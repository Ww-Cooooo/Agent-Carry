import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const immutable130Digest = "836b755de7593c3da0bf1687dd6da21adb7587b69555d7b64628f827ef6200d7";
const immutable131Digest = "00950088bc548592c5faaffe022f1022989a1ca1bd7ed4e60b049f2d746020c1";
const immutable140Digest = "a8ee3f4a113c0f958f6979e3d2abd14e8c087f3b919b6f76118203b9015fde91";
const immutable141Digest = "92e8254f94da230cfca8ab4c18e0ef1a047e056d44c8be5f0433e05bf344c56d";
const immutable142Digest = "c123edf004b30a819a9c68b01452c8c7a166efb77dbe851388ad4b4c5a66fce4";
const immutable143Digest = "e069e33e86d5485e7a12f13651bba3de88ff5453966e3795206e726c24233f71";
const immutable144Digest = "b2e63ff9ea08cb8fddc37ecee6f0f72c116b74c887bba9225d41dbbe50bbae6b";
const immutable146Digest = "45688bbdd2bdf6ecb00ae9712101cc3b6cff0a8cc570981e0613d309c760a6fb";
const immutable147Digest = "c3d6039afda6842ea3c8360e5b37f17efb4c70c02a59e7812526f3c236831c09";
const immutable148Digest = "2d49f5afb66b0782fc0279549caff0ef0fb106f54f27740f773fd9a70e57671e";
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

const release141Bytes = bytes("core/upgrade/release-manifest-1.4.1.toml");
expect(sha256(release141Bytes) === immutable141Digest, "published 1.4.1 manifest was rewritten by the 1.4.2 patch");
const release141 = release141Bytes.toString("utf8").replaceAll("\r\n", "\n");
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

const release142Bytes = bytes("core/upgrade/release-manifest-1.4.2.toml");
expect(sha256(release142Bytes) === immutable142Digest, "published 1.4.2 manifest was rewritten by the 1.4.3 release");
const release142 = release142Bytes.toString("utf8").replaceAll("\r\n", "\n");
includesAll(release142, [
  "schema_version = 2",
  'release = "1.4.2"',
  'core = "1.4.2"',
  'from_versions = ["1.4.1"]',
  'id = "receipt-and-guidance-continuity-1.4.2"',
  '"published-1.4.1-manifest-remains-byte-immutable"',
  '"actual-use-receipt-has-stable-brain-heading-and-requires-body-impact"',
  '"learning-receipt-has-stable-sprout-heading-finding-status-and-future-use-icons"',
  '"receipts-precede-the-final-localized-user-action-guidance"',
  '"uninstantiated-1.4.1-template-upgrades-to-byte-exact-blank-1.4.2"',
  '"instantiated-1.4.1-identity-assets-validation-evolution-components-extensions-workspace-local-and-private-state-are-byte-preserved"',
  '"patch-upgrade-faults-restore-complete-source-and-second-run-makes-no-change"',
], "1.4.2 release manifest");
const release142TargetSelection = section(release142, "target_selection");
includesAll(release142TargetSelection, [
  'forbidden_segments = [".git", "node_modules", ".cache", ".vite", ".turbo", "coverage", "tmp", "temp", "maintainer-private", ".assistant-private", ".assistant-local"]',
  'exact_override_policy = "only-listed-regular-zero-byte-files-may-override-forbidden-segments; directory-records-are-container-metadata-not-files"',
], "1.4.2 target selection");
const release142OverrideMatch = release142TargetSelection.match(/^allow_overrides_deny_for_exact_paths\s*=\s*(\[[^\n]*\])$/mu);
expect(release142OverrideMatch, "1.4.2 exact placeholder override list is missing");
expect(JSON.stringify(JSON.parse(release142OverrideMatch[1])) === JSON.stringify(exactPlaceholders), "1.4.2 exact placeholder override list drifted");
includesAll(section(release142, "instance_component_changes"), [
  'schema = "1.0"',
  'target_interfaces = ["agent-carry.instance-component@1"]',
  'optional_incompatible_action = "disable-and-preserve"',
  'required_incompatible_action = "stop-and-preserve"',
  'ordinary_startup = "never-read-registry-enumerate-components-or-load-component-bodies"',
], "1.4.2 instance component continuity");
includesAll(section(release142, "release_boundary"), [
  'status = "published-release"',
  'release_ref = "v1.4.2"',
  "publication_authorized = true",
  "repository_operation_authorized = true",
  "instance_replacement_authorized = true",
  "future_publication_or_repository_operation_authorized = false",
  'authority_requires = ["official-fixed-tag-v1.4.2", "official-release-object-v1.4.2", "manifest-and-extracted-tree-match-the-fixed-tag", "user-explicitly-authorized-this-upgrade"]',
  'authority_scope = "this-fixed-release-may-be-used-for-instance-replacement; never-authorizes-future-repository-release-or-publication-actions"',
], "1.4.2 release boundary");
expect(!release142.includes('status = "local-unreleased-candidate"'), "1.4.2 still declares itself a local unreleased candidate");

const release143Bytes = bytes("core/upgrade/release-manifest-1.4.3.toml");
expect(sha256(release143Bytes) === immutable143Digest, "published 1.4.3 manifest was rewritten by the 1.4.4 release");
const release143 = release143Bytes.toString("utf8").replaceAll("\r\n", "\n");
includesAll(release143, [
  "schema_version = 2",
  'release = "1.4.3"',
  'core = "1.4.3"',
  'from_versions = ["1.4.2"]',
  'id = "upgrade-session-activation-1.4.3"',
  '"source-files-switch-session-and-behavior-states-are-distinct"',
  '"old-running-session-cannot-report-complete-after-only-file-change"',
  '"one-behavior-failure-keeps-valid-instance-and-unrelated-capabilities-usable"',
  '"invalid-switched-startup-requires-only-the-existing-file-transaction-rollback"',
  '"final-user-guidance-returns-to-the-next-unfinished-overall-goal-action"',
  '"uninstantiated-1.4.2-template-upgrades-to-byte-exact-blank-1.4.3"',
  '"instantiated-1.4.2-identity-assets-validation-evolution-components-extensions-workspace-local-and-private-state-are-byte-preserved"',
], "1.4.3 published manifest");
const release143TargetSelection = section(release143, "target_selection");
includesAll(release143TargetSelection, [
  'forbidden_segments = [".git", "node_modules", ".cache", ".vite", ".turbo", "coverage", "tmp", "temp", "maintainer-private", ".assistant-private", ".assistant-local"]',
  'exact_override_policy = "only-listed-regular-zero-byte-files-may-override-forbidden-segments; directory-records-are-container-metadata-not-files"',
], "1.4.3 target selection");
const release143OverrideMatch = release143TargetSelection.match(/^allow_overrides_deny_for_exact_paths\s*=\s*(\[[^\n]*\])$/mu);
expect(release143OverrideMatch, "1.4.3 exact placeholder override list is missing");
expect(JSON.stringify(JSON.parse(release143OverrideMatch[1])) === JSON.stringify(exactPlaceholders), "1.4.3 exact placeholder override list drifted");
includesAll(section(release143, "instance_component_changes"), [
  'schema = "1.0"',
  'target_interfaces = ["agent-carry.instance-component@1"]',
  'optional_incompatible_action = "disable-and-preserve"',
  'required_incompatible_action = "stop-and-preserve"',
  'ordinary_startup = "never-read-registry-enumerate-components-or-load-component-bodies"',
], "1.4.3 instance component continuity");
includesAll(section(release143, "release_boundary"), [
  'status = "published-release"',
  'release_ref = "v1.4.3"',
  "publication_authorized = true",
  "repository_operation_authorized = true",
  "instance_replacement_authorized = true",
  "future_publication_or_repository_operation_authorized = false",
  'authority_requires = ["official-fixed-tag-v1.4.3", "official-release-object-v1.4.3", "manifest-and-extracted-tree-match-the-fixed-tag", "user-explicitly-authorized-this-upgrade"]',
  'authority_scope = "this-fixed-release-may-be-used-for-instance-replacement; never-authorizes-future-repository-release-or-publication-actions"',
], "1.4.3 release boundary");
expect(!release143.includes('status = "local-unreleased-candidate"'), "1.4.3 still declares itself a local unreleased candidate");

const release144Bytes = bytes("core/upgrade/release-manifest-1.4.4.toml");
expect(sha256(release144Bytes) === immutable144Digest, "published 1.4.4 manifest was rewritten by the 1.4.5 release");
const release144 = release144Bytes.toString("utf8").replaceAll("\r\n", "\n");
includesAll(release144, [
  "schema_version = 2",
  'release = "1.4.4"',
  'core = "1.4.4"',
  'from_versions = ["1.4.3"]',
  'id = "skill-workshop-1.4.4"',
  'skill_overlap_note = "instance/skills/** is instance-owned and preserved.',
  '"skill-workshop-recommendations-are-advisory-and-non-persistent"',
  '"only-the-user-selected-formal-method-enters-an-isolated-local-draft"',
  '"source-asset-remains-byte-unchanged-during-export"',
  '"shared-skill-inspection-is-read-only-and-never-executes-scripts-or-installs-dependencies"',
  '"ready-review-and-isolated-results-are-contained-to-the-current-package"',
  '"blank-1.4.4-template-has-zero-export-index-zero-generated-packages-and-zero-installed-skills"',
  '"uninstantiated-1.4.3-template-upgrades-to-byte-exact-blank-1.4.4"',
  '"instantiated-1.4.3-identity-assets-validation-evolution-components-extensions-workspace-local-private-skill-requirements-and-exports-are-byte-preserved"',
], "1.4.4 published manifest");
const release144TargetSelection = section(release144, "target_selection");
includesAll(release144TargetSelection, [
  'forbidden_segments = [".git", "node_modules", ".cache", ".vite", ".turbo", "coverage", "tmp", "temp", "maintainer-private", ".assistant-private", ".assistant-local"]',
  'exact_override_policy = "only-listed-regular-zero-byte-files-may-override-forbidden-segments; directory-records-are-container-metadata-not-files"',
], "1.4.4 target selection");
const release144OverrideMatch = release144TargetSelection.match(/^allow_overrides_deny_for_exact_paths\s*=\s*(\[[^\n]*\])$/mu);
expect(release144OverrideMatch, "1.4.4 exact placeholder override list is missing");
expect(JSON.stringify(JSON.parse(release144OverrideMatch[1])) === JSON.stringify(exactPlaceholders), "1.4.4 exact placeholder override list drifted");
includesAll(section(release144, "instance_component_changes"), [
  'schema = "1.0"',
  'target_interfaces = ["agent-carry.instance-component@1"]',
  'optional_incompatible_action = "disable-and-preserve"',
  'required_incompatible_action = "stop-and-preserve"',
  'ordinary_startup = "never-read-registry-enumerate-components-or-load-component-bodies"',
], "1.4.4 instance component continuity");
includesAll(section(release144, "release_boundary"), [
  'status = "published-release"',
  'release_ref = "v1.4.4"',
  "publication_authorized = true",
  "repository_operation_authorized = true",
  "instance_replacement_authorized = true",
  "future_publication_or_repository_operation_authorized = false",
  'authority_requires = ["official-fixed-tag-v1.4.4", "official-release-object-v1.4.4", "manifest-and-extracted-tree-match-the-fixed-tag", "user-explicitly-authorized-this-upgrade"]',
  'authority_scope = "this-fixed-release-may-be-used-for-instance-replacement; never-authorizes-future-repository-release-or-publication-actions"',
], "1.4.4 release boundary");
expect(!release144.includes('status = "local-unreleased-candidate"'), "1.4.4 still declares itself a local unreleased candidate");

const release145Bytes = bytes("core/upgrade/release-manifest-1.4.5.toml");
const release145 = release145Bytes.toString("utf8").replaceAll("\r\n", "\n");
expect(sha256(release145Bytes) === "1a838c332efae04aed88648f4db4a8c5035f7a1bb538bf0f332198ff0decd2fb",
  "published 1.4.5 manifest was rewritten by the 1.4.6 release");
includesAll(release145, [
  "schema_version = 2",
  'release = "1.4.5"',
  'core = "1.4.5"',
  'from_versions = ["1.4.4"]',
  'id = "long-session-upgrade-continuity-1.4.5"',
  '"long-conversation-compares-agent-carry-version-instance-id-and-manifest-digest-before-each-new-substantive-goal"',
  '"same-goal-consecutive-replies-and-unchanged-baselines-load-no-upgrade-body"',
  '"host-product-version-is-never-used-as-agent-carry-product-version"',
  '"ordinary-file-reread-cannot-impersonate-adoption"',
  '"validated-current-session-reentry-requires-safe-boundary-strict-entry-minimum-rule-load-host-conflict-check-and-automatic-behavior-acceptance"',
  '"agent-not-user-runs-one-non-destructive-representative-behavior"',
  '"immutable-host-block-keeps-only-affected-behavior-pending-and-new-run-is-last-fallback"',
  '"uninstantiated-1.4.4-template-upgrades-to-byte-exact-blank-1.4.5"',
  '"instantiated-1.4.4-identity-assets-validation-evolution-components-extensions-workspace-local-private-skill-requirements-exports-and-unknown-fields-are-byte-preserved"',
], "1.4.5 published manifest");
const release145TargetSelection = section(release145, "target_selection");
includesAll(release145TargetSelection, [
  'forbidden_segments = [".git", "node_modules", ".cache", ".vite", ".turbo", "coverage", "tmp", "temp", "maintainer-private", ".assistant-private", ".assistant-local"]',
  'exact_override_policy = "only-listed-regular-zero-byte-files-may-override-forbidden-segments; directory-records-are-container-metadata-not-files"',
], "1.4.5 target selection");
const release145OverrideMatch = release145TargetSelection.match(/^allow_overrides_deny_for_exact_paths\s*=\s*(\[[^\n]*\])$/mu);
expect(release145OverrideMatch, "1.4.5 exact placeholder override list is missing");
expect(JSON.stringify(JSON.parse(release145OverrideMatch[1])) === JSON.stringify(exactPlaceholders), "1.4.5 exact placeholder override list drifted");
includesAll(section(release145, "instance_component_changes"), [
  'schema = "1.0"',
  'target_interfaces = ["agent-carry.instance-component@1"]',
  'optional_incompatible_action = "disable-and-preserve"',
  'required_incompatible_action = "stop-and-preserve"',
  'ordinary_startup = "never-read-registry-enumerate-components-or-load-component-bodies"',
], "1.4.5 instance component continuity");
includesAll(section(release145, "release_boundary"), [
  'status = "published-release"',
  'release_ref = "v1.4.5"',
  "publication_authorized = true",
  "repository_operation_authorized = true",
  "instance_replacement_authorized = true",
  "future_publication_or_repository_operation_authorized = false",
  'authority_requires = ["official-fixed-tag-v1.4.5", "official-release-object-v1.4.5", "manifest-and-extracted-tree-match-the-fixed-tag", "user-explicitly-authorized-this-upgrade"]',
  'authority_scope = "this-fixed-release-may-be-used-for-instance-replacement; never-authorizes-future-repository-release-or-publication-actions"',
], "1.4.5 release boundary");
expect(!release145.includes('status = "local-unreleased-candidate"'), "1.4.5 still declares itself a local unreleased candidate");

const release146Bytes = bytes("core/upgrade/release-manifest-1.4.6.toml");
expect(sha256(release146Bytes) === immutable146Digest, "published 1.4.6 manifest was rewritten by the 1.4.7 release");
const release146 = release146Bytes.toString("utf8").replaceAll("\r\n", "\n");
includesAll(release146, [
  "schema_version = 2",
  'release = "1.4.6"',
  'core = "1.4.6"',
  'from_versions = ["1.4.5"]',
  'id = "skill-workshop-delivery-1.4.6"',
  "missing delivery fields remain valid and no carrier is created during upgrade",
  '"legacy-draft-review-and-ready-without-delivery-fields-project-as-needs-finishing-review-and-sharing-method-needed-without-source-writes"',
  '"new-zip-and-folder-carriers-round-trip-through-the-bounded-inspector"',
  '"zip-traversal-link-encryption-overflow-crc-and-duplicate-path-faults-remain-local-to-one-package"',
  '"changed-editable-source-or-missing-carrier-projects-stale-without-deleting-old-artifacts-or-blocking-snapshot"',
], "1.4.6 published manifest");
const release146TargetSelection = section(release146, "target_selection");
includesAll(release146TargetSelection, [
  'forbidden_segments = [".git", "node_modules", ".cache", ".vite", ".turbo", "coverage", "tmp", "temp", "maintainer-private", ".assistant-private", ".assistant-local"]',
  'exact_override_policy = "only-listed-regular-zero-byte-files-may-override-forbidden-segments; directory-records-are-container-metadata-not-files"',
], "1.4.6 target selection");
const release146OverrideMatch = release146TargetSelection.match(/^allow_overrides_deny_for_exact_paths\s*=\s*(\[[^\n]*\])$/mu);
expect(release146OverrideMatch, "1.4.6 exact placeholder override list is missing");
expect(JSON.stringify(JSON.parse(release146OverrideMatch[1])) === JSON.stringify(exactPlaceholders), "1.4.6 exact placeholder override list drifted");
includesAll(section(release146, "instance_component_changes"), [
  'schema = "1.0"',
  'target_interfaces = ["agent-carry.instance-component@1"]',
  'optional_incompatible_action = "disable-and-preserve"',
  'required_incompatible_action = "stop-and-preserve"',
  'ordinary_startup = "never-read-registry-enumerate-components-or-load-component-bodies"',
], "1.4.6 instance component continuity");
includesAll(section(release146, "release_boundary"), [
  'status = "published-release"',
  'release_ref = "v1.4.6"',
  "publication_authorized = true",
  "repository_operation_authorized = true",
  "instance_replacement_authorized = true",
  "future_publication_or_repository_operation_authorized = false",
  'authority_requires = ["official-fixed-tag-v1.4.6", "official-release-object-v1.4.6", "manifest-and-extracted-tree-match-the-fixed-tag", "user-explicitly-authorized-this-upgrade"]',
  'authority_scope = "this-fixed-release-may-be-used-for-instance-replacement; never-authorizes-future-repository-release-or-publication-actions"',
], "1.4.6 release boundary");
expect(!release146.includes('status = "local-unreleased-candidate"'), "1.4.6 still declares itself a local unreleased candidate");

const release147Bytes = bytes("core/upgrade/release-manifest-1.4.7.toml");
expect(sha256(release147Bytes) === immutable147Digest, "published 1.4.7 manifest was rewritten by the 1.4.8 release");
const release147 = release147Bytes.toString("utf8").replaceAll("\r\n", "\n");
includesAll(release147, [
  "schema_version = 2",
  'release = "1.4.7"',
  'core = "1.4.7"',
  'from_versions = ["1.4.6"]',
  'id = "task-closeout-continuity-1.4.7"',
  "task closeout input and output are not persisted by upgrade",
  '"task-closeout-incident-omission-repairs-only-the-final-reply"',
  '"simple-task-adds-no-empty-use-learning-or-file-receipts"',
  '"malformed-or-oversized-closeout-input-degrades-locally-and-business-result-remains-deliverable"',
  '"instantiated-1.4.6-identity-assets-validation-evolution-components-extensions-workspace-local-private-skills-exports-carriers-task-handoffs-and-unknown-fields-are-byte-preserved"',
], "1.4.7 published manifest");
const release147TargetSelection = section(release147, "target_selection");
includesAll(release147TargetSelection, [
  'forbidden_segments = [".git", "node_modules", ".cache", ".vite", ".turbo", "coverage", "tmp", "temp", "maintainer-private", ".assistant-private", ".assistant-local"]',
  'exact_override_policy = "only-listed-regular-zero-byte-files-may-override-forbidden-segments; directory-records-are-container-metadata-not-files"',
], "1.4.7 target selection");
const release147OverrideMatch = release147TargetSelection.match(/^allow_overrides_deny_for_exact_paths\s*=\s*(\[[^\n]*\])$/mu);
expect(release147OverrideMatch, "1.4.7 exact placeholder override list is missing");
expect(JSON.stringify(JSON.parse(release147OverrideMatch[1])) === JSON.stringify(exactPlaceholders), "1.4.7 exact placeholder override list drifted");
includesAll(section(release147, "instance_component_changes"), [
  'schema = "1.0"',
  'target_interfaces = ["agent-carry.instance-component@1"]',
  'optional_incompatible_action = "disable-and-preserve"',
  'required_incompatible_action = "stop-and-preserve"',
  'ordinary_startup = "never-read-registry-enumerate-components-or-load-component-bodies"',
], "1.4.7 instance component continuity");
includesAll(section(release147, "release_boundary"), [
  'status = "published-release"',
  'release_ref = "v1.4.7"',
  "publication_authorized = true",
  "repository_operation_authorized = true",
  "instance_replacement_authorized = true",
  "future_publication_or_repository_operation_authorized = false",
  'authority_requires = ["official-fixed-tag-v1.4.7", "official-release-object-v1.4.7", "manifest-and-extracted-tree-match-the-fixed-tag", "user-explicitly-authorized-this-upgrade"]',
  'authority_scope = "this-fixed-release-may-be-used-for-instance-replacement; never-authorizes-future-repository-release-or-publication-actions"',
], "1.4.7 release boundary");
expect(!release147.includes('status = "local-unreleased-candidate"'), "1.4.7 still declares itself a local unreleased candidate");

const release148Bytes = bytes("core/upgrade/release-manifest-1.4.8.toml");
expect(sha256(release148Bytes) === immutable148Digest, "published 1.4.8 manifest was rewritten by the 1.4.9 candidate");
const release148 = release148Bytes.toString("utf8").replaceAll("\r\n", "\n");
includesAll(release148, [
  "schema_version = 2",
  'release = "1.4.8"',
  'core = "1.4.8"',
  'from_versions = ["1.4.7"]',
  'id = "deterministic-user-journeys-1.4.8"',
  "upgrade does not create a first-instantiation request learning preview Skill preview or operational receipt",
  '"first-instantiation-transaction-closes-all-identity-files-and-rolls-back-one-injected-fault"',
  '"shared-skill-preview-is-source-digest-target-bound-and-one-confirmation-installs-registers-without-executing-package-code"',
  '"unchecked-state-remains-not-checked-and-is-never-reported-as-absent"',
  '"instantiated-1.4.7-identity-assets-validation-evolution-components-extensions-workspace-local-private-skills-exports-carriers-task-handoffs-and-unknown-fields-are-byte-preserved"',
], "1.4.8 published manifest");
const release148TargetSelection = section(release148, "target_selection");
includesAll(release148TargetSelection, [
  'forbidden_segments = [".git", "node_modules", ".cache", ".vite", ".turbo", "coverage", "tmp", "temp", "maintainer-private", ".assistant-private", ".assistant-local"]',
  'exact_override_policy = "only-listed-regular-zero-byte-files-may-override-forbidden-segments; directory-records-are-container-metadata-not-files"',
], "1.4.8 target selection");
const release148OverrideMatch = release148TargetSelection.match(/^allow_overrides_deny_for_exact_paths\s*=\s*(\[[^\n]*\])$/mu);
expect(release148OverrideMatch, "1.4.8 exact placeholder override list is missing");
expect(JSON.stringify(JSON.parse(release148OverrideMatch[1])) === JSON.stringify(exactPlaceholders), "1.4.8 exact placeholder override list drifted");
includesAll(section(release148, "instance_component_changes"), [
  'schema = "1.0"',
  'target_interfaces = ["agent-carry.instance-component@1"]',
  'optional_incompatible_action = "disable-and-preserve"',
  'required_incompatible_action = "stop-and-preserve"',
  'ordinary_startup = "never-read-registry-enumerate-components-or-load-component-bodies"',
], "1.4.8 instance component continuity");
includesAll(section(release148, "release_boundary"), [
  'status = "published-release"',
  'release_ref = "v1.4.8"',
  "publication_authorized = true",
  "repository_operation_authorized = true",
  "instance_replacement_authorized = true",
  "future_publication_or_repository_operation_authorized = false",
  'authority_requires = ["official-fixed-tag-v1.4.8", "official-release-object-v1.4.8", "manifest-and-extracted-tree-match-the-fixed-tag", "user-explicitly-authorized-this-upgrade"]',
  'authority_scope = "this-fixed-release-may-be-used-for-instance-replacement; never-authorizes-future-repository-release-or-publication-actions"',
], "1.4.8 release boundary");
expect(!release148.includes('status = "local-unreleased-candidate"'), "1.4.8 still declares itself a local unreleased candidate");

const release149 = read("core/upgrade/release-manifest-1.4.9.toml");
includesAll(release149, [
  "schema_version = 2",
  'release = "1.4.9"',
  'core = "1.4.9"',
  'from_versions = ["1.4.8"]',
  'id = "skill-upgrade-and-problem-report-1.4.9"',
  '"published-1.4.8-manifest-remains-byte-immutable"',
  '"explicit-higher-version-same-skill-preview-lists-bounded-added-changed-and-removed-paths"',
  '"same-skill-upgrade-preserves-old-preimage-installs-registers-and-reads-back-without-executing-package-code"',
  '"same-version-byte-drift-downgrade-local-drift-ambiguous-legacy-identity-and-unsafe-package-remain-local-to-one-skill"',
  '"problem-report-action-starts-from-earliest-user-observed-problem-and-does-not-require-hidden-logs-or-a-new-conversation"',
  '"problem-report-treats-input-as-untrusted-masks-sensitive-material-separates-facts-inference-and-missing-evidence-and-never-auto-sends"',
  '"instantiated-1.4.8-identity-assets-validation-evolution-components-extensions-workspace-local-private-skills-requirements-exports-editable-sources-carriers-problem-reports-task-handoffs-and-unknown-fields-are-byte-preserved"',
], "1.4.9 local candidate manifest");
const release149TargetSelection = section(release149, "target_selection");
includesAll(release149TargetSelection, [
  'forbidden_segments = [".git", "node_modules", ".cache", ".vite", ".turbo", "coverage", "tmp", "temp", "maintainer-private", ".assistant-private", ".assistant-local"]',
  'exact_override_policy = "only-listed-regular-zero-byte-files-may-override-forbidden-segments; directory-records-are-container-metadata-not-files"',
], "1.4.9 target selection");
const release149OverrideMatch = release149TargetSelection.match(/^allow_overrides_deny_for_exact_paths\s*=\s*(\[[^\n]*\])$/mu);
expect(release149OverrideMatch, "1.4.9 exact placeholder override list is missing");
expect(JSON.stringify(JSON.parse(release149OverrideMatch[1])) === JSON.stringify(exactPlaceholders), "1.4.9 exact placeholder override list drifted");
includesAll(section(release149, "instance_component_changes"), [
  'schema = "1.0"',
  'target_interfaces = ["agent-carry.instance-component@1"]',
  'optional_incompatible_action = "disable-and-preserve"',
  'required_incompatible_action = "stop-and-preserve"',
  'ordinary_startup = "never-read-registry-enumerate-components-or-load-component-bodies"',
], "1.4.9 instance component continuity");
includesAll(section(release149, "release_boundary"), [
  'status = "local-unreleased-candidate"',
  'release_ref = "v1.4.9"',
  "publication_authorized = false",
  "repository_operation_authorized = false",
  "instance_replacement_authorized = false",
  "future_publication_or_repository_operation_authorized = false",
], "1.4.9 local candidate boundary");
expect(!release149.includes('status = "published-release"'), "1.4.9 local candidate falsely declares a published release");

const release200 = read("core/upgrade/release-manifest-2.0.0.toml");
includesAll(release200, [
  "schema_version = 2",
  'release = "2.0.0"',
  'core = "2.0.0"',
  'from_versions = ["1.4.8", "1.4.9"]',
  'id = "agent-carry-to-ai-carry-product-identity-2.0.0"',
  '"blank-2.0.0-template-remains-empty-and-writes-only-ai-carry-current-identities"',
  '"legacy-component-record-types-and-agent-carry-interface-remain-compatible-while-new-components-use-ai-carry-interface"',
  '"every-agent-carry-residual-is-classified-per-match-as-history-compatibility-alias-or-current-legacy-repository-url"',
  '"published-2.0.0-authority-requires-latest-release-versioned-release-lightweight-tag-public-main-matching-tree-and-user-authorization"',
  '"published-release-still-authorizes-no-future-publication-repository-operation-or-repository-rename"',
  '"large-workspace-bodies-are-not-enumerated-or-copied"',
  '"generic-session-json-never-self-attests-session-or-behavior"',
  '"host-waits-for-an-independent-user-confirmation-before-confirm"',
  'already_current_authority = "a local version string never proves current status;',
  'copied_target_closure = "confirm must re-hash the isolated copied target',
  'staging_recovery = "each same-directory staging file is recorded before copy',
  'network_reporting = "prepare confirm and same-version official checks report network use truthfully"',
  'windows_metadata_closure = "touched hardlinks named streams and failures to enumerate either are review-required',
  'New Pages output requires the current AI Carry product name and current AI_CARRY envelope',
], "2.0.0 published rename manifest");
const release200TargetSelection = section(release200, "target_selection");
includesAll(release200TargetSelection, [
  'forbidden_segments = [".git", "node_modules", ".cache", ".vite", ".turbo", "coverage", "tmp", "temp", "maintainer-private", ".assistant-private", ".assistant-local"]',
  'exact_override_policy = "only-listed-regular-zero-byte-files-may-override-forbidden-segments; directory-records-are-container-metadata-not-files"',
], "2.0.0 target selection");
const release200OverrideMatch = release200TargetSelection.match(/^allow_overrides_deny_for_exact_paths\s*=\s*(\[[^\n]*\])$/mu);
expect(release200OverrideMatch, "2.0.0 exact placeholder override list is missing");
expect(JSON.stringify(JSON.parse(release200OverrideMatch[1])) === JSON.stringify(exactPlaceholders), "2.0.0 exact placeholder override list drifted");
includesAll(section(release200, "instance_component_changes"), [
  'schema = "1.0"',
  'target_interfaces = ["ai-carry.instance-component@1", "agent-carry.instance-component@1"]',
  'migration_ids = ["product-identity-agent-carry-to-ai-carry-2.0"]',
  'optional_incompatible_action = "disable-and-preserve"',
  'required_incompatible_action = "stop-and-preserve"',
  'ordinary_startup = "never-read-registry-enumerate-components-or-load-component-bodies"',
], "2.0.0 instance component continuity");
includesAll(section(release200, "release_boundary"), [
  'status = "published-release"',
  'release_ref = "v2.0.0"',
  "publication_authorized = true",
  "repository_operation_authorized = true",
  "instance_replacement_authorized = true",
  "future_publication_or_repository_operation_authorized = false",
  'authority_requires = ["official-latest-release-is-v2.0.0", "official-release-object-v2.0.0", "official-lightweight-tag-v2.0.0", "official-public-main-equals-v2.0.0-tag", "manifest-and-extracted-tree-match-the-fixed-tag", "user-explicitly-authorized-this-upgrade"]',
  'authority_scope = "this-fixed-release-may-be-used-for-instance-replacement; never-authorizes-future-repository-release-publication-or-rename-actions"',
], "2.0.0 release boundary");
expect(!release200.includes('status = "local-unreleased-candidate"'), "2.0.0 still declares itself a local unreleased candidate");

const release201 = read("core/upgrade/release-manifest-2.0.1.toml");
includesAll(release201, [
  "schema_version = 2",
  'release = "2.0.1"',
  'core = "2.0.1"',
  'from_versions = ["1.4.8", "1.4.9", "2.0.0"]',
  'id = "stable-upgrade-confirmation-authority-2.0.1"',
  'stable_authority_fingerprint = "same authoritative facts with different verified_at values must produce the same fingerprint',
  'real_authority_drift = "Release ID commit public main Git tree target tree target file count or release manifest drift must change the fingerprint',
  'request_budget = "one live verification uses exactly six bounded GitHub API requests; prepare plus confirm uses at most twelve',
  'network_failure = "HTTP 403 timeout or other live verification failure writes neither source nor target',
  '"different-observation-times-with-identical-authoritative-facts-produce-one-confirmation-reference"',
  '"real-release-tag-tree-target-manifest-or-source-drift-rejects-the-old-reference"',
  '"network-403-or-timeout-writes-nothing-and-keeps-the-old-instance-usable"',
  '"generic-session-json-never-self-attests-session-or-behavior"',
], "2.0.1 stable upgrade authority manifest");
const release201TargetSelection = section(release201, "target_selection");
includesAll(release201TargetSelection, [
  'forbidden_segments = [".git", "node_modules", ".cache", ".vite", ".turbo", "coverage", "tmp", "temp", "maintainer-private", ".assistant-private", ".assistant-local"]',
  'exact_override_policy = "only-listed-regular-zero-byte-files-may-override-forbidden-segments; directory-records-are-container-metadata-not-files"',
], "2.0.1 target selection");
const release201OverrideMatch = release201TargetSelection.match(/^allow_overrides_deny_for_exact_paths\s*=\s*(\[[^\n]*\])$/mu);
expect(release201OverrideMatch, "2.0.1 exact placeholder override list is missing");
expect(JSON.stringify(JSON.parse(release201OverrideMatch[1])) === JSON.stringify(exactPlaceholders), "2.0.1 exact placeholder override list drifted");
includesAll(section(release201, "release_boundary"), [
  'status = "published-release"',
  'release_ref = "v2.0.1"',
  "publication_authorized = true",
  "repository_operation_authorized = true",
  "instance_replacement_authorized = true",
  "future_publication_or_repository_operation_authorized = false",
  'authority_requires = ["official-latest-release-is-v2.0.1", "official-release-object-v2.0.1", "official-lightweight-tag-v2.0.1", "official-public-main-equals-v2.0.1-tag", "manifest-and-extracted-tree-match-the-fixed-tag", "user-explicitly-authorized-this-upgrade"]',
], "2.0.1 release boundary");
expect(!release201.includes('status = "local-unreleased-candidate"'), "2.0.1 still declares itself a local unreleased candidate");

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
const guide142 = read("core/upgrade/upgrade-1.4.1-to-1.4.2.md");
includesAll(guide142, ["1.4.1 → 1.4.2", "固定 `v1.4.2`", "使用回执", "学习回执", "用户行动建议", "不改变 Asset Schema", "保持空白", "逐路径逐字节保留", "第二次执行零变化", "恢复完整 1.4.1 前像"], "1.4.2 patch upgrade guide");
const guide143 = read("core/upgrade/upgrade-1.4.2-to-1.4.3.md");
includesAll(guide143, ["1.4.2 → 1.4.3", "正式发布", "固定 `v1.4.3`", "来源已经核对", "文件已经安装", "当前宿主会话", "代表行为", "不回滚已经验证", "普通对话、只读能力", "总体目标中的下一项未完成工作"], "1.4.3 patch upgrade guide");
const guide144 = read("core/upgrade/upgrade-1.4.3-to-1.4.4.md");
includesAll(guide144, ["1.4.3 → 1.4.4", "Skill 工坊", "固定 `v1.4.4`", "本地隔离草稿", "来源资产不修改", "不执行脚本", "不安装依赖", "逐路径、逐字节", "不打开工坊，不转换资产，不检查或安装外来 Skill", "单个 Skill", "普通对话、只读能力"], "1.4.4 patch upgrade guide");
const guide145 = read("core/upgrade/upgrade-1.4.4-to-1.4.5.md");
includesAll(guide145, ["1.4.4 → 1.4.5", "长期对话升级连续性", "固定 `v1.4.5`", "安全节点", "Agent 自动完成", "普通重读", "新任务只在用户希望立即使用受影响行为时作为最后兼容路线", "逐路径、逐字节", "未知字段", "不回滚有效新实例"], "1.4.5 patch upgrade guide");
const guide146 = read("core/upgrade/upgrade-1.4.5-to-1.4.6.md");
includesAll(guide146, ["1.4.5 升级到 1.4.6", "固定 `v1.4.6`", "可编辑真源", "不会在升级过程中生成 ZIP", "旧 `draft`、`ready`、`review` 条目无需先迁移", "单个 Skill 的交付信息异常只影响这一项", "逐路径、逐字节", "第二次执行必须零变化"], "1.4.6 patch upgrade guide");
const guide147 = read("core/upgrade/upgrade-1.4.6-to-1.4.7.md");
includesAll(guide147, ["1.4.6 升级到 1.4.7", "固定 `v1.4.7`", "不会扫描旧对话来补回执", "业务结果、文件、对话和无关能力继续可用", "逐路径、逐字节", "第二次执行必须零变化"], "1.4.7 patch upgrade guide");
const guide148 = read("core/upgrade/upgrade-1.4.7-to-1.4.8.md");
includesAll(guide148, ["1.4.7 升级到 1.4.8", "固定 `v1.4.8`", "升级不执行首次创建", "本次未核对", "对话、已有结果和无关能力继续可用", "逐路径、逐字节", "第二次执行必须零变化"], "1.4.8 patch upgrade guide");
const guide149 = read("core/upgrade/upgrade-1.4.8-to-1.4.9.md");
includesAll(guide149, ["1.4.8 升级到 1.4.9", "本地候选", "尚未成为正式发布", "逐路径、逐字节", "稳定 `skill_id`", "新增、修改、删除路径", "不执行脚本", "哪一步操作开始觉得不对", "假装拥有隐藏日志", "不会自动上传", "第二次执行零变化"], "1.4.9 candidate upgrade guide");
const guide200 = read("core/upgrade/upgrade-1.4.8-to-2.0.0.md");
includesAll(guide200, ["Agent Carry 1.4.8／1.4.9 升级到 AI Carry 2.0.0", "直接升级来源", "正式发布边界", "不是全文替换", "created_from", "GitHub 仓库仍位于", "ai-carry-upgrade-cli.mjs", "GitHub HTTPS API", "用户不需要操作终端", "逐字节保留核对", "已生成但尚未选择分享方式", "agent-carry.instance-component@1", "AI_CARRY_SNAPSHOT", "agent-carry-private-migration", "保持用户当前打开的实例根路径不变", "回滚包", "按事务记录逆序恢复", "复制到隔离候选并再次核对整树指纹", "本地静态产品文件与官方目标的逐路径字节", "回执如实注明这次只读检查使用了网络", "第二次", "当前会话"], "2.0.0 rename upgrade guide");
const guide201 = read("core/upgrade/upgrade-2.0.0-to-2.0.1.md");
includesAll(guide201, ["Agent Carry 1.4.8／本地 1.4.9／AI Carry 2.0.0", "审计时间与稳定发布事实分开", "六项 GitHub HTTPS API 核验", "最多十二个", "不需要先成功安装 2.0.0", "保持用户当前打开的实例根路径不变", "逐路径、逐字节", "失败都按事务记录逆序恢复", "不影响 Agent 的对话和其他能力", "第二次", "固定 2.0.1"], "2.0.1 upgrade continuity guide");
includesAll(read("core/guides/upgrade-guide.md"), ["当前正式目标是 AI Carry 2.0.1", "固定 `v2.0.1`", "release-manifest-1.3.1.toml", "upgrade-1.2.1-to-1.3.1.md", "upgrade-1.3.0-to-1.3.1.md", "release-manifest-1.4.0.toml", "upgrade-1.3.1-to-1.4.0.md", "release-manifest-1.4.1.toml", "upgrade-1.4.0-to-1.4.1.md", "release-manifest-1.4.2.toml", "upgrade-1.4.1-to-1.4.2.md", "release-manifest-1.4.3.toml", "upgrade-1.4.2-to-1.4.3.md", "release-manifest-1.4.4.toml", "upgrade-1.4.3-to-1.4.4.md", "release-manifest-1.4.5.toml", "upgrade-1.4.4-to-1.4.5.md", "release-manifest-1.4.6.toml", "upgrade-1.4.5-to-1.4.6.md", "release-manifest-1.4.7.toml", "upgrade-1.4.6-to-1.4.7.md", "release-manifest-1.4.8.toml", "upgrade-1.4.7-to-1.4.8.md", "release-manifest-1.4.9.toml", "upgrade-1.4.8-to-1.4.9.md", "release-manifest-2.0.0.toml", "upgrade-1.4.8-to-2.0.0.md", "release-manifest-2.0.1.toml", "upgrade-2.0.0-to-2.0.1.md", "不授权任何未来提交"], "current upgrade guide");

includesAll(read("assistant.toml"), ['product_id = "ai-carry"', 'product_name = "AI Carry"', 'product_version = "2.0.1"', 'core_version = "2.0.1"', 'release_manifest = "core/upgrade/release-manifest-2.0.1.toml"', 'legacy_product_ids = ["agent-carry"]', 'new-run-is-last-host-compatibility-fallback'], "assistant authority");
includesAll(read("core/manifest.toml"), ['core_id = "ai-carry-core"', 'version = "2.0.1"', 'instance_component_schema = "1.0"'], "core authority");
includesAll(read("instance/manifest.toml"), ['created_from = "ai-carry@2.0.1"', 'product = "2.0.1"'], "template instance authority");
includesAll(read("dashboard/package.json"), ['"name": "ai-carry-dashboard"', '"version": "2.0.1"', '"instantiate": "node scripts/first-instantiation-transaction.mjs"', '"upgrade": "node scripts/ai-carry-upgrade-cli.mjs"', '"learning-save": "node scripts/learning-save-cli.mjs"', '"skill-install": "node scripts/skill-install-cli.mjs"', '"check:skill-install": "node scripts/validate-skill-install-transaction.mjs"', '"check:problem-report": "node scripts/validate-problem-report-contract.mjs"', '"check:task-closeout": "node scripts/validate-task-closeout-contract.mjs"', '"check:product-identity": "node scripts/validate-product-identity-contract.mjs"', '"check:release-authority": "node scripts/validate-release-authority.mjs"', "npm run check:first-run", "npm run check:product-identity", "npm run check:learning-capture", "npm run check:skill-install", "npm run check:problem-report"], "Dashboard package authority");
includesAll(read("dashboard/package-lock.json"), ['"name": "ai-carry-dashboard"', '"version": "2.0.1"'], "Dashboard lock authority");
includesAll(read("core/maps/dashboard-actions.toml"), ["目标包自己的版本文字", "GitHub HTTPS API", "我不需要操作终端", "不得遍历工作区正文", "不能认证聊天角色", "未知根文件原地不碰", "sessionReentryCommand", "不得生成 sessionActivated=true、behaviorAccepted=true"], "lower-cost-model upgrade action boundary");
const upgrade200Cli = read("dashboard/scripts/ai-carry-upgrade-cli.mjs");
includesAll(upgrade200Cli, ['completionState: "session-activation-required"', "sessionReentryCommand", 'decision: "ai-carry-upgrade-target-runtime-validated"', "targetPackageBoundaryValidated: true", "userMessageRoleAuthenticatedByCli: false", "filesInstalled: true", "instanceSwitched: true", "sessionActivated: false", "behaviorAccepted: false", "target release boundary does not authorize published instance replacement", "--user-reply", "聊天消息角色由承载对话的宿主负责"], "deterministic post-switch fact boundary");
expect(!upgrade200Cli.includes("sessionActivated: true") && !upgrade200Cli.includes("behaviorAccepted: true") && !upgrade200Cli.includes("sourceVerified: true"),
  "2.0.1 CLI still self-attests source, session, or behavior authority");
expect(!upgrade200Cli.includes("--source-evidence") && !upgrade200Cli.includes("process.stdin.isTTY"),
  "2.0.1 upgrade still trusts caller-authored source evidence or forces terminal-only approval");
includesAll(read("core/protocols/UPGRADE_SESSION_ACTIVATION.md"), ["把自己填写的 `passed`", "sessionReentryCommand", "target-runtime-validated", "不得签发 `sessionActivated=true`", "宿主侧适配器"], "host-observed session activation boundary");

const instanceManifestBytes = bytes("instance/manifest.toml");
const startupCapsule = read("instance/startup-capsule.toml");
includesAll(startupCapsule, [
  `source_manifest_digest = "sha256:${sha256(instanceManifestBytes)}"`,
  'capsule_id = "ai-carry-startup"',
  'product_version = "2.0.1"',
], "template startup capsule");

console.log("Release authority validation passed for immutable published history through 2.0.0, retained local 1.4.9 history, and the conditional AI Carry 2.0.1 published boundary.");
