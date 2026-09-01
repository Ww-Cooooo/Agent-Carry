import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  cpSync, existsSync, linkSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync,
  renameSync, rmSync, symlinkSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  confirmPersistentLearningCaptureChallenge,
  executePersistentLearningCaptureTransaction,
  preparePersistentLearningCaptureChallenge,
} from "./learning-capture-transaction.mjs";
import { parseMarkdownFrontmatterHead } from "./asset-route-contract.mjs";
import { buildStartupCapsule } from "./startup-capsule-contract.mjs";
import { parseCurrentSnapshotEnvelope } from "./snapshot-envelope.mjs";
import {
  cleanupPersistentPromotionTransactions,
  cleanupPromotionProjectionResidue,
  closePersistentPromotionTransaction,
  preparePersistentPromotionFromHandoff,
} from "./learning-promotion-transaction.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const sourceRoot = resolve(scriptDir, "../..");
const cli = resolve(scriptDir, "learning-promotion-cli.mjs");
const temporaryRoots = [];
const expect = (condition, message) => { if (!condition) throw new Error(`Learning promotion transaction failed: ${message}`); };
const sha256 = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;

function createFixture(name) {
  const root = mkdtempSync(join(tmpdir(), `ai-carry-promotion-${name}-`)); temporaryRoots.push(root);
  for (const file of ["assistant.toml", "AGENTS.md", "BOOTSTRAP.md"]) cpSync(join(sourceRoot, file), join(root, file));
  cpSync(join(sourceRoot, "core"), join(root, "core"), { recursive: true });
  cpSync(join(sourceRoot, "instance"), join(root, "instance"), { recursive: true });
  mkdirSync(join(root, "dashboard/public"), { recursive: true }); mkdirSync(join(root, "dashboard/dist"), { recursive: true });
  cpSync(join(sourceRoot, "dashboard/public/snapshot.js"), join(root, "dashboard/public/snapshot.js"));
  cpSync(join(sourceRoot, "dashboard/dist/snapshot.js"), join(root, "dashboard/dist/snapshot.js"));
  let manifest = readFileSync(join(root, "instance/manifest.toml"), "utf8");
  manifest = manifest.replace('instance_id = "template"', `instance_id = "${name}"`)
    .replace('state = "template"', 'state = "instance"').replace('type = "unselected"', 'type = "general"')
    .replace('locked = false', 'locked = true').replace('label = ""', 'label = "通用个人助手"')
    .replace('scope_statement = ""', 'scope_statement = "用于真实学习事务测试"')
    .replace('status = "not-instantiated"', 'status = "active"').replace('guidance_mode = "unselected"', 'guidance_mode = "balanced"')
    .replace('display_name = ""', 'display_name = "晋升事务测试助手"').replace('mission = ""', 'mission = "可靠完成学习晋升"')
    .replace('user_preferences_ref = "instance/profile/README.md"', 'user_preferences_ref = "instance/profile/user.md"');
  writeFileSync(join(root, "instance/manifest.toml"), manifest, "utf8");
  let domainMap = readFileSync(join(root, "instance/maps/domain-map.toml"), "utf8");
  domainMap = domainMap.replace('instance_id = "template"', `instance_id = "${name}"`)
    .replace('direction = "unselected"', 'direction = "general"')
    .replace('status = "empty-until-instantiation"', 'status = "active"');
  writeFileSync(join(root, "instance/maps/domain-map.toml"), domainMap, "utf8");
  for (const ref of ["instance/evolution/index.toml", "instance/signals/control.toml", "instance/maps/signal-map.toml",
    "instance/maps/time-trigger-map.toml", "instance/skills/requirements.toml", "instance/validations/index.toml"]) {
    const path = join(root, ...ref.split("/"));
    let content = readFileSync(path, "utf8").replace('instance_id = "template"', `instance_id = "${name}"`);
    if (ref === "instance/evolution/index.toml") content = content.replace('generated_at = ""', `generated_at = "${new Date().toISOString()}"`);
    writeFileSync(path, content, "utf8");
  }
  writeFileSync(join(root, "instance/profile/user.md"), "# Fixture\n", "utf8");
  writeFileSync(join(root, "instance/startup-capsule.toml"), buildStartupCapsule(root).source, "utf8");
  return root;
}

function cloneFixture(source, name) {
  const parent = mkdtempSync(join(tmpdir(), `ai-carry-promotion-${name}-`)); temporaryRoots.push(parent);
  const root = join(parent, "repository"); cpSync(source, root, { recursive: true }); return root;
}

function truthTreeDigest(root) {
  const hash = createHash("sha256"); const queue = [root];
  while (queue.length) {
    const directory = queue.shift();
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, "en"))) {
      if (directory === root && entry.name === ".assistant-local") continue;
      const path = join(directory, entry.name); const info = lstatSync(path);
      expect(!info.isSymbolicLink(), "fixture truth tree unexpectedly contains a link");
      const ref = path.slice(root.length + 1).replaceAll("\\", "/"); hash.update(`${entry.isDirectory() ? "d" : "f"}\0${ref}\0`);
      if (entry.isDirectory()) queue.push(path); else hash.update(readFileSync(path));
    }
  }
  return `sha256:${hash.digest("hex")}`;
}

function physicalFilesBelow(root) {
  const files = []; const queue = [root];
  while (queue.length) {
    const directory = queue.shift();
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name); const info = lstatSync(path);
      expect(!info.isSymbolicLink(), "fixture source tree unexpectedly contains a link");
      if (entry.isDirectory()) queue.push(path); else if (entry.isFile()) files.push(path);
    }
  }
  return files;
}

function proposal() {
  const formalPreview = `+++
id = "capability.reviewed-summary"
kind = "capability"
status = "active"
title = "先给结论再说明依据"
summary = "在工作汇报中先给出结论，再补充必要依据与风险。"
triggers = ["汇报一下进展"]
aliases = ["先说结论"]
topic_key = "communication-style"
subject_key = "work-progress"
scope = ["工作进度汇报"]
conditions = ["结论已经有可核对依据"]
excludes = ["证据不足或高风险决定"]
lifecycle = "recurring"
expected_next_use = ""
source_refs = []
private_refs = []
supersedes = []
related_asset_ids = []
body_sections = []
minimum_level = 3
confirmation = "explicit-before-action"
approval_state = "explicit"
activation_basis = "explicit-user"
risk_tier = "high"
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
# 使用方式

工作汇报先给结论，再给必要依据、风险与下一步；证据不足时明确说明不确定。
`;
  return {
    title: "先给结论再说明依据", summary: "在工作汇报中先给出结论，再补充必要依据与风险。",
    triggers: ["汇报一下进展"], aliases: ["先说结论"], scope: ["工作进度汇报"],
    conditions: ["结论已经有可核对依据"], excludes: ["证据不足或高风险决定"],
    topic_key: "communication-style", subject_key: "work-progress", target_kind: "capability", target_subtype: "",
    claim_summary: "工作进度汇报应先给结论，再补充依据与风险。", proposed_risk_tier: "high",
    minimum_level: 3, formal_preview: formalPreview,
  };
}

function captureHandoff(root, suffix) {
  const observedAt = new Date(Date.now() - 1000).toISOString();
  const observation = { basis: "same-process-host-task-observation", source_kind: "external-content",
    task_ref_digest: sha256(`task-${suffix}`), context_ref_digest: sha256(`context-${suffix}`),
    occurred_at: observedAt, result_state: "closed-unverified" };
  const prepared = preparePersistentLearningCaptureChallenge(root, proposal(), observation);
  expect(prepared.decision === "persistent-learning-capture-choice-required", `capture prepare failed: ${prepared.reason ?? prepared.decision}`);
  const now = new Date().toISOString();
  const receipt = { basis: "host-current-user-message", message_ref: `message.keep.${suffix}`,
    message_digest: sha256(`keep-${suffix}`), user_message_at: now, confirmed_at: now, choice: "keep", remind_at: "",
    instance_id: prepared.instanceId, proposal_digest: prepared.proposalDigest, challenge_nonce: prepared.challengeNonce };
  const planned = confirmPersistentLearningCaptureChallenge(root, { challengeId: prepared.persistentChallengeId,
    proposal: proposal(), observationAssertion: observation, receipt });
  expect(planned.decision === "persistent-learning-capture-plan-ready"
    && planned.plan.formalPromotionRequest?.decision === "awaiting-review-with-existing-content-authorization",
  `capture did not create the exact targeted-review handoff: ${planned.reason ?? JSON.stringify(planned.plan?.formalPromotionRequest) ?? planned.decision}`);
  const executed = executePersistentLearningCaptureTransaction(root,
    { challengeId: prepared.persistentChallengeId, challengeNonce: prepared.challengeNonce });
  expect(executed.decision === "persistent-learning-capture-execution-complete", `capture execution failed: ${executed.reason ?? executed.decision}`);
  const handoff = planned.plan.formalPromotionRequest;
  return {
    candidate_id: handoff.candidateId, candidate_revision: handoff.candidateSourceRevision,
    review_payload_id: handoff.reviewPayloadId, review_payload_ref: handoff.reviewPayloadRef,
    review_payload_digest: handoff.reviewPayloadDigest, formal_id: handoff.formalId,
    formal_target: handoff.formalTarget, formal_preview_digest: handoff.formalPreviewDigest,
  };
}

function cliCall(command, root, request, env = {}) {
  const requests = mkdtempSync(join(tmpdir(), "ai-carry-promotion-request-")); temporaryRoots.push(requests);
  const path = join(requests, `${command}.json`); writeFileSync(path, `${JSON.stringify(request)}\n`, "utf8");
  const result = spawnSync(process.execPath, [cli, command, root, path], {
    encoding: "utf8", windowsHide: true, env: { ...process.env, ...env },
  });
  const source = result.stdout.trim() || result.stderr.trim();
  let parsed;
  try { parsed = JSON.parse(source); } catch { throw new Error(`CLI ${command} returned non-JSON: ${source}`); }
  return { ...parsed, exitCode: result.status, rawOutput: source };
}

try {
  const seed = createFixture("promotion-seed"); const handoff = captureHandoff(seed, "seed");
  const failures = []; let passed = 0;
  const check = (name, operation) => {
    try { operation(); passed += 1; }
    catch (error) { failures.push({ name, message: error.message }); }
  };

  check("happy-path-and-byte-idempotence", () => {
    const root = cloneFixture(seed, "happy"); const prepared = cliCall("prepare-handoff", root, handoff);
    expect(prepared.decision === "persistent-learning-promotion-prepared" && prepared.contentIncluded === false
      && prepared.writeTargetCount >= 10 && prepared.relatedSignalCount === 1
      && !prepared.rawOutput.includes("formal_preview_base64") && !prepared.rawOutput.includes(root),
    `persistent prepare did not seal a bounded write set: ${prepared.reason ?? prepared.decision}`);
    const action = { transaction_id: prepared.transactionId, transaction_nonce: prepared.transactionNonce };
    expect(cliCall("persist", root, action).decision === "persistent-learning-promotion-planned", "persistent plan did not enter planned state");
    const executed = cliCall("execute", root, action);
    expect(executed.decision === "persistent-learning-promotion-execution-complete" && executed.updated === true, "cross-process execution failed");
    const publicSource = readFileSync(join(root, "dashboard/public/snapshot.js"), "utf8");
    const distSource = readFileSync(join(root, "dashboard/dist/snapshot.js"), "utf8");
    const snapshot = parseCurrentSnapshotEnvelope(publicSource, "promotion happy snapshot");
    expect(publicSource === distSource, "public/dist snapshots are not byte-identical");
    expect(snapshot.capabilities.filter((item) => item.id === handoff.formal_id).length === 1
      && snapshot.evolution.every((item) => item.id !== handoff.candidate_id), "formal card was duplicated or candidate remained visible");
    const candidateRef = `instance/evolution/evolution.learning.${handoff.candidate_id.split(".").at(-1)}.md`;
    const candidate = parseMarkdownFrontmatterHead(readFileSync(join(root, ...candidateRef.split("/")), "utf8"), "archived candidate").values;
    expect(candidate.status === "archived" && candidate.resolution === "promoted" && candidate.resolved_to === handoff.formal_id,
      "source candidate was not archived with promoted resolution");
    const formal = parseMarkdownFrontmatterHead(readFileSync(join(root, ...handoff.formal_target.split("/")), "utf8"), "formal asset").values;
    expect(formal.successful_use_count === 0 && formal.independent_task_count === 0 && formal.distinct_context_count === 0
      && formal.maturity === "unvalidated" && formal.validation_refs.length === 0,
    "candidate observations leaked into formal maturity");
    const domainMap = readFileSync(join(root, "instance/maps/domain-map.toml"), "utf8");
    const control = readFileSync(join(root, "instance/signals/control.toml"), "utf8");
    const timeMap = readFileSync(join(root, "instance/maps/time-trigger-map.toml"), "utf8");
    const relatedSignals = physicalFilesBelow(join(root, "instance/signals")).filter((path) => path.endsWith(".toml")
      && path !== join(root, "instance/signals/control.toml") && readFileSync(path, "utf8").includes(handoff.candidate_id));
    expect(domainMap.includes(`id = ${JSON.stringify(handoff.formal_id)}`)
      && domainMap.includes(`target = ${JSON.stringify(handoff.formal_target)}`), "formal direct route did not close");
    expect(control.includes('update_state = "clean"') && control.includes('pending_operation_id = ""')
      && timeMap.includes(`source_ref = ${JSON.stringify(candidateRef)}`) === false
      && relatedSignals.length === 1 && relatedSignals.every((path) => readFileSync(path, "utf8").includes('status = "resolved"')),
    "related signal, reminder, or control state did not close consistently");
    const beforeRepeat = truthTreeDigest(root); const repeated = cliCall("execute", root, action); const afterRepeat = truthTreeDigest(root);
    expect(repeated.decision === "persistent-learning-promotion-execution-complete" && repeated.updated === false
      && repeated.idempotent === true && repeated.writeCount === 0 && beforeRepeat === afterRepeat,
    "second execution was not an exact tree no-op");
  });

  check("unchanged-handoff-reuses-authorization", () => {
    const root = cloneFixture(seed, "unchanged");
    const prepared = preparePersistentPromotionFromHandoff(root, handoff, { proposedFormalPreview: proposal().formal_preview });
    expect(prepared.decision === "persistent-learning-promotion-prepared"
      && prepared.authorizationBasis === "verified-existing-review-handoff", "unchanged exact preview requested another confirmation");
    const closed = closePersistentPromotionTransaction(root, { transactionId: prepared.transactionId, transactionNonce: prepared.transactionNonce });
    expect(closed.decision === "persistent-learning-promotion-closed", "unchanged authorization fixture did not close safely");
  });

  check("material-change-requires-new-confirmation", () => {
    const root = cloneFixture(seed, "material"); const before = truthTreeDigest(root);
    const changed = preparePersistentPromotionFromHandoff(root, handoff,
      { proposedFormalPreview: proposal().formal_preview.replace("先给结论再说明依据", "扩大范围后的标题") });
    expect(changed.decision === "learning-promotion-new-confirmation-required" && truthTreeDigest(root) === before,
      "material preview change was silently authorized or wrote truth state");
  });

  for (const [label, chooseStep] of [["first", () => 1], ["middle", (count) => Math.ceil(count / 2)], ["last", (count) => count]]) {
    check(`${label}-step-interruption-resume`, () => {
      const root = cloneFixture(seed, `fault-${label}`); const prepared = cliCall("prepare-handoff", root, handoff);
      const action = { transaction_id: prepared.transactionId, transaction_nonce: prepared.transactionNonce };
      expect(cliCall("persist", root, action).decision === "persistent-learning-promotion-planned", `${label} fault plan did not persist`);
      const exactPreimage = truthTreeDigest(root);
      const faultAt = chooseStep(prepared.stepCount);
      const interrupted = cliCall("execute", root, action, { AI_CARRY_PROMOTION_TEST_FAULTS: "1",
        AI_CARRY_PROMOTION_FAIL_AFTER_STEP: String(faultAt) });
      const coreComplete = faultAt >= 3;
      expect(coreComplete
        ? ["persistent-learning-promotion-core-complete-projections-pending", "persistent-learning-promotion-execution-complete"].includes(interrupted.decision)
        : interrupted.decision === "persistent-learning-promotion-execution-denied",
      `${label} fault did not stay inside the expected core/projection boundary`);
      const inspected = cliCall("inspect", root, action);
      expect(["persistent-learning-promotion-resume-or-rollback-required",
        "persistent-learning-promotion-core-complete-projections-pending", "persistent-learning-promotion-final"].includes(inspected.decision),
        `${label} interruption did not preserve a legal prefix/final state`);
      const resumed = inspected.decision === "persistent-learning-promotion-final"
        ? cliCall("execute", root, action) : cliCall("resume", root, action);
      expect(["persistent-learning-promotion-resume-complete", "persistent-learning-promotion-execution-complete"].includes(resumed.decision),
        `${label} interruption did not resume its remaining work`);
      if (!coreComplete) expect(exactPreimage !== truthTreeDigest(root), "resumed core transaction did not publish the authorized asset");
      const beforeRepeat = truthTreeDigest(root); const repeated = cliCall("execute", root, action);
      expect(repeated.updated === false && truthTreeDigest(root) === beforeRepeat, `${label} resumed transaction was not idempotent`);
    });
  }

  check("atomic-rename-residue-recovers", () => {
    const root = cloneFixture(seed, "atomic-residue"); const prepared = cliCall("prepare-handoff", root, handoff);
    const action = { transaction_id: prepared.transactionId, transaction_nonce: prepared.transactionNonce };
    const bundle = join(root, ".assistant-local/learning-promotion-transactions", prepared.transactionId);
    const recordPath = join(bundle, "record.json"); const record = JSON.parse(readFileSync(recordPath, "utf8"));
    const stagedRecord = { ...record, status: "planned", updated_at: new Date().toISOString() };
    writeFileSync(`${recordPath}.atomic-stage`, `${JSON.stringify(stagedRecord, null, 2)}\n`, "utf8");
    renameSync(recordPath, `${recordPath}.atomic-backup`);
    expect(cliCall("inspect", root, action).decision === "persistent-learning-promotion-preimage"
      && existsSync(recordPath) && !existsSync(`${recordPath}.atomic-stage`) && !existsSync(`${recordPath}.atomic-backup`),
    "mid-record rename residue was not restored to the prepared record");
    expect(cliCall("persist", root, action).decision === "persistent-learning-promotion-planned", "recovered record could not persist");
    const plan = JSON.parse(readFileSync(join(bundle, "plan.json"), "utf8"));
    const step = plan.steps.find((item) => item.phase === "archived-source-candidate");
    const blob = plan.blobs.find((item) => item.digest === step.proposed_digest); const target = join(root, ...step.target.split("/"));
    const stem = `${target}.promotion-${plan.plan_digest.slice(7, 23)}-step-${step.ordinal}`;
    writeFileSync(`${stem}.stage`, Buffer.from(blob.content_base64, "base64"), { flag: "wx" }); renameSync(target, `${stem}.backup`);
    const inspected = cliCall("inspect", root, action);
    expect(inspected.decision === "persistent-learning-promotion-preimage" && existsSync(target)
      && !existsSync(`${stem}.stage`) && !existsSync(`${stem}.backup`), "mid-rename residue was not restored to its exact preimage");
    expect(cliCall("execute", root, action).decision === "persistent-learning-promotion-execution-complete",
      "recovered atomic residue could not execute");
  });

  check("tamper-path-template-secret-and-snapshot-boundaries", () => {
    const pathRoot = cloneFixture(seed, "path");
    expect(cliCall("prepare-handoff", pathRoot, { ...handoff, formal_target: "../escaped.md" }).decision.endsWith("-denied"),
      "path traversal request was accepted");
    const testMarker = "PROMOTION_TEST_MARKER_7f4c0d";
    const secretResult = cliCall("prepare-handoff", pathRoot, { ...handoff, injected_secret: testMarker });
    expect(secretResult.decision.endsWith("-denied") && !secretResult.rawOutput.includes(testMarker) && !secretResult.rawOutput.includes(pathRoot),
      "CLI echoed secret content or an absolute repository path");
    const templateRoot = cloneFixture(seed, "template"); const manifestPath = join(templateRoot, "instance/manifest.toml");
    writeFileSync(manifestPath, readFileSync(manifestPath, "utf8").replace('state = "instance"', 'state = "template"'), "utf8");
    expect(cliCall("prepare-handoff", templateRoot, handoff).decision.endsWith("-denied"), "template instance accepted promotion");
    const snapshotRoot = cloneFixture(seed, "snapshot-drift");
    writeFileSync(join(snapshotRoot, "dashboard/dist/snapshot.js"), `${readFileSync(join(snapshotRoot, "dashboard/dist/snapshot.js"), "utf8")}\n`, "utf8");
    const snapshotPrepared = cliCall("prepare-handoff", snapshotRoot, handoff);
    expect(snapshotPrepared.decision === "persistent-learning-promotion-prepared",
      "a repairable dual-snapshot drift blocked the authorized promotion");
    const snapshotAction = { transaction_id: snapshotPrepared.transactionId, transaction_nonce: snapshotPrepared.transactionNonce };
    expect(cliCall("persist", snapshotRoot, snapshotAction).decision === "persistent-learning-promotion-planned"
      && cliCall("execute", snapshotRoot, snapshotAction).decision === "persistent-learning-promotion-execution-complete"
      && readFileSync(join(snapshotRoot, "dashboard/public/snapshot.js"), "utf8")
        === readFileSync(join(snapshotRoot, "dashboard/dist/snapshot.js"), "utf8"),
    "promotion did not repair the derived snapshot pair after preserving core truth");
    const tamperRoot = cloneFixture(seed, "plan-tamper"); const prepared = cliCall("prepare-handoff", tamperRoot, handoff);
    const action = { transaction_id: prepared.transactionId, transaction_nonce: prepared.transactionNonce }; cliCall("persist", tamperRoot, action);
    const before = truthTreeDigest(tamperRoot); const planPath = join(tamperRoot, ".assistant-local/learning-promotion-transactions", prepared.transactionId, "plan.json");
    const plan = JSON.parse(readFileSync(planPath, "utf8")); plan.formal_id = "capability.substituted"; writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
    expect(cliCall("execute", tamperRoot, action).decision.endsWith("-denied") && truthTreeDigest(tamperRoot) === before,
      "tampered plan executed or changed truth bytes");
  });

  check("promotion-projection-residue-cleanup-is-bounded", () => {
    const root = cloneFixture(seed, "projection-cleanup"); const parent = dirname(root);
    const residue = join(parent, ".ai-carry-promotion-projection-owned-test"); mkdirSync(residue);
    writeFileSync(join(residue, ".ai-carry-promotion-projection-owner.json"), `${JSON.stringify({ schema_version: 1,
      record_type: "learning-promotion-projection-residue", repository_binding: sha256(root.normalize("NFC")),
      created_at: new Date(Date.now() - 2 * 60 * 60_000).toISOString() })}\n`, "utf8");
    linkSync(join(root, "assistant.toml"), join(residue, "assistant-copy.toml"));
    const cleaned = cleanupPromotionProjectionResidue(root, { now: new Date() });
    expect(cleaned.decision === "learning-promotion-projection-cleanup-complete" && cleaned.removedCount === 1
      && !existsSync(residue) && existsSync(join(root, "assistant.toml")), "owned stale projection was not safely removed");
    const outside = join(parent, "outside-sentinel"); mkdirSync(outside); writeFileSync(join(outside, "keep.txt"), "keep", "utf8");
    const forged = join(parent, ".ai-carry-promotion-projection-forged-link"); symlinkSync(outside, forged, "junction");
    const denied = cleanupPromotionProjectionResidue(root, { now: new Date() });
    expect(denied.decision === "learning-promotion-projection-cleanup-denied" && existsSync(join(outside, "keep.txt")),
      "forged projection link was followed or deleted");
    const prepared = preparePersistentPromotionFromHandoff(root, handoff);
    expect(prepared.decision === "persistent-learning-promotion-prepared"
      && prepared.projectionPending?.includes("dashboard-public-snapshot")
      && existsSync(join(outside, "keep.txt")),
    "an unrelated forged projection residue blocked source promotion preparation or was removed");
    const action = { transaction_id: prepared.transactionId, transaction_nonce: prepared.transactionNonce };
    expect(cliCall("persist", root, action).decision === "persistent-learning-promotion-planned",
      "projection-degraded promotion plan did not persist");
    const executed = cliCall("execute", root, action);
    expect(executed.decision === "persistent-learning-promotion-execution-complete-projections-pending"
      && executed.projectionPending?.includes("dashboard-public-snapshot")
      && executed.ordinaryTasksContinue === true
      && existsSync(join(root, ...handoff.formal_target.split("/")))
      && existsSync(join(outside, "keep.txt")),
    "projection cleanup trouble blocked the formal asset/direct route or removed unrelated bytes");
  });

  check("prepared-expiry-does-not-delete-planned-evidence", () => {
    const old = new Date(Date.now() - 2 * 60 * 60_000);
    const preparedRoot = cloneFixture(seed, "prepared-expiry");
    const prepared = preparePersistentPromotionFromHandoff(preparedRoot, handoff, { now: old });
    const cleaned = cleanupPersistentPromotionTransactions(preparedRoot, { now: new Date() });
    expect(cleaned.decision === "persistent-learning-promotion-cleanup-complete" && cleaned.removedPreparedCount === 1,
      "expired exact-preimage prepared bundle was not cleaned");
    const plannedRoot = cloneFixture(seed, "planned-preserve");
    const planned = preparePersistentPromotionFromHandoff(plannedRoot, handoff, { now: old });
    const action = { transaction_id: planned.transactionId, transaction_nonce: planned.transactionNonce };
    expect(cliCall("persist", plannedRoot, action).decision === "persistent-learning-promotion-planned", "planned evidence fixture did not persist");
    cliCall("execute", plannedRoot, action, { AI_CARRY_PROMOTION_TEST_FAULTS: "1", AI_CARRY_PROMOTION_FAIL_AFTER_STEP: "1" });
    const preserved = cleanupPersistentPromotionTransactions(plannedRoot, { now: new Date() });
    expect(preserved.decision === "persistent-learning-promotion-cleanup-recovery-required" && preserved.preservedCount === 1
      && existsSync(join(plannedRoot, ".assistant-local/learning-promotion-transactions", planned.transactionId)),
    "expired planned prefix evidence was TTL-deleted");
  });

  if (failures.length) {
    console.error(JSON.stringify({ passed, failed: failures.length, firstFailure: failures[0], failures }, null, 2));
    throw new Error(`${failures.length} learning promotion transaction checks failed; first: ${failures[0].name}: ${failures[0].message}`);
  }
  console.log(`learning promotion persistent transaction passed ${passed} real-instance checks (handoff reuse/material change, fault recovery, tamper boundaries, exact snapshots, idempotence)`);
} finally {
  for (const root of temporaryRoots.reverse()) rmSync(root, { recursive: true, force: true });
}
