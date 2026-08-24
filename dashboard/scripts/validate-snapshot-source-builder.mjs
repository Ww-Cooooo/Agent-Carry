import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { buildSnapshotCandidate, computeSnapshotSourceDigest } from "./snapshot-source-builder.mjs";
import { parseSnapshotEnvelope } from "./snapshot-envelope.mjs";
import { validateSnapshotSemantics } from "./snapshot-semantics.mjs";
import { buildStartupCapsule } from "./startup-capsule-contract.mjs";

const assert = (condition, message) => { if (!condition) throw new Error(`Snapshot source builder contract failed: ${message}`); };
const root = mkdtempSync(join(tmpdir(), "agent-carry-snapshot-builder-"));
const write = (ref, source) => { const path = resolve(root, ...ref.split("/")); mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, source, "utf8"); };
const manifest = (mission = "帮助用户整理学习平台成绩。") => `schema_version = 1
instance_id = "ac-snapshot-fixture"
state = "instance"
created_from = "agent-carry@test"
created_at = "2026-08-24T00:00:00+08:00"

[direction]
type = "domain"
locked = true
domain_id = "education"
label = "教育"
scope_statement = "教育工作"
out_of_scope_policy = "create-new-instance"

[profile]
status = "active"
guidance_mode = "balanced"
display_name = "学习平台成绩助手"
mission = ${JSON.stringify(mission)}
language = "zh-CN"
user_preferences_ref = "instance/profile/approved-profile.md"
domain_map_ref = "instance/maps/domain-map.toml"
signal_control_ref = "instance/signals/control.toml"
signal_map_ref = "instance/maps/signal-map.toml"
time_trigger_map_ref = "instance/maps/time-trigger-map.toml"
host_registry_ref = "instance/hosts/registry.toml"

[learning]
policy = "risk-tiered"
low_risk_promotion = "explicit-confirmation-after-notice"
medium_high = "explicit-confirmation"
direct_user_instruction = "direct-authorization"

[validation]
evidence_index_ref = "instance/validations/index.toml"

[versions]
product = "test"
asset_schema = "1.2"
evolution_candidate_index_schema = "1.0"
asset_confirmation_gate_schema = "1.0"
result_validation_evidence_schema = "1.0"
`;

try {
  write("AGENTS.md", "# fixture\n"); write("BOOTSTRAP.md", "# fixture\n"); write("core/maps/root-map.toml", "schema_version = 1\n");
  write("assistant.toml", `schema_version = 1
product_id = "agent-carry"
product_name = "Agent Carry"
product_version = "test"
core_version = "test"

[bootstrap]
maximum_characters = 20000
`);
  write("core/manifest.toml", `schema_version = 1
core_id = "agent-carry-core"
version = "1.3.0-test.1"
asset_schema = "1.2"
evolution_candidate_index_schema = "1.0"
asset_confirmation_gate_schema = "1.0"
result_validation_evidence_schema = "1.0"

[entry]
root_map = "core/maps/root-map.toml"
result_validation_evidence_index = "instance/validations/index.toml"

[contracts]
asset_confirmation_gate_registry = "core/maps/asset-confirmation-gates.toml"
asset_confirmation_gate_schema = "core/schemas/asset-confirmation-gates.schema.md"
result_validation_evidence_schema = "core/schemas/result-validation-evidence-index.schema.md"
`);
  write("core/schemas/asset-confirmation-gates.schema.md", "# fixture\n");
  write("core/schemas/result-validation-evidence-index.schema.md", "# fixture\n");
  write("core/maps/asset-confirmation-gates.toml", `schema_version = 1
registry_id = "asset-confirmation-gates"

[[gates]]
id = "none"
phase = "none"
summary = "无需额外确认。"
legacy_aliases = []

[[gates]]
id = "risk-dependent-before-action"
phase = "before-action"
summary = "按风险确认。"
legacy_aliases = []
`);
  write("instance/manifest.toml", manifest());
  write("instance/validations/index.toml", `schema_version = 1
index_id = "result-validations"
instance_id = "ac-snapshot-fixture"
state = "empty"
source_revision = 0
generated_at = ""
budget_bytes = 262144
overflow = false
record_count = 0
`);
  write("instance/startup-capsule.toml", buildStartupCapsule(root).source);
  write("instance/profile/approved-profile.md", "# 已确认档案\n");
  for (const directory of ["memory", "capabilities", "sops", "experiences", "evolution", "todo", "governance", "deferred"]) write(`instance/${directory}/README.md`, "# fixture\n");
  write("instance/signals/control.toml", "schema_version = 1\n"); write("instance/maps/signal-map.toml", "schema_version = 1\n");
  write("instance/skills/requirements.toml", `schema_version = 1
instance_id = "ac-snapshot-fixture"
generated_at = "2026-08-24T00:00:00+08:00"
status = "current"
`);
  write("instance/evolution/index.toml", `schema_version = 1
index_id = "evolution-candidates"
instance_id = "ac-snapshot-fixture"
state = "empty"
source_revision = 0
generated_at = "2026-08-24T00:00:00+08:00"
budget_bytes = 32768
overflow = false
candidate_count = 0
indexed_count = 0
active_count = 0
`);
  write("instance/sops/grade-summary.md", `+++
id = "sop.grade-summary"
kind = "sop"
status = "active"
title = "汇总学习平台成绩"
summary = "按用户确认的方法汇总并核对成绩。"
triggers = ["帮我整理学习平台成绩"]
aliases = ["上次的成绩整理方法"]
topic_key = "grade-summary"
subject_key = "learning-platform"
scope = ["学习平台成绩汇总"]
conditions = ["用户要求汇总"]
excludes = ["修改原始成绩"]
lifecycle = "recurring"
expected_next_use = ""
related_asset_ids = []
body_sections = []
source_refs = []
private_refs = []
supersedes = []
minimum_level = 2
confirmation = "none"
approval_state = "explicit"
activation_basis = "explicit-user"
risk_tier = "low"
approved_by_user = true
maturity = "unvalidated"
independent_task_count = 0
successful_use_count = 0
failed_use_count = 0
distinct_context_count = 0
distinct_host_count = 0
last_validated_at = ""
validation_refs = []
host_experience_refs = []
updated_at = ""
+++
# 使用方法
先核对输入列，再生成可回读结果。
`);
  write("instance/maps/domain-map.toml", `schema_version = 1
map_id = "instance-domain"
instance_id = "ac-snapshot-fixture"
direction = "education"
status = "active"

[budget]
soft_max_bytes = 32768
hard_max_bytes = 49152
soft_max_routes = 96
hard_max_routes = 128
max_route_bytes = 2048
candidate_limit = 3
overflow_state = "ok"

[[routes]]
id = "sop.grade-summary"
asset_kind = "sop"
title = "汇总学习平台成绩"
summary = "按用户确认的方法汇总并核对成绩。"
triggers = ["帮我整理学习平台成绩"]
aliases = ["上次的成绩整理方法"]
topic_key = "grade-summary"
subject_key = "learning-platform"
scope = ["学习平台成绩汇总"]
conditions = ["用户要求汇总"]
excludes = ["修改原始成绩"]
related_asset_ids = []
body_sections = []
target = "instance/sops/grade-summary.md"
state = "active"
minimum_level = 2
confirmation = "none"
`);

  const first = buildSnapshotCandidate(root, { now: new Date("2026-08-24T04:00:00+08:00") });
  const snapshot = parseSnapshotEnvelope(first.source, "generated fixture");
  validateSnapshotSemantics(snapshot, "generated fixture");
  const expectedIdentity = `ac-${createHash("sha256").update("ac-snapshot-fixture", "utf8").digest("hex").slice(0, 12)}`;
  assert(first.updated && first.identityRef === expectedIdentity && snapshot.meta.identity_ref === expectedIdentity, "instance identity was not derived from instance_id");
  assert(snapshot.assets.sops === 1 && snapshot.sops[0]?.id === "sop.grade-summary" && snapshot.sops[0]?.maturity === "unvalidated", "formal source was not projected from the trusted map/body pair");
  assert(snapshot.meta.source_digest === computeSnapshotSourceDigest(root).digest, "source digest did not match an independent deterministic rebuild");
  const repeated = buildSnapshotCandidate(root, { existingSource: first.source, now: new Date("2026-08-24T05:00:00+08:00") });
  assert(!repeated.updated && repeated.source === first.source, "unchanged formal truth refreshed generated_at or bytes");

  const forged = JSON.parse(JSON.stringify(snapshot)); forged.meta.source_digest = `sha256:${"a".repeat(64)}`;
  const forgedSource = first.source.replace(JSON.stringify(snapshot, null, 2), JSON.stringify(forged, null, 2));
  assert(buildSnapshotCandidate(root, { existingSource: forgedSource, now: new Date("2026-08-24T05:00:00+08:00") }).updated, "a self-consistent-looking forged digest suppressed a real rebuild");

  write("instance/manifest.toml", manifest("帮助用户安全整理与复核学习平台成绩。"));
  let staleCapsuleBlocked = false; try { buildSnapshotCandidate(root, { existingSource: first.source }); } catch { staleCapsuleBlocked = true; }
  assert(staleCapsuleBlocked, "a stale startup capsule was ignored during snapshot maintenance");
  write("instance/startup-capsule.toml", buildStartupCapsule(root).source);
  const changed = buildSnapshotCandidate(root, { existingSource: first.source, now: new Date("2026-08-24T06:00:00+08:00") });
  assert(changed.updated && changed.sourceDigest !== first.sourceDigest && changed.snapshot.profile.mission.includes("安全整理"), "changed current truth did not produce a new deterministic candidate");

  write("instance/profile/local-note.md", ["token = sk", "-", "abcdefghijklmnopqrstuvwxyz123456", "\n"].join(""));
  let secretBlocked = false; try { buildSnapshotCandidate(root); } catch { secretBlocked = true; }
  assert(secretBlocked, "a secret hidden in an otherwise unprojected instance file entered the snapshot source set");
  rmSync(resolve(root, "instance/profile/local-note.md"), { force: true });

  write("instance/profile/local-note.md", "location = C:/Users/example/private.txt\n");
  let locationBlocked = false; try { buildSnapshotCandidate(root); } catch { locationBlocked = true; }
  assert(locationBlocked, "an absolute local location hidden in the instance source set was accepted");
  rmSync(resolve(root, "instance/profile/local-note.md"), { force: true });

  console.log("Snapshot source builder passed source-digest truth, instance identity, formal projection, unchanged idempotence, forged-digest rejection, and whole-instance safety checks.");
} finally {
  rmSync(root, { recursive: true, force: true });
}
