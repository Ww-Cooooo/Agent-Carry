import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPromotionTransactionPlan, confirmPromotionReview, preparePromotionReview, projectPromotionState } from "./learning-promotion-contract.mjs";

const assert = (condition, message) => { if (!condition) throw new Error(`Learning promotion contract failed: ${message}`); };
const fixture = mkdtempSync(join(tmpdir(), "ai-carry-promotion-fixture-"));
const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const write = (ref, content) => {
  const target = resolve(fixture, ...ref.split("/"));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, "utf8");
};
const q = JSON.stringify;
const fieldLines = (value) => Object.entries(value).map(([key, item]) => `${key} = ${Array.isArray(item) ? q(item) : typeof item === "string" ? q(item) : item}`).join("\n");

const candidate = {
  id: "evolution.grade-workflow", title: "成绩整理流程候选", summary: "把重复验证的成绩整理方法形成流程。",
  topic_key: "grade-workflow", subject_key: "learning-platform", triggers: ["按之前的方法整理成绩"], aliases: ["成绩整理流程"],
  scope: ["学习平台成绩整理"], conditions: ["用户已经允许观察"], excludes: ["修改原始成绩"], target_kind: "sop", target_subtype: "",
  candidate_relation: "new", status: "candidate", observation_state: "explicit", observation_basis: "explicit-user",
  risk_tier: "high", independent_event_count: 2, last_evidence_at: "2026-08-24T01:00:00+08:00",
  source_ref: "instance/evolution/grade-workflow.md", source_revision: 3,
};
const candidateSource = (overrides = {}) => `+++\n${fieldLines({
  id: candidate.id, kind: "evolution-candidate", status: candidate.status, title: candidate.title, summary: candidate.summary,
  triggers: candidate.triggers, aliases: candidate.aliases, topic_key: candidate.topic_key, subject_key: candidate.subject_key,
  scope: candidate.scope, conditions: candidate.conditions, excludes: candidate.excludes, target_kind: candidate.target_kind,
  target_subtype: candidate.target_subtype, candidate_relation: candidate.candidate_relation, observation_state: candidate.observation_state,
  observation_basis: candidate.observation_basis, proposed_risk_tier: candidate.risk_tier, independent_event_count: 2,
  successful_event_count: 0, failed_event_count: 0, distinct_context_count: 2,
  representative_event_ids: ["event.grade-1", "event.grade-2"], last_evidence_at: candidate.last_evidence_at,
  source_revision: 3, minimum_level: 2, approval_state: "pending", activation_basis: "candidate", risk_tier: candidate.risk_tier,
  approved_by_user: false, ...overrides,
})}\n+++\n# 候选证据\n用户已允许观察；事件计数仍只是宿主记录，不能代替当前正式采用确认。\n`;
const index = (overrides = {}) => {
  const entry = { ...candidate, ...overrides };
  const active = entry.status === "candidate" && entry.observation_state === "explicit"
    && ["explicit-user", "existing-approved-migration"].includes(entry.observation_basis)
    && ["new", "refine", "condition-variant", "related"].includes(entry.candidate_relation);
  return `schema_version = 1\nindex_id = "evolution-candidates"\ninstance_id = "ac-promotion-fixture"\nstate = "current"\nsource_revision = 3\ngenerated_at = "2026-08-24T01:00:00+08:00"\nbudget_bytes = 32768\noverflow = false\ncandidate_count = 1\nindexed_count = 1\nactive_count = ${active ? 1 : 0}\n\n[[candidates]]\n${fieldLines(entry)}\n`;
};
const domainMap = `schema_version = 1\nmap_id = "instance-domain"\ninstance_id = "ac-promotion-fixture"\ndirection = "education"\nstatus = "active"\n\n[budget]\nsoft_max_bytes = 32768\nhard_max_bytes = 49152\nsoft_max_routes = 96\nhard_max_routes = 128\nmax_route_bytes = 2048\ncandidate_limit = 3\noverflow_state = "ok"\n`;
const manifest = `schema_version = 1\ninstance_id = "ac-promotion-fixture"\nstate = "instance"\ncreated_from = "ai-carry@fixture"\ncreated_at = ""\n\n[direction]\ntype = "domain"\nlocked = true\ndomain_id = "education"\nlabel = "教育助手"\nscope_statement = "测试晋升闭包"\nout_of_scope_policy = "create-new-instance"\n\n[profile]\nstatus = "active"\nguidance_mode = "balanced"\nuser_preferences_ref = "instance/profile/approved-profile.md"\ndomain_map_ref = "instance/maps/domain-map.toml"\nsignal_control_ref = "instance/signals/control.toml"\nsignal_map_ref = "instance/maps/signal-map.toml"\ntime_trigger_map_ref = "instance/maps/time-trigger-map.toml"\nhost_registry_ref = "instance/hosts/registry.toml"\n\n[learning]\npolicy = "risk-tiered"\nlow_risk_promotion = "explicit-confirmation-after-notice"\nmedium_high = "explicit-confirmation"\ndirect_user_instruction = "direct-authorization"\n\n[validation]\nevidence_index_ref = "instance/validations/index.toml"\n\n[versions]\nasset_schema = "1.2"\nevolution_candidate_index_schema = "1.0"\nasset_confirmation_gate_schema = "1.0"\nresult_validation_evidence_schema = "1.0"\n`;
  const preview = (status = "active") => `+++\nid = "sop.grade-workflow"\nkind = "sop"\nstatus = "${status}"\ntitle = "学习平台成绩整理"\nsummary = "按用户确认的方法整理并核对学习平台成绩。"\ntriggers = ["帮我整理学习平台成绩"]\naliases = ["之前的成绩整理方法"]\ntopic_key = "grade-workflow"\nsubject_key = "learning-platform"\nscope = ["学习平台成绩整理"]\nconditions = ["用户要求汇总或核对"]\nexcludes = ["修改原始成绩"]\nlifecycle = "recurring"\nexpected_next_use = ""\nsource_refs = []\nprivate_refs = []\nsupersedes = []\nrelated_asset_ids = []\nbody_sections = []\nminimum_level = 2\nconfirmation = "explicit-before-action"\napproval_state = "explicit"\nactivation_basis = "explicit-user"\nrisk_tier = "high"\napproved_by_user = true\nmaturity = "unvalidated"\nindependent_task_count = 0\nsuccessful_use_count = 0\nfailed_use_count = 0\ndistinct_context_count = 0\ndistinct_host_count = 0\nlast_validated_at = ""\nvalidation_refs = []\nhost_experience_refs = []\nupdated_at = ""\n+++\n# 使用方法\n先核对输入列与输出范围，再生成可回读结果。\n`;

try {
  const prepare = (options) => preparePromotionReview(fixture, options);
  write("core/manifest.toml", `schema_version = 1\ncore_id = "ai-carry-core"\nversion = "fixture"\nasset_schema = "1.2"\nevolution_candidate_index_schema = "1.0"\nasset_confirmation_gate_schema = "1.0"\nresult_validation_evidence_schema = "1.0"\n\n[entry]\nresult_validation_evidence_index = "instance/validations/index.toml"\n\n[contracts]\nasset_confirmation_gate_registry = "core/maps/asset-confirmation-gates.toml"\nasset_confirmation_gate_schema = "core/schemas/asset-confirmation-gates.schema.md"\nresult_validation_evidence_schema = "core/schemas/result-validation-evidence-index.schema.md"\n`);
  write("core/schemas/asset-confirmation-gates.schema.md", "# fixture\n");
  write("core/schemas/result-validation-evidence-index.schema.md", "# fixture\n");
  write("core/maps/asset-confirmation-gates.toml", `schema_version = 1\nregistry_id = "asset-confirmation-gates"\n\n[[gates]]\nid = "none"\nphase = "none"\nsummary = "低风险参考。"\nlegacy_aliases = []\n\n[[gates]]\nid = "risk-dependent-before-action"\nphase = "before-action"\nsummary = "按风险确认。"\nlegacy_aliases = []\n\n[[gates]]\nid = "explicit-before-action"\nphase = "before-action"\nsummary = "真实动作前明确确认。"\nlegacy_aliases = []\n\n[[gates]]\nid = "before-durable-change"\nphase = "before-action"\nsummary = "长期写入前确认。"\nlegacy_aliases = []\n`);
  write("instance/profile/approved-profile.md", "# 已确认档案\n");
  write("instance/memory/README.md", "# fixture memory root\n");
  write("instance/sops/README.md", "# fixture SOP root\n");
  write("instance/manifest.toml", manifest);
  write("instance/validations/index.toml", `schema_version = 1\nindex_id = "result-validations"\ninstance_id = "ac-promotion-fixture"\nstate = "empty"\nsource_revision = 0\ngenerated_at = ""\nbudget_bytes = 262144\noverflow = false\nrecord_count = 0\n`);
  write("instance/maps/domain-map.toml", domainMap);
  write(candidate.source_ref, candidateSource());
  write("instance/evolution/index.toml", index());

  const memoryPreview = ({ id, riskTier, minimumLevel, confirmation }) => `+++\nid = "${id}"\nkind = "memory"\nsubtype = "habit"\nstatus = "active"\ntitle = "偏好简短进度"\nsummary = "用户希望进度说明简短，但关键风险不能省略。"\ntriggers = ["汇报进度"]\naliases = ["进度简短一点"]\ntopic_key = "communication-style"\nsubject_key = "progress-updates"\nscope = ["任务进度汇报"]\nconditions = ["不省略关键风险"]\nexcludes = []\nlifecycle = "recurring"\nexpected_next_use = ""\nsource_refs = []\nprivate_refs = []\nsupersedes = []\nrelated_asset_ids = []\nbody_sections = []\nminimum_level = ${minimumLevel}\nconfirmation = "${confirmation}"\napproval_state = "explicit"\nactivation_basis = "explicit-user"\nrisk_tier = "${riskTier}"\napproved_by_user = true\nupdated_at = ""\n+++\n# 使用方式\n在汇报进度时简明说明结果、风险与下一步。\n`;
  write(candidate.source_ref, candidateSource({ target_kind: "memory", target_subtype: "habit", proposed_risk_tier: "low", risk_tier: "low", minimum_level: 1 }));
  write("instance/evolution/index.toml", index({ target_kind: "memory", target_subtype: "habit", risk_tier: "low" }));
  const lowRequest = { candidateId: candidate.id, formalTarget: "instance/memory/concise-progress.md",
    formalPreview: memoryPreview({ id: "memory.habit.concise-progress", riskTier: "low", minimumLevel: 1, confirmation: "none" }) };
  const lowReview = preparePromotionReview(fixture, lowRequest);
  assert(lowReview.decision === "promotion-confirmation-required" && lowReview.requiredReviewLevel === 1, "a clear low-risk new habit was unnecessarily forced to a higher review level");

  write(candidate.source_ref, candidateSource({ target_kind: "memory", target_subtype: "habit", proposed_risk_tier: "medium", risk_tier: "medium", minimum_level: 2 }));
  write("instance/evolution/index.toml", index({ target_kind: "memory", target_subtype: "habit", risk_tier: "medium" }));
  const mediumRequest = { candidateId: candidate.id, formalTarget: "instance/memory/medium-progress.md",
    formalPreview: memoryPreview({ id: "memory.habit.medium-progress", riskTier: "medium", minimumLevel: 2, confirmation: "explicit-before-action" }) };
  const mediumReview = preparePromotionReview(fixture, mediumRequest);
  assert(mediumReview.decision === "promotion-confirmation-required" && mediumReview.requiredReviewLevel === 2,
    "a clear medium-risk asset did not expose Level 2 as a recommendation");

  write(candidate.source_ref, candidateSource());
  write("instance/evolution/index.toml", index());

  const promotionRequest = { candidateId: candidate.id, formalTarget: "instance/sops/grade-workflow.md", formalPreview: preview() };
  const advisoryReview = preparePromotionReview(fixture, promotionRequest);
  assert(advisoryReview.decision === "promotion-confirmation-required" && advisoryReview.requiredReviewLevel === 3,
    "a high-risk promotion did not expose Level 3 as advice or was blocked on a model ticket");
  write("instance/maps/domain-map.toml", domainMap.replace('overflow_state = "ok"', 'overflow_state = "rebuild-required"'));
  assert(prepare({ ...promotionRequest }).reason === "domain-map-rebuild-required-before-promotion",
    "a promotion entered a domain map already marked for bounded rebuild");
  write("instance/maps/domain-map.toml", domainMap);
  assert(prepare({ ...promotionRequest, mode: "policy-proposed" }).reason === "request-invalid",
    "a formal asset could still be activated from self-reported policy evidence without a current user confirmation");
  assert(prepare({ candidateId: candidate.id, formalTarget: "instance/sops/reused-candidate-id.md",
    formalPreview: preview().replaceAll("sop.grade-workflow", candidate.id) }).reason === "formal-id-collides-with-candidate-history",
  "a formal asset reused its source candidate stable ID");
  write("instance/evolution/archive/old-candidate.md", candidateSource({ id: "sop.reserved-by-history", status: "archived", source_revision: 1,
    resolution: "rejected", resolved_to: "" }));
  assert(prepare({ candidateId: candidate.id, formalTarget: "instance/sops/history-id.md",
    formalPreview: preview().replaceAll("sop.grade-workflow", "sop.reserved-by-history") }).reason === "formal-id-collides-with-candidate-history",
  "a formal asset reused a stable ID reserved by archived candidate history");
  const review = prepare({ candidateId: candidate.id, formalTarget: "instance/sops/grade-workflow.md", formalPreview: preview() });
  assert(review.decision === "promotion-confirmation-required" && review.formalStatus === "active"
    && review.promotionChangeGateIds.includes("before-durable-change") && review.retainedFutureActionGateIds.includes("explicit-before-action"),
  "trusted explicit review was not created or did not separate the current write gate from retained future gates");
  assert(preparePromotionReview(repository, { candidateId: candidate.id, formalTarget: "instance/sops/grade-workflow.md", formalPreview: preview() }).decision === "promotion-review-denied", "the blank public template participated in promotion");
  assert(prepare({ candidateId: candidate.id, formalTarget: "instance/sops/grade-workflow.md", formalPreview: preview("provisional") }).decision === "promotion-review-denied", "high-risk provisional preview was accepted");
  assert(confirmPromotionReview(fixture, { ...review }, {}).decision === "promotion-review-denied", "a cloned review was accepted");
  const receipt = { basis: "host-current-user-message", message_ref: "turn.confirm-1",
    candidate_id: candidate.id, candidate_revision: 3, formal_id: review.formalId, formal_preview_digest: review.formalPreviewDigest,
    confirmed_change_gate_ids: [...review.promotionChangeGateIds] };
  assert(confirmPromotionReview(fixture, review, { ...receipt, formal_id: "sop.other" }).decision === "promotion-review-denied", "confirmation for a different formal target was accepted");
  const confirmed = confirmPromotionReview(fixture, review, receipt);
  assert(confirmed.decision === "explicit-promotion-confirmed" && confirmed.initialStatus === "active" && confirmed.initialMaturity === "unvalidated", "current explicit confirmation did not preserve the legal high-risk status/maturity pair");
  assert(confirmPromotionReview(fixture, review, receipt).decision === "promotion-review-denied", "one confirmation challenge was reused");
  const plan = buildPromotionTransactionPlan(fixture, confirmed);
  assert(plan.decision === "transaction-preview" && plan.formalId === review.formalId && plan.sourceCandidateId === candidate.id
    && plan.requiredCoreSet.length === 3 && plan.bestEffortProjectionSet.length === 4
    && plan.requiredAudits.includes("projection-failure-is-local"), "transaction plan did not separate its semantic core from rebuildable projections");
  assert(plan.completeness === "bound-input-preview-not-a-filesystem-transaction-executor"
    && plan.promotionChangeGateIds.length === 1 && !plan.promotionChangeGateIds.includes("explicit-before-action"),
  "the bounded plan pretended to be an executor or treated a retained future action gate as already satisfied");
  assert(buildPromotionTransactionPlan(fixture, { ...confirmed }).decision === "no-transaction", "a cloned confirmation minted a transaction plan");
  assert(buildPromotionTransactionPlan(fixture, confirmed).decision === "no-transaction", "one confirmation minted more than one transaction plan");
  const lateReview = prepare({ candidateId: candidate.id, formalTarget: "instance/sops/late-drift.md", formalPreview: preview().replaceAll("sop.grade-workflow", "sop.late-drift") });
  const lateReceipt = { ...receipt, message_ref: "turn.confirm-late-drift", formal_id: lateReview.formalId, formal_preview_digest: lateReview.formalPreviewDigest };
  const lateConfirmation = confirmPromotionReview(fixture, lateReview, lateReceipt);
  write("instance/maps/domain-map.toml", `${domainMap}\n# changed after confirmation\n`);
  assert(buildPromotionTransactionPlan(fixture, lateConfirmation).decision === "no-transaction", "a stale confirmation minted a plan after the trusted map changed");
  write("instance/maps/domain-map.toml", domainMap);
  const initial = { formal_ids: [], active_candidate_ids: [candidate.id], archived_candidate_ids: [], dashboard_formal_ids: [], dashboard_candidate_ids: [candidate.id] };
  const committed = projectPromotionState(initial, plan);
  const repeated = projectPromotionState(committed, plan);
  assert(JSON.stringify(committed) === JSON.stringify(repeated) && committed.formal_ids.length === 1 && committed.active_candidate_ids.length === 0, "complete commit was not idempotent");
  for (const invalid of [
    { ...initial, active_candidate_ids: [] },
    { ...initial, formal_ids: [plan.formalId] },
    { ...initial, archived_candidate_ids: [candidate.id] },
  ]) {
    let blocked = false;
    try { projectPromotionState(invalid, plan); } catch { blocked = true; }
    assert(blocked, "source-missing, colliding, or partial state was silently repaired");
  }

  const secretPreview = preview().replace("按用户确认的方法整理并核对学习平台成绩。", ["secret = sk", "-", "abcdefghijklmnopqrstuvwxyz123456", ""].join(""));
  assert(prepare({ candidateId: candidate.id, formalTarget: "instance/sops/secret.md", formalPreview: secretPreview }).decision === "promotion-review-denied",
    "a secret in formal frontmatter entered a promotion review");
  const pathPreview = preview().replace("按用户确认的方法整理并核对学习平台成绩。", "读取 /etc/shadow 后整理成绩。");
  assert(prepare({ candidateId: candidate.id, formalTarget: "instance/sops/path.md", formalPreview: pathPreview }).decision === "promotion-review-denied",
    "an absolute location in formal frontmatter entered a promotion review");
  const requiredFormalFields = ["id", "kind", "status", "title", "summary", "triggers", "aliases", "topic_key", "subject_key", "scope", "conditions",
    "excludes", "lifecycle", "expected_next_use", "source_refs", "private_refs", "supersedes", "minimum_level", "confirmation", "approval_state",
    "activation_basis", "risk_tier", "approved_by_user", "updated_at", "maturity", "independent_task_count", "successful_use_count", "failed_use_count",
    "distinct_context_count", "distinct_host_count", "last_validated_at", "validation_refs"];
  for (const field of requiredFormalFields) {
    const withoutField = preview().replace(new RegExp(`^${field} = .*\\n`, "m"), "").replaceAll("sop.grade-workflow", `sop.missing-${field.replaceAll("_", "-")}`);
    assert(prepare({ candidateId: candidate.id, formalTarget: `instance/sops/missing-${field.replaceAll("_", "-")}.md`, formalPreview: withoutField }).decision === "promotion-review-denied",
      `a formal preview missing required field ${field} entered review`);
  }
  const unknownFieldPreview = preview().replace('id = "sop.grade-workflow"', 'id = "sop.unknown-field"\nunexpected_field = "not allowed"');
  assert(prepare({ candidateId: candidate.id, formalTarget: "instance/sops/unknown-field.md", formalPreview: unknownFieldPreview }).decision === "promotion-review-denied",
    "an unknown formal frontmatter field entered review");
  const secretBodyPreview = preview().replace("先核对输入列与输出范围，再生成可回读结果。", ["先读取 sk", "-", "abcdefghijklmnopqrstuvwxyz123456", " 再执行。"].join(""));
  assert(prepare({ candidateId: candidate.id, formalTarget: "instance/sops/secret-body.md", formalPreview: secretBodyPreview.replaceAll("sop.grade-workflow", "sop.secret-body") }).decision === "promotion-review-denied",
    "a secret in the formal body entered review");
  const fakePrivateTitle = preview().replace('title = "学习平台成绩整理"', 'title = "private://attacker/hidden"').replaceAll("sop.grade-workflow", "sop.fake-private-title");
  assert(prepare({ candidateId: candidate.id, formalTarget: "instance/sops/fake-private-title.md", formalPreview: fakePrivateTitle }).decision === "promotion-review-denied",
    "a private locator outside private_refs entered formal metadata");
  const fakePrivateBody = preview().replace("先核对输入列与输出范围，再生成可回读结果。", "读取 private://attacker/hidden 后执行。").replaceAll("sop.grade-workflow", "sop.fake-private-body");
  assert(prepare({ candidateId: candidate.id, formalTarget: "instance/sops/fake-private-body.md", formalPreview: fakePrivateBody }).decision === "promotion-review-denied",
    "a private locator in model-visible formal body entered review");
  const oversizedSectionPreview = preview().replace("body_sections = []", 'body_sections = ["usage"]')
    .replace("# 使用方法\n先核对输入列与输出范围，再生成可回读结果。", `# 使用方法\n<!-- ac-section:usage -->\n${"x".repeat(33 * 1024)}`)
    .replaceAll("sop.grade-workflow", "sop.oversized-section");
  assert(prepare({ candidateId: candidate.id, formalTarget: "instance/sops/oversized-section.md", formalPreview: oversizedSectionPreview }).decision === "promotion-review-denied",
    "an oversized registered section entered review");
  write("instance/sops/occupied.md", "user-owned unregistered file\n");
  assert(prepare({ candidateId: candidate.id, formalTarget: "instance/sops/occupied.md", formalPreview: preview().replaceAll("sop.grade-workflow", "sop.occupied") }).reason === "formal-target-unavailable-or-unsafe",
    "an unregistered occupied file could be selected as a new formal target");
  rmSync(resolve(fixture, "instance/sops/occupied.md"), { force: true });

  write("instance/sops/archived-grade.md", "archived evidence placeholder\n");
  write("instance/maps/domain-map.toml", `${domainMap}\n[[routes]]\nid = "sop.archived-grade"\nasset_kind = "sop"\ntitle = "学习平台成绩整理"\nsummary = "旧版成绩整理记录。"\ntriggers = ["旧版成绩整理"]\naliases = []\ntopic_key = ""\nsubject_key = ""\nscope = ["历史记录"]\nconditions = []\nexcludes = []\nrelated_asset_ids = []\nbody_sections = []\ntarget = "instance/sops/archived-grade.md"\nstate = "archived"\nminimum_level = 2\nconfirmation = "explicit-before-action"\n`);
  assert(prepare({ candidateId: candidate.id, formalTarget: "instance/sops/duplicate.md", formalPreview: preview().replaceAll("sop.grade-workflow", "sop.duplicate") }).reason === "possible-formal-duplicate-requires-targeted-review",
    "a proposed asset duplicate hidden in an archived route bypassed the all-state duplicate check");
  write("instance/sops/trigger-overlap.md", "archived trigger-overlap placeholder\n");
  write("instance/maps/domain-map.toml", `${domainMap}\n[[routes]]\nid = "sop.trigger-overlap"\nasset_kind = "sop"\ntitle = "课程数据整理"\nsummary = "按既定格式核对课程导出数据。"\ntriggers = ["帮我整理学习平台成绩"]\naliases = []\ntopic_key = ""\nsubject_key = ""\nscope = ["学习平台成绩整理"]\nconditions = []\nexcludes = []\nrelated_asset_ids = []\nbody_sections = []\ntarget = "instance/sops/trigger-overlap.md"\nstate = "archived"\nminimum_level = 2\nconfirmation = "explicit-before-action"\n`);
  assert(prepare({ candidateId: candidate.id, formalTarget: "instance/sops/trigger-duplicate.md",
    formalPreview: preview().replaceAll("sop.grade-workflow", "sop.trigger-duplicate") }).reason === "possible-formal-duplicate-requires-targeted-review",
  "a same-trigger and same-scope duplicate bypassed the semantic duplicate check by changing title and summary");
  write("instance/maps/domain-map.toml", domainMap);

  const replayReview = prepare({ candidateId: candidate.id, formalTarget: "instance/sops/replay.md", formalPreview: preview().replaceAll("sop.grade-workflow", "sop.replay") });
  const replayReceipt = { ...receipt, formal_id: replayReview.formalId, formal_preview_digest: replayReview.formalPreviewDigest };
  assert(confirmPromotionReview(fixture, replayReview, replayReceipt).decision === "promotion-review-denied", "one old user message confirmed a second promotion review");

  const driftReview = prepare({ candidateId: candidate.id, formalTarget: "instance/sops/drift.md", formalPreview: preview().replaceAll("sop.grade-workflow", "sop.drift") });
  write("instance/memory/unrelated.md", "placeholder\n");
  write("instance/maps/domain-map.toml", `${domainMap}\n[[routes]]\nid = "memory.unrelated"\nasset_kind = "memory"\nsubtype = "general"\ntitle = "无关记忆"\nsummary = "用于制造地图修订。"\ntriggers = ["无关测试"]\naliases = []\ntopic_key = "unrelated"\nsubject_key = "fixture"\nscope = ["测试"]\nconditions = []\nexcludes = []\nrelated_asset_ids = []\nbody_sections = []\ntarget = "instance/memory/unrelated.md"\nstate = "active"\nminimum_level = 1\nconfirmation = "none"\n`);
  const driftReceipt = { ...receipt, message_ref: "turn.confirm-drift", formal_id: driftReview.formalId, formal_preview_digest: driftReview.formalPreviewDigest };
  assert(confirmPromotionReview(fixture, driftReview, driftReceipt).reason === "manifest-map-registry-duplicate-or-target-drifted", "a changed formal map remained bound to an old review");
  write("instance/maps/domain-map.toml", domainMap);

  write(candidate.source_ref, candidateSource({ candidate_relation: "refine" }));
  write("instance/evolution/index.toml", index({ candidate_relation: "refine" }));
  assert(prepare({ candidateId: candidate.id, formalTarget: "instance/sops/other.md", formalPreview: preview().replaceAll("sop.grade-workflow", "sop.other") }).reason === "non-new-relation-requires-targeted-review",
    "a refine relation was treated as a deterministic new formal asset");

  write(candidate.source_ref, candidateSource({ status: "review", candidate_relation: "new" }));
  write("instance/evolution/index.toml", index({ status: "review", candidate_relation: "new" }));
  assert(prepare({ candidateId: candidate.id, formalTarget: "instance/sops/review-state.md", formalPreview: preview().replaceAll("sop.grade-workflow", "sop.review-state") }).reason === "candidate-review-state-requires-targeted-resolution",
    "a review-state candidate entered the generic promotion path without resolving its review reason");

  console.log("Learning promotion passed trusted-candidate, advisory model level, template denial, legal status, current-confirmation binding, no-cross-target plan, semantic-core/projection separation, and idempotence checks.");
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
