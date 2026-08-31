import { createHash, randomBytes } from "node:crypto";
import { realpathSync } from "node:fs";
import { consumeTrustedModelLevel, findPotentialFormalDuplicates, loadTrustedDomainEnvelope, parseMarkdownFrontmatterHead, prepareNewFormalTarget, resolveTrustedModelLevel, stableAssetId, trustedMaintenanceStateDigest, validateProposedFormalAsset, verifyNewFormalTarget } from "./asset-route-contract.mjs";
import { auditFormalIdAgainstCandidateHistory, loadTrustedPromotionCandidateRecord, verifyTrustedPromotionCandidateRecord } from "./candidate-index-contract.mjs";
import { locateHighConfidenceSecretCandidates } from "./secret-content-boundary.mjs";
import { containsForbiddenLocationReference } from "./safe-output-boundary.mjs";

const formalKinds = new Set(["memory", "capability", "sop", "experience"]);
const stableDigest = /^sha256:[a-f0-9]{64}$/u;
const unsafe = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u;
const trustedReviews = new WeakMap();
const trustedConfirmations = new WeakMap();
const trustedPlans = new WeakMap();
const consumedConfirmations = new WeakSet();
const consumedConfirmationMessageRefs = new Map();

function fail(reason) { return Object.freeze({ decision: "promotion-review-denied", reason, executable: false }); }
function clean(value, max, allowEmpty = true) {
  return typeof value === "string" && (allowEmpty || value.length > 0) && [...value].length <= max
    && value.normalize("NFC") === value && !unsafe.test(value);
}
function exactObject(value, fields) {
  return value && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype
    && Object.keys(value).length === fields.size && Object.keys(value).every((key) => fields.has(key));
}
function hash(value) { return `sha256:${createHash("sha256").update(value).digest("hex")}`; }
function validSubtype(kind, subtype) {
  if (kind === "memory") return ["general", "habit"].includes(subtype);
  if (kind === "experience") return ["task", "host-execution"].includes(subtype);
  return ["capability", "sop"].includes(kind) && subtype === "";
}
function validPreviewAuthorization(asset, candidate, mode) {
  return mode === "explicit-user"
    && asset.approval_state === "explicit" && asset.activation_basis === "explicit-user" && asset.approved_by_user === true
    && (asset.status === "active" || (asset.status === "provisional" && asset.risk_tier === "low"));
}
function classificationChange(candidate, asset) {
  return candidate.targetKind !== asset.kind || (candidate.targetSubtype ?? "") !== (asset.subtype ?? "");
}
function duplicateProposals(candidate, asset) {
  return [
    { id: candidate.id, kind: formalKinds.has(candidate.targetKind) ? candidate.targetKind : asset.kind, title: candidate.title, summary: candidate.summary,
      topicKey: candidate.topicKey, subjectKey: candidate.subjectKey, triggers: candidate.triggers, aliases: candidate.aliases, scope: candidate.scope, conditions: candidate.conditions },
    { id: asset.id, kind: asset.kind, title: asset.title, summary: asset.summary, topicKey: asset.topic_key ?? "", subjectKey: asset.subject_key ?? "",
      triggers: asset.triggers ?? [], aliases: asset.aliases ?? [], scope: asset.scope ?? [], conditions: asset.conditions ?? [] },
  ];
}
function proposedRouteProjection(asset, formalTarget) {
  const route = {
    id: asset.id, asset_kind: asset.kind, ...(asset.subtype ? { subtype: asset.subtype } : {}), title: asset.title, summary: asset.summary,
    triggers: asset.triggers, aliases: asset.aliases ?? [], topic_key: asset.topic_key ?? "", subject_key: asset.subject_key ?? "",
    scope: asset.scope ?? [], conditions: asset.conditions ?? [], excludes: asset.excludes ?? [], related_asset_ids: asset.related_asset_ids ?? [],
    body_sections: asset.body_sections ?? [], target: formalTarget, state: asset.status, minimum_level: asset.minimum_level, confirmation: asset.confirmation,
  };
  const source = `\n[[routes]]\n${Object.entries(route).map(([key, value]) => `${key} = ${JSON.stringify(value)}`).join("\n")}\n`;
  return Object.freeze({ route: Object.freeze(route), source, bytes: Buffer.byteLength(source, "utf8"), digest: hash(source) });
}
function currentReviewStateValid(repository, trust, current) {
  try {
    if (current.context.instanceId !== trust.context.instanceId || current.context.learningPolicy !== trust.context.learningPolicy
      || trustedMaintenanceStateDigest(repository, current.envelope) !== trust.maintenanceStateDigest || current.envelope.explicitRoute
      || !verifyNewFormalTarget(repository, trust.targetProof)) return false;
    const body = trust.normalizedPreview.slice(parseMarkdownFrontmatterHead(trust.normalizedPreview, "formal promotion revalidation").bodyOffset);
    const proposal = validateProposedFormalAsset(repository, current.envelope, trust.asset, body);
    if (proposal.decision !== "proposal-metadata-valid") return false;
    const duplicates = findPotentialFormalDuplicates(repository, current.envelope, duplicateProposals(trust.candidate, trust.asset));
    return duplicates.decision === "duplicate-check-complete" && duplicates.matches.length === 0;
  } catch { return false; }
}

// Optional defense-in-depth library. It never mutates AI Carry and never
// treats caller JSON as a durable-write authorization. A real candidate, the
// current instance/map/registry and exact proposed formal bytes are bound into
// one same-process review. Cross-turn hosts must use the documented lifecycle;
// this file does not claim a persistent CLI confirmation channel.
export function preparePromotionReview(repository, { candidateId, formalTarget, formalPreview, mode = "explicit-user", classificationReason = "", levelEvidence = undefined } = {}) {
  if (mode !== "explicit-user" || typeof formalPreview !== "string"
    || Buffer.byteLength(formalPreview, "utf8") === 0 || Buffer.byteLength(formalPreview, "utf8") > 128 * 1024) return fail("request-invalid");
  const levelPurpose = "review-and-promote-formal-ai-carry-asset";
  let repositoryReal; let context; let envelope; let candidate;
  try {
    repositoryReal = realpathSync(repository);
    ({ context, envelope } = loadTrustedDomainEnvelope(repository, { explicitRequestedId: candidateId }));
    if (context.manifestState !== "instance" || !["risk-tiered", "manual-only"].includes(context.learningPolicy)) return fail("instantiated-learning-context-required");
    if (!envelope.ordinaryMatchingAllowed) return fail("domain-map-rebuild-required-before-promotion");
    candidate = loadTrustedPromotionCandidateRecord(repository, { instanceContext: context, candidateId });
  } catch { return fail("trusted-candidate-unavailable"); }
  if (candidate.status !== "candidate" || candidate.observationState !== "explicit"
    || !["explicit-user", "existing-approved-migration"].includes(candidate.observationBasis)) return fail("candidate-review-state-requires-targeted-resolution");
  if (candidate.candidateRelation !== "new") return fail("non-new-relation-requires-targeted-level3-review");
  let parsed;
  try { parsed = parseMarkdownFrontmatterHead(formalPreview, "formal promotion preview"); }
  catch { return fail("formal-preview-frontmatter-invalid"); }
  const asset = parsed.values;
  if (!stableAssetId.test(asset.id ?? "") || !formalKinds.has(asset.kind) || !validSubtype(asset.kind, asset.subtype ?? "")
    || !clean(asset.title, 80, false) || !clean(asset.summary, 240, false)
    || !["low", "medium", "high"].includes(asset.risk_tier) || asset.risk_tier !== candidate.riskTier
    || ![1, 2, 3].includes(asset.minimum_level) || !context.allowedConfirmationGates.includes(asset.confirmation)
    || (["medium", "high"].includes(asset.risk_tier) && asset.confirmation === "none")
    || (mode === "explicit-user" && classificationChange(candidate, asset) && !clean(classificationReason, 240, false))
    || !validPreviewAuthorization(asset, candidate, mode)) return fail("formal-preview-contract-invalid");
  const riskReviewLevel = asset.risk_tier === "high" ? 3 : asset.risk_tier === "medium" ? 2 : 1;
  const requiredReviewLevel = classificationChange(candidate, asset) ? 3 : Math.max(riskReviewLevel, asset.minimum_level);
  if (resolveTrustedModelLevel(levelEvidence, { expectedPurpose: levelPurpose }) < requiredReviewLevel) return fail(`verified-level${requiredReviewLevel}-required`);
  try { auditFormalIdAgainstCandidateHistory(repository, { instanceContext: context, proposedFormalId: asset.id, sourceCandidateId: candidate.id }); }
  catch { return fail("formal-id-collides-with-candidate-history"); }
  const proposalValidation = validateProposedFormalAsset(repository, envelope, asset, formalPreview.replaceAll("\r\n", "\n").slice(parsed.bodyOffset));
  if (proposalValidation.decision !== "proposal-metadata-valid") return fail(proposalValidation.reason ?? "formal-preview-schema-invalid");
  const maturityBearing = ["capability", "sop"].includes(asset.kind) || (asset.kind === "experience" && asset.subtype === "host-execution");
  if (maturityBearing && (asset.maturity !== "unvalidated" || asset.independent_task_count !== 0
    || asset.successful_use_count !== 0 || asset.failed_use_count !== 0 || (asset.validation_refs ?? []).length !== 0)) return fail("new-formal-preview-cannot-preclaim-maturity");
  if ((asset.related_asset_ids ?? []).length > 0 || (asset.supersedes ?? []).length > 0) return fail("new-relation-preview-cannot-change-existing-assets");
  let targetProof;
  try { targetProof = prepareNewFormalTarget(repository, formalTarget, asset.kind); }
  catch { return fail("formal-target-unavailable-or-unsafe"); }
  let currentTarget;
  try { currentTarget = loadTrustedDomainEnvelope(repository, { explicitRequestedId: asset.id }).envelope.explicitRoute; }
  catch { return fail("trusted-map-unavailable"); }
  if (currentTarget || envelope.explicitRoute) return fail("candidate-or-formal-id-already-registered");
  const projectedRoute = proposedRouteProjection(asset, formalTarget);
  if (Buffer.byteLength(JSON.stringify(projectedRoute.route), "utf8") > 2048 || envelope.routeCount + 1 > 96
    || envelope.bytes + projectedRoute.bytes > 32768) return fail("domain-map-soft-budget-maintenance-required-before-promotion");
  const duplicateCheck = findPotentialFormalDuplicates(repository, envelope, duplicateProposals(candidate, asset));
  if (duplicateCheck.decision !== "duplicate-check-complete") return fail("formal-duplicate-check-unavailable");
  if (duplicateCheck.matches.length > 0) return fail("possible-formal-duplicate-requires-targeted-level3-review");
  const normalizedPreview = formalPreview.replaceAll("\r\n", "\n");
  const body = normalizedPreview.slice(parsed.bodyOffset);
  if (!body.trim() || locateHighConfidenceSecretCandidates(normalizedPreview).blocked || containsForbiddenLocationReference(body)) return fail("formal-preview-sensitive-or-empty");
  const promotionChangeGateIds = Object.freeze(["before-durable-change"]);
  const retainedFutureActionGateIds = Object.freeze([...new Set([
    ...(asset.confirmation === "none" ? [] : [asset.confirmation]),
    ...(["medium", "high"].includes(asset.risk_tier) ? ["risk-dependent-before-action"] : []),
  ])].sort());
  if ([...promotionChangeGateIds, ...retainedFutureActionGateIds].some((id) => !context.allowedConfirmationGates.includes(id))) return fail("required-gate-registry-drift");
  const previewDigest = hash(Buffer.from(normalizedPreview, "utf8"));
  const issuedAtMs = Date.now();
  const challengeNonce = randomBytes(18).toString("hex");
  const review = Object.freeze({
    decision: "promotion-confirmation-required",
    executable: false, candidateId: candidate.id, candidateRevision: candidate.sourceRevision,
    formalId: asset.id, formalKind: asset.kind, formalSubtype: asset.subtype ?? "", formalStatus: asset.status,
    formalRiskTier: asset.risk_tier, requiredReviewLevel, formalPreviewDigest: previewDigest, projectedRouteDigest: projectedRoute.digest,
    classificationChange: Object.freeze({ fromKind: candidate.targetKind, fromSubtype: candidate.targetSubtype ?? "", toKind: asset.kind, toSubtype: asset.subtype ?? "", reason: classificationChange(candidate, asset) ? classificationReason : "unchanged" }),
    promotionChangeGateIds, retainedFutureActionGateIds,
    challengeNonce, issuedAt: new Date(issuedAtMs).toISOString(), expiresAt: new Date(issuedAtMs + 10 * 60_000).toISOString(),
    confirmationReceiptContract: "same-process-current-user-message-v2",
  });
  const maintenanceStateDigest = trustedMaintenanceStateDigest(repository, envelope);
  if (!maintenanceStateDigest) return fail("trusted-maintenance-state-unavailable");
  if (requiredReviewLevel > 1 && consumeTrustedModelLevel(levelEvidence, levelPurpose) < requiredReviewLevel) return fail(`verified-level${requiredReviewLevel}-ticket-stale-or-consumed`);
  trustedReviews.set(review, Object.freeze({ repository: repositoryReal, context, envelope, maintenanceStateDigest, candidate, asset, formalTarget, targetProof,
    normalizedPreview, previewDigest, projectedRouteDigest: projectedRoute.digest, promotionChangeGateIds, retainedFutureActionGateIds, challengeNonce, issuedAtMs, mode }));
  return review;
}

export function confirmPromotionReview(repository, review, receipt) {
  let repositoryReal;
  try { repositoryReal = realpathSync(repository); } catch { return fail("repository-unavailable"); }
  const trust = trustedReviews.get(review);
  if (!trust || trust.repository !== repositoryReal || trust.mode !== "explicit-user") return fail("untrusted-or-nonconfirmable-review");
  const fields = new Set(["basis", "message_ref", "confirmed_at", "candidate_id", "candidate_revision", "formal_id", "formal_preview_digest", "challenge_nonce", "confirmed_change_gate_ids"]);
  const confirmedAt = Date.parse(receipt?.confirmed_at ?? ""); const now = Date.now();
  for (const [key, expiresAt] of consumedConfirmationMessageRefs) if (expiresAt < now) consumedConfirmationMessageRefs.delete(key);
  const messageKey = `${trust.context.instanceId}:${receipt?.message_ref ?? ""}`;
  const gateIds = Array.isArray(receipt?.confirmed_change_gate_ids) ? receipt.confirmed_change_gate_ids : [];
  const valid = exactObject(receipt, fields) && receipt.basis === "host-current-user-message" && stableAssetId.test(receipt.message_ref ?? "")
    && receipt.candidate_id === trust.candidate.id && receipt.candidate_revision === trust.candidate.sourceRevision
    && receipt.formal_id === trust.asset.id && receipt.formal_preview_digest === trust.previewDigest && stableDigest.test(receipt.formal_preview_digest)
    && receipt.challenge_nonce === trust.challengeNonce && !consumedConfirmationMessageRefs.has(messageKey)
    && Number.isFinite(confirmedAt) && /[zZ]|[+-]\d{2}:\d{2}$/u.test(receipt.confirmed_at)
    && confirmedAt >= trust.issuedAtMs && confirmedAt <= now + 60_000 && confirmedAt <= trust.issuedAtMs + 10 * 60_000
    && gateIds.length === trust.promotionChangeGateIds.length && new Set(gateIds).size === gateIds.length
    && trust.promotionChangeGateIds.every((id) => gateIds.includes(id));
  if (!valid || !verifyTrustedPromotionCandidateRecord(repository, trust.candidate) || !verifyNewFormalTarget(repository, trust.targetProof)) return fail("confirmation-invalid-stale-or-drifted");
  let current;
  try { current = loadTrustedDomainEnvelope(repository, { explicitRequestedId: trust.asset.id }); }
  catch { return fail("trusted-context-no-longer-valid"); }
  if (!currentReviewStateValid(repository, trust, current)) return fail("manifest-map-registry-duplicate-or-target-drifted");
  trustedReviews.delete(review);
  consumedConfirmationMessageRefs.set(messageKey, trust.issuedAtMs + 10 * 60_000);
  const confirmation = Object.freeze({
    decision: "explicit-promotion-confirmed", executable: false, candidateId: trust.candidate.id,
    candidateRevision: trust.candidate.sourceRevision, formalId: trust.asset.id, formalPreviewDigest: trust.previewDigest,
    initialStatus: trust.asset.status, initialMaturity: ["capability", "sop"].includes(trust.asset.kind) ? (trust.asset.maturity ?? "unvalidated") : "not-applicable",
    confirmationTrust: "host-asserted-current-user-message-not-cryptographically-verifiable",
  });
  trustedConfirmations.set(confirmation, Object.freeze({ ...trust, currentContext: current.context, confirmationExpiresAt: trust.issuedAtMs + 10 * 60_000 }));
  return confirmation;
}

export function buildPromotionTransactionPlan(repository, confirmation) {
  const trust = trustedConfirmations.get(confirmation);
  const candidateTrust = trust ? verifyTrustedPromotionCandidateRecord(repository, trust.candidate) : null;
  if (!trust || !candidateTrust || consumedConfirmations.has(confirmation) || trust.confirmationExpiresAt < Date.now()
    || !verifyNewFormalTarget(repository, trust.targetProof)) return Object.freeze({ decision: "no-transaction", executable: false });
  let current;
  try { current = loadTrustedDomainEnvelope(repository, { explicitRequestedId: trust.asset.id }); }
  catch { return Object.freeze({ decision: "no-transaction", executable: false }); }
  if (!currentReviewStateValid(repository, trust, current)) return Object.freeze({ decision: "no-transaction", executable: false });
  const planExpiresAtMs = Math.min(trust.confirmationExpiresAt, Date.now() + 2 * 60_000);
  const planCore = {
    decision: "transaction-preview", executable: false, transactionRequired: true,
    sourceCandidateId: trust.candidate.id, sourceCandidateRevision: trust.candidate.sourceRevision,
    sourceCandidateIndexDigest: candidateTrust.indexDigest, sourceCandidateDigest: candidateTrust.sourceDigest,
    formalId: trust.asset.id, formalKind: trust.asset.kind, formalSubtype: trust.asset.subtype ?? "",
    formalTarget: trust.formalTarget, formalPreviewDigest: trust.previewDigest, projectedRouteDigest: trust.projectedRouteDigest,
    targetPreimage: "absent", promotionChangeGateIds: trust.promotionChangeGateIds, retainedFutureActionGateIds: trust.retainedFutureActionGateIds,
    requiredProjectionSet: Object.freeze(["formal-asset", "instance-domain-map", "archived-source-candidate", "evolution-candidate-index", "matching-learning-signal-if-present", "dashboard-public-snapshot", "dashboard-dist-snapshot"]),
    requiredAudits: Object.freeze(["formal-source-closure", "candidate-source-closure", "snapshot-source-digest", "second-run-idempotence", "rollback-on-any-failure"]),
    expiresAt: new Date(planExpiresAtMs).toISOString(),
    preCommitRequirements: Object.freeze(["reverify-manifest-map-candidate-target-preimage", "stage-complete-write-set", "rollback-on-any-failure"]),
  };
  const previewDigest = hash(JSON.stringify(planCore));
  const plan = Object.freeze({ ...planCore, previewDigest, completeness: "bound-input-preview-not-a-filesystem-transaction-executor" });
  consumedConfirmations.add(confirmation);
  trustedPlans.set(plan, Object.freeze({ repository: realpathSync(repository), candidateId: trust.candidate.id, formalId: trust.asset.id,
    formalPreview: trust.normalizedPreview, formalPreviewDigest: trust.previewDigest, expiresAt: planExpiresAtMs }));
  return plan;
}

export function projectPromotionState(state, plan) {
  const trust = trustedPlans.get(plan);
  if (!trust || trust.expiresAt < Date.now() || !state || typeof state !== "object") throw new Error("untrusted or expired promotion plan");
  const keys = ["formal_ids", "active_candidate_ids", "archived_candidate_ids", "dashboard_formal_ids", "dashboard_candidate_ids"];
  const lists = Object.fromEntries(keys.map((key) => [key, Array.isArray(state[key]) && new Set(state[key]).size === state[key].length ? state[key] : null]));
  if (Object.values(lists).some((value) => value === null)) throw new Error("invalid promotion projection state");
  const sourceActive = lists.active_candidate_ids.includes(trust.candidateId);
  const sourceArchived = lists.archived_candidate_ids.includes(trust.candidateId);
  const formalExists = lists.formal_ids.includes(trust.formalId);
  const dashboardFormal = lists.dashboard_formal_ids.includes(trust.formalId);
  const dashboardCandidate = lists.dashboard_candidate_ids.includes(trust.candidateId);
  const initial = sourceActive && !sourceArchived && !formalExists && !dashboardFormal && dashboardCandidate;
  const committed = !sourceActive && sourceArchived && formalExists && dashboardFormal && !dashboardCandidate;
  if (committed) return Object.freeze(Object.fromEntries(keys.map((key) => [key, Object.freeze([...lists[key]])])));
  if (!initial) throw new Error("partial, colliding, or source-missing promotion state");
  return Object.freeze({
    formal_ids: Object.freeze([...lists.formal_ids, trust.formalId]),
    active_candidate_ids: Object.freeze(lists.active_candidate_ids.filter((id) => id !== trust.candidateId)),
    archived_candidate_ids: Object.freeze([...lists.archived_candidate_ids, trust.candidateId]),
    dashboard_formal_ids: Object.freeze([...lists.dashboard_formal_ids, trust.formalId]),
    dashboard_candidate_ids: Object.freeze(lists.dashboard_candidate_ids.filter((id) => id !== trust.candidateId)),
  });
}

// The in-memory review API above remains the same-process preview boundary.
// Cross-process promotion consumes the exact Level 3 handoff persisted by the
// learning-capture transaction; caller JSON is never treated as user authority.
export {
  cleanupPersistentPromotionTransactions,
  cleanupPromotionProjectionResidue,
  closePersistentPromotionTransaction,
  executePersistentPromotionTransaction,
  inspectPersistentPromotionTransaction,
  persistPreparedPromotionTransaction,
  preparePersistentPromotionFromHandoff,
  resumePersistentPromotionTransaction,
  rollbackPersistentPromotionTransaction,
  validatePersistentPromotionPlan,
} from "./learning-promotion-transaction.mjs";
