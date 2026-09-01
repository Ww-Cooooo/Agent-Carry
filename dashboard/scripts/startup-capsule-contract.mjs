import { closeSync, fstatSync, lstatSync, openSync, readSync, realpathSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { parseSectionedToml, validateInstanceManifestStructure } from "./asset-route-contract.mjs";
import { PRODUCT_IDENTITY } from "./product-identity.mjs";

export const MAX_MANIFEST_BYTES = 2560;
const MAX_CAPSULE_BYTES = 4096;
const utf8 = new TextDecoder("utf-8", { fatal: true });
const capsuleFields = new Set([
  "schema_version", "capsule_id", "source_manifest_digest", "product_version", "instance_id", "state",
  "direction_type", "direction_locked", "domain_id", "guidance_mode", "learning_policy", "language",
  "profile_ref", "domain_map_ref", "signal_control_ref", "signal_map_ref", "root_map_ref", "migration_required",
]);

function fail(message) { throw new Error(`Startup capsule contract failed: ${message}`); }
function hash(buffer) { return `sha256:${createHash("sha256").update(buffer).digest("hex")}`; }
function stableRead(path, maxBytes, label) {
  const realBefore = realpathSync(path); const descriptor = openSync(path, "r");
  try {
    const before = fstatSync(descriptor, { bigint: true });
    if (!before.isFile() || before.size > BigInt(maxBytes)) fail(`${label} is not a bounded regular file`);
    const buffer = Buffer.alloc(Number(before.size)); let offset = 0;
    while (offset < buffer.length) { const count = readSync(descriptor, buffer, offset, buffer.length - offset, offset); if (count === 0) break; offset += count; }
    const after = fstatSync(descriptor, { bigint: true }); const info = lstatSync(path);
    if (offset !== buffer.length || before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size
      || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs || !info.isFile() || info.isSymbolicLink()
      || realpathSync(path) !== realBefore) fail(`${label} changed during its bounded read`);
    return buffer;
  } finally { closeSync(descriptor); }
}
function q(value) { return JSON.stringify(value); }
function serialize(values) {
  const order = [...capsuleFields];
  return `${order.map((field) => `${field} = ${typeof values[field] === "string" ? q(values[field]) : values[field]}`).join("\n")}\n`;
}

export function buildStartupCapsule(repository) {
  const root = realpathSync(repository);
  const manifestBuffer = stableRead(resolve(root, "instance/manifest.toml"), MAX_MANIFEST_BYTES, "instance manifest");
  let manifestSource;
  try { manifestSource = utf8.decode(manifestBuffer); } catch { fail("instance manifest is not UTF-8"); }
  if (manifestSource.startsWith("\uFEFF") || manifestSource.includes("\r")) fail("instance manifest must be UTF-8 without BOM and use LF line endings");
  const manifest = parseSectionedToml(manifestSource, "instance manifest");
  const validated = validateInstanceManifestStructure(manifest);
  const coreBuffer = stableRead(resolve(root, "core/manifest.toml"), 32 * 1024, "core manifest");
  let coreSource;
  try { coreSource = utf8.decode(coreBuffer); } catch { fail("core manifest is not UTF-8"); }
  const core = parseSectionedToml(coreSource, "core manifest");
  const coreRoot = core[""] ?? {}; const entry = core.entry ?? {};
  if (coreRoot.core_id !== PRODUCT_IDENTITY.coreId
    || typeof coreRoot.version !== "string" || coreRoot.version.length === 0
    || entry.root_map !== "core/maps/root-map.toml") fail("core startup identity is invalid");
  if (validated.versions.product !== coreRoot.version) fail("instance and core product versions disagree");
  const values = Object.freeze({
    schema_version: 1,
    capsule_id: PRODUCT_IDENTITY.startupCapsuleId,
    source_manifest_digest: hash(manifestBuffer),
    product_version: coreRoot.version,
    instance_id: validated.root.instance_id,
    state: validated.root.state,
    direction_type: validated.direction.type,
    direction_locked: validated.direction.locked,
    domain_id: validated.direction.domain_id,
    guidance_mode: validated.profile.guidance_mode,
    learning_policy: validated.root.state === "template" ? "unselected" : validated.learningPolicy,
    language: validated.profile.language ?? "zh-CN",
    profile_ref: validated.profile.user_preferences_ref,
    domain_map_ref: validated.profile.domain_map_ref,
    signal_control_ref: validated.profile.signal_control_ref,
    signal_map_ref: validated.profile.signal_map_ref,
    root_map_ref: entry.root_map,
    migration_required: validated.schemaMigrationRequired,
  });
  const source = serialize(values);
  if (Buffer.byteLength(source, "utf8") > MAX_CAPSULE_BYTES) fail("generated capsule exceeds its hard budget");
  return Object.freeze({ values, source, sourceManifestDigest: values.source_manifest_digest });
}

export function inspectStartupCapsule(repository) {
  let expected;
  try {
    expected = buildStartupCapsule(repository);
  } catch {
    return Object.freeze({ decision: "startup-repair-required", reason: "manifest-or-core-contract-invalid",
      repairable: false, executable: false });
  }
  try {
    const root = realpathSync(repository); const target = resolve(root, "instance/startup-capsule.toml");
    let info;
    try { info = lstatSync(target); }
    catch (error) {
      if (error?.code === "ENOENT") return Object.freeze({ decision: "startup-repair-required", reason: "capsule-missing",
        repairable: true, executable: false });
      return Object.freeze({ decision: "startup-repair-required", reason: "capsule-path-unavailable",
        repairable: false, executable: false });
    }
    if (!info.isFile() || info.isSymbolicLink()) return Object.freeze({ decision: "startup-repair-required",
      reason: "capsule-path-unsafe", repairable: false, executable: false });
    const actualBuffer = stableRead(target, MAX_CAPSULE_BYTES, "startup capsule");
    let actualSource;
    try { actualSource = utf8.decode(actualBuffer); } catch { return Object.freeze({ decision: "startup-repair-required", reason: "capsule-not-utf8", repairable: true, executable: false }); }
    if (actualSource.startsWith("\uFEFF") || actualSource.includes("\r")) {
      return Object.freeze({ decision: "startup-repair-required", reason: "capsule-stale-or-invalid", repairable: true, executable: false });
    }
    const parsed = parseSectionedToml(actualSource, "startup capsule");
    const values = parsed[""] ?? {};
    if (Object.keys(parsed).some((section) => section !== "") || Object.keys(values).length !== capsuleFields.size
      || Object.keys(values).some((field) => !capsuleFields.has(field)) || actualSource !== expected.source) {
      return Object.freeze({ decision: "startup-repair-required", reason: "capsule-stale-or-invalid", repairable: true, executable: false });
    }
    return Object.freeze({ decision: "startup-capsule-valid", executable: false, ...expected.values });
  } catch {
    return Object.freeze({ decision: "startup-repair-required", reason: "capsule-read-unstable-or-unbounded",
      repairable: false, executable: false });
  }
}
