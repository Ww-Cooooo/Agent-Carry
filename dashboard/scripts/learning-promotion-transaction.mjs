import { createHash, randomBytes } from "node:crypto";
import {
  closeSync, existsSync, fstatSync, linkSync, lstatSync, mkdirSync, mkdtempSync, openSync,
  readSync, readdirSync, realpathSync, renameSync, rmdirSync, rmSync, unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import {
  findPotentialFormalDuplicates,
  loadTrustedDomainEnvelope,
  parseArrayTableDocument,
  parseMarkdownFrontmatterHead,
  parseSectionedToml,
  prepareNewFormalTarget,
  stableAssetId,
  trustedMaintenanceStateDigest,
  validateInstanceManifestStructure,
  validateProposedFormalAsset,
  verifyNewFormalTarget,
} from "./asset-route-contract.mjs";
import {
  auditCandidateSourceClosure,
  auditFormalIdAgainstCandidateHistory,
  candidateTargetSubtypeDisposition,
  loadTrustedPromotionCandidateRecord,
  validateCandidateIndex,
  verifyTrustedPromotionCandidateRecord,
} from "./candidate-index-contract.mjs";
import { locateHighConfidenceSecretCandidates } from "./secret-content-boundary.mjs";
import { containsForbiddenLocationReference } from "./safe-output-boundary.mjs";
import { buildSnapshotCandidate } from "./snapshot-source-builder.mjs";
import { parseCurrentSnapshotEnvelope } from "./snapshot-envelope.mjs";
import { operationalDerivedStateGate } from "./cross-session-signal-transaction.mjs";

const utf8 = new TextDecoder("utf-8", { fatal: true });
const digestPattern = /^sha256:[a-f0-9]{64}$/u;
const unsafeText = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u;
const formalKinds = new Set(["memory", "capability", "sop", "experience"]);
const ordinaryCandidateRelations = new Set(["new", "refine", "condition-variant", "related"]);
const signalStatuses = new Set(["observing", "near-trigger", "pending-review", "conflict", "uncertain", "stale", "resolved", "rejected", "archived"]);
const STORE_REF = ".assistant-local/learning-promotion-transactions";
const PROJECTION_PREFIX = ".ai-carry-promotion-projection-";
const PROJECTION_MARKER = ".ai-carry-promotion-projection-owner.json";
const MANIFEST_REF = "instance/manifest.toml";
const INDEX_REF = "instance/evolution/index.toml";
const CONTROL_REF = "instance/signals/control.toml";
const SIGNAL_MAP_REF = "instance/maps/signal-map.toml";
const TIME_MAP_REF = "instance/maps/time-trigger-map.toml";
const PUBLIC_SNAPSHOT_REF = "dashboard/public/snapshot.js";
const DIST_SNAPSHOT_REF = "dashboard/dist/snapshot.js";
const PROMOTION_CORE_STEP_COUNT = 3;
const limits = Object.freeze({
  manifest: 16 * 1024,
  candidate: 32 * 1024,
  index: 32 * 1024,
  control: 4 * 1024,
  signal: 64 * 1024,
  signalMap: 1536,
  timeMap: 32 * 1024,
  domainMap: 49_152,
  payload: 256 * 1024,
  formal: 128 * 1024,
  snapshot: 8 * 1024 * 1024,
  plan: 96 * 1024 * 1024,
  record: 32 * 1024,
});

const handoffRequestFields = new Set([
  "candidate_id", "candidate_revision", "review_payload_id", "review_payload_ref",
  "review_payload_digest", "formal_id", "formal_target", "formal_preview_digest",
]);
const payloadFields = new Set([
  "schema_version", "record_type", "id", "state", "candidate_id", "formal_id", "formal_kind",
  "formal_preview_digest", "formal_preview_encoding", "formal_preview_base64", "authorization", "review",
]);
const payloadAuthorizationFields = new Set([
  "basis", "message_ref", "message_digest", "message_at", "content_scope",
  "exact_content_authorized", "future_actions_authorized",
]);
const payloadReviewFields = new Set([
  "reason", "required_level", "exact_preview_may_reuse_authorization",
  "material_change_requires_new_confirmation", "result_validation_claimed", "executable",
]);
const currentPayloadReviewFields = new Set([
  "reason", "recommended_level", "exact_preview_may_reuse_authorization",
  "material_change_requires_new_confirmation", "result_validation_claimed", "executable",
]);
const controlFields = new Set([
  "schema_version", "record_type", "instance_id", "source_revision", "projection_revision", "update_state",
  "pending_operation_id", "pending_event_id", "pending_signal_id", "pending_trigger_id", "pending_source_ref",
  "base_revision", "updated_at",
]);
const indexRootFields = new Set([
  "schema_version", "index_id", "instance_id", "state", "source_revision", "generated_at", "budget_bytes",
  "overflow", "candidate_count", "indexed_count", "active_count",
]);
const indexEntryOrder = [
  "id", "title", "summary", "topic_key", "subject_key", "triggers", "aliases", "scope", "conditions",
  "excludes", "target_kind", "target_subtype", "candidate_relation", "status", "observation_state",
  "observation_basis", "risk_tier", "independent_event_count", "last_evidence_at", "source_ref", "source_revision",
];
const signalMapRootFields = new Set([
  "schema_version", "map_id", "instance_id", "state", "source_revision", "generated_at", "budget_bytes",
  "overflow", "active_count", "scheduled_count", "next_wakeup_at", "next_wakeup_ref",
]);
const signalMapEntryFields = new Set([
  "id", "signal_type", "status", "reason", "progress", "next_event", "domain", "route_id", "source_ref",
  "source_signal_revision", "provenance", "trust_state", "minimum_level", "confirmation",
]);
const signalMapEntryOrder = [...signalMapEntryFields];
const timeMapRootFields = new Set([
  "schema_version", "map_id", "instance_id", "state", "source_revision", "generated_at", "scheduled_count",
  "next_wakeup_at",
]);
const timeEntryFields = new Set([
  "id", "kind", "status", "title", "next_check_at", "effective_check_at", "domain", "route_id", "source_ref",
  "source_trigger_revision", "minimum_level", "confirmation",
]);
const timeEntryOrder = [...timeEntryFields];
const candidateFieldOrder = [
  "id", "kind", "status", "title", "summary", "triggers", "scope", "excludes", "lifecycle",
  "expected_next_use", "topic_key", "subject_key", "aliases", "conditions", "target_kind", "target_subtype",
  "candidate_relation", "observation_state", "observation_basis", "observation_event_ref", "claim_summary",
  "proposed_risk_tier", "independent_event_count", "successful_event_count", "failed_event_count",
  "distinct_context_count", "representative_event_ids", "last_evidence_at", "remind_at", "snoozed_until",
  "trigger_revision", "source_revision", "source_refs", "private_refs", "supersedes", "minimum_level",
  "approval_state", "activation_basis", "risk_tier", "approved_by_user", "resolution", "resolved_to", "updated_at",
];
const planFields = new Set([
  "schema_version", "plan_type", "transaction_id", "repository_binding", "instance_id", "manifest_digest",
  "candidate_id", "candidate_revision", "candidate_source_ref", "candidate_source_digest", "candidate_index_digest",
  "authorization", "formal_id", "formal_kind", "formal_subtype", "formal_target", "formal_preview_digest",
  "transaction_at", "projection_issues", "read_bindings", "blobs", "preimages", "steps", "final_digests", "rollback", "write_set", "plan_digest",
]);
const legacyPlanFields = new Set([...planFields].filter((field) => field !== "projection_issues"));
const authorizationFields = new Set([
  "basis", "message_ref", "message_digest", "confirmed_at", "review_payload_id", "review_payload_ref",
  "review_payload_digest", "formal_preview_digest", "reuse_scope", "current_user_role_evidence",
]);
const recordFields = new Set([
  "schema_version", "record_type", "transaction_id", "repository_binding", "instance_id", "status", "nonce_digest",
  "plan_digest", "plan_ref", "candidate_id", "candidate_revision", "review_payload_digest", "formal_id",
  "created_at", "expires_at", "updated_at",
]);

function clean(value, max, allowEmpty = true) {
  return typeof value === "string" && (allowEmpty || value.length > 0) && [...value].length <= max
    && value.normalize("NFC") === value && !unsafeText.test(value);
}
function exactKeys(value, fields) {
  return value && typeof value === "object" && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype
    && Object.keys(value).length === fields.size && Object.keys(value).every((key) => fields.has(key));
}
function safeInteger(value, minimum = 0) { return Number.isSafeInteger(value) && value >= minimum; }
function strictDate(value) {
  return clean(value, 64, false) && /[zZ]|[+-]\d{2}:\d{2}$/u.test(value) && Number.isFinite(Date.parse(value));
}
function sha256(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value, "utf8");
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
function noPoisonKeys(value) {
  if (!value || typeof value !== "object") return true;
  if (Object.keys(value).some((key) => ["__proto__", "prototype", "constructor"].includes(key))) return false;
  return Object.values(value).every(noPoisonKeys);
}
function projectionIssuesOf(plan) { return Array.isArray(plan?.projection_issues) ? plan.projection_issues : []; }
function decode(buffer, label) {
  try { return utf8.decode(buffer); } catch { throw new Error(`${label} is not valid UTF-8`); }
}
function portableRef(ref, { prefix = "", extension = "" } = {}) {
  return clean(ref, 240, false) && (!prefix || ref.startsWith(prefix)) && (!extension || ref.endsWith(extension))
    && !ref.includes("\\") && !ref.includes(":") && !ref.includes("?") && !ref.includes("#") && !isAbsolute(ref)
    && ref.split("/").every((part) => part && part !== "." && part !== ".." && !/[. ]$/u.test(part)
      && !/[<>"|*]/u.test(part));
}
function ensureInside(root, target) {
  const rel = relative(root, target);
  if (rel === "") return;
  if (isAbsolute(rel) || rel === ".." || rel.startsWith(`..${sep}`)) throw new Error("path escaped the bound repository");
}
function verifyParents(root, ref, { allowMissing = false } = {}) {
  let cursor = root;
  for (const part of ref.split("/").slice(0, -1)) {
    cursor = resolve(cursor, part);
    if (!existsSync(cursor)) {
      if (allowMissing) return;
      throw new Error(`${ref} has a missing parent`);
    }
    const info = lstatSync(cursor);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error(`${ref} crosses a link, reparse point, or non-directory`);
    ensureInside(root, realpathSync(cursor));
  }
}
function stableRead(root, ref, maxBytes, { allowMissing = false } = {}) {
  if (!(portableRef(ref, { prefix: "instance/" }) || [PUBLIC_SNAPSHOT_REF, DIST_SNAPSHOT_REF, "assistant.toml",
    "AGENTS.md", "BOOTSTRAP.md"].includes(ref) || ref.startsWith("core/"))) throw new Error("source reference is not portable");
  verifyParents(root, ref, { allowMissing });
  const target = resolve(root, ...ref.split("/")); ensureInside(root, target);
  let pathInfo;
  try { pathInfo = lstatSync(target); } catch (error) {
    if (allowMissing && error?.code === "ENOENT") return null;
    throw error;
  }
  if (!pathInfo.isFile() || pathInfo.isSymbolicLink() || pathInfo.size > maxBytes) throw new Error(`${ref} is not one bounded physical file`);
  ensureInside(root, realpathSync(target));
  const descriptor = openSync(target, "r");
  try {
    const before = fstatSync(descriptor, { bigint: true }); const buffer = Buffer.alloc(Number(before.size)); let offset = 0;
    while (offset < buffer.length) {
      const count = readSync(descriptor, buffer, offset, buffer.length - offset, offset);
      if (count === 0) break; offset += count;
    }
    const after = fstatSync(descriptor, { bigint: true });
    if (offset !== buffer.length || before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size
      || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs) throw new Error(`${ref} changed during read`);
    return Object.freeze({ ref, buffer, text: decode(buffer, ref), byte_length: buffer.length, digest: sha256(buffer) });
  } finally { closeSync(descriptor); }
}
function tomlValue(value) {
  if (typeof value === "string" || Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === "boolean" || Number.isSafeInteger(value)) return String(value);
  throw new Error("unsupported portable TOML value");
}
function serializeRoot(root, order) {
  return order.filter((key) => Object.hasOwn(root, key)).map((key) => `${key} = ${tomlValue(root[key])}`).join("\n");
}
function serializeArrayTable(root, rootOrder, table, entries, entryOrder) {
  const chunks = [serializeRoot(root, rootOrder)];
  for (const entry of entries) chunks.push(`[[${table}]]\n${serializeRoot(entry, entryOrder)}`);
  return `${chunks.join("\n\n")}\n`;
}
function serializeCandidate(values, body) {
  if (Object.keys(values).some((field) => !candidateFieldOrder.includes(field))) throw new Error("candidate has an unsupported field");
  return `+++\n${serializeRoot(values, candidateFieldOrder)}\n+++\n${body}`;
}
function activeCandidate(entry) {
  return entry.status === "candidate" && entry.observation_state === "explicit"
    && ["explicit-user", "existing-approved-migration"].includes(entry.observation_basis)
    && ordinaryCandidateRelations.has(entry.candidate_relation)
    && candidateTargetSubtypeDisposition(entry.target_kind, entry.target_subtype ?? "") === "valid";
}
function strictBase64(value) {
  if (typeof value !== "string" || value.length > 2 * 1024 * 1024) return null;
  const buffer = Buffer.from(value, "base64");
  return buffer.toString("base64") === value ? buffer : null;
}
function formalTargetFor(kind, previewDigest) {
  const folder = { memory: "memory", capability: "capabilities", sop: "sops", experience: "experiences" }[kind];
  return `instance/${folder}/${kind}.${previewDigest.slice("sha256:".length, "sha256:".length + 24)}.md`;
}
function routeProjection(asset, formalTarget) {
  const route = {
    id: asset.id, asset_kind: asset.kind, ...(asset.subtype ? { subtype: asset.subtype } : {}),
    title: asset.title, summary: asset.summary, triggers: asset.triggers, aliases: asset.aliases ?? [],
    topic_key: asset.topic_key ?? "", subject_key: asset.subject_key ?? "", scope: asset.scope ?? [],
    conditions: asset.conditions ?? [], excludes: asset.excludes ?? [], related_asset_ids: asset.related_asset_ids ?? [],
    body_sections: asset.body_sections ?? [], target: formalTarget, state: asset.status,
    minimum_level: asset.minimum_level, confirmation: asset.confirmation,
  };
  const source = `\n[[routes]]\n${Object.entries(route).map(([key, value]) => `${key} = ${JSON.stringify(value)}`).join("\n")}\n`;
  return Object.freeze({ route, source, byte_length: Buffer.byteLength(source, "utf8"), digest: sha256(source) });
}
function duplicateProposals(candidate, asset) {
  return [
    { id: candidate.id, kind: formalKinds.has(candidate.targetKind) ? candidate.targetKind : asset.kind,
      title: candidate.title, summary: candidate.summary, topicKey: candidate.topicKey, subjectKey: candidate.subjectKey,
      triggers: candidate.triggers, aliases: candidate.aliases, scope: candidate.scope, conditions: candidate.conditions },
    { id: asset.id, kind: asset.kind, title: asset.title, summary: asset.summary, topicKey: asset.topic_key ?? "",
      subjectKey: asset.subject_key ?? "", triggers: asset.triggers ?? [], aliases: asset.aliases ?? [],
      scope: asset.scope ?? [], conditions: asset.conditions ?? [] },
  ];
}

function parseHandoff(repositoryReal, request, { proposedFormalPreview = undefined } = {}) {
  if (!exactKeys(request, handoffRequestFields) || !stableAssetId.test(request.candidate_id ?? "")
    || !safeInteger(request.candidate_revision, 1) || !stableAssetId.test(request.review_payload_id ?? "")
    || !portableRef(request.review_payload_ref, { prefix: "instance/evolution/review-payloads/", extension: ".json" })
    || !digestPattern.test(request.review_payload_digest ?? "") || !stableAssetId.test(request.formal_id ?? "")
    || !portableRef(request.formal_target, { prefix: "instance/", extension: ".md" })
    || !digestPattern.test(request.formal_preview_digest ?? "")) throw new Error("handoff request is invalid or unbounded");
  const manifestRead = stableRead(repositoryReal, MANIFEST_REF, limits.manifest);
  const manifest = validateInstanceManifestStructure(parseSectionedToml(manifestRead.text, "promotion instance manifest"));
  if (manifest.root.state !== "instance") throw new Error("template state cannot promote learning content");
  const { context, envelope } = loadTrustedDomainEnvelope(repositoryReal, { explicitRequestedId: request.candidate_id });
  if (context.instanceId !== manifest.root.instance_id || !envelope.ordinaryMatchingAllowed) throw new Error("instance domain map is not current");
  auditCandidateSourceClosure(repositoryReal, { instanceContext: context });
  const candidate = loadTrustedPromotionCandidateRecord(repositoryReal, { instanceContext: context, candidateId: request.candidate_id });
  const candidateTrust = verifyTrustedPromotionCandidateRecord(repositoryReal, candidate);
  if (!candidateTrust || candidate.sourceRevision !== request.candidate_revision || candidate.status !== "candidate"
    || candidate.candidateRelation !== "new" || candidate.observationState !== "explicit"
    || !["explicit-user", "existing-approved-migration"].includes(candidate.observationBasis)) {
    throw new Error("candidate is not one current explicitly observed new candidate");
  }
  const indexRead = stableRead(repositoryReal, INDEX_REF, limits.index);
  if (`sha256:${candidateTrust.indexDigest}` !== indexRead.digest && candidateTrust.indexDigest !== indexRead.digest) {
    throw new Error("candidate index changed during handoff validation");
  }
  const parsedIndex = parseArrayTableDocument(indexRead.text, "candidates", "promotion candidate index");
  const index = { ...parsedIndex.root, candidates: parsedIndex.entries };
  const entry = parsedIndex.entries.find((item) => item.id === candidate.id);
  if (!entry) throw new Error("candidate disappeared from its current index");
  const candidateRead = stableRead(repositoryReal, entry.source_ref, limits.candidate);
  const candidateParsed = parseMarkdownFrontmatterHead(candidateRead.text, "promotion source candidate");
  const candidateSource = candidateParsed.values;
  if (candidateSource.source_revision !== request.candidate_revision
    || !Array.isArray(candidateSource.source_refs) || !candidateSource.source_refs.includes(request.review_payload_id)) {
    throw new Error("candidate does not close over the requested review payload");
  }
  const payloadRead = stableRead(repositoryReal, request.review_payload_ref, limits.payload);
  if (payloadRead.digest !== request.review_payload_digest) throw new Error("review payload digest does not match the reviewed handoff");
  let payload;
  try { payload = JSON.parse(payloadRead.text); } catch { throw new Error("review payload is not strict JSON"); }
  const reviewShapeValid = exactKeys(payload?.review, currentPayloadReviewFields)
    || exactKeys(payload?.review, payloadReviewFields);
  const reviewLevel = payload?.review?.recommended_level ?? payload?.review?.required_level;
  if (!noPoisonKeys(payload) || !exactKeys(payload, payloadFields) || !exactKeys(payload.authorization, payloadAuthorizationFields)
    || !reviewShapeValid || payload.schema_version !== 1
    || !["awaiting-learning-review", "awaiting-level3-learning-review"].includes(payload.record_type)
    || !["awaiting-review", "awaiting-level3-review"].includes(payload.state)
    || payload.id !== request.review_payload_id || basename(request.review_payload_ref) !== `${payload.id}.json`
    || payload.candidate_id !== candidate.id || payload.formal_id !== request.formal_id
    || !formalKinds.has(payload.formal_kind) || payload.formal_preview_digest !== request.formal_preview_digest
    || payload.formal_preview_encoding !== "base64" || payload.authorization.basis !== "current-user-exact-preview-keep"
    || !stableAssetId.test(payload.authorization.message_ref ?? "") || !digestPattern.test(payload.authorization.message_digest ?? "")
    || !strictDate(payload.authorization.message_at) || payload.authorization.content_scope !== "exact-formal-preview-and-user-visible-scope"
    || payload.authorization.exact_content_authorized !== true || payload.authorization.future_actions_authorized !== false
    || reviewLevel !== 3 || payload.review.exact_preview_may_reuse_authorization !== true
    || payload.review.material_change_requires_new_confirmation !== true || payload.review.result_validation_claimed !== false
    || payload.review.executable !== false || !clean(payload.review.reason, 1000, false)) {
    throw new Error("review payload identity, authorization, or boundary is invalid");
  }
  const authorizedPreview = strictBase64(payload.formal_preview_base64);
  if (!authorizedPreview || authorizedPreview.length === 0 || authorizedPreview.length > limits.formal
    || sha256(authorizedPreview) !== request.formal_preview_digest) throw new Error("authorized formal preview bytes are invalid");
  const authorizedText = decode(authorizedPreview, "authorized formal preview").replaceAll("\r\n", "\n");
  if (sha256(Buffer.from(authorizedText, "utf8")) !== request.formal_preview_digest) {
    throw new Error("authorized preview uses non-canonical line endings");
  }
  if (proposedFormalPreview !== undefined) {
    if (typeof proposedFormalPreview !== "string" || Buffer.byteLength(proposedFormalPreview, "utf8") > limits.formal) {
      throw new Error("proposed formal preview is invalid or unbounded");
    }
    const proposed = proposedFormalPreview.replaceAll("\r\n", "\n");
    if (Buffer.compare(Buffer.from(proposed, "utf8"), authorizedPreview) !== 0) {
      return Object.freeze({ decision: "learning-promotion-new-confirmation-required", executable: false,
        reason: "exact-formal-preview-changed", candidateId: candidate.id, formalId: request.formal_id,
        authorizedPreviewDigest: request.formal_preview_digest, proposedPreviewDigest: sha256(proposed) });
    }
  }
  const candidateBody = candidateRead.text.replaceAll("\r\n", "\n").slice(candidateParsed.bodyOffset);
  const formalParsed = parseMarkdownFrontmatterHead(authorizedText, "authorized formal preview");
  const asset = formalParsed.values; const body = authorizedText.slice(formalParsed.bodyOffset);
  const targetKindMatches = candidate.targetKind === "preference"
    ? asset.kind === "memory" && asset.subtype === "habit"
    : candidate.targetKind === asset.kind && (candidate.targetSubtype ?? "") === (asset.subtype ?? "");
  const exactCandidateProjection = asset.title === candidate.title && asset.summary === candidate.summary
    && (asset.topic_key ?? "") === candidate.topicKey && (asset.subject_key ?? "") === candidate.subjectKey
    && JSON.stringify(asset.triggers ?? []) === JSON.stringify(candidate.triggers)
    && JSON.stringify(asset.aliases ?? []) === JSON.stringify(candidate.aliases)
    && JSON.stringify(asset.scope ?? []) === JSON.stringify(candidate.scope)
    && JSON.stringify(asset.conditions ?? []) === JSON.stringify(candidate.conditions)
    && JSON.stringify(asset.excludes ?? []) === JSON.stringify(entry.excludes ?? []);
  if (!stableAssetId.test(asset.id ?? "") || asset.id !== payload.formal_id || asset.kind !== payload.formal_kind
    || !formalKinds.has(asset.kind) || !targetKindMatches || !exactCandidateProjection
    || asset.risk_tier !== candidate.riskTier || asset.approval_state !== "explicit"
    || asset.activation_basis !== "explicit-user" || asset.approved_by_user !== true
    || !["active", "provisional"].includes(asset.status) || (asset.status === "provisional" && asset.risk_tier !== "low")
    || (["medium", "high"].includes(asset.risk_tier) && asset.confirmation === "none")
    || (asset.related_asset_ids ?? []).length !== 0 || (asset.supersedes ?? []).length !== 0
    || !body.trim() || locateHighConfidenceSecretCandidates(authorizedText).blocked
    || containsForbiddenLocationReference(authorizedText)) throw new Error("authorized formal preview changed scope, risk, identity, or safety boundary");
  const maturityBearing = ["capability", "sop"].includes(asset.kind)
    || (asset.kind === "experience" && asset.subtype === "host-execution");
  if (maturityBearing && (asset.maturity !== "unvalidated" || asset.independent_task_count !== 0
    || asset.successful_use_count !== 0 || asset.failed_use_count !== 0 || asset.distinct_context_count !== 0
    || asset.distinct_host_count !== 0 || (asset.validation_refs ?? []).length !== 0)) {
    throw new Error("candidate observation counts cannot become formal maturity or success counts");
  }
  const schema = validateProposedFormalAsset(repositoryReal, envelope, asset, body);
  if (schema.decision !== "proposal-metadata-valid") throw new Error(schema.reason ?? "formal preview schema is invalid");
  auditFormalIdAgainstCandidateHistory(repositoryReal, { instanceContext: context,
    proposedFormalId: asset.id, sourceCandidateId: candidate.id });
  const expectedTarget = formalTargetFor(asset.kind, request.formal_preview_digest);
  if (request.formal_target !== expectedTarget) throw new Error("formal target substitution does not match the authorized preview");
  const targetProof = prepareNewFormalTarget(repositoryReal, request.formal_target, asset.kind);
  if (!verifyNewFormalTarget(repositoryReal, targetProof)) throw new Error("formal target is occupied or unsafe");
  const currentTarget = loadTrustedDomainEnvelope(repositoryReal, { explicitRequestedId: asset.id });
  if (currentTarget.envelope.explicitRoute || envelope.explicitRoute) throw new Error("formal identity already has a route");
  const duplicates = findPotentialFormalDuplicates(repositoryReal, envelope, duplicateProposals(candidate, asset));
  if (duplicates.decision !== "duplicate-check-complete" || duplicates.matches.length > 0) {
    throw new Error("formal duplicate or duplicate-check drift requires targeted review");
  }
  const route = routeProjection(asset, request.formal_target);
  if (Buffer.byteLength(JSON.stringify(route.route), "utf8") > 2048 || envelope.routeCount + 1 > 96
    || envelope.bytes + route.byte_length > 32768) throw new Error("domain map soft budget cannot accept the direct formal route");
  return Object.freeze({ decision: "verified-review-handoff", repositoryReal, manifestRead, manifest, context, envelope,
    maintenanceDigest: trustedMaintenanceStateDigest(repositoryReal, envelope), candidate, candidateTrust, candidateRead,
    candidateSource, candidateBody,
    indexRead, index, entry, payloadRead, payload, authorizedPreview, authorizedText, asset, body, route, targetProof,
    formalPreviewDigest: request.formal_preview_digest, formalTarget: request.formal_target,
    authorization: Object.freeze({ basis: "verified-existing-review-handoff", message_ref: payload.authorization.message_ref,
      message_digest: payload.authorization.message_digest, confirmed_at: payload.authorization.message_at,
      review_payload_id: payload.id, review_payload_ref: request.review_payload_ref,
      review_payload_digest: payloadRead.digest, formal_preview_digest: request.formal_preview_digest,
      reuse_scope: "exact-formal-preview-bytes-only", current_user_role_evidence: "existing-verified-keep-handoff-not-cli-json" }),
  });
}

function validateControl(read, instanceId) {
  const value = parseArrayTableDocument(read.text, "__none__", "promotion signal control").root;
  if (!exactKeys(Object.assign({}, value), controlFields) || value.schema_version !== 1
    || value.record_type !== "cross-session-signal-control" || value.instance_id !== instanceId
    || !safeInteger(value.source_revision) || value.source_revision !== value.projection_revision
    || value.update_state !== "clean" || !safeInteger(value.base_revision)
    || ["pending_operation_id", "pending_event_id", "pending_signal_id", "pending_trigger_id", "pending_source_ref"]
      .some((field) => value[field] !== "")) throw new Error("signal control is not one clean exact record");
  return Object.assign({}, value);
}
function deterministicEarliest(entries) {
  if (entries.length === 0) return "";
  return [...entries].sort((left, right) => Date.parse(left.effective_check_at) - Date.parse(right.effective_check_at)
    || left.id.localeCompare(right.id, "en"))[0].effective_check_at;
}
function validateProjectionEntry(entry, fields) {
  return exactKeys(Object.assign({}, entry), fields) && stableAssetId.test(entry.id ?? "")
    && Object.values(entry).every((value) => typeof value !== "string" || clean(value, 512));
}
function parseSignalMap(read, instanceId, revision) {
  const parsed = parseArrayTableDocument(read.text, "signals", "promotion signal map");
  const root = Object.assign({}, parsed.root); const entries = parsed.entries.map((entry) => Object.assign({}, entry));
  if (!exactKeys(root, signalMapRootFields) || root.schema_version !== 1 || root.map_id !== "cross-session-signals"
    || root.instance_id !== instanceId || !["empty", "current"].includes(root.state)
    || root.source_revision !== revision || root.budget_bytes !== limits.signalMap || root.overflow !== false
    || root.active_count !== entries.length || !safeInteger(root.scheduled_count)
    || root.next_wakeup_ref !== TIME_MAP_REF || !clean(root.generated_at, 64)
    || !clean(root.next_wakeup_at, 64) || entries.some((entry) => !validateProjectionEntry(entry, signalMapEntryFields))
    || new Set(entries.map((entry) => entry.id)).size !== entries.length) throw new Error("signal map is drifted or invalid");
  return { root, entries };
}
function parseTimeMap(read, instanceId, revision) {
  const parsed = parseArrayTableDocument(read.text, "triggers", "promotion time map");
  const root = Object.assign({}, parsed.root); const entries = parsed.entries.map((entry) => Object.assign({}, entry));
  if (!exactKeys(root, timeMapRootFields) || root.schema_version !== 1 || root.map_id !== "time-triggers"
    || root.instance_id !== instanceId || !["empty", "current"].includes(root.state) || root.source_revision !== revision
    || root.scheduled_count !== entries.length || root.next_wakeup_at !== deterministicEarliest(entries)
    || entries.some((entry) => !validateProjectionEntry(entry, timeEntryFields)
      || !strictDate(entry.next_check_at) || !strictDate(entry.effective_check_at)
      || !portableRef(entry.source_ref, { prefix: "instance/" }))
    || new Set(entries.map((entry) => entry.id)).size !== entries.length) throw new Error("time map is drifted or invalid");
  return { root, entries };
}

function parseSignalDocument(source, label) {
  const normalized = source.replaceAll("\r\n", "\n");
  const values = { root: Object.create(null), sections: new Map() };
  let section = "root"; let ordinal = 0;
  const assignments = new Map();
  for (const [index, raw] of normalized.split("\n").entries()) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const table = /^\[([^\]]+)\]$/u.exec(line);
    const array = /^\[\[([^\]]+)\]\]$/u.exec(line);
    if (array) { section = `${array[1]}#${++ordinal}`; values.sections.set(section, Object.create(null)); continue; }
    if (table) { section = table[1]; if (values.sections.has(section)) throw new Error(`${label} repeats a section`);
      values.sections.set(section, Object.create(null)); continue; }
    if (line.startsWith("[")) throw new Error(`${label} contains an unsupported table`);
    const parsed = parseArrayTableDocument(`${line}\n`, "__none__", label).root;
    const keys = Object.keys(parsed);
    if (keys.length !== 1) throw new Error(`${label} contains an invalid assignment`);
    const target = section === "root" ? values.root : values.sections.get(section);
    if (Object.hasOwn(target, keys[0])) throw new Error(`${label} repeats ${keys[0]}`);
    target[keys[0]] = parsed[keys[0]]; assignments.set(`${section}\u0000${keys[0]}`, index);
  }
  return { normalized, root: values.root, sections: values.sections, assignments };
}
function replaceSignalAssignments(parsed, changes) {
  const lines = parsed.normalized.split("\n");
  for (const [section, key, value] of changes) {
    const index = parsed.assignments.get(`${section}\u0000${key}`);
    if (!Number.isSafeInteger(index)) throw new Error(`signal source lacks required ${section}.${key}`);
    lines[index] = `${key} = ${tomlValue(value)}`;
  }
  return lines.join("\n");
}
function enumerateSignalSources(repositoryReal) {
  const root = resolve(repositoryReal, "instance/signals");
  const queue = [root]; const results = []; let directories = 0;
  while (queue.length) {
    const directory = queue.shift();
    if (++directories > 512) throw new Error("signal directory budget exceeded");
    const info = lstatSync(directory);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("signal source tree crosses a link or reparse point");
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name); const child = lstatSync(path);
      if (child.isSymbolicLink()) throw new Error("signal source tree crosses a link or reparse point");
      if (entry.isDirectory()) { queue.push(path); continue; }
      if (!entry.isFile() || !entry.name.endsWith(".toml")) continue;
      const ref = relative(repositoryReal, path).split(sep).join("/");
      if (ref === CONTROL_REF) continue;
      if (results.length >= 2048) throw new Error("signal source file budget exceeded");
      const read = stableRead(repositoryReal, ref, limits.signal);
      const parsed = parseSignalDocument(read.text, ref); const rootValues = parsed.root;
      if (rootValues.record_type !== "cross-session-signal" || !stableAssetId.test(rootValues.id ?? "")
        || !safeInteger(rootValues.revision, 1) || !signalStatuses.has(rootValues.status)
        || !Array.isArray(rootValues.asset_refs) || !rootValues.asset_refs.every((id) => stableAssetId.test(id))
        || !safeInteger(rootValues.candidate_source_revision)) throw new Error("signal source identity or revision is invalid");
      results.push({ ref, read, parsed, root: rootValues });
    }
  }
  const ids = results.map((item) => item.root.id);
  if (new Set(ids).size !== ids.length) throw new Error("signal sources contain duplicate IDs");
  return results;
}

function mirrorTree(source, target, budget) {
  const info = lstatSync(source);
  if (info.isSymbolicLink()) throw new Error("projection source contains a link or reparse point");
  if (info.isDirectory()) {
    if (++budget.directories > 8192) throw new Error("projection directory budget exceeded");
    mkdirSync(target, { recursive: true });
    for (const entry of readdirSync(source, { withFileTypes: true })) mirrorTree(resolve(source, entry.name), resolve(target, entry.name), budget);
    return;
  }
  if (!info.isFile() || ++budget.files > 16384) throw new Error("projection file budget exceeded");
  mkdirSync(dirname(target), { recursive: true }); linkSync(source, target);
}
function validatePhysicalProjectionTree(directory) {
  const queue = [directory]; let directories = 0; let files = 0;
  while (queue.length) {
    const current = queue.shift(); const info = lstatSync(current);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("promotion projection residue contains a link or reparse point");
    if (++directories > 8192) throw new Error("promotion projection residue directory budget exceeded");
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const absolute = resolve(current, entry.name); const child = lstatSync(absolute);
      if (child.isSymbolicLink()) throw new Error("promotion projection residue contains a link or reparse point");
      if (entry.isDirectory()) queue.push(absolute);
      else if (!entry.isFile() || ++files > 16384) throw new Error("promotion projection residue file budget exceeded");
    }
  }
}
export function cleanupPromotionProjectionResidue(repository, { now = new Date() } = {}) {
  try {
    const repositoryReal = realpathSync(repository); const parent = dirname(repositoryReal);
    const nowMs = now instanceof Date ? now.getTime() : Number.NaN;
    if (!Number.isFinite(nowMs)) throw new Error("promotion projection cleanup time is invalid");
    let inspected = 0; let removed = 0;
    for (const entry of readdirSync(parent, { withFileTypes: true })) {
      if (!entry.name.startsWith(PROJECTION_PREFIX)) continue;
      if (++inspected > 128) throw new Error("promotion projection residue budget exceeded");
      const directory = resolve(parent, entry.name); const info = lstatSync(directory);
      if (!entry.isDirectory() || info.isSymbolicLink() || dirname(directory) !== parent) {
        throw new Error("promotion projection residue name is occupied by a link, reparse point, or non-directory");
      }
      ensureInside(parent, realpathSync(directory)); validatePhysicalProjectionTree(directory);
      const markerPath = resolve(directory, PROJECTION_MARKER);
      if (!existsSync(markerPath)) throw new Error("promotion projection residue lacks its ownership marker");
      const marker = readBoundedJson(markerPath, 4096, "promotion projection ownership marker");
      if (!exactKeys(marker, new Set(["schema_version", "record_type", "repository_binding", "created_at"]))
        || marker.schema_version !== 1 || marker.record_type !== "learning-promotion-projection-residue"
        || marker.repository_binding !== sha256(repositoryReal.normalize("NFC")) || !strictDate(marker.created_at)) {
        throw new Error("promotion projection residue ownership marker is invalid");
      }
      if (nowMs - Date.parse(marker.created_at) < 30 * 60_000) continue;
      rmSync(directory, { recursive: true, force: false }); removed += 1;
    }
    return Object.freeze({ decision: "learning-promotion-projection-cleanup-complete", executable: false,
      inspectedCount: inspected, removedCount: removed, contentIncluded: false });
  } catch (error) {
    return Object.freeze({ decision: "learning-promotion-projection-cleanup-denied", reason: error.message,
      executable: false, contentIncluded: false });
  }
}
function createProjectionRoot(repositoryReal, transactionAt) {
  const cleanup = cleanupPromotionProjectionResidue(repositoryReal, { now: new Date(transactionAt) });
  if (cleanup.decision !== "learning-promotion-projection-cleanup-complete") throw new Error(cleanup.reason ?? cleanup.decision);
  const projectionRoot = mkdtempSync(join(dirname(repositoryReal), PROJECTION_PREFIX));
  const marker = { schema_version: 1, record_type: "learning-promotion-projection-residue",
    repository_binding: sha256(repositoryReal.normalize("NFC")), created_at: transactionAt };
  atomicJson(resolve(projectionRoot, PROJECTION_MARKER), marker);
  return projectionRoot;
}
function removeOwnedProjectionRoot(projectionRoot, repositoryReal) {
  const expectedParent = dirname(repositoryReal);
  if (dirname(projectionRoot) !== expectedParent || !basename(projectionRoot).startsWith(PROJECTION_PREFIX)) {
    throw new Error("refused to remove an unexpected promotion projection root");
  }
  const info = lstatSync(projectionRoot);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("promotion projection root became a link, reparse point, or non-directory");
  ensureInside(expectedParent, realpathSync(projectionRoot)); validatePhysicalProjectionTree(projectionRoot);
  const marker = readBoundedJson(resolve(projectionRoot, PROJECTION_MARKER), 4096, "promotion projection ownership marker");
  if (!exactKeys(marker, new Set(["schema_version", "record_type", "repository_binding", "created_at"]))
    || marker.schema_version !== 1 || marker.record_type !== "learning-promotion-projection-residue"
    || marker.repository_binding !== sha256(repositoryReal.normalize("NFC")) || !strictDate(marker.created_at)) {
    throw new Error("promotion projection ownership marker changed before cleanup");
  }
  rmSync(projectionRoot, { recursive: true, force: false });
}
function enumerateReadBindings(repositoryReal, writeTargets) {
  const bindings = [];
  const add = (ref, maxBytes = 128 * 1024 * 1024) => {
    if (writeTargets.has(ref)) return;
    const read = stableRead(repositoryReal, ref, maxBytes);
    bindings.push({ target: ref, digest: read.digest });
  };
  for (const ref of ["assistant.toml", "core/manifest.toml", "core/maps/asset-confirmation-gates.toml"]) add(ref, 256 * 1024);
  const instanceRoot = resolve(repositoryReal, "instance"); const queue = [instanceRoot]; let directories = 0; let totalBytes = 0;
  while (queue.length) {
    const directory = queue.shift();
    if (++directories > 4096) throw new Error("promotion read-binding directory budget exceeded");
    const info = lstatSync(directory);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("promotion read-binding tree crosses a link or reparse point");
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = resolve(directory, entry.name); const child = lstatSync(absolute);
      if (child.isSymbolicLink()) throw new Error("promotion read-binding tree crosses a link or reparse point");
      if (entry.isDirectory()) { queue.push(absolute); continue; }
      if (!entry.isFile()) throw new Error("promotion read-binding tree contains a non-file entry");
      const ref = relative(repositoryReal, absolute).split(sep).join("/");
      if (writeTargets.has(ref)) continue;
      const read = stableRead(repositoryReal, ref, 128 * 1024 * 1024);
      totalBytes += read.byte_length;
      if (totalBytes > 512 * 1024 * 1024 || bindings.length > 8192) throw new Error("promotion read-binding budget exceeded");
      bindings.push({ target: ref, digest: read.digest });
    }
  }
  bindings.sort((left, right) => left.target.localeCompare(right.target, "en"));
  if (new Set(bindings.map((item) => item.target)).size !== bindings.length) throw new Error("promotion read bindings contain duplicates");
  return bindings;
}
function replaceProjection(root, ref, buffer) {
  const target = resolve(root, ...ref.split("/"));
  if (existsSync(target)) unlinkSync(target);
  mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, buffer, { flag: "wx" });
}
function blobStore() {
  const blobs = new Map();
  return {
    add(buffer) {
      const bytes = Buffer.from(buffer); const digest = sha256(bytes);
      if (!blobs.has(digest)) blobs.set(digest, Object.freeze({ digest, byte_length: bytes.length,
        encoding: "base64", content_base64: bytes.toString("base64") }));
      return digest;
    },
    values() { return [...blobs.values()].sort((left, right) => left.digest.localeCompare(right.digest, "en")); },
  };
}
function buildPromotionPlan(repositoryReal, handoff, { transactionId, transactionAt }) {
  const controlRead = stableRead(repositoryReal, CONTROL_REF, limits.control);
  const control = validateControl(controlRead, handoff.context.instanceId);
  const signalMapRead = stableRead(repositoryReal, SIGNAL_MAP_REF, limits.signalMap);
  const signalMap = parseSignalMap(signalMapRead, handoff.context.instanceId, control.projection_revision);
  const timeMapRead = stableRead(repositoryReal, TIME_MAP_REF, limits.timeMap);
  const timeMap = parseTimeMap(timeMapRead, handoff.context.instanceId, control.projection_revision);
  if (signalMap.root.scheduled_count !== timeMap.entries.length || signalMap.root.next_wakeup_at !== timeMap.root.next_wakeup_at) {
    throw new Error("time and startup signal projections are not one clean revision");
  }
  const signalSources = enumerateSignalSources(repositoryReal);
  const signalByRef = new Map(signalSources.map((item) => [item.ref, item]));
  for (const entry of signalMap.entries) {
    const source = signalByRef.get(entry.source_ref);
    if (!source || source.root.id !== entry.id || source.root.revision !== entry.source_signal_revision
      || source.root.status !== entry.status) throw new Error("signal map/source projection drifted");
  }
  const relatedSignals = signalSources.filter((item) => item.root.asset_refs.includes(handoff.candidate.id));
  for (const signal of relatedSignals) {
    if (signal.root.candidate_source_revision !== handoff.candidate.sourceRevision) {
      throw new Error("related signal holds a stale candidate revision");
    }
  }
  const relatedIds = new Set(relatedSignals.map((item) => item.root.id));
  const relatedRefs = new Set(relatedSignals.map((item) => item.ref));
  const scheduledForCandidate = timeMap.entries.filter((entry) => entry.source_ref === handoff.entry.source_ref
    || relatedIds.has(entry.id) || relatedRefs.has(entry.source_ref));
  const candidateReminder = handoff.candidateSource.remind_at ?? "";
  if ((candidateReminder === "") !== (scheduledForCandidate.length === 0)) throw new Error("candidate reminder and time projection drifted");
  const nextCandidateRevision = handoff.candidate.sourceRevision + 1;
  const candidateValues = { ...handoff.candidateSource, status: "archived", source_revision: nextCandidateRevision,
    resolution: "promoted", resolved_to: handoff.asset.id, updated_at: transactionAt };
  if (Object.hasOwn(candidateValues, "remind_at")) candidateValues.remind_at = "";
  if (Object.hasOwn(candidateValues, "snoozed_until")) candidateValues.snoozed_until = "";
  if (scheduledForCandidate.length > 0 && Object.hasOwn(candidateValues, "trigger_revision")) {
    candidateValues.trigger_revision += 1;
  }
  const candidateBuffer = Buffer.from(serializeCandidate(candidateValues, handoff.candidateBody), "utf8");
  if (candidateBuffer.length > limits.candidate) throw new Error("archived candidate exceeds its byte envelope");
  const remainingIndexEntries = handoff.index.candidates.filter((entry) => entry.id !== handoff.candidate.id)
    .sort((left, right) => left.id.localeCompare(right.id, "en"));
  if (remainingIndexEntries.length !== handoff.index.candidates.length - 1) throw new Error("candidate index removal is not exact");
  const indexRoot = { ...handoff.index, candidates: undefined, state: remainingIndexEntries.length === 0 ? "empty" : "current",
    source_revision: handoff.index.source_revision + 1, generated_at: transactionAt,
    candidate_count: remainingIndexEntries.length, indexed_count: remainingIndexEntries.length,
    active_count: remainingIndexEntries.filter(activeCandidate).length };
  delete indexRoot.candidates;
  const indexBuffer = Buffer.from(serializeArrayTable(indexRoot, [...indexRootFields], "candidates", remainingIndexEntries, indexEntryOrder), "utf8");
  if (indexBuffer.length > limits.index) throw new Error("recomputed candidate index exceeds its budget");
  const updatedSignals = relatedSignals.map((signal) => {
    const changes = [["root", "status", "resolved"], ["root", "revision", signal.root.revision + 1],
      ["root", "updated_at", transactionAt], ["root", "candidate_source_revision", nextCandidateRevision]];
    if (signal.parsed.assignments.has("trigger\u0000next_check_at")) changes.push(["trigger", "next_check_at", ""]);
    const source = replaceSignalAssignments(signal.parsed, changes);
    const buffer = Buffer.from(source, "utf8");
    if (buffer.length > limits.signal) throw new Error("resolved signal exceeds its byte envelope");
    return { ...signal, buffer };
  }).sort((left, right) => left.ref.localeCompare(right.ref, "en"));
  const remainingTimeEntries = timeMap.entries.filter((entry) => !scheduledForCandidate.includes(entry));
  const remainingSignalEntries = signalMap.entries.filter((entry) => !relatedIds.has(entry.id) && !relatedRefs.has(entry.source_ref));
  const nextRevision = control.source_revision + 1;
  const nextWakeup = deterministicEarliest(remainingTimeEntries);
  const timeRoot = { ...timeMap.root, state: remainingTimeEntries.length === 0 ? "empty" : "current",
    source_revision: nextRevision, generated_at: transactionAt, scheduled_count: remainingTimeEntries.length,
    next_wakeup_at: nextWakeup };
  const timeBuffer = Buffer.from(serializeArrayTable(timeRoot, [...timeMapRootFields], "triggers",
    remainingTimeEntries, timeEntryOrder), "utf8");
  const signalRoot = { ...signalMap.root,
    state: remainingSignalEntries.length === 0 && remainingTimeEntries.length === 0 ? "empty" : "current",
    source_revision: nextRevision, generated_at: transactionAt, active_count: remainingSignalEntries.length,
    scheduled_count: remainingTimeEntries.length, next_wakeup_at: nextWakeup };
  const signalMapBuffer = Buffer.from(serializeArrayTable(signalRoot, [...signalMapRootFields], "signals",
    remainingSignalEntries, signalMapEntryOrder), "utf8");
  if (timeBuffer.length > limits.timeMap || signalMapBuffer.length > limits.signalMap) throw new Error("closed signal projections exceed their budgets");
  const cleanControl = { ...control, source_revision: nextRevision, projection_revision: nextRevision, update_state: "clean",
    pending_operation_id: "", pending_event_id: "", pending_signal_id: "", pending_trigger_id: "",
    pending_source_ref: "", base_revision: nextRevision, updated_at: transactionAt };
  const controlOrder = [...controlFields];
  const cleanControlBuffer = Buffer.from(`${serializeRoot(cleanControl, controlOrder)}\n`, "utf8");
  const domainRead = stableRead(repositoryReal, handoff.context.domainMapRef, limits.domainMap);
  if (trustedMaintenanceStateDigest(repositoryReal, handoff.envelope) !== handoff.maintenanceDigest
    || !verifyNewFormalTarget(repositoryReal, handoff.targetProof)) throw new Error("domain, registry, or formal target drifted");
  const domainBuffer = Buffer.from(`${domainRead.text.replace(/\s*$/u, "")}${handoff.route.source}`, "utf8");
  if (domainBuffer.length > limits.domainMap) throw new Error("domain map hard budget would be exceeded");
  const formalRead = stableRead(repositoryReal, handoff.formalTarget, limits.formal, { allowMissing: true });
  if (formalRead) throw new Error("formal target became occupied");
  let publicRead = null;
  let distRead = null;
  const proposed = new Map([
    [handoff.formalTarget, handoff.authorizedPreview],
    [handoff.context.domainMapRef, domainBuffer], [handoff.entry.source_ref, candidateBuffer], [INDEX_REF, indexBuffer],
    ...updatedSignals.map((signal) => [signal.ref, signal.buffer]), [TIME_MAP_REF, timeBuffer], [SIGNAL_MAP_REF, signalMapBuffer],
    [CONTROL_REF, cleanControlBuffer],
  ]);
  let projectionRoot;
  let snapshotSource;
  const projectionIssues = [];
  try {
    publicRead = stableRead(repositoryReal, PUBLIC_SNAPSHOT_REF, limits.snapshot);
    distRead = stableRead(repositoryReal, DIST_SNAPSHOT_REF, limits.snapshot);
    projectionRoot = createProjectionRoot(repositoryReal, transactionAt);
    const budget = { directories: 0, files: 0 };
    for (const ref of ["assistant.toml", "AGENTS.md", "BOOTSTRAP.md", "core", "instance"])
      mirrorTree(resolve(repositoryReal, ...ref.split("/")), resolve(projectionRoot, ...ref.split("/")), budget);
    mirrorTree(resolve(repositoryReal, ...PUBLIC_SNAPSHOT_REF.split("/")), resolve(projectionRoot, ...PUBLIC_SNAPSHOT_REF.split("/")), budget);
    mirrorTree(resolve(repositoryReal, ...DIST_SNAPSHOT_REF.split("/")), resolve(projectionRoot, ...DIST_SNAPSHOT_REF.split("/")), budget);
    for (const [ref, buffer] of proposed) replaceProjection(projectionRoot, ref, buffer);
    const projected = loadTrustedDomainEnvelope(projectionRoot, { explicitRequestedId: handoff.asset.id });
    if (projected.envelope.explicitRoute?.id !== handoff.asset.id) throw new Error("formal route did not close in isolated projection");
    const requiredSourceRefs = [...proposed.keys()];
    const snapshot = buildSnapshotCandidate(projectionRoot, { existingSource: publicRead.text, now: new Date(transactionAt),
      mode: "operational", requiredSourceRefs });
    if (!snapshot.updated || typeof snapshot.source !== "string") throw new Error("formal promotion did not create a changed snapshot");
    const parsedSnapshot = parseCurrentSnapshotEnvelope(snapshot.source, "promotion snapshot");
    const formalCards = [...parsedSnapshot.memories, ...parsedSnapshot.sops, ...parsedSnapshot.capabilities, ...parsedSnapshot.experiences]
      .filter((item) => item.id === handoff.asset.id);
    if (formalCards.length !== 1 || parsedSnapshot.evolution.some((item) => item.id === handoff.candidate.id)) {
      throw new Error("snapshot contains a duplicate formal card or retained promoted candidate");
    }
    const second = buildSnapshotCandidate(projectionRoot, { existingSource: snapshot.source, now: new Date(transactionAt),
      mode: "operational", requiredSourceRefs });
    if (second.updated || second.source !== snapshot.source) throw new Error("promotion snapshot is not byte-idempotent");
    snapshotSource = snapshot.source;
  } catch {
    projectionIssues.push("dashboard-public-snapshot", "dashboard-dist-snapshot");
  } finally {
    if (projectionRoot && existsSync(projectionRoot)) {
      try { removeOwnedProjectionRoot(projectionRoot, repositoryReal); }
      catch {
        projectionIssues.push("projection-cleanup-pending");
      }
    }
  }
  let snapshotBuffer = null;
  if (typeof snapshotSource === "string") {
    snapshotBuffer = Buffer.from(snapshotSource, "utf8");
    if (snapshotBuffer.length > limits.snapshot) {
      projectionIssues.splice(0, projectionIssues.length, "dashboard-public-snapshot", "dashboard-dist-snapshot");
      snapshotBuffer = null;
    } else {
      proposed.set(PUBLIC_SNAPSHOT_REF, snapshotBuffer); proposed.set(DIST_SNAPSHOT_REF, snapshotBuffer);
    }
  }

  const reads = new Map([
    [CONTROL_REF, controlRead], [handoff.formalTarget, formalRead],
    [handoff.context.domainMapRef, domainRead], [handoff.entry.source_ref, handoff.candidateRead], [INDEX_REF, handoff.indexRead],
    ...updatedSignals.map((signal) => [signal.ref, signal.read]), [TIME_MAP_REF, timeMapRead], [SIGNAL_MAP_REF, signalMapRead],
    ...(snapshotBuffer ? [[PUBLIC_SNAPSHOT_REF, publicRead], [DIST_SNAPSHOT_REF, distRead]] : []),
  ]);
  const phases = [
    ["formal-asset", handoff.formalTarget, handoff.authorizedPreview],
    ["instance-domain-map", handoff.context.domainMapRef, domainBuffer],
    ["archived-source-candidate", handoff.entry.source_ref, candidateBuffer],
    ["evolution-candidate-index", INDEX_REF, indexBuffer],
    ...updatedSignals.map((signal) => ["related-learning-signal-resolved", signal.ref, signal.buffer]),
    ["time-projection", TIME_MAP_REF, timeBuffer], ["startup-signal-projection", SIGNAL_MAP_REF, signalMapBuffer],
    ["control-clean", CONTROL_REF, cleanControlBuffer],
    ...(snapshotBuffer ? [
      ["dashboard-public-snapshot", PUBLIC_SNAPSHOT_REF, snapshotBuffer],
      ["dashboard-dist-snapshot", DIST_SNAPSHOT_REF, snapshotBuffer],
    ] : []),
  ];
  const blobs = blobStore(); const preimages = [];
  for (const [target, read] of reads) {
    preimages.push({ target, digest: read ? blobs.add(read.buffer) : "absent" });
  }
  preimages.sort((left, right) => left.target.localeCompare(right.target, "en"));
  const state = new Map(preimages.map((item) => [item.target, item.digest]));
  const steps = phases.map(([phase, target, buffer], index) => {
    const core = { ordinal: index + 1, phase, target, precondition_digest: state.get(target), proposed_digest: blobs.add(buffer) };
    if (core.precondition_digest === undefined) throw new Error("transaction phase targets an unbound preimage");
    const step = { ...core, step_digest: sha256(canonical(core)) }; state.set(target, core.proposed_digest); return step;
  });
  const finalDigests = [...state].map(([target, digest]) => ({ target, digest }))
    .sort((left, right) => left.target.localeCompare(right.target, "en"));
  const rollback = [...preimages].reverse().map(({ target, digest }) => ({ target, restore_digest: digest }));
  const writeSet = finalDigests.map(({ target, digest }) => ({ target, digest }));
  const readBindings = enumerateReadBindings(repositoryReal, new Set(writeSet.map((item) => item.target)));
  const core = {
    schema_version: 1, plan_type: "learning-promotion-transaction", transaction_id: transactionId,
    repository_binding: sha256(repositoryReal.normalize("NFC")), instance_id: handoff.context.instanceId,
    manifest_digest: handoff.manifestRead.digest, candidate_id: handoff.candidate.id,
    candidate_revision: handoff.candidate.sourceRevision, candidate_source_ref: handoff.entry.source_ref,
    candidate_source_digest: handoff.candidateRead.digest, candidate_index_digest: handoff.indexRead.digest,
    authorization: handoff.authorization, formal_id: handoff.asset.id, formal_kind: handoff.asset.kind,
    formal_subtype: handoff.asset.subtype ?? "", formal_target: handoff.formalTarget,
    formal_preview_digest: handoff.formalPreviewDigest, transaction_at: transactionAt,
    projection_issues: [...new Set(projectionIssues)].sort((left, right) => left.localeCompare(right, "en")), read_bindings: readBindings,
    blobs: blobs.values(), preimages, steps, final_digests: finalDigests, rollback, write_set: writeSet,
  };
  return Object.freeze({ ...core, plan_digest: sha256(canonical(core)) });
}

function bundleRoot(repositoryReal) {
  let cursor = repositoryReal;
  for (const part of STORE_REF.split("/")) {
    cursor = resolve(cursor, part);
    if (!existsSync(cursor)) mkdirSync(cursor);
    const info = lstatSync(cursor);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("promotion transaction store crosses a link or reparse point");
    ensureInside(repositoryReal, realpathSync(cursor));
  }
  return cursor;
}
function transactionDirectory(repositoryReal, transactionId) {
  if (!stableAssetId.test(transactionId ?? "") || !transactionId.startsWith("promotion.")) throw new Error("transaction ID is invalid");
  const target = resolve(bundleRoot(repositoryReal), transactionId); ensureInside(repositoryReal, target); return target;
}
function atomicJson(target, value, { replace = false } = {}) {
  const stage = `${target}.atomic-stage`; const backup = `${target}.atomic-backup`;
  if (existsSync(stage) || existsSync(backup)) throw new Error("JSON transaction residue is unexpectedly occupied");
  writeFileSync(stage, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  try {
    if (replace && existsSync(target)) renameSync(target, backup);
    renameSync(stage, target);
    if (existsSync(backup)) unlinkSync(backup);
  } catch (error) {
    if (existsSync(stage)) unlinkSync(stage);
    if (!existsSync(target) && existsSync(backup)) renameSync(backup, target);
    throw error;
  }
}
function readBoundedJson(target, maxBytes, label) {
  const info = lstatSync(target);
  if (!info.isFile() || info.isSymbolicLink() || info.size > maxBytes) throw new Error(`${label} is not one bounded physical file`);
  const descriptor = openSync(target, "r");
  try {
    const before = fstatSync(descriptor, { bigint: true }); const buffer = Buffer.alloc(Number(before.size)); let offset = 0;
    while (offset < buffer.length) { const count = readSync(descriptor, buffer, offset, buffer.length - offset, offset); if (count === 0) break; offset += count; }
    const after = fstatSync(descriptor, { bigint: true });
    if (offset !== buffer.length || before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size
      || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs) throw new Error(`${label} changed during read`);
    const parsed = JSON.parse(decode(buffer, label));
    if (!noPoisonKeys(parsed)) throw new Error(`${label} contains forbidden object keys`);
    return parsed;
  } finally { closeSync(descriptor); }
}
function validRecord(record, repositoryReal) {
  return exactKeys(record, recordFields) && record.schema_version === 1
    && record.record_type === "learning-promotion-transaction-record" && stableAssetId.test(record.transaction_id ?? "")
    && record.repository_binding === sha256(repositoryReal.normalize("NFC")) && stableAssetId.test(record.instance_id ?? "")
    && ["prepared", "planned", "completed"].includes(record.status) && digestPattern.test(record.nonce_digest ?? "")
    && digestPattern.test(record.plan_digest ?? "") && clean(record.plan_ref, 240, false)
    && stableAssetId.test(record.candidate_id ?? "") && safeInteger(record.candidate_revision, 1)
    && (record.review_payload_digest === "" || digestPattern.test(record.review_payload_digest))
    && stableAssetId.test(record.formal_id ?? "") && strictDate(record.created_at) && strictDate(record.expires_at)
    && strictDate(record.updated_at);
}
function sameRecordIdentity(left, right) {
  const mutable = new Set(["status", "updated_at"]);
  return [...recordFields].filter((field) => !mutable.has(field)).every((field) => left[field] === right[field]);
}
function validRecordTransition(repositoryReal, before, after) {
  return validRecord(before, repositoryReal) && validRecord(after, repositoryReal) && sameRecordIdentity(before, after)
    && ((before.status === "prepared" && after.status === "planned")
      || (before.status === "planned" && after.status === "completed"))
    && Date.parse(after.updated_at) >= Date.parse(before.updated_at);
}
function recoverRecordResidue(directory, repositoryReal) {
  const target = resolve(directory, "record.json"); const stage = `${target}.atomic-stage`; const backup = `${target}.atomic-backup`;
  const stageExists = existsSync(stage); const backupExists = existsSync(backup); const targetExists = existsSync(target);
  if (!stageExists && !backupExists) return;
  const read = (path, label) => readBoundedJson(path, limits.record, label);
  if (stageExists && !backupExists && targetExists) {
    const current = read(target, "promotion transaction record"); const proposed = read(stage, "promotion transaction record stage");
    if (!validRecordTransition(repositoryReal, current, proposed)) throw new Error("promotion record stage is not one valid status transition");
    unlinkSync(stage); return;
  }
  if (stageExists && backupExists && !targetExists) {
    const previous = read(backup, "promotion transaction record backup"); const proposed = read(stage, "promotion transaction record stage");
    if (!validRecordTransition(repositoryReal, previous, proposed)) throw new Error("promotion record backup is not one valid status transition");
    renameSync(backup, target); unlinkSync(stage); return;
  }
  if (!stageExists && backupExists && targetExists) {
    const previous = read(backup, "promotion transaction record backup"); const current = read(target, "promotion transaction record");
    if (!validRecordTransition(repositoryReal, previous, current)) throw new Error("promotion record completion residue is not one valid status transition");
    unlinkSync(backup); return;
  }
  throw new Error("promotion record atomic residue was preserved for recovery review");
}
function removeEmptyStoreParents(repositoryReal) {
  for (const ref of [STORE_REF, ".assistant-local"]) {
    const target = resolve(repositoryReal, ...ref.split("/"));
    if (existsSync(target) && lstatSync(target).isDirectory() && !lstatSync(target).isSymbolicLink()
      && readdirSync(target).length === 0) rmdirSync(target);
  }
}

export function validatePersistentPromotionPlan(plan) {
  if (!(exactKeys(plan, planFields) || exactKeys(plan, legacyPlanFields))
    || plan.schema_version !== 1 || plan.plan_type !== "learning-promotion-transaction"
    || !stableAssetId.test(plan.transaction_id ?? "") || !digestPattern.test(plan.repository_binding ?? "")
    || !stableAssetId.test(plan.instance_id ?? "") || !digestPattern.test(plan.manifest_digest ?? "")
    || !stableAssetId.test(plan.candidate_id ?? "") || !safeInteger(plan.candidate_revision, 1)
    || !portableRef(plan.candidate_source_ref, { prefix: "instance/evolution/", extension: ".md" })
    || !digestPattern.test(plan.candidate_source_digest ?? "") || !digestPattern.test(plan.candidate_index_digest ?? "")
    || !exactKeys(plan.authorization, authorizationFields)
    || !["verified-existing-review-handoff", "verified-existing-level3-handoff", "trusted-same-process-current-user-receipt"].includes(plan.authorization.basis)
    || !stableAssetId.test(plan.authorization.message_ref ?? "") || !digestPattern.test(plan.authorization.message_digest ?? "")
    || !strictDate(plan.authorization.confirmed_at) || plan.authorization.formal_preview_digest !== plan.formal_preview_digest
    || plan.authorization.reuse_scope !== "exact-formal-preview-bytes-only"
    || !stableAssetId.test(plan.formal_id ?? "") || !formalKinds.has(plan.formal_kind)
    || !clean(plan.formal_subtype, 80) || !portableRef(plan.formal_target, { prefix: "instance/", extension: ".md" })
    || !digestPattern.test(plan.formal_preview_digest ?? "") || !strictDate(plan.transaction_at)
    || !Array.isArray(plan.read_bindings) || !Array.isArray(plan.blobs) || !Array.isArray(plan.preimages) || !Array.isArray(plan.steps)
    || !Array.isArray(plan.final_digests) || !Array.isArray(plan.rollback) || !Array.isArray(plan.write_set)
    || !digestPattern.test(plan.plan_digest ?? "")) return false;
  const { plan_digest: planDigest, ...core } = plan;
  if (sha256(canonical(core)) !== planDigest) return false;
  if (["verified-existing-review-handoff", "verified-existing-level3-handoff"].includes(plan.authorization.basis)) {
    if (!stableAssetId.test(plan.authorization.review_payload_id ?? "")
      || !portableRef(plan.authorization.review_payload_ref, { prefix: "instance/evolution/review-payloads/", extension: ".json" })
      || !digestPattern.test(plan.authorization.review_payload_digest ?? "")
      || plan.authorization.current_user_role_evidence !== "existing-verified-keep-handoff-not-cli-json") return false;
  } else if (plan.authorization.review_payload_id !== "" || plan.authorization.review_payload_ref !== ""
    || plan.authorization.review_payload_digest !== ""
    || plan.authorization.current_user_role_evidence !== "trusted-same-process-host-receipt-not-caller-json") return false;
  const blobs = new Map();
  for (const blob of plan.blobs) {
    if (!exactKeys(blob, new Set(["digest", "byte_length", "encoding", "content_base64"]))
      || !digestPattern.test(blob.digest ?? "") || blobs.has(blob.digest) || !safeInteger(blob.byte_length)
      || blob.encoding !== "base64") return false;
    const buffer = strictBase64(blob.content_base64);
    if (!buffer || buffer.length !== blob.byte_length || sha256(buffer) !== blob.digest) return false;
    blobs.set(blob.digest, buffer);
  }
  const readBindings = new Set();
  for (const item of plan.read_bindings) {
    if (!exactKeys(item, new Set(["target", "digest"])) || !portableRef(item.target)
      || readBindings.has(item.target) || !digestPattern.test(item.digest ?? "")) return false;
    readBindings.add(item.target);
  }
  const preimages = new Map();
  for (const item of plan.preimages) {
    if (!exactKeys(item, new Set(["target", "digest"])) || !portableRef(item.target) || preimages.has(item.target)
      || !(item.digest === "absent" || blobs.has(item.digest))) return false;
    preimages.set(item.target, item.digest);
  }
  const state = new Map(preimages);
  for (const [index, step] of plan.steps.entries()) {
    if (!exactKeys(step, new Set(["ordinal", "phase", "target", "precondition_digest", "proposed_digest", "step_digest"]))
      || step.ordinal !== index + 1 || !clean(step.phase, 80, false) || !state.has(step.target)
      || state.get(step.target) !== step.precondition_digest || !blobs.has(step.proposed_digest)
      || sha256(canonical({ ordinal: step.ordinal, phase: step.phase, target: step.target,
        precondition_digest: step.precondition_digest, proposed_digest: step.proposed_digest })) !== step.step_digest) return false;
    state.set(step.target, step.proposed_digest);
  }
  const projectionIssues = projectionIssuesOf(plan);
  const allowedProjectionIssues = new Set(["dashboard-public-snapshot", "dashboard-dist-snapshot", "projection-cleanup-pending"]);
  if (new Set(projectionIssues).size !== projectionIssues.length
    || projectionIssues.some((item) => !allowedProjectionIssues.has(item))
    || JSON.stringify([...projectionIssues].sort((left, right) => left.localeCompare(right, "en"))) !== JSON.stringify(projectionIssues)) return false;
  const snapshotProjectionMissing = projectionIssues.includes("dashboard-public-snapshot")
    || projectionIssues.includes("dashboard-dist-snapshot");
  if (projectionIssues.includes("dashboard-public-snapshot") !== projectionIssues.includes("dashboard-dist-snapshot")) return false;
  const phases = plan.steps.map((step) => step.phase);
  const fixedPrefix = ["formal-asset", "instance-domain-map", "archived-source-candidate", "evolution-candidate-index"];
  const fixedSuffix = ["time-projection", "startup-signal-projection", "control-clean",
    ...(snapshotProjectionMissing ? [] : ["dashboard-public-snapshot", "dashboard-dist-snapshot"])];
  const relatedCount = phases.length - fixedPrefix.length - fixedSuffix.length;
  if (relatedCount < 0 || JSON.stringify(phases.slice(0, fixedPrefix.length)) !== JSON.stringify(fixedPrefix)
    || JSON.stringify(phases.slice(-fixedSuffix.length)) !== JSON.stringify(fixedSuffix)
    || phases.slice(fixedPrefix.length, fixedPrefix.length + relatedCount)
      .some((phase) => phase !== "related-learning-signal-resolved")
    || plan.steps[0].target !== plan.formal_target || plan.steps[2].target !== plan.candidate_source_ref
    || plan.steps[3].target !== INDEX_REF
    || plan.steps[fixedPrefix.length + relatedCount].target !== TIME_MAP_REF
    || plan.steps[fixedPrefix.length + relatedCount + 1].target !== SIGNAL_MAP_REF
    || plan.steps[fixedPrefix.length + relatedCount + 2].target !== CONTROL_REF
    || (!snapshotProjectionMissing && (plan.steps.at(-2).target !== PUBLIC_SNAPSHOT_REF
      || plan.steps.at(-1).target !== DIST_SNAPSHOT_REF))
    || !portableRef(plan.steps[1].target, { prefix: "instance/maps/", extension: ".toml" })
    || plan.steps.slice(fixedPrefix.length, fixedPrefix.length + relatedCount)
      .some((step) => !portableRef(step.target, { prefix: "instance/signals/", extension: ".toml" }) || step.target === CONTROL_REF)) return false;
  const targetStepCounts = new Map();
  for (const step of plan.steps) targetStepCounts.set(step.target, (targetStepCounts.get(step.target) ?? 0) + 1);
  if ([...targetStepCounts].some(([, count]) => count !== 1)) return false;
  const finals = new Map(plan.final_digests.map((item) => [item.target, item.digest]));
  const writes = new Map(plan.write_set.map((item) => [item.target, item.digest]));
  if (finals.size !== state.size || writes.size !== state.size || [...state].some(([target, digest]) => finals.get(target) !== digest || writes.get(target) !== digest)) return false;
  if (plan.rollback.length !== preimages.size || plan.rollback.some((item, index) => !exactKeys(item, new Set(["target", "restore_digest"]))
    || item.target !== [...plan.preimages].reverse()[index].target || item.restore_digest !== preimages.get(item.target))) return false;
  const publicDigest = finals.get(PUBLIC_SNAPSHOT_REF); const distDigest = finals.get(DIST_SNAPSHOT_REF);
  const payloadBinding = !["verified-existing-review-handoff", "verified-existing-level3-handoff"].includes(plan.authorization.basis)
    || plan.read_bindings.some((item) => item.target === plan.authorization.review_payload_ref
      && item.digest === plan.authorization.review_payload_digest);
  const snapshotBinding = snapshotProjectionMissing
    ? publicDigest === undefined && distDigest === undefined && !preimages.has(PUBLIC_SNAPSHOT_REF) && !preimages.has(DIST_SNAPSHOT_REF)
    : digestPattern.test(publicDigest ?? "") && publicDigest === distDigest;
  return payloadBinding && snapshotBinding && blobs.has(plan.formal_preview_digest)
    && finals.get(plan.formal_target) === plan.formal_preview_digest
    && [...preimages.keys()].every((target) => !readBindings.has(target));
}

function persistBundle(repositoryReal, plan, nonce, status, expiresAt) {
  if (!validatePersistentPromotionPlan(plan)) throw new Error("promotion transaction plan failed structural sealing");
  const root = bundleRoot(repositoryReal);
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const entryPath = resolve(root, entry.name); const entryInfo = lstatSync(entryPath);
    if (!entry.isDirectory() || entryInfo.isSymbolicLink()) throw new Error("promotion store contains a link, reparse point, or non-directory entry");
    if (entry.name.endsWith(".stage")) continue;
    const recordPath = resolve(entryPath, "record.json");
    if (!existsSync(recordPath)) throw new Error("promotion store contains an incomplete bundle");
    const record = readBoundedJson(recordPath, limits.record, "promotion transaction record");
    if (!validRecord(record, repositoryReal)) throw new Error("promotion store contains an invalid record");
    if (record.candidate_id === plan.candidate_id && ["prepared", "planned", "completed"].includes(record.status)) {
      throw new Error("candidate already has a persistent promotion transaction");
    }
  }
  const finalDirectory = transactionDirectory(repositoryReal, plan.transaction_id);
  if (existsSync(finalDirectory)) throw new Error("promotion transaction ID is already occupied");
  const stageDirectory = resolve(root, `${plan.transaction_id}.stage`);
  if (existsSync(stageDirectory)) throw new Error("promotion transaction stage is already occupied");
  mkdirSync(stageDirectory);
  const planRef = `${STORE_REF}/${plan.transaction_id}/plan.json`;
  const record = {
    schema_version: 1, record_type: "learning-promotion-transaction-record", transaction_id: plan.transaction_id,
    repository_binding: plan.repository_binding, instance_id: plan.instance_id, status,
    nonce_digest: sha256(nonce), plan_digest: plan.plan_digest, plan_ref: planRef,
    candidate_id: plan.candidate_id, candidate_revision: plan.candidate_revision,
    review_payload_digest: plan.authorization.review_payload_digest, formal_id: plan.formal_id,
    created_at: plan.transaction_at, expires_at: expiresAt, updated_at: plan.transaction_at,
  };
  try {
    atomicJson(resolve(stageDirectory, "plan.json"), plan);
    atomicJson(resolve(stageDirectory, "record.json"), record);
    renameSync(stageDirectory, finalDirectory);
  } catch (error) {
    rmSync(stageDirectory, { recursive: true, force: true }); throw error;
  }
  return { record, planRef };
}

function preparationSummary(record, plan, nonce, decision, { updated = true, userReport = null } = {}) {
  return Object.freeze({ decision, executable: false, transactionId: record.transaction_id,
    transactionNonce: nonce, planDigest: plan.plan_digest, status: record.status, updated,
    candidateId: plan.candidate_id, formalId: plan.formal_id, writeTargetCount: plan.write_set.length,
    stepCount: plan.steps.length, relatedSignalCount: plan.steps.filter((step) => step.phase === "related-learning-signal-resolved").length,
    authorizationBasis: plan.authorization.basis, contentIncluded: false,
    ...(projectionIssuesOf(plan).length ? { projectionPending: Object.freeze([...projectionIssuesOf(plan)]), ordinaryTasksContinue: true } : {}),
    ...(userReport ? { userReport } : {}) });
}

export function preparePersistentPromotionFromHandoff(repository, request,
  { now = new Date(), proposedFormalPreview = undefined } = {}) {
  try {
    const repositoryReal = realpathSync(repository);
    const operationalGate = operationalDerivedStateGate(repositoryReal, "learning-promotion");
    if (!operationalGate.proceed) return operationalGate.result;
    const checked = parseHandoff(repositoryReal, request, { proposedFormalPreview });
    if (checked.decision === "learning-promotion-new-confirmation-required") return checked;
    const nowMs = now instanceof Date ? now.getTime() : Number.NaN;
    if (!Number.isFinite(nowMs)) throw new Error("promotion transaction time is invalid");
    const transactionAt = new Date(nowMs).toISOString();
    const transactionId = `promotion.${randomBytes(16).toString("hex")}`; const nonce = randomBytes(24).toString("hex");
    const plan = buildPromotionPlan(repositoryReal, checked, { transactionId, transactionAt });
    const expiresAt = new Date(nowMs + 30 * 60_000).toISOString();
    const { record } = persistBundle(repositoryReal, plan, nonce, "prepared", expiresAt);
    return preparationSummary(record, plan, nonce, "persistent-learning-promotion-prepared",
      { userReport: operationalGate.repair.userReport ?? null });
  } catch (error) {
    return Object.freeze({ decision: "persistent-learning-promotion-prepare-denied", reason: error.message,
      executable: false, contentIncluded: false, ordinaryTasksContinue: true,
      pausedCapabilities: Object.freeze(["learning-promotion"]),
      userReport: Object.freeze({
        impact: "本次学习晋升暂时没有继续；故障只限制这一项，不影响整个助手。",
        data_state: "候选正文、正式资产和用户数据均保持原样，没有删除或猜测改写。",
        recoverability: "修正这项候选的来源、索引或复核交接后，可以重新发起晋升。",
        still_usable: "普通对话、现有资产和其他独立能力仍可继续使用。",
        next_step: "让 Agent 只检查这项候选及其复核交接，不要重建整个实例。",
        user_summary: "本次学习晋升暂时没有继续，现有数据未改动；普通任务仍可继续。请只检查这项候选及其复核交接。",
      }) });
  }
}

function loadBundle(repository, { transactionId, transactionNonce }, { allowCompleted = true } = {}) {
  const repositoryReal = realpathSync(repository); const directory = transactionDirectory(repositoryReal, transactionId);
  if (!existsSync(directory)) throw new Error("promotion transaction bundle is unavailable");
  const directoryInfo = lstatSync(directory);
  if (!directoryInfo.isDirectory() || directoryInfo.isSymbolicLink()) throw new Error("promotion transaction bundle is not a physical directory");
  ensureInside(repositoryReal, realpathSync(directory));
  recoverRecordResidue(directory, repositoryReal);
  const names = readdirSync(directory).sort();
  if (JSON.stringify(names) !== JSON.stringify(["plan.json", "record.json"])) throw new Error("promotion transaction bundle contains unexpected files");
  const recordPath = resolve(directory, "record.json"); const planPath = resolve(directory, "plan.json");
  const record = readBoundedJson(recordPath, limits.record, "promotion transaction record");
  const plan = readBoundedJson(planPath, limits.plan, "promotion transaction plan");
  if (!validRecord(record, repositoryReal) || !validatePersistentPromotionPlan(plan)
    || record.transaction_id !== transactionId || record.nonce_digest !== sha256(transactionNonce ?? "")
    || record.plan_digest !== plan.plan_digest || record.instance_id !== plan.instance_id
    || record.candidate_id !== plan.candidate_id || record.candidate_revision !== plan.candidate_revision
    || record.review_payload_digest !== plan.authorization.review_payload_digest || record.formal_id !== plan.formal_id
    || (!allowCompleted && record.status === "completed")) throw new Error("promotion transaction binding, nonce, record, or plan is invalid");
  const manifestRead = stableRead(repositoryReal, MANIFEST_REF, limits.manifest);
  const manifest = validateInstanceManifestStructure(parseSectionedToml(manifestRead.text, "promotion execution manifest"));
  if (manifest.root.state !== "instance" || manifest.root.instance_id !== plan.instance_id
    || manifestRead.digest !== plan.manifest_digest || plan.repository_binding !== sha256(repositoryReal.normalize("NFC"))) {
    throw new Error("promotion transaction repository or instance binding changed");
  }
  for (const item of plan.read_bindings) {
    if (digestAt(repositoryReal, item.target) !== item.digest) throw new Error("promotion transaction read-only source drifted");
  }
  recoverStepResidue(repositoryReal, plan);
  return { repositoryReal, directory, recordPath, planPath, record, plan };
}
function blobMap(plan) { return new Map(plan.blobs.map((item) => [item.digest, Buffer.from(item.content_base64, "base64")])); }
function limitForTarget(ref) {
  if (ref === CONTROL_REF) return limits.control;
  if (ref === INDEX_REF) return limits.index;
  if (ref === SIGNAL_MAP_REF) return limits.signalMap;
  if (ref === TIME_MAP_REF) return limits.timeMap;
  if ([PUBLIC_SNAPSHOT_REF, DIST_SNAPSHOT_REF].includes(ref)) return limits.snapshot;
  if (ref.startsWith("instance/evolution/review-payloads/") && ref.endsWith(".json")) return limits.payload;
  if (ref.startsWith("instance/signals/")) return limits.signal;
  if (ref.startsWith("instance/evolution/")) return limits.candidate;
  if (ref.startsWith("instance/maps/")) return limits.domainMap;
  if (["instance/memory/", "instance/capabilities/", "instance/sops/", "instance/experiences/"]
    .some((prefix) => ref.startsWith(prefix))) return limits.formal;
  return 128 * 1024 * 1024;
}
function digestAt(repositoryReal, ref) { return stableRead(repositoryReal, ref, limitForTarget(ref), { allowMissing: true })?.digest ?? "absent"; }
function stepArtifactPaths(repositoryReal, plan, targetRef, operationKey) {
  if (!clean(operationKey, 80, false) || !/^[a-z0-9-]+$/u.test(operationKey)) throw new Error("transaction operation key is invalid");
  const target = physicalTarget(repositoryReal, targetRef); const token = plan.plan_digest.slice(7, 23);
  const stem = `${target}.promotion-${token}-${operationKey}`;
  return { target, stage: `${stem}.stage`, backup: `${stem}.backup` };
}
function physicalArtifactDigest(repositoryReal, path, targetRef, label) {
  const info = lstatSync(path);
  if (!info.isFile() || info.isSymbolicLink() || info.size > limitForTarget(targetRef)) {
    throw new Error(`${label} is not one bounded physical file`);
  }
  ensureInside(repositoryReal, realpathSync(path));
  const descriptor = openSync(path, "r");
  try {
    const before = fstatSync(descriptor, { bigint: true }); const buffer = Buffer.alloc(Number(before.size)); let offset = 0;
    while (offset < buffer.length) { const count = readSync(descriptor, buffer, offset, buffer.length - offset, offset); if (count === 0) break; offset += count; }
    const after = fstatSync(descriptor, { bigint: true });
    if (offset !== buffer.length || before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size
      || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs) throw new Error(`${label} changed during read`);
    return sha256(buffer);
  } finally { closeSync(descriptor); }
}
function rollbackOperationKey(targetRef) { return `rollback-${sha256(targetRef).slice(7, 19)}`; }
function recoverOneStepResidue(repositoryReal, plan, transition) {
  const paths = stepArtifactPaths(repositoryReal, plan, transition.target, transition.operationKey);
  const stageExists = existsSync(paths.stage); const backupExists = existsSync(paths.backup);
  if (!stageExists && !backupExists) return 0;
  const targetDigest = digestAt(repositoryReal, transition.target);
  const stageDigest = stageExists ? physicalArtifactDigest(repositoryReal, paths.stage, transition.target, "promotion transaction stage") : "absent";
  const backupDigest = backupExists ? physicalArtifactDigest(repositoryReal, paths.backup, transition.target, "promotion transaction backup") : "absent";
  const fromAllowed = transition.fromDigests.has(targetDigest) || transition.fromDigests.has(backupDigest);
  if (stageExists && !backupExists && targetDigest !== transition.toDigest
    && transition.fromDigests.has(targetDigest) && stageDigest === transition.toDigest) {
    unlinkSync(paths.stage); return 1;
  }
  if (stageExists && backupExists && targetDigest === "absent"
    && transition.fromDigests.has(backupDigest) && stageDigest === transition.toDigest) {
    renameSync(paths.backup, paths.target); unlinkSync(paths.stage); return 1;
  }
  if (!stageExists && backupExists && targetDigest === transition.toDigest
    && transition.fromDigests.has(backupDigest)) {
    unlinkSync(paths.backup); return 1;
  }
  if (!fromAllowed) throw new Error("promotion transaction atomic residue has an unknown precondition");
  throw new Error("promotion transaction atomic residue is not a recoverable write prefix");
}
function recoverStepResidue(repositoryReal, plan) {
  const transitions = plan.steps.map((step) => ({ target: step.target, operationKey: `step-${step.ordinal}`,
    fromDigests: new Set([step.precondition_digest]), toDigest: step.proposed_digest }));
  const targetStates = new Map(plan.preimages.map((item) => [item.target, new Set([item.digest])]));
  for (const step of plan.steps) targetStates.get(step.target).add(step.proposed_digest);
  for (const item of plan.rollback) transitions.push({ target: item.target, operationKey: rollbackOperationKey(item.target),
    fromDigests: targetStates.get(item.target), toDigest: item.restore_digest });
  const allowedPaths = new Set(); const targetStems = new Map();
  for (const transition of transitions) {
    const paths = stepArtifactPaths(repositoryReal, plan, transition.target, transition.operationKey);
    allowedPaths.add(paths.stage); allowedPaths.add(paths.backup);
    targetStems.set(paths.target, `${basename(paths.target)}.promotion-${plan.plan_digest.slice(7, 23)}-`);
  }
  for (const [target, stem] of targetStems) {
    for (const entry of readdirSync(dirname(target), { withFileTypes: true })) {
      const path = resolve(dirname(target), entry.name);
      if (entry.name.startsWith(stem) && !allowedPaths.has(path)) {
        throw new Error("promotion transaction target has an unexpected atomic residue");
      }
    }
  }
  const occupied = transitions.filter((transition) => {
    const paths = stepArtifactPaths(repositoryReal, plan, transition.target, transition.operationKey);
    return existsSync(paths.stage) || existsSync(paths.backup);
  });
  if (occupied.length > 1) throw new Error("promotion transaction has multiple atomic residues and was preserved for review");
  return occupied.length === 1 ? recoverOneStepResidue(repositoryReal, plan, occupied[0]) : 0;
}
function inspectPlanState(repositoryReal, plan) {
  const actual = new Map(plan.preimages.map((item) => [item.target, digestAt(repositoryReal, item.target)]));
  const preimage = new Map(plan.preimages.map((item) => [item.target, item.digest]));
  const final = new Map(plan.final_digests.map((item) => [item.target, item.digest]));
  const same = (expected) => expected.size === actual.size && [...expected].every(([target, digest]) => actual.get(target) === digest);
  if (same(final)) return Object.freeze({ state: "final", checkpoint: plan.steps.length });
  if (same(preimage)) return Object.freeze({ state: "preimage", checkpoint: 0 });
  const simulated = new Map(preimage);
  for (let index = 0; index < plan.steps.length; index += 1) {
    const step = plan.steps[index]; simulated.set(step.target, step.proposed_digest);
    if (same(simulated)) return Object.freeze({ state: "prefix", checkpoint: index + 1 });
  }
  return Object.freeze({ state: "drift", checkpoint: 0 });
}

export function persistPreparedPromotionTransaction(repository, { transactionId, transactionNonce } = {}) {
  try {
    const loaded = loadBundle(repository, { transactionId, transactionNonce });
    if (loaded.record.status === "completed") return preparationSummary(loaded.record, loaded.plan, transactionNonce,
      "persistent-learning-promotion-already-completed", { updated: false });
    const state = inspectPlanState(loaded.repositoryReal, loaded.plan);
    if (loaded.record.status === "planned") return preparationSummary(loaded.record, loaded.plan, transactionNonce,
      "persistent-learning-promotion-planned", { updated: false });
    if (loaded.record.status !== "prepared" || state.state !== "preimage") throw new Error("prepared transaction drifted before persistence");
    const now = new Date().toISOString(); const record = { ...loaded.record, status: "planned", updated_at: now };
    atomicJson(loaded.recordPath, record, { replace: true });
    return preparationSummary(record, loaded.plan, transactionNonce, "persistent-learning-promotion-planned");
  } catch (error) {
    return Object.freeze({ decision: "persistent-learning-promotion-persist-denied", reason: error.message,
      executable: false, contentIncluded: false });
  }
}

export function inspectPersistentPromotionTransaction(repository, { transactionId, transactionNonce } = {}) {
  try {
    const loaded = loadBundle(repository, { transactionId, transactionNonce }); const state = inspectPlanState(loaded.repositoryReal, loaded.plan);
    const decision = state.state === "final" ? "persistent-learning-promotion-final"
      : state.state === "preimage" ? "persistent-learning-promotion-preimage"
        : state.state === "prefix" && state.checkpoint >= PROMOTION_CORE_STEP_COUNT
          ? "persistent-learning-promotion-core-complete-projections-pending"
          : state.state === "prefix" ? "persistent-learning-promotion-resume-or-rollback-required"
          : "persistent-learning-promotion-drift-recovery-required";
    return Object.freeze({ decision, executable: false, transactionId, status: loaded.record.status,
      planDigest: loaded.plan.plan_digest, checkpoint: state.checkpoint, stepCount: loaded.plan.steps.length,
      updated: false, recoveryEvidencePreserved: true, contentIncluded: false });
  } catch (error) {
    return Object.freeze({ decision: "persistent-learning-promotion-inspect-denied", reason: error.message,
      executable: false, contentIncluded: false });
  }
}

function physicalTarget(repositoryReal, ref) {
  if (!portableRef(ref)) throw new Error("transaction target is not a portable relative reference");
  let cursor = repositoryReal;
  for (const part of ref.split("/").slice(0, -1)) {
    cursor = resolve(cursor, part);
    if (!existsSync(cursor)) mkdirSync(cursor);
    const info = lstatSync(cursor);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("transaction target parent crosses a link, reparse point, or non-directory");
    ensureInside(repositoryReal, realpathSync(cursor));
  }
  const target = resolve(repositoryReal, ...ref.split("/")); ensureInside(repositoryReal, target);
  if (existsSync(target)) {
    const info = lstatSync(target);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error("transaction target is not one physical file");
    ensureInside(repositoryReal, realpathSync(target));
  }
  return target;
}
function atomicStep(repositoryReal, plan, step, blobs) {
  const operationKey = step.operation_key ?? `step-${step.ordinal}`;
  const { target, stage, backup } = stepArtifactPaths(repositoryReal, plan, step.target, operationKey);
  if (existsSync(stage)) throw new Error("transaction stage is unexpectedly occupied");
  if (existsSync(backup)) throw new Error("transaction backup is unexpectedly occupied");
  if (digestAt(repositoryReal, step.target) !== step.precondition_digest) throw new Error(`step ${step.ordinal} precondition drifted`);
  const content = blobs.get(step.proposed_digest);
  if (!content || sha256(content) !== step.proposed_digest) throw new Error(`step ${step.ordinal} proposed bytes are unavailable`);
  writeFileSync(stage, content, { flag: "wx" });
  try {
    if (existsSync(target)) renameSync(target, backup);
    renameSync(stage, target);
    if (digestAt(repositoryReal, step.target) !== step.proposed_digest) throw new Error(`step ${step.ordinal} readback failed`);
    if (existsSync(backup)) unlinkSync(backup);
  } catch (error) {
    if (existsSync(stage)) unlinkSync(stage);
    if (existsSync(backup)) {
      if (existsSync(target)) unlinkSync(target);
      renameSync(backup, target);
    }
    throw error;
  }
}
function finalizeRecord(loaded) {
  const now = new Date().toISOString();
  if (loaded.record.status !== "completed") atomicJson(loaded.recordPath, { ...loaded.record, status: "completed", updated_at: now }, { replace: true });
}
function verifyPromotionCoreSemantics(loaded) {
  if (digestAt(loaded.repositoryReal, loaded.plan.formal_target) !== loaded.plan.formal_preview_digest) {
    throw new Error("promoted formal asset is not the authorized exact content");
  }
  const routed = loadTrustedDomainEnvelope(loaded.repositoryReal, { explicitRequestedId: loaded.plan.formal_id });
  if (routed.envelope.explicitRoute?.id !== loaded.plan.formal_id
    || routed.envelope.explicitRoute?.target !== loaded.plan.formal_target) {
    throw new Error("promoted formal asset is not reachable through its instance route");
  }
  const candidate = parseMarkdownFrontmatterHead(
    stableRead(loaded.repositoryReal, loaded.plan.candidate_source_ref, limits.candidate).text,
    "promoted source candidate",
  ).values;
  if (candidate.status !== "archived" || candidate.resolution !== "promoted"
    || candidate.resolved_to !== loaded.plan.formal_id) {
    throw new Error("source candidate was not closed after formal promotion");
  }
}
function verifyFinalSemantics(loaded) {
  verifyPromotionCoreSemantics(loaded);
  if (projectionIssuesOf(loaded.plan).includes("dashboard-public-snapshot")) return;
  const publicRead = stableRead(loaded.repositoryReal, PUBLIC_SNAPSHOT_REF, limits.snapshot);
  const distRead = stableRead(loaded.repositoryReal, DIST_SNAPSHOT_REF, limits.snapshot);
  if (publicRead.digest !== distRead.digest) throw new Error("committed snapshot pair is not byte-identical");
  const snapshot = parseCurrentSnapshotEnvelope(publicRead.text, "committed promotion snapshot");
  const formalCards = [...snapshot.memories, ...snapshot.sops, ...snapshot.capabilities, ...snapshot.experiences]
    .filter((item) => item.id === loaded.plan.formal_id);
  if (formalCards.length !== 1 || snapshot.evolution.some((item) => item.id === loaded.plan.candidate_id)) {
    throw new Error("committed snapshot closure is duplicated or stale");
  }
  const second = buildSnapshotCandidate(loaded.repositoryReal, { existingSource: publicRead.text,
    now: new Date(loaded.plan.transaction_at), mode: "operational",
    requiredSourceRefs: loaded.plan.steps.map((step) => step.target) });
  if (second.updated || second.source !== publicRead.text) throw new Error("committed snapshot is not byte-idempotent from current truth sources");
}
function promotionProjectionPendingResult(loaded, state, decision = "persistent-learning-promotion-core-complete-projections-pending") {
  verifyPromotionCoreSemantics(loaded);
  const pending = [...new Set([
    ...loaded.plan.steps.slice(state.checkpoint).map((step) => step.phase),
    ...projectionIssuesOf(loaded.plan),
  ])];
  return Object.freeze({
    decision, status: "limited", executable: false, transactionId: loaded.plan.transaction_id,
    planDigest: loaded.plan.plan_digest, updated: true, checkpoint: state.checkpoint,
    projectionPending: Object.freeze(pending),
    ordinaryTasksContinue: true, recoveryEvidencePreserved: true, contentIncluded: false,
  });
}
function promotionCompleteResult(loaded, decision, { updated, idempotent, writeCount }) {
  const pending = projectionIssuesOf(loaded.plan);
  return Object.freeze({
    decision: pending.length ? `${decision}-projections-pending` : decision,
    ...(pending.length ? { status: "limited", projectionPending: Object.freeze([...pending]), ordinaryTasksContinue: true } : {}),
    executable: false, transactionId: loaded.plan.transaction_id, planDigest: loaded.plan.plan_digest,
    updated, idempotent, writeCount, contentIncluded: false,
  });
}
function executeFromCheckpoint(loaded, checkpoint, { faultAfterStep = 0 } = {}) {
  const blobs = blobMap(loaded.plan); let writes = 0;
  for (const step of loaded.plan.steps.slice(checkpoint)) {
    atomicStep(loaded.repositoryReal, loaded.plan, step, blobs); writes += 1;
    if (faultAfterStep > 0 && step.ordinal === faultAfterStep) throw new Error(`injected interruption after step ${step.ordinal}`);
  }
  const state = inspectPlanState(loaded.repositoryReal, loaded.plan);
  if (state.state !== "final") throw new Error("transaction did not reach its exact final state");
  verifyFinalSemantics(loaded); finalizeRecord(loaded); return writes;
}

export function executePersistentPromotionTransaction(repository,
  { transactionId, transactionNonce, faultAfterStep = 0 } = {}) {
  let loaded;
  try {
    loaded = loadBundle(repository, { transactionId, transactionNonce }); const state = inspectPlanState(loaded.repositoryReal, loaded.plan);
    if (state.state === "final") {
      verifyFinalSemantics(loaded); finalizeRecord(loaded);
      return promotionCompleteResult(loaded, "persistent-learning-promotion-execution-complete",
        { updated: false, idempotent: true, writeCount: 0 });
    }
    if (loaded.record.status !== "planned") throw new Error("transaction must be persisted before execution");
    if (state.state === "prefix" && state.checkpoint < PROMOTION_CORE_STEP_COUNT) return Object.freeze({ decision: "persistent-learning-promotion-resume-or-rollback-required",
      executable: false, transactionId, checkpoint: state.checkpoint, recoveryEvidencePreserved: true, contentIncluded: false });
    if (state.state === "drift") return Object.freeze({ decision: "persistent-learning-promotion-drift-recovery-required",
      executable: false, transactionId, recoveryEvidencePreserved: true, contentIncluded: false });
    const writes = executeFromCheckpoint(loaded, state.state === "prefix" ? state.checkpoint : 0, { faultAfterStep });
    return promotionCompleteResult(loaded, "persistent-learning-promotion-execution-complete",
      { updated: true, idempotent: false, writeCount: writes });
  } catch (error) {
    try {
      if (loaded) {
        const state = inspectPlanState(loaded.repositoryReal, loaded.plan);
        if (state.state === "final") {
          verifyFinalSemantics(loaded); finalizeRecord(loaded);
          return promotionCompleteResult(loaded, "persistent-learning-promotion-execution-complete",
            { updated: true, idempotent: false, writeCount: loaded.plan.steps.length });
        }
        if (state.state === "prefix" && state.checkpoint >= PROMOTION_CORE_STEP_COUNT) {
          return promotionProjectionPendingResult(loaded, state);
        }
      }
    } catch { /* preserve the original failure and recovery evidence */ }
    return Object.freeze({ decision: "persistent-learning-promotion-execution-denied", reason: error.message,
      executable: false, transactionId: transactionId ?? "", recoveryEvidencePreserved: true, contentIncluded: false });
  }
}

export function resumePersistentPromotionTransaction(repository,
  { transactionId, transactionNonce, faultAfterStep = 0 } = {}) {
  let loaded;
  try {
    loaded = loadBundle(repository, { transactionId, transactionNonce }); const state = inspectPlanState(loaded.repositoryReal, loaded.plan);
    if (state.state === "final") {
      verifyFinalSemantics(loaded); finalizeRecord(loaded);
      return promotionCompleteResult(loaded, "persistent-learning-promotion-resume-complete",
        { updated: false, idempotent: true, writeCount: 0 });
    }
    if (loaded.record.status !== "planned" || !["preimage", "prefix"].includes(state.state)) {
      throw new Error("only an exact preimage or legal prefix can resume");
    }
    const writes = executeFromCheckpoint(loaded, state.checkpoint, { faultAfterStep });
    return promotionCompleteResult(loaded, "persistent-learning-promotion-resume-complete",
      { updated: writes > 0, idempotent: writes === 0, writeCount: writes });
  } catch (error) {
    try {
      if (loaded) {
        const state = inspectPlanState(loaded.repositoryReal, loaded.plan);
        if (state.state === "final") {
          verifyFinalSemantics(loaded); finalizeRecord(loaded);
          return promotionCompleteResult(loaded, "persistent-learning-promotion-resume-complete",
            { updated: true, idempotent: false, writeCount: loaded.plan.steps.length });
        }
        if (state.state === "prefix" && state.checkpoint >= PROMOTION_CORE_STEP_COUNT) {
          return promotionProjectionPendingResult(loaded, state, "persistent-learning-promotion-resume-projections-pending");
        }
      }
    } catch { /* preserve the original failure and recovery evidence */ }
    return Object.freeze({ decision: "persistent-learning-promotion-resume-denied", reason: error.message,
      executable: false, transactionId: transactionId ?? "", recoveryEvidencePreserved: true, contentIncluded: false });
  }
}

export function rollbackPersistentPromotionTransaction(repository, { transactionId, transactionNonce } = {}) {
  try {
    const loaded = loadBundle(repository, { transactionId, transactionNonce }); const state = inspectPlanState(loaded.repositoryReal, loaded.plan);
    if (state.state === "final") throw new Error("a complete promotion cannot be crash-rolled back");
    if (state.state === "drift") throw new Error("non-prefix drift cannot be automatically overwritten");
    if (state.state === "prefix" && state.checkpoint >= PROMOTION_CORE_STEP_COUNT) {
      throw new Error("promotion core is already complete; refresh only the pending projections instead of removing the authorized asset");
    }
    if (loaded.record.status !== "planned" && state.state !== "preimage") throw new Error("transaction is not rollback-eligible");
    const blobs = blobMap(loaded.plan); let restored = 0;
    for (const item of loaded.plan.rollback) {
      const current = digestAt(loaded.repositoryReal, item.target);
      if (current === item.restore_digest) continue;
      const target = physicalTarget(loaded.repositoryReal, item.target);
      if (item.restore_digest === "absent") {
        if (existsSync(target)) unlinkSync(target);
      } else {
        const content = blobs.get(item.restore_digest);
        if (!content) throw new Error("rollback preimage bytes are unavailable");
        const synthetic = { ordinal: 0, operation_key: rollbackOperationKey(item.target), target: item.target, precondition_digest: current,
          proposed_digest: item.restore_digest };
        atomicStep(loaded.repositoryReal, loaded.plan, synthetic, blobs);
      }
      if (digestAt(loaded.repositoryReal, item.target) !== item.restore_digest) throw new Error("rollback readback failed");
      restored += 1;
    }
    const after = inspectPlanState(loaded.repositoryReal, loaded.plan);
    if (after.state !== "preimage") throw new Error("rollback did not restore all exact preimages");
    return Object.freeze({ decision: "persistent-learning-promotion-rollback-complete", executable: false,
      transactionId, restoredTargetCount: restored, updated: restored > 0, resumable: true,
      recoveryEvidencePreserved: true, contentIncluded: false });
  } catch (error) {
    return Object.freeze({ decision: "persistent-learning-promotion-rollback-denied", reason: error.message,
      executable: false, transactionId: transactionId ?? "", recoveryEvidencePreserved: true, contentIncluded: false });
  }
}

export function closePersistentPromotionTransaction(repository, { transactionId, transactionNonce } = {}) {
  try {
    const loaded = loadBundle(repository, { transactionId, transactionNonce }); const state = inspectPlanState(loaded.repositoryReal, loaded.plan);
    if (![["prepared", "preimage"], ["planned", "preimage"], ["completed", "final"]]
      .some(([status, expected]) => loaded.record.status === status && state.state === expected)) {
      throw new Error("only a complete preimage or complete final bundle can close safely");
    }
    rmSync(loaded.directory, { recursive: true, force: false }); removeEmptyStoreParents(loaded.repositoryReal);
    return Object.freeze({ decision: "persistent-learning-promotion-closed", executable: false,
      transactionId, closedState: state.state, updated: true, contentIncluded: false });
  } catch (error) {
    return Object.freeze({ decision: "persistent-learning-promotion-close-denied", reason: error.message,
      executable: false, transactionId: transactionId ?? "", recoveryEvidencePreserved: true, contentIncluded: false });
  }
}

export function cleanupPersistentPromotionTransactions(repository, { now = new Date() } = {}) {
  try {
    const repositoryReal = realpathSync(repository); const root = bundleRoot(repositoryReal);
    const nowMs = now instanceof Date ? now.getTime() : Number.NaN;
    if (!Number.isFinite(nowMs)) throw new Error("cleanup time is invalid");
    let inspected = 0; let removedPreparedCount = 0; const preserved = [];
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (++inspected > 2048) throw new Error("promotion cleanup budget exceeded");
      if (!entry.isDirectory()) throw new Error("promotion store contains an unexpected non-directory entry");
      const directory = resolve(root, entry.name);
      if (entry.name.endsWith(".stage")) { preserved.push({ transactionId: entry.name, state: "incomplete-stage" }); continue; }
      const record = readBoundedJson(resolve(directory, "record.json"), limits.record, "promotion cleanup record");
      const plan = readBoundedJson(resolve(directory, "plan.json"), limits.plan, "promotion cleanup plan");
      if (!validRecord(record, repositoryReal) || !validatePersistentPromotionPlan(plan) || record.plan_digest !== plan.plan_digest) {
        preserved.push({ transactionId: entry.name, state: "tampered" }); continue;
      }
      const state = inspectPlanState(repositoryReal, plan);
      if (record.status === "prepared" && Date.parse(record.expires_at) < nowMs && state.state === "preimage") {
        rmSync(directory, { recursive: true, force: false }); removedPreparedCount += 1; continue;
      }
      if (record.status === "prepared" && Date.parse(record.expires_at) < nowMs) {
        preserved.push({ transactionId: record.transaction_id, state: state.state }); continue;
      }
      if (record.status === "planned" && ["prefix", "drift"].includes(state.state)) {
        preserved.push({ transactionId: record.transaction_id, state: state.state });
      }
    }
    removeEmptyStoreParents(repositoryReal);
    return Object.freeze({ decision: preserved.length > 0 ? "persistent-learning-promotion-cleanup-recovery-required"
      : "persistent-learning-promotion-cleanup-complete", executable: false, inspectedCount: inspected,
    removedPreparedCount, preservedCount: preserved.length, preserved: Object.freeze(preserved), contentIncluded: false });
  } catch (error) {
    return Object.freeze({ decision: "persistent-learning-promotion-cleanup-denied", reason: error.message,
      executable: false, contentIncluded: false });
  }
}
