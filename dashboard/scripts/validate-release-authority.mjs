import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const immutable130Digest = "836b755de7593c3da0bf1687dd6da21adb7587b69555d7b64628f827ef6200d7";
const exactPlaceholders = [
  ".assistant-local/.gitkeep",
  ".assistant-local/dashboard/.gitkeep",
  ".assistant-local/indexes/.gitkeep",
  ".assistant-local/skills/.gitkeep",
  ".assistant-local/task-handoffs/.gitkeep",
  ".assistant-local/upgrade-inbox/.gitkeep",
  ".assistant-private/.gitkeep",
  ".assistant-private/assets/.gitkeep",
  ".assistant-private/inbox/.gitkeep",
];

function bytes(relative) {
  return readFileSync(resolve(repository, ...relative.split("/")));
}

function read(relative) {
  return bytes(relative).toString("utf8").replaceAll("\r\n", "\n");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function expect(condition, message) {
  if (!condition) throw new Error(`Release authority validation failed: ${message}`);
}

function includesAll(source, fragments, label) {
  for (const fragment of fragments) expect(source.includes(fragment), `${label} is missing: ${fragment}`);
}

function section(source, name) {
  const match = source.match(new RegExp(`^\\[${name.replaceAll(".", "\\.")}\\]\\s*$`, "mu"));
  expect(match, `manifest section is missing: ${name}`);
  const tail = source.slice(match.index + match[0].length);
  const next = tail.search(/^\[/mu);
  return next < 0 ? tail : tail.slice(0, next);
}

const oldManifestBytes = bytes("core/upgrade/release-manifest-1.3.0.toml");
const oldManifest = oldManifestBytes.toString("utf8").replaceAll("\r\n", "\n");
expect(sha256(oldManifestBytes) === immutable130Digest, "immutable 1.3.0 manifest was rewritten instead of repaired by a patch");
includesAll(section(oldManifest, "release_boundary"), [
  'status = "local-unreleased-candidate"',
  "publication_authorized = false",
  "repository_operation_authorized = false",
  "instance_replacement_authorized = false",
], "historical 1.3.0 boundary");

const manifest = read("core/upgrade/release-manifest-1.3.1.toml");
includesAll(manifest, [
  "schema_version = 2",
  'release = "1.3.1"',
  'core = "1.3.1"',
  'from_versions = ["1.2.1", "1.3.0"]',
  'id = "release-authority-and-guidance-1.3.1"',
  'from_versions = ["1.3.0"]',
  '"version-1.3.1-and-asset-schema-1.3-aligned"',
  '"both-1.2.1-and-1.3.0-are-direct-sources"',
], "1.3.1 manifest");
expect(!manifest.includes("Unreleased local 1.3.1 candidate"), "1.3.1 still declares itself an unreleased local candidate");
expect(manifest.includes('"instance/evolution/index.toml"'), "1.3.1 does not classify the identity-bound evolution index for migration");

const targetSelection = section(manifest, "target_selection");
includesAll(targetSelection, [
  'forbidden_segments = [".git", "node_modules", ".cache", ".vite", ".turbo", "coverage", "tmp", "temp", "maintainer-private", ".assistant-private", ".assistant-local"]',
  'exact_override_policy = "only-listed-regular-zero-byte-files-may-override-forbidden-segments; directory-records-are-container-metadata-not-files"',
], "1.3.1 target selection");
const overrideMatch = targetSelection.match(/^allow_overrides_deny_for_exact_paths\s*=\s*(\[[^\n]*\])$/mu);
expect(overrideMatch, "1.3.1 exact placeholder override list is missing");
expect(JSON.stringify(JSON.parse(overrideMatch[1])) === JSON.stringify(exactPlaceholders), "1.3.1 exact placeholder override list drifted");

const boundary = section(manifest, "release_boundary");
includesAll(boundary, [
  'status = "published-release"',
  'release_ref = "v1.3.1"',
  "publication_authorized = true",
  "repository_operation_authorized = true",
  "instance_replacement_authorized = true",
  "future_publication_or_repository_operation_authorized = false",
  'authority_requires = ["official-fixed-tag-v1.3.1", "official-release-object-v1.3.1", "manifest-and-extracted-tree-match-the-fixed-tag", "user-explicitly-authorized-this-upgrade"]',
  'authority_scope = "this-fixed-release-may-be-used-for-instance-replacement; never-authorizes-future-repository-release-or-publication-actions"',
], "1.3.1 release boundary");

const schema = read("core/schemas/release-manifest.schema.md");
includesAll(schema, [
  "`allow_overrides_deny_for_exact_paths`",
  "只允许清单逐字列出的普通零字节文件",
  "`status=published-release`",
  "不能授权未来的提交、推送、标签、Release 或 Pages",
], "release manifest Schema");

const guide121 = read("core/upgrade/upgrade-1.2.1-to-1.3.1.md");
includesAll(guide121, ["1.2.1 → 1.3.1", "正式发布", "隔离副本", "逐路径", "第二次", "回滚", "generated_at"], "1.2.1 patch upgrade guide");
const guide130 = read("core/upgrade/upgrade-1.3.0-to-1.3.1.md");
includesAll(guide130, ["1.3.0 → 1.3.1", "发布 authority", "零字节", "不重新迁移", "隔离副本"], "1.3.0 patch upgrade guide");
includesAll(read("core/guides/upgrade-guide.md"), ["1.3.1", "release-manifest-1.3.1.toml", "upgrade-1.2.1-to-1.3.1.md", "upgrade-1.3.0-to-1.3.1.md"], "current upgrade guide");

includesAll(read("assistant.toml"), ['product_version = "1.3.1"', 'core_version = "1.3.1"'], "assistant authority");
includesAll(read("core/manifest.toml"), ['version = "1.3.1"'], "core authority");
includesAll(read("instance/manifest.toml"), ['product = "1.3.1"'], "template instance authority");
includesAll(read("dashboard/package.json"), ['"version": "1.3.1"', '"check:release-authority": "node scripts/validate-release-authority.mjs"', "npm run check:release-authority"], "Dashboard package authority");
includesAll(read("dashboard/package-lock.json"), ['"version": "1.3.1"'], "Dashboard lock authority");

const instanceManifestBytes = bytes("instance/manifest.toml");
const startupCapsule = read("instance/startup-capsule.toml");
includesAll(startupCapsule, [
  `source_manifest_digest = "sha256:${sha256(instanceManifestBytes)}"`,
  'product_version = "1.3.1"',
], "template startup capsule");

console.log("Release authority validation passed for immutable 1.3.0 plus patch 1.3.1.");
