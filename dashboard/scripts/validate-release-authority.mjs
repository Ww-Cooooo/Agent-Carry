import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const immutable130Digest = "836b755de7593c3da0bf1687dd6da21adb7587b69555d7b64628f827ef6200d7";
const immutable131Digest = "00950088bc548592c5faaffe022f1022989a1ca1bd7ed4e60b049f2d746020c1";
const immutable140Digest = "a8ee3f4a113c0f958f6979e3d2abd14e8c087f3b919b6f76118203b9015fde91";
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

const publishedManifestBytes = bytes("core/upgrade/release-manifest-1.3.1.toml");
expect(sha256(publishedManifestBytes) === immutable131Digest, "published 1.3.1 manifest was rewritten by later development");
const publishedManifest = publishedManifestBytes.toString("utf8").replaceAll("\r\n", "\n");
includesAll(publishedManifest, [
  "schema_version = 2",
  'release = "1.3.1"',
  'core = "1.3.1"',
  'from_versions = ["1.2.1", "1.3.0"]',
  'id = "release-authority-and-guidance-1.3.1"',
  'from_versions = ["1.3.0"]',
  '"version-1.3.1-and-asset-schema-1.3-aligned"',
  '"both-1.2.1-and-1.3.0-are-direct-sources"',
], "1.3.1 manifest");
expect(!publishedManifest.includes("Unreleased local 1.3.1 candidate"), "1.3.1 still declares itself an unreleased local candidate");
expect(publishedManifest.includes('"instance/evolution/index.toml"'), "1.3.1 does not classify the identity-bound evolution index for migration");

const publishedTargetSelection = section(publishedManifest, "target_selection");
includesAll(publishedTargetSelection, [
  'forbidden_segments = [".git", "node_modules", ".cache", ".vite", ".turbo", "coverage", "tmp", "temp", "maintainer-private", ".assistant-private", ".assistant-local"]',
  'exact_override_policy = "only-listed-regular-zero-byte-files-may-override-forbidden-segments; directory-records-are-container-metadata-not-files"',
], "1.3.1 target selection");
const publishedOverrideMatch = publishedTargetSelection.match(/^allow_overrides_deny_for_exact_paths\s*=\s*(\[[^\n]*\])$/mu);
expect(publishedOverrideMatch, "1.3.1 exact placeholder override list is missing");
expect(JSON.stringify(JSON.parse(publishedOverrideMatch[1])) === JSON.stringify(exactPlaceholders), "1.3.1 exact placeholder override list drifted");

const publishedBoundary = section(publishedManifest, "release_boundary");
includesAll(publishedBoundary, [
  'status = "published-release"',
  'release_ref = "v1.3.1"',
  "publication_authorized = true",
  "repository_operation_authorized = true",
  "instance_replacement_authorized = true",
  "future_publication_or_repository_operation_authorized = false",
  'authority_requires = ["official-fixed-tag-v1.3.1", "official-release-object-v1.3.1", "manifest-and-extracted-tree-match-the-fixed-tag", "user-explicitly-authorized-this-upgrade"]',
  'authority_scope = "this-fixed-release-may-be-used-for-instance-replacement; never-authorizes-future-repository-release-or-publication-actions"',
], "1.3.1 release boundary");

const release140Bytes = bytes("core/upgrade/release-manifest-1.4.0.toml");
expect(sha256(release140Bytes) === immutable140Digest, "published 1.4.0 manifest was rewritten by the 1.4.1 patch");
const release140 = release140Bytes.toString("utf8").replaceAll("\r\n", "\n");
includesAll(release140, [
  "schema_version = 2",
  'release = "1.4.0"',
  'core = "1.4.0"',
  'instance_component_schema = "1.0"',
  'from_versions = ["1.3.1"]',
  'id = "instance-component-adoption-1.4"',
  'id = "instance-component-interface-1.0"',
  '"published-1.3.1-manifest-remains-byte-immutable"',
  '"durable-instance-change-gate-reuses-current-authorization-without-a-second-confirmation"',
  '"published-1.4.0-authority-requires-fixed-tag-release-object-matching-tree-and-user-authorization"',
], "1.4.0 release manifest");
const release140TargetSelection = section(release140, "target_selection");
includesAll(release140TargetSelection, [
  'forbidden_segments = [".git", "node_modules", ".cache", ".vite", ".turbo", "coverage", "tmp", "temp", "maintainer-private", ".assistant-private", ".assistant-local"]',
  'exact_override_policy = "only-listed-regular-zero-byte-files-may-override-forbidden-segments; directory-records-are-container-metadata-not-files"',
], "1.4.0 target selection");
const candidateOverrideMatch = release140TargetSelection.match(/^allow_overrides_deny_for_exact_paths\s*=\s*(\[[^\n]*\])$/mu);
expect(candidateOverrideMatch, "1.4.0 exact placeholder override list is missing");
expect(JSON.stringify(JSON.parse(candidateOverrideMatch[1])) === JSON.stringify(exactPlaceholders), "1.4.0 exact placeholder override list drifted");
includesAll(section(release140, "instance_component_changes"), [
  'schema = "1.0"',
  'target_interfaces = ["agent-carry.instance-component@1"]',
  'migration_ids = ["instance-component-adoption-1.4", "instance-component-interface-1.0"]',
  'optional_incompatible_action = "disable-and-preserve"',
  'required_incompatible_action = "stop-and-preserve"',
  'ordinary_startup = "never-read-registry-enumerate-components-or-load-component-bodies"',
  'authorization = "reuse-the-current-durable-action-authorization-never-add-a-compatibility-only-user-confirmation"',
], "1.4.0 instance component changes");
includesAll(section(release140, "release_boundary"), [
  'status = "published-release"',
  'release_ref = "v1.4.0"',
  "publication_authorized = true",
  "repository_operation_authorized = true",
  "instance_replacement_authorized = true",
  "future_publication_or_repository_operation_authorized = false",
  'authority_requires = ["official-fixed-tag-v1.4.0", "official-release-object-v1.4.0", "manifest-and-extracted-tree-match-the-fixed-tag", "user-explicitly-authorized-this-upgrade"]',
  'authority_scope = "this-fixed-release-may-be-used-for-instance-replacement; never-authorizes-future-repository-release-or-publication-actions"',
], "1.4.0 release boundary");
expect(!release140.includes('status = "local-unreleased-candidate"'), "1.4.0 still declares itself a local unreleased candidate");

const release141 = read("core/upgrade/release-manifest-1.4.1.toml");
includesAll(release141, [
  "schema_version = 2",
  'release = "1.4.1"',
  'core = "1.4.1"',
  'instance_component_schema = "1.0"',
  'result_validation_evidence_schema = "1.0"',
  'startup_capsule_schema = "1.0"',
  'from_versions = ["1.4.0"]',
  'id = "first-instantiation-identity-closure-1.4.1"',
  '"published-1.4.0-manifest-remains-byte-immutable"',
  '"uninstantiated-1.4.0-template-upgrades-to-blank-1.4.1-and-can-then-instantiate"',
  '"instantiated-1.4.0-identity-assets-validation-evolution-components-extensions-workspace-local-and-private-state-are-preserved"',
  '"first-instantiation-second-run-is-byte-idempotent"',
  '"schema-valid-component-private-collection-refs-enter-source-digest-but-never-dashboard-projection"',
  '"absolute-component-private-or-device-local-paths-remain-rejected"',
  '"operational-daily-actions-isolate-unrelated-invalid-sources-and-preserve-raw-bytes"',
  '"operational-current-target-identity-core-path-link-and-private-boundary-remain-hard-failures"',
  '"strict-first-use-upgrade-release-and-maintenance-reject-every-operationally-isolated-invalid-source"',
  '"unknown-future-fields-business-entries-times-revisions-and-validation-evidence-are-never-guessed-or-deleted"',
  '"healthy-success-adds-no-operational-report-noise"',
], "1.4.1 release manifest");
const release141TargetSelection = section(release141, "target_selection");
includesAll(release141TargetSelection, [
  'forbidden_segments = [".git", "node_modules", ".cache", ".vite", ".turbo", "coverage", "tmp", "temp", "maintainer-private", ".assistant-private", ".assistant-local"]',
  'exact_override_policy = "only-listed-regular-zero-byte-files-may-override-forbidden-segments; directory-records-are-container-metadata-not-files"',
], "1.4.1 target selection");
const release141OverrideMatch = release141TargetSelection.match(/^allow_overrides_deny_for_exact_paths\s*=\s*(\[[^\n]*\])$/mu);
expect(release141OverrideMatch, "1.4.1 exact placeholder override list is missing");
expect(JSON.stringify(JSON.parse(release141OverrideMatch[1])) === JSON.stringify(exactPlaceholders), "1.4.1 exact placeholder override list drifted");
includesAll(section(release141, "instance_component_changes"), [
  'schema = "1.0"',
  'target_interfaces = ["agent-carry.instance-component@1"]',
  'optional_incompatible_action = "disable-and-preserve"',
  'required_incompatible_action = "stop-and-preserve"',
  'ordinary_startup = "never-read-registry-enumerate-components-or-load-component-bodies"',
], "1.4.1 instance component continuity");
includesAll(section(release141, "release_boundary"), [
  'status = "published-release"',
  'release_ref = "v1.4.1"',
  "publication_authorized = true",
  "repository_operation_authorized = true",
  "instance_replacement_authorized = true",
  "future_publication_or_repository_operation_authorized = false",
  'authority_requires = ["official-fixed-tag-v1.4.1", "official-release-object-v1.4.1", "manifest-and-extracted-tree-match-the-fixed-tag", "user-explicitly-authorized-this-upgrade"]',
  'authority_scope = "this-fixed-release-may-be-used-for-instance-replacement; never-authorizes-future-repository-release-or-publication-actions"',
], "1.4.1 release boundary");
expect(!release141.includes('status = "local-unreleased-candidate"'), "1.4.1 still declares itself a local unreleased candidate");

const schema = read("core/schemas/release-manifest.schema.md");
includesAll(schema, [
  "`allow_overrides_deny_for_exact_paths`",
  "只允许清单逐字列出的普通零字节文件",
  "`status=published-release`",
  "不能授权未来的提交、推送、标签、Release 或 Pages",
  "`instance_component_changes`",
  "未登记组件目录原样保留并进入冲突",
], "release manifest Schema");

const guide121 = read("core/upgrade/upgrade-1.2.1-to-1.3.1.md");
includesAll(guide121, ["1.2.1 → 1.3.1", "正式发布", "隔离副本", "逐路径", "第二次", "回滚", "generated_at"], "1.2.1 patch upgrade guide");
const guide130 = read("core/upgrade/upgrade-1.3.0-to-1.3.1.md");
includesAll(guide130, ["1.3.0 → 1.3.1", "发布 authority", "零字节", "不重新迁移", "隔离副本"], "1.3.0 patch upgrade guide");
const guide140 = read("core/upgrade/upgrade-1.3.1-to-1.4.0.md");
includesAll(guide140, ["1.3.1 → 1.4.0", "正式迁移规则", "固定 `v1.4.0`", "一次性纳管", "不扫描整台电脑", "可选组件", "必需组件", "第二次执行零变化", "用户真实验收"], "1.3.1 release upgrade guide");
const guide141 = read("core/upgrade/upgrade-1.4.0-to-1.4.1.md");
includesAll(guide141, ["1.4.0 → 1.4.1", "首次实例化闭包补丁", "固定 `v1.4.1`", "尚未实例化的空模板", "已经实例化的助手", "created_from", "不重新执行首次实例化", "private_collection_refs", "绝对设备本地路径", "逐路径、逐字节保留", "日常容错和正式升级是两条不同路线", "最多自动修复一次", "只暂停相关学习／信号能力", "第二次执行不产生"], "1.4.0 patch upgrade guide");
includesAll(read("core/guides/upgrade-guide.md"), ["当前官方正式目标是 1.4.1", "release-manifest-1.3.1.toml", "upgrade-1.2.1-to-1.3.1.md", "upgrade-1.3.0-to-1.3.1.md", "release-manifest-1.4.0.toml", "upgrade-1.3.1-to-1.4.0.md", "release-manifest-1.4.1.toml", "upgrade-1.4.0-to-1.4.1.md", "不授权任何未来提交"], "current upgrade guide");

includesAll(read("assistant.toml"), ['product_version = "1.4.1"', 'core_version = "1.4.1"', 'release_manifest = "core/upgrade/release-manifest-1.4.1.toml"'], "assistant authority");
includesAll(read("core/manifest.toml"), ['version = "1.4.1"', 'instance_component_schema = "1.0"'], "core authority");
includesAll(read("instance/manifest.toml"), ['created_from = "agent-carry@1.4.1"', 'product = "1.4.1"'], "template instance authority");
includesAll(read("dashboard/package.json"), ['"version": "1.4.1"', '"check:instance-components": "node scripts/validate-instance-component-contract.mjs"', '"check:release-authority": "node scripts/validate-release-authority.mjs"', "npm run check:instance-components", "npm run check:release-authority"], "Dashboard package authority");
includesAll(read("dashboard/package-lock.json"), ['"version": "1.4.1"'], "Dashboard lock authority");

const instanceManifestBytes = bytes("instance/manifest.toml");
const startupCapsule = read("instance/startup-capsule.toml");
includesAll(startupCapsule, [
  `source_manifest_digest = "sha256:${sha256(instanceManifestBytes)}"`,
  'product_version = "1.4.1"',
], "template startup capsule");

console.log("Release authority validation passed for immutable 1.3.0, 1.3.1 and 1.4.0 history plus the 1.4.1 conditional fixed-release boundary.");
