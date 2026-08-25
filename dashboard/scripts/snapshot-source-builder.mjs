import { closeSync, fstatSync, lstatSync, openSync, readSync, readdirSync, realpathSync } from "node:fs";
import { createHash } from "node:crypto";
import { basename, dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArrayTableDocument, parseMarkdownFrontmatterHead, parseSectionedToml, projectFormalAssetsForSnapshot, loadTrustedDomainEnvelope, stableAssetId, validateInstanceManifestStructure } from "./asset-route-contract.mjs";
import { projectCandidatesForSnapshot } from "./candidate-index-contract.mjs";
import { locateHighConfidenceSecretCandidates } from "./secret-content-boundary.mjs";
import { containsForbiddenLocationReference, containsForbiddenStructuredLocation } from "./safe-output-boundary.mjs";
import { parseSnapshotEnvelope, serializeSnapshotEnvelope } from "./snapshot-envelope.mjs";
import { validateSnapshotSemantics } from "./snapshot-semantics.mjs";
import { inspectStartupCapsule } from "./startup-capsule-contract.mjs";
import { measureModelVisibleStartupContext } from "./query-startup-capsule.mjs";

const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
const unsafeText = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u;
const structuredPrivateRefSource = /^instance\/(?:memory|capabilities|sops|experiences|evolution|todo|deferred)\/.+\.md$/u;
const supportFields = {
  todo: new Set(["id", "kind", "status", "visible", "title", "summary", "triggers", "scope", "excludes", "source_refs", "private_refs", "minimum_level", "approved_by_user", "updated_at"]),
  governance: new Set(["id", "kind", "status", "title", "summary", "triggers", "frequency_days", "background", "minimum_level", "approved_by_user", "schedule_state", "schedule_anchor_at", "last_completed_at", "next_due_at", "snoozed_until", "trigger_revision"]),
  "deferred-work": new Set(["id", "kind", "status", "title", "summary", "required_level", "deferral_reason", "recovery_route", "source_refs", "private_refs", "created_at", "remind_at", "snoozed_until", "trigger_revision", "approved_by_user"]),
};

function fail(message) { throw new Error(`Snapshot source builder failed: ${message}`); }
function hash(value) { return createHash("sha256").update(value).digest("hex"); }
function clean(value, max, allowEmpty = false) {
  return typeof value === "string" && (allowEmpty || value.trim().length > 0) && [...value].length <= max
    && value.normalize("NFC") === value && !unsafeText.test(value);
}
function compareOrdinal(left, right) { return left < right ? -1 : left > right ? 1 : 0; }
function decode(buffer, label) { try { return utf8Decoder.decode(buffer); } catch { fail(`${label} is not UTF-8`); } }

function portablePrivatePathSegment(part) {
  const base = part.replace(/\..*$/u, "").toLowerCase();
  return part && part !== "." && part !== ".." && part.normalize("NFC") === part && !unsafeText.test(part)
    && !/[. ]$/u.test(part) && !/[<>"|*]/u.test(part)
    && !["con", "prn", "aux", "nul", "clock$"].includes(base) && !/^(?:com|lpt)[1-9]$/u.test(base);
}

function validStructuredPrivateReference(ref) {
  if (!clean(ref, 240)) return false;
  let relativeRef;
  if (ref.startsWith("private://")) {
    const match = /^private:\/\/([a-z0-9][a-z0-9._:-]{0,159})\/(.+)$/u.exec(ref);
    if (!match) return false;
    relativeRef = match[2];
  } else if (ref.startsWith(".assistant-private/assets/")) {
    relativeRef = ref.slice(".assistant-private/assets/".length);
  } else return false;
  return relativeRef.length > 0 && !relativeRef.includes("\\") && !relativeRef.includes(":")
    && !relativeRef.includes("?") && !relativeRef.includes("#") && relativeRef.split("/").every(portablePrivatePathSegment);
}

function containsForbiddenSnapshotSourceLocation(ref, text) {
  if (!structuredPrivateRefSource.test(ref)) return containsForbiddenLocationReference(text);
  const normalized = text.replaceAll("\r\n", "\n");
  let parsed;
  try { parsed = parseMarkdownFrontmatterHead(normalized, ref); } catch { return true; }
  const privateRefs = parsed.values.private_refs ?? [];
  if (!Array.isArray(privateRefs) || privateRefs.length > 32 || privateRefs.some((item) => !validStructuredPrivateReference(item))) return true;
  return containsForbiddenStructuredLocation(parsed.values)
    || containsForbiddenLocationReference(normalized.slice(parsed.bodyOffset));
}

function stableRead(path, maxBytes, label) {
  const realBefore = realpathSync(path);
  const descriptor = openSync(path, "r");
  try {
    const before = fstatSync(descriptor, { bigint: true });
    if (!before.isFile() || before.size > BigInt(maxBytes)) fail(`${label} is not a regular file or exceeds ${maxBytes} bytes`);
    const buffer = Buffer.alloc(Number(before.size)); let offset = 0;
    while (offset < buffer.length) { const count = readSync(descriptor, buffer, offset, buffer.length - offset, offset); if (count === 0) break; offset += count; }
    const after = fstatSync(descriptor, { bigint: true });
    const pathInfo = lstatSync(path);
    if (offset !== buffer.length || before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size
      || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs || !pathInfo.isFile() || pathInfo.isSymbolicLink()
      || realpathSync(path) !== realBefore) fail(`${label} changed during its bounded read`);
    return buffer;
  } finally { closeSync(descriptor); }
}

function enumerateInstanceSources(repository) {
  const root = realpathSync(repository);
  const files = [{ ref: "assistant.toml", path: resolve(root, "assistant.toml") }];
  const instanceRoot = resolve(root, "instance");
  if (!lstatSync(instanceRoot).isDirectory() || lstatSync(instanceRoot).isSymbolicLink()) fail("instance root is not a physical directory");
  const queue = [instanceRoot]; let visited = 0;
  while (queue.length) {
    const directory = queue.shift();
    if (++visited > 4096) fail("instance directory count exceeds the maintenance bound");
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name); const info = lstatSync(path);
      if (info.isSymbolicLink()) fail("instance source tree contains a link or reparse point");
      if (entry.isDirectory()) { queue.push(path); continue; }
      if (!entry.isFile() || basename(path) === "README.md") continue;
      const ref = relative(root, realpathSync(path)).split(sep).join("/").normalize("NFC");
      if (!ref.startsWith("instance/") || ref.includes("\\") || ref.includes(":")) fail("instance source escaped the repository or is not portable");
      files.push({ ref, path });
      if (files.length > 8192) fail("instance source file count exceeds 8192");
    }
  }
  return files.sort((left, right) => compareOrdinal(left.ref, right.ref));
}

export function computeSnapshotSourceDigest(repository) {
  const files = enumerateInstanceSources(repository); const lines = []; let totalBytes = 0;
  for (const file of files) {
    const bytes = stableRead(file.path, 128 * 1024 * 1024, `source ${file.ref}`);
    totalBytes += bytes.length;
    if (totalBytes > 512 * 1024 * 1024) fail("instance source bytes exceed the 512 MiB snapshot-maintenance bound");
    const text = decode(bytes, file.ref);
    if (locateHighConfidenceSecretCandidates(text).blocked || containsForbiddenSnapshotSourceLocation(file.ref, text)) fail(`source ${file.ref} contains a secret candidate or non-portable absolute location`);
    lines.push(`${file.ref}\t${hash(bytes)}\n`);
  }
  return Object.freeze({ digest: `sha256:${hash(Buffer.from(lines.join(""), "utf8"))}`, fileCount: files.length, totalBytes });
}

function readStructured(repository, ref, maxBytes = 128 * 1024) {
  const root = realpathSync(repository); const path = resolve(root, ...ref.split("/"));
  const fromRoot = relative(root, realpathSync(path));
  if (fromRoot === ".." || fromRoot.startsWith(`..${sep}`)) fail(`${ref} escapes the repository`);
  let cursor = root;
  for (const part of ref.split("/")) { cursor = resolve(cursor, part); const info = lstatSync(cursor); if (info.isSymbolicLink()) fail(`${ref} crosses a link`); }
  return decode(stableRead(path, maxBytes, ref), ref).replaceAll("\r\n", "\n");
}

function projectSupportDirectory(repository, directory, expectedKind) {
  const root = resolve(realpathSync(repository), "instance", directory);
  const results = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isFile() || entry.name === "README.md" || !entry.name.endsWith(".md")) continue;
    const source = readStructured(repository, `instance/${directory}/${entry.name}`);
    const parsed = parseMarkdownFrontmatterHead(source, `${directory}/${entry.name}`);
    const asset = parsed.values; const body = source.slice(parsed.bodyOffset);
    const allowed = supportFields[expectedKind];
    if (!allowed || Object.keys(asset).some((field) => !allowed.has(field)) || asset.kind !== expectedKind
      || !stableAssetId.test(asset.id ?? "") || !clean(asset.title, 160) || !clean(asset.summary, 1000)
      || locateHighConfidenceSecretCandidates(JSON.stringify(asset)).blocked || containsForbiddenStructuredLocation(asset)
      || locateHighConfidenceSecretCandidates(body).blocked || containsForbiddenLocationReference(body)) fail(`support asset ${asset.id ?? entry.name} is unsafe or invalid`);
    if (expectedKind === "todo") {
      if (asset.visible === false) continue;
      results.push({ id: asset.id, title: asset.title, summary: asset.summary, status: asset.status, visible: asset.visible !== false });
    } else if (expectedKind === "deferred-work") {
      if (![1, 2, 3].includes(asset.required_level)) fail(`deferred asset ${asset.id} has an invalid required level`);
      results.push({ summary: asset.summary, level: asset.required_level, remind: asset.remind_at ?? "", status: asset.status });
    } else {
      if (!Number.isSafeInteger(asset.frequency_days) || asset.frequency_days < 1 || asset.frequency_days > 3650) fail(`governance asset ${asset.id} has an invalid frequency`);
      const steps = [...body.matchAll(/^\s*\d+\.\s+(.+)$/gmu)].map((match) => match[1].trim()).slice(0, 20);
      if (steps.length === 0) fail(`governance asset ${asset.id} has no bounded numbered steps`);
      results.push({ id: asset.id, title: asset.title, summary: asset.summary, frequency: `每 ${asset.frequency_days} 天`, status: asset.schedule_state ?? asset.status,
        purpose: asset.summary, steps, last_completed_at: asset.last_completed_at ?? "", next_due_at: asset.next_due_at ?? "", schedule_state: asset.schedule_state ?? "uninitialized" });
    }
  }
  return results.sort((left, right) => compareOrdinal(left.id ?? left.summary, right.id ?? right.summary));
}

function projectSkills(repository, instanceId) {
  const source = readStructured(repository, "instance/skills/requirements.toml", 32 * 1024);
  if (locateHighConfidenceSecretCandidates(source).blocked || containsForbiddenLocationReference(source)) fail("skill requirements contain unsafe content");
  const parsed = parseArrayTableDocument(source, "skills", "skill requirements");
  if (parsed.root.schema_version !== 1 || parsed.root.instance_id !== instanceId || parsed.entries.length > 256) fail("skill requirements identity or count is invalid");
  for (const item of parsed.entries) if (!stableAssetId.test(item.id ?? "") || !clean(item.summary, 240) || !["available", "review", "unavailable"].includes(item.state)) fail("skill requirement entry is invalid");
  return { count: parsed.entries.length, status: parsed.root.status ?? (parsed.entries.length ? "已登记，按任务需要加载" : "尚未登记 Skill"), path: "" };
}

function withoutGeneratedAt(snapshot) {
  const clone = JSON.parse(JSON.stringify(snapshot));
  if (clone?.meta) clone.meta.generated_at = "";
  return clone;
}

export function buildSnapshotCandidate(repository, { existingSource = undefined, now = new Date() } = {}) {
  const root = realpathSync(repository);
  if (inspectStartupCapsule(root).decision !== "startup-capsule-valid") fail("startup capsule is stale or invalid");
  const assistant = parseSectionedToml(readStructured(root, "assistant.toml", 64 * 1024), "assistant manifest");
  const manifest = parseSectionedToml(readStructured(root, "instance/manifest.toml", 2560), "instance manifest");
  const validatedManifest = validateInstanceManifestStructure(manifest);
  const identity = validatedManifest.root; const direction = validatedManifest.direction; const profile = validatedManifest.profile; const versions = validatedManifest.versions;
  const productVersion = versions.product ?? assistant[""]?.product_version;
  if (!clean(productVersion, 64)) fail("product version is missing");
  if (identity.state === "template") {
    const startupBudget = assistant.bootstrap?.maximum_characters;
    if (!Number.isSafeInteger(startupBudget) || startupBudget < 1) fail("assistant startup budget is invalid");
    const template = {
      meta: { schema_version: "1.1", generated_at: "", product_version: productVersion, state: "template",
        freshness_seconds: 86400, source_digest: "template-empty", identity_ref: "template" },
      overview: { product: "AgentCarry", state: "template", domain: "uninstantiated",
        startup_chars: measureModelVisibleStartupContext(root).totalCharacters, startup_budget: startupBudget },
      profile: { display_name: "Agent Carry", mission: "把你的记忆、能力与工作方式沉淀为可迁移的个人助手。",
        domain_id: "uninstantiated", guidance_mode: "unselected", learning_policy: "unselected", language: "zh-CN" },
      assets: { memory: 0, sops: 0, capabilities: 0, experiences: 0, evolution: 0, todo: 0, governance: 0, skills: 0 },
      memories: [], sops: [], capabilities: [], experiences: [], evolution: [], governance: [], todo: [], deferred: [],
      skills: { count: 0, status: "等待实例化后按需扫描", path: "" }, changes: [],
      advanced: { file_count: 0, entry_files: ["AGENTS.md", "BOOTSTRAP.md", "assistant.toml", "core/maps/root-map.toml"] },
    };
    validateSnapshotSemantics(template, "generated formal template snapshot");
    const source = serializeSnapshotEnvelope(template);
    const current = typeof existingSource === "string" ? existingSource : readStructured(root, "dashboard/public/snapshot.js", 8 * 1024 * 1024);
    return Object.freeze({ updated: current !== source, snapshot: template, source, sourceDigest: "template-empty", identityRef: "template" });
  }
  if (!["general", "domain"].includes(direction.type) || direction.locked !== true
    || !["step-by-step", "balanced", "direct"].includes(profile.guidance_mode)
    || !["risk-tiered", "manual-only"].includes(validatedManifest.learningPolicy)
    || !clean(profile.display_name, 160) || !clean(profile.mission, 512) || !clean(profile.language ?? "zh-CN", 80)) fail("instance profile lacks explicit low-sensitivity dashboard fields");
  const generatedAt = now instanceof Date && Number.isFinite(now.getTime()) ? now.toISOString() : "";
  if (!generatedAt) fail("snapshot generation time is invalid");
  const sources = computeSnapshotSourceDigest(root);
  const { context } = loadTrustedDomainEnvelope(root);
  const formal = projectFormalAssetsForSnapshot(root);
  const evolution = projectCandidatesForSnapshot(root, { instanceContext: context });
  const todo = projectSupportDirectory(root, "todo", "todo");
  const governance = projectSupportDirectory(root, "governance", "governance");
  const deferred = projectSupportDirectory(root, "deferred", "deferred-work");
  const skills = projectSkills(root, identity.instance_id);
  const startupBudget = assistant.bootstrap?.maximum_characters;
  if (!Number.isSafeInteger(startupBudget) || startupBudget < 1) fail("assistant startup budget is invalid");
  const snapshot = {
    meta: { schema_version: "1.1", generated_at: generatedAt, product_version: productVersion, state: "instance", freshness_seconds: 86400,
      source_digest: sources.digest, identity_ref: `ac-${hash(Buffer.from(identity.instance_id, "utf8")).slice(0, 12)}` },
    overview: { product: "AgentCarry", state: "instance", domain: direction.type === "general" ? "general" : direction.domain_id,
      startup_chars: measureModelVisibleStartupContext(root).totalCharacters, startup_budget: startupBudget },
    profile: { display_name: profile.display_name, mission: profile.mission, domain_id: direction.type === "general" ? "general" : direction.domain_id,
      guidance_mode: profile.guidance_mode, learning_policy: validatedManifest.learningPolicy, language: profile.language ?? "zh-CN" },
    assets: { memory: formal.memory.length, sops: formal.sops.length, capabilities: formal.capabilities.length, experiences: formal.experiences.length,
      evolution: evolution.length, todo: todo.length, governance: governance.length, skills: skills.count },
    memories: formal.memory, sops: formal.sops, capabilities: formal.capabilities, experiences: formal.experiences,
    evolution, governance, todo, deferred, skills, changes: [], advanced: { file_count: sources.fileCount, entry_files: ["AGENTS.md", "BOOTSTRAP.md", "assistant.toml", "core/maps/root-map.toml"] },
  };
  validateSnapshotSemantics(snapshot, "generated instance snapshot");
  const source = serializeSnapshotEnvelope(snapshot);
  if (locateHighConfidenceSecretCandidates(source).blocked || containsForbiddenLocationReference(source)) fail("generated snapshot contains unsafe projected content");
  if (typeof existingSource === "string") {
    try {
      const existing = parseSnapshotEnvelope(existingSource, "existing instance snapshot");
      validateSnapshotSemantics(existing, "existing instance snapshot");
      if (existing.meta?.source_digest === snapshot.meta.source_digest
        && JSON.stringify(withoutGeneratedAt(existing)) === JSON.stringify(withoutGeneratedAt(snapshot))) {
        return Object.freeze({ updated: false, snapshot: existing, source: existingSource, sourceDigest: sources.digest, identityRef: snapshot.meta.identity_ref });
      }
    } catch { /* Invalid old snapshots never suppress a valid rebuild candidate. */ }
  }
  return Object.freeze({ updated: true, snapshot, source, sourceDigest: sources.digest, identityRef: snapshot.meta.identity_ref });
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const existingPath = resolve(root, "dashboard", "public", "snapshot.js");
  const existingSource = readStructured(root, relative(root, existingPath).split(sep).join("/"), 8 * 1024 * 1024);
  const candidate = buildSnapshotCandidate(root, { existingSource });
  console.log(JSON.stringify({ updated: candidate.updated, source_digest: candidate.sourceDigest, identity_ref: candidate.identityRef }));
}
