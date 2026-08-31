import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseSectionedToml,
  stableAssetId,
  validateInstanceManifestStructure,
} from "./asset-route-contract.mjs";
import {
  inspectInstanceComponentCompatibility,
  inspectInstanceComponents,
} from "./instance-component-contract.mjs";
import {
  inspectCrossSessionSignalStartup,
  repairOperationalDerivedStateOnce,
} from "./cross-session-signal-transaction.mjs";
import { locateHighConfidenceSecretCandidates } from "./secret-content-boundary.mjs";
import { parseCurrentSnapshotEnvelope } from "./snapshot-envelope.mjs";
import { validateSnapshotSemantics } from "./snapshot-semantics.mjs";
import { inspectStartupCapsule, MAX_MANIFEST_BYTES } from "./startup-capsule-contract.mjs";
import { syncStartupCapsule } from "./sync-startup-capsule.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultRepository = resolve(scriptDirectory, "../..");
const utf8 = new TextDecoder("utf-8", { fatal: true });
const requestLimitBytes = 64 * 1024;
const forbiddenControls = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/u;
const zonedDate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/u;
const excludedCandidateRoots = new Set([
  ".git",
  ".planning",
  "node_modules",
  "maintainer-private",
  "AGENTS.override.md",
  ".assistant-local",
  ".assistant-private",
]);

export const firstInstantiationWriteSet = Object.freeze([
  "instance/profile/approved-profile.md",
  "instance/maps/domain-map.toml",
  "instance/signals/control.toml",
  "instance/maps/signal-map.toml",
  "instance/maps/time-trigger-map.toml",
  "instance/evolution/index.toml",
  "instance/validations/index.toml",
  "instance/components/registry.toml",
  "instance/hosts/registry.toml",
  "instance/skills/requirements.toml",
  "instance/governance/consistency-governance-card.md",
  "instance/governance/memory-governance-card.md",
  "instance/governance/network-security-governance-card.md",
  "dashboard/public/snapshot.js",
  "dashboard/dist/snapshot.js",
  "instance/manifest.toml",
  "instance/startup-capsule.toml",
]);

const templateIdentityRefs = Object.freeze([
  "instance/components/registry.toml",
  "instance/evolution/index.toml",
  "instance/hosts/registry.toml",
  "instance/manifest.toml",
  "instance/maps/domain-map.toml",
  "instance/maps/signal-map.toml",
  "instance/maps/time-trigger-map.toml",
  "instance/signals/control.toml",
  "instance/skills/requirements.toml",
  "instance/startup-capsule.toml",
  "instance/validations/index.toml",
]);

const governanceDefinitions = Object.freeze([
  Object.freeze({
    ref: "instance/governance/consistency-governance-card.md",
    routeId: "governance-consistency-research",
  }),
  Object.freeze({
    ref: "instance/governance/memory-governance-card.md",
    routeId: "governance-memory-research",
  }),
  Object.freeze({
    ref: "instance/governance/network-security-governance-card.md",
    routeId: "governance-security-research",
  }),
]);

const requestExample = Object.freeze({
  schema_version: 1,
  guidance_mode: "balanced",
  language: "zh-CN",
  learning_policy: "risk-tiered",
  display_name: "我的助手",
  mission: "一句话说明这个助手长期帮助我完成什么。",
  direction: Object.freeze({
    type: "domain",
    domain_id: "",
    label: "内容研究助手",
    scope_statement: "帮助研究公开内容、整理证据并形成可复用的方法。",
  }),
  first_task: Object.freeze({
    title: "完成第一项真实任务",
    summary: "说明第一项任务会产生什么结果，但不要写成已经完成。",
    trigger: "帮我开始第一项任务",
    aliases: Object.freeze([]),
    scope: Object.freeze([]),
    conditions: Object.freeze([]),
    excludes: Object.freeze([]),
    start_after_instantiation: false,
  }),
  profile: Object.freeze({
    in_scope: Object.freeze([]),
    out_of_scope: Object.freeze([]),
    automation: Object.freeze([]),
    privacy: Object.freeze([]),
    learning: Object.freeze([]),
    environment: Object.freeze([]),
    unknowns: Object.freeze([]),
  }),
  host: Object.freeze({
    label: "当前宿主",
    product_name: "",
    product_version: "",
    model_name: "",
    model_selection_label: "",
    request_model_name: "",
    model_routing_mode: "unknown",
    model_observation_basis: Object.freeze([]),
    environment: "",
    observation_basis: "current-session",
    integration_mode: "direct-workspace",
    match_hint: "current-host",
    limitations: Object.freeze([]),
  }),
});

function fail(message) {
  throw new Error("First instantiation failed: " + message);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function q(value) {
  return JSON.stringify(value);
}

function rel(root, path) {
  return relative(root, path).split(sep).join("/");
}

function oneLine(value, label, maximum, { allowEmpty = false } = {}) {
  if (typeof value !== "string") fail(label + " must be text");
  const normalized = value.normalize("NFC").replace(/\s+/gu, " ").trim();
  if ((!allowEmpty && normalized === "") || normalized.length > maximum || forbiddenControls.test(normalized)) {
    fail(label + " is empty, too long, or contains unsafe control text");
  }
  return normalized;
}

function textList(value, label, maximumItems, maximumLength) {
  if (value === undefined) return Object.freeze([]);
  if (!Array.isArray(value) || value.length > maximumItems) fail(label + " must be a short text list");
  return Object.freeze(value.map((item, index) => oneLine(item, label + "[" + index + "]", maximumLength)));
}

function exactObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(label + " must be an object");
  return value;
}

function unknownKeys(value, allowed, prefix, warnings) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) warnings.push("Ignored unknown request field: " + prefix + key);
  }
}

function stableDerivedId(prefix, preferred, seed, maximum = 64) {
  const normalizedPreferred = typeof preferred === "string" ? preferred.normalize("NFC").trim().toLowerCase() : "";
  if (normalizedPreferred !== "" && stableAssetId.test(normalizedPreferred) && normalizedPreferred.length <= maximum) {
    return normalizedPreferred;
  }
  const ascii = seed.normalize("NFKD").toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "").slice(0, Math.max(3, maximum - prefix.length - 1));
  const suffix = ascii.length >= 3 ? ascii : sha256(Buffer.from(seed, "utf8")).slice(0, 12);
  return (prefix + "-" + suffix).slice(0, maximum);
}

export function normalizeFirstInstantiationRequest(input) {
  const value = exactObject(input, "request");
  const warnings = [];
  unknownKeys(value, new Set([
    "schema_version", "guidance_mode", "language", "learning_policy", "display_name", "mission",
    "direction", "first_task", "profile", "host",
  ]), "", warnings);
  if (value.schema_version !== 1) fail("request schema_version must be 1");
  if (!["step-by-step", "balanced", "direct"].includes(value.guidance_mode)) fail("guidance_mode is unsupported");
  const language = value.language === undefined ? "zh-CN" : value.language;
  if (!["zh-CN", "en", "en-US"].includes(language)) fail("language is unsupported");
  const learningPolicy = value.learning_policy === undefined ? "risk-tiered" : value.learning_policy;
  if (!["risk-tiered", "manual-only"].includes(learningPolicy)) fail("learning_policy is unsupported");

  const directionInput = exactObject(value.direction, "direction");
  unknownKeys(directionInput, new Set(["type", "domain_id", "label", "scope_statement"]), "direction.", warnings);
  if (!["general", "domain"].includes(directionInput.type)) fail("direction.type must be general or domain");
  const directionLabel = oneLine(directionInput.label, "direction.label", 80);
  const directionScope = oneLine(directionInput.scope_statement, "direction.scope_statement", 240);
  const domainId = directionInput.type === "general"
    ? ""
    : stableDerivedId("domain", directionInput.domain_id, directionLabel + "\n" + directionScope, 96);

  const taskInput = exactObject(value.first_task, "first_task");
  unknownKeys(taskInput, new Set([
    "title", "summary", "trigger", "aliases", "scope", "conditions", "excludes", "start_after_instantiation",
  ]), "first_task.", warnings);
  const taskTitle = oneLine(taskInput.title, "first_task.title", 80);
  const taskSummary = oneLine(taskInput.summary, "first_task.summary", 240);
  const taskTrigger = oneLine(taskInput.trigger, "first_task.trigger", 80);
  const taskAliases = textList(taskInput.aliases, "first_task.aliases", 8, 80);
  const taskScope = textList(taskInput.scope, "first_task.scope", 8, 120);
  const taskConditions = textList(taskInput.conditions, "first_task.conditions", 8, 120);
  const taskExcludes = textList(taskInput.excludes, "first_task.excludes", 8, 120);
  const startAfterInstantiation = taskInput.start_after_instantiation ?? false;
  if (typeof startAfterInstantiation !== "boolean") fail("first_task.start_after_instantiation must be true or false");

  const profileInput = value.profile === undefined ? {} : exactObject(value.profile, "profile");
  unknownKeys(profileInput, new Set([
    "in_scope", "out_of_scope", "automation", "privacy", "learning", "environment", "unknowns",
  ]), "profile.", warnings);
  const profile = Object.freeze({
    inScope: textList(profileInput.in_scope, "profile.in_scope", 12, 240),
    outOfScope: textList(profileInput.out_of_scope, "profile.out_of_scope", 12, 240),
    automation: textList(profileInput.automation, "profile.automation", 12, 240),
    privacy: textList(profileInput.privacy, "profile.privacy", 12, 240),
    learning: textList(profileInput.learning, "profile.learning", 12, 240),
    environment: textList(profileInput.environment, "profile.environment", 12, 240),
    unknowns: textList(profileInput.unknowns, "profile.unknowns", 12, 240),
  });

  const hostInput = value.host === undefined ? {} : exactObject(value.host, "host");
  unknownKeys(hostInput, new Set([
    "label", "product_name", "product_version", "model_name", "model_selection_label",
    "request_model_name", "model_routing_mode", "model_observation_basis", "environment",
    "observation_basis", "integration_mode", "match_hint", "limitations",
  ]), "host.", warnings);
  const routingMode = hostInput.model_routing_mode === undefined ? "unknown" : hostInput.model_routing_mode;
  if (!["manual", "auto", "host-managed", "unknown"].includes(routingMode)) fail("host.model_routing_mode is unsupported");
  const modelObservationBasis = textList(hostInput.model_observation_basis, "host.model_observation_basis", 8, 80);
  const rawModelName = oneLine(hostInput.model_name ?? "", "host.model_name", 160, { allowEmpty: true });
  const rawSelectionLabel = oneLine(hostInput.model_selection_label ?? "", "host.model_selection_label", 160, { allowEmpty: true });
  const rawRequestModel = oneLine(hostInput.request_model_name ?? "", "host.request_model_name", 160, { allowEmpty: true });
  const requestModelVerified = modelObservationBasis.some((basis) => ["current-request-metadata", "host-receipt"].includes(basis));
  const selectionVerified = modelObservationBasis.some((basis) => ["user-visible-selection", "user-stated-selection"].includes(basis));
  const requestModelName = requestModelVerified ? (rawRequestModel || rawModelName) : "";
  const modelSelectionLabel = selectionVerified ? (rawSelectionLabel || (!requestModelVerified ? rawModelName : "")) : "";
  const modelName = requestModelName || modelSelectionLabel;
  if ((rawRequestModel || rawModelName) && !requestModelVerified && !selectionVerified) {
    warnings.push("Ignored an unverified host model name; the instance records it as unknown instead of treating a UI or proxy alias as the request backend.");
  }
  if (rawSelectionLabel && !selectionVerified) {
    warnings.push("Ignored a model selection label without user-visible or user-stated selection evidence.");
  }
  const host = Object.freeze({
    label: oneLine(hostInput.label ?? "当前宿主", "host.label", 120),
    productName: oneLine(hostInput.product_name ?? "", "host.product_name", 160, { allowEmpty: true }),
    productVersion: oneLine(hostInput.product_version ?? "", "host.product_version", 80, { allowEmpty: true }),
    modelName,
    modelSelectionLabel,
    requestModelName,
    modelRoutingMode: routingMode,
    modelObservationBasis,
    environment: oneLine(hostInput.environment ?? "", "host.environment", 240, { allowEmpty: true }),
    observationBasis: oneLine(hostInput.observation_basis ?? "current-session", "host.observation_basis", 120),
    integrationMode: oneLine(hostInput.integration_mode ?? "direct-workspace", "host.integration_mode", 120),
    matchHint: oneLine(hostInput.match_hint ?? "current-host", "host.match_hint", 120),
    limitations: textList(hostInput.limitations, "host.limitations", 12, 160),
  });

  const displayName = oneLine(value.display_name, "display_name", 160);
  const mission = oneLine(value.mission, "mission", 512);
  const semanticSeed = [displayName, mission, directionInput.type, domainId, directionLabel, directionScope, taskTitle].join("\n");
  const taskFamilyId = "task-family." + stableDerivedId("task", "", taskTitle + "\n" + taskSummary, 48);
  const hostProfileId = "host." + stableDerivedId("runtime", "", host.label + "\n" + host.matchHint, 48);
  return Object.freeze({
    schemaVersion: 1,
    guidanceMode: value.guidance_mode,
    language,
    learningPolicy,
    displayName,
    mission,
    direction: Object.freeze({
      type: directionInput.type,
      domainId,
      label: directionLabel,
      scopeStatement: directionScope,
    }),
    firstTask: Object.freeze({
      id: taskFamilyId,
      title: taskTitle,
      summary: taskSummary,
      trigger: taskTrigger,
      aliases: taskAliases,
      scope: taskScope.length ? taskScope : Object.freeze([directionScope]),
      conditions: taskConditions.length ? taskConditions : Object.freeze(["真实任务完成后再进入结果验证和资产生命周期"]),
      excludes: taskExcludes.length ? taskExcludes : Object.freeze(["不把尚未执行的任务写成正式资产"]),
      topicKey: stableDerivedId("topic", "", taskTitle + "\n" + taskTrigger, 64),
      subjectKey: directionInput.type === "domain" ? domainId : "general-personal-work",
      startAfterInstantiation,
    }),
    profile,
    host: Object.freeze({ ...host, profileId: hostProfileId }),
    semanticDigest: sha256(Buffer.from(semanticSeed, "utf8")),
    warnings: Object.freeze(warnings),
  });
}

function decodeUtf8(bytes, label) {
  try {
    return utf8.decode(bytes);
  } catch {
    fail(label + " is not UTF-8");
  }
}

function readRequestFile(path) {
  if (typeof path !== "string" || /^[\s\uFEFF]*[\[{]/u.test(path)) {
    fail("--request-file expects a UTF-8 JSON file path, not pasted JSON text; save the request to a temporary file and pass that path");
  }
  const absolute = resolve(path);
  let info;
  try {
    info = lstatSync(absolute);
  } catch (error) {
    if (error?.code === "ENOENT") fail("request file path was not found; save the UTF-8 JSON request first, then pass its path with --request-file");
    fail("request file path could not be read safely");
  }
  if (!info.isFile() || info.isSymbolicLink() || info.size > requestLimitBytes) fail("request file must be a bounded physical file");
  const bytes = readFileSync(absolute);
  const source = decodeUtf8(bytes, "request file");
  const secretCheck = locateHighConfidenceSecretCandidates(source);
  if (secretCheck.blocked) fail("request file appears to contain a secret; remove credentials and retry");
  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch {
    fail("request file is not valid JSON");
  }
  return parsed;
}

function canonicalSource(source) {
  return source.replace(/^\uFEFF/u, "").replace(/\r\n?/gu, "\n");
}

function flexibleManifest(root) {
  const path = resolve(root, "instance/manifest.toml");
  const source = decodeUtf8(readFileSync(path), "instance manifest");
  return Object.freeze({
    source,
    canonical: canonicalSource(source),
    parsed: validateInstanceManifestStructure(parseSectionedToml(canonicalSource(source), "instance manifest")),
  });
}

function excludedRef(ref) {
  if (!ref) return false;
  const first = ref.split("/")[0];
  return excludedCandidateRoots.has(first)
    || ref === "dashboard/node_modules"
    || ref.startsWith("dashboard/node_modules/");
}

function sourceTreeFingerprint(root) {
  const lines = [];
  const queue = [root];
  while (queue.length) {
    const directory = queue.shift();
    const entries = readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name, "en"));
    for (const entry of entries) {
      const path = resolve(directory, entry.name);
      const ref = rel(root, path);
      if (excludedRef(ref)) continue;
      const info = lstatSync(path);
      if (info.isSymbolicLink()) fail("source tree contains a link: " + ref);
      if (info.isDirectory()) {
        lines.push("D\t" + ref + "\n");
        queue.push(path);
      } else if (info.isFile()) {
        const bytes = readFileSync(path);
        lines.push("F\t" + ref + "\t" + bytes.length + "\t" + sha256(bytes) + "\n");
      } else {
        fail("source tree contains a non-regular entry: " + ref);
      }
    }
  }
  return sha256(Buffer.from(lines.sort().join(""), "utf8"));
}

function copyCandidate(root, candidateRoot) {
  cpSync(root, candidateRoot, {
    recursive: true,
    errorOnExist: true,
    filter(path) {
      const ref = rel(root, path);
      if (excludedRef(ref)) return false;
      if (ref !== "") {
        const info = lstatSync(path);
        if (info.isSymbolicLink()) fail("candidate source contains a link: " + ref);
      }
      return true;
    },
  });
}

function physicalFile(root, ref, { optional = false } = {}) {
  const path = resolve(root, ...ref.split("/"));
  if (!existsSync(path)) {
    if (optional) return null;
    fail("required file is missing: " + ref);
  }
  const info = lstatSync(path);
  if (!info.isFile() || info.isSymbolicLink()) fail("path is not a physical file: " + ref);
  return path;
}

function assertBoundedComponentDirectory(root) {
  const directory = resolve(root, "instance/components");
  const info = lstatSync(directory);
  if (!info.isDirectory() || info.isSymbolicLink()) fail("instance/components is not a physical directory");
  const names = readdirSync(directory, { withFileTypes: true })
    .map((entry) => {
      if (!entry.isFile() || entry.isSymbolicLink()) fail("instance/components contains a non-file entry");
      return entry.name;
    }).sort();
  if (names.length !== 2 || names[0] !== "README.md" || names[1] !== "registry.toml") {
    fail("instance/components is not the clean two-file template directory");
  }
}

function discoverIdentityRefs(root) {
  const results = [];
  const queue = [resolve(root, "instance")];
  while (queue.length) {
    const directory = queue.shift();
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      const info = lstatSync(path);
      const ref = rel(root, path);
      if (info.isSymbolicLink()) fail("identity scan encountered a link: " + ref);
      if (info.isDirectory()) queue.push(path);
      else if (info.isFile() && entry.name.endsWith(".toml")) {
        const source = canonicalSource(decodeUtf8(readFileSync(path), ref));
        const matches = [...source.matchAll(/^instance_id = "([^"]+)"$/gmu)];
        if (matches.length > 1) fail("identity file contains duplicate root identity: " + ref);
        if (matches.length === 1) results.push(Object.freeze({ ref, instanceId: matches[0][1] }));
      } else if (!info.isFile()) {
        fail("identity scan encountered a non-regular entry: " + ref);
      }
    }
  }
  return results.sort((left, right) => left.ref.localeCompare(right.ref, "en"));
}

function assertTemplatePreflight(root, manifest) {
  if (manifest.parsed.root.state !== "template" || manifest.parsed.root.instance_id !== "template") {
    fail("the target is not an uninstantiated template");
  }
  const repairs = [];
  if (manifest.source !== manifest.canonical) repairs.push("instance manifest canonical UTF-8/LF representation");
  assertBoundedComponentDirectory(root);
  const component = inspectInstanceComponentCompatibility(root);
  if (!["normal", "auto-repairable"].includes(component.outcome)) fail("component registry is not a clean or uniquely repairable zero-component template");
  if (component.outcome === "auto-repairable") repairs.push("zero-component registry identity, count, or line-ending representation");

  const refs = discoverIdentityRefs(root);
  const actualRefs = refs.map((item) => item.ref);
  if (actualRefs.length !== templateIdentityRefs.length
    || actualRefs.some((ref, index) => ref !== templateIdentityRefs[index])) {
    fail("template identity-bearing files do not match the bounded first-instantiation set");
  }
  for (const item of refs) {
    if (item.ref === "instance/components/registry.toml" || item.ref === "instance/startup-capsule.toml") continue;
    if (item.instanceId !== "template") fail("template identity drift is not uniquely repairable: " + item.ref);
  }
  const profileEntries = readdirSync(resolve(root, "instance/profile"), { withFileTypes: true });
  if (profileEntries.length !== 1 || profileEntries[0].name !== "README.md" || !profileEntries[0].isFile()) {
    fail("template profile directory already contains instance-owned content");
  }
  const hostProfiles = resolve(root, "instance/hosts/profiles");
  if (existsSync(hostProfiles) && readdirSync(hostProfiles).length !== 0) fail("template already contains a host profile");
  const workspace = resolve(root, "workspace");
  if (existsSync(workspace) && readdirSync(workspace).length !== 0) fail("template already contains an unclassified professional workspace");
  const capsule = inspectStartupCapsule(root);
  if (capsule.decision !== "startup-capsule-valid") repairs.push("startup capsule derived bytes");
  return Object.freeze(repairs);
}

function replaceUnique(text, from, to, label) {
  const first = text.indexOf(from);
  if (first < 0 || text.indexOf(from, first + from.length) >= 0) fail(label + " replacement is not unique");
  return text.slice(0, first) + to + text.slice(first + from.length);
}

function replaceTomlField(text, field, value, label) {
  const expression = new RegExp("^" + field + " = .*?$", "gmu");
  const matches = [...text.matchAll(expression)];
  if (matches.length !== 1) fail(label + " field " + field + " is not unique");
  return text.replace(expression, field + " = " + value);
}

function identityForRequest(request, testIdentity = undefined) {
  const createdAt = testIdentity?.createdAt ?? new Date().toISOString();
  const instanceId = testIdentity?.instanceId ?? ("ac-" + randomUUID());
  if (!stableAssetId.test(instanceId) || !zonedDate.test(createdAt) || !Number.isFinite(Date.parse(createdAt))) {
    fail("generated instance identity or time is invalid");
  }
  return Object.freeze({ instanceId, createdAt });
}

function manifestSource(templateSource, request, identity) {
  let source = canonicalSource(templateSource);
  source = replaceUnique(source, 'instance_id = "template"', "instance_id = " + q(identity.instanceId), "manifest instance_id");
  source = replaceUnique(source, 'state = "template"', 'state = "instance"', "manifest state");
  source = replaceUnique(source, 'created_at = ""', "created_at = " + q(identity.createdAt), "manifest created_at");
  source = replaceUnique(source, 'type = "unselected"', "type = " + q(request.direction.type), "manifest direction type");
  source = replaceUnique(source, "locked = false", "locked = true", "manifest direction lock");
  source = replaceUnique(source, 'domain_id = ""', "domain_id = " + q(request.direction.domainId), "manifest domain_id");
  source = replaceUnique(source, 'label = ""', "label = " + q(request.direction.label), "manifest direction label");
  source = replaceUnique(source, 'scope_statement = ""', "scope_statement = " + q(request.direction.scopeStatement), "manifest direction scope");
  source = replaceUnique(source, 'status = "not-instantiated"', 'status = "active"', "manifest profile status");
  source = replaceUnique(source, 'guidance_mode = "unselected"', "guidance_mode = " + q(request.guidanceMode), "manifest guidance mode");
  source = replaceUnique(source, 'display_name = ""', "display_name = " + q(request.displayName), "manifest display name");
  source = replaceUnique(source, 'mission = ""', "mission = " + q(request.mission), "manifest mission");
  source = replaceUnique(source, 'language = "zh-CN"', "language = " + q(request.language), "manifest language");
  source = replaceUnique(source, 'user_preferences_ref = "instance/profile/README.md"',
    'user_preferences_ref = "instance/profile/approved-profile.md"', "manifest profile ref");
  source = replaceUnique(source, 'policy = "risk-tiered"', "policy = " + q(request.learningPolicy), "manifest learning policy");
  return source;
}

function previewList(items, emptyText) {
  return items.length ? items.map((item) => "- " + item).join("\n") : "- " + emptyText;
}

function userPreview(request) {
  const english = request.language === "en" || request.language === "en-US";
  const hostModel = request.host.requestModelName || request.host.modelSelectionLabel || "";
  const hostFacts = [
    request.host.productName ? (english ? "Product: " : "宿主：") + request.host.productName : "",
    request.host.productVersion ? (english ? "Version: " : "版本：") + request.host.productVersion : "",
    hostModel ? (english ? "Verified model fact: " : "已核实模型信息：") + hostModel : "",
    request.host.environment ? (english ? "Environment: " : "环境：") + request.host.environment : "",
  ].filter(Boolean);
  if (english) {
    return [
      "# Create my AI Carry assistant",
      "",
      "- Name: " + request.displayName,
      "- Direction: " + request.direction.label + " (" + request.direction.type + ", permanently locked after creation)",
      "- Scope: " + request.direction.scopeStatement,
      "- Mission: " + request.mission,
      "- Collaboration: " + request.guidanceMode,
      "- Learning: " + request.learningPolicy,
      "",
      "## First real task",
      "",
      "- " + request.firstTask.title + ": " + request.firstTask.summary,
      "- It has not run and is not a saved memory, SOP, capability, or validation record.",
      request.firstTask.startAfterInstantiation
        ? "- This confirmation also starts that task after creation; do not ask for a second start confirmation."
        : "- Creation will not start it automatically; ask once afterwards whether to begin.",
      "",
      "## Confirmed boundaries",
      "",
      "In scope:\n" + previewList(request.profile.inScope, request.direction.scopeStatement),
      "Out of scope:\n" + previewList(request.profile.outOfScope, "No extra boundary recorded."),
      "Automation and confirmation:\n" + previewList(request.profile.automation, "Follow the current authorization; ask only for material decisions."),
      "Privacy:\n" + previewList(request.profile.privacy, "Use only task-needed context; never place credentials in model context."),
      "Learning:\n" + previewList(request.profile.learning, "Offer reusable learning naturally; save formal assets only after explicit confirmation."),
      "Environment assumptions:\n" + previewList(request.profile.environment, "None recorded."),
      "Still unknown:\n" + previewList(request.profile.unknowns, "No extra unknown recorded."),
      "",
      "## Current host facts",
      "",
      previewList(hostFacts, "The model, version, or environment remains unknown where there is no verifiable evidence."),
      "",
      "## What this confirmation changes",
      "",
      "- Atomically initializes the instance identity, approved profile, initial task route, empty indexes, host record, governance schedule, startup capsule, and two identical snapshots.",
      "- Initial business and learning assets stay at 0; the three scheduled governance cards are counted separately as governance = 3.",
      "- A local failure rolls back this creation only; ordinary conversation and unrelated capabilities remain usable.",
      "",
      "If this accurately reflects your choices, explicitly confirm this complete preview. You may correct any line first.",
    ].join("\n");
  }
  return [
    "# 创建我的 AI Carry 助手",
    "",
    "- 名称：" + request.displayName,
    "- 方向：" + request.direction.label + "（" + request.direction.type + "；创建后永久锁定）",
    "- 范围：" + request.direction.scopeStatement,
    "- 长期使命：" + request.mission,
    "- 交流方式：" + request.guidanceMode,
    "- 学习政策：" + request.learningPolicy,
    "",
    "## 第一项真实任务",
    "",
    "- " + request.firstTask.title + "：" + request.firstTask.summary,
    "- 它尚未执行，也没有被写成记忆、SOP、能力或验证记录。",
    request.firstTask.startAfterInstantiation
      ? "- 你确认这份预览后，创建完成即进入这项任务，不再重复询问一次“是否开始”。"
      : "- 创建不会自动开始它；完成后只再询问一次是否开始。",
    "",
    "## 已确认边界",
    "",
    "范围内：\n" + previewList(request.profile.inScope, request.direction.scopeStatement),
    "范围外：\n" + previewList(request.profile.outOfScope, "当前没有补充边界。"),
    "自动化与确认：\n" + previewList(request.profile.automation, "沿用当前授权，只在实质决定处询问。"),
    "隐私：\n" + previewList(request.profile.privacy, "只使用任务需要的最小上下文；秘密凭据不进入模型上下文。"),
    "学习：\n" + previewList(request.profile.learning, "自然提出可复用学习；正式保存仍需明确确认。"),
    "环境假设：\n" + previewList(request.profile.environment, "当前没有记录。"),
    "仍未知：\n" + previewList(request.profile.unknowns, "当前没有额外未知项。"),
    "",
    "## 当前宿主事实",
    "",
    previewList(hostFacts, "没有可靠证据的模型、版本或环境信息保持未知，不靠猜测补齐。"),
    "",
    "## 本次确认会写入什么",
    "",
    "- 原子初始化实例身份、正式档案、初始任务路线、空索引、宿主档案、治理排期、启动胶囊和两份一致快照。",
    "- 业务与学习资产保持 0；三张已排期治理卡单独计为 governance = 3。",
    "- 局部失败只回滚本次创建；普通对话和无关能力继续可用。",
    "",
    "如果以上内容准确，请明确确认这份完整预览；任何一行不对都可以先修改。",
  ].join("\n");
}

function inspectManifestBudget(root, request) {
  const templateSource = readFileSync(resolve(root, "instance/manifest.toml"), "utf8");
  const previewIdentity = Object.freeze({
    instanceId: "ac-00000000-0000-4000-8000-000000000000",
    createdAt: "2000-01-01T00:00:00.000Z",
  });
  const bytes = Buffer.byteLength(manifestSource(templateSource, request, previewIdentity), "utf8");
  if (bytes > MAX_MANIFEST_BYTES) {
    fail("the generated instance manifest would use " + bytes + " bytes, above the " + MAX_MANIFEST_BYTES
      + "-byte startup limit; shorten only direction.scope_statement and keep the full detail in profile.in_scope or profile.out_of_scope, then inspect again");
  }
  return bytes;
}

function markdownList(items, emptyText) {
  if (!items.length) return "- " + emptyText;
  return items.map((item) => "- " + item).join("\n");
}

function approvedProfileSource(request, identity) {
  const english = request.language === "en" || request.language === "en-US";
  if (english) {
    return [
      "# Approved instance profile",
      "",
      "- instance_id: " + identity.instanceId,
      "- Direction: " + request.direction.label,
      "- Collaboration style: " + request.guidanceMode,
      "- Mission: " + request.mission,
      "- First real task: " + request.firstTask.title + ". This task has not started.",
      "",
      "## In scope",
      "",
      markdownList(request.profile.inScope, request.direction.scopeStatement),
      "",
      "## Out of scope",
      "",
      markdownList(request.profile.outOfScope, "Use the create-new-instance boundary for work outside this direction."),
      "",
      "## Automation and confirmation",
      "",
      markdownList(request.profile.automation, "Follow the current task authorization and ask only for material decisions."),
      "",
      "## Privacy",
      "",
      markdownList(request.profile.privacy, "Use minimum task-needed context; credentials never enter model context."),
      "",
      "## Learning",
      "",
      markdownList(request.profile.learning, "Offer reusable learning at natural stopping points; formal assets still need explicit confirmation."),
      "",
      "## Environment assumptions",
      "",
      markdownList(request.profile.environment, "Current host facts may be unknown and must be reverified when needed."),
      "",
      "## Unknowns",
      "",
      markdownList(request.profile.unknowns, "None recorded."),
      "",
    ].join("\n");
  }
  return [
    "# 已确认实例档案",
    "",
    "- instance_id: " + identity.instanceId,
    "- 实例方向：" + request.direction.label,
    "- 协作方式：" + request.guidanceMode,
    "- 长期使命：" + request.mission,
    "- 第一项真实任务：" + request.firstTask.title + "；本任务尚未开始。",
    "",
    "## 范围内",
    "",
    markdownList(request.profile.inScope, request.direction.scopeStatement),
    "",
    "## 范围外",
    "",
    markdownList(request.profile.outOfScope, "超出当前方向时使用“创建新实例”边界。"),
    "",
    "## 自动化与确认",
    "",
    markdownList(request.profile.automation, "沿用当前任务授权，只在实质决定处询问。"),
    "",
    "## 隐私",
    "",
    markdownList(request.profile.privacy, "只使用任务需要的最小上下文；秘密凭据不进入模型上下文。"),
    "",
    "## 学习",
    "",
    markdownList(request.profile.learning, "在自然停点主动提出可复用学习；正式资产仍需明确确认。"),
    "",
    "## 环境假设",
    "",
    markdownList(request.profile.environment, "宿主事实未知时保持未知，命中时再核验。"),
    "",
    "## 仍未知",
    "",
    markdownList(request.profile.unknowns, "当前没有额外记录。"),
    "",
  ].join("\n");
}

function domainMapSource(request, identity) {
  return [
    "schema_version = 1",
    'map_id = "instance-domain"',
    "instance_id = " + q(identity.instanceId),
    "direction = " + q(request.direction.type === "domain" ? request.direction.domainId : "general"),
    'status = "active"',
    "",
    "[budget]",
    "soft_max_bytes = 32768",
    "hard_max_bytes = 49152",
    "soft_max_routes = 96",
    "hard_max_routes = 128",
    "max_route_bytes = 2048",
    "candidate_limit = 3",
    'overflow_state = "ok"',
    "",
    "[[routes]]",
    "id = " + q(request.firstTask.id),
    "title = " + q(request.firstTask.title),
    "summary = " + q(request.firstTask.summary),
    "triggers = " + q([request.firstTask.trigger]),
    'asset_kind = "task-family"',
    "topic_key = " + q(request.firstTask.topicKey),
    "subject_key = " + q(request.firstTask.subjectKey),
    "aliases = " + q(request.firstTask.aliases),
    "scope = " + q(request.firstTask.scope),
    "conditions = " + q(request.firstTask.conditions),
    "excludes = " + q(request.firstTask.excludes),
    "related_asset_ids = []",
    'target = "instance/profile/approved-profile.md"',
    'state = "on-demand"',
    "minimum_level = 1",
    'confirmation = "none"',
    "",
  ].join("\n");
}

function initializeGovernanceCard(source, ref, createdAt) {
  const canonical = canonicalSource(source);
  const frequencyMatch = canonical.match(/^frequency_days = (\d+)$/mu);
  const idMatch = canonical.match(/^id = "([^"]+)"$/mu);
  const titleMatch = canonical.match(/^title = "([^"]+)"$/mu);
  const levelMatch = canonical.match(/^minimum_level = (\d+)$/mu);
  if (!frequencyMatch || !idMatch || !titleMatch || !levelMatch) fail("governance card metadata is incomplete: " + ref);
  const frequencyDays = Number(frequencyMatch[1]);
  const nextDueAt = new Date(Date.parse(createdAt) + frequencyDays * 24 * 60 * 60 * 1000).toISOString();
  let updated = replaceTomlField(canonical, "schedule_state", q("scheduled"), ref);
  updated = replaceTomlField(updated, "schedule_anchor_at", q(createdAt), ref);
  updated = replaceTomlField(updated, "next_due_at", q(nextDueAt), ref);
  updated = replaceTomlField(updated, "trigger_revision", "1", ref);
  return Object.freeze({
    source: updated,
    trigger: Object.freeze({
      id: idMatch[1],
      kind: "governance",
      status: "scheduled",
      title: titleMatch[1],
      next_check_at: nextDueAt,
      effective_check_at: nextDueAt,
      domain: "assistant-maintenance",
      source_ref: ref,
      source_trigger_revision: 1,
      minimum_level: Number(levelMatch[1]),
      confirmation: "user-starts-review",
    }),
  });
}

function timeMapSource(identity, triggers) {
  const sorted = [...triggers].sort((left, right) => left.id.localeCompare(right.id, "en"));
  const nextWakeupAt = [...sorted].sort((left, right) => Date.parse(left.effective_check_at) - Date.parse(right.effective_check_at)
    || left.id.localeCompare(right.id, "en"))[0]?.effective_check_at ?? "";
  const lines = [
    "schema_version = 1",
    'map_id = "time-triggers"',
    "instance_id = " + q(identity.instanceId),
    'state = "current"',
    "source_revision = 1",
    "generated_at = " + q(identity.createdAt),
    "scheduled_count = " + sorted.length,
    "next_wakeup_at = " + q(nextWakeupAt),
  ];
  for (const trigger of sorted) {
    lines.push(
      "",
      "[[triggers]]",
      "id = " + q(trigger.id),
      "kind = " + q(trigger.kind),
      "status = " + q(trigger.status),
      "title = " + q(trigger.title),
      "next_check_at = " + q(trigger.next_check_at),
      "effective_check_at = " + q(trigger.effective_check_at),
      "domain = " + q(trigger.domain),
      "route_id = " + q(governanceDefinitions.find((item) => item.ref === trigger.source_ref).routeId),
      "source_ref = " + q(trigger.source_ref),
      "source_trigger_revision = " + trigger.source_trigger_revision,
      "minimum_level = " + trigger.minimum_level,
      "confirmation = " + q(trigger.confirmation),
    );
  }
  lines.push("");
  return Object.freeze({ source: lines.join("\n"), nextWakeupAt, scheduledCount: sorted.length });
}

function buildPrimarySources(root, request, identity) {
  const sources = new Map();
  sources.set("instance/manifest.toml", manifestSource(readFileSync(resolve(root, "instance/manifest.toml"), "utf8"), request, identity));
  sources.set("instance/profile/approved-profile.md", approvedProfileSource(request, identity));
  sources.set("instance/maps/domain-map.toml", domainMapSource(request, identity));

  const governance = governanceDefinitions.map((definition) => {
    const result = initializeGovernanceCard(readFileSync(resolve(root, ...definition.ref.split("/")), "utf8"), definition.ref, identity.createdAt);
    sources.set(definition.ref, result.source);
    return result.trigger;
  });
  const timeMap = timeMapSource(identity, governance);
  sources.set("instance/maps/time-trigger-map.toml", timeMap.source);
  sources.set("instance/signals/control.toml", [
    "schema_version = 1",
    'record_type = "cross-session-signal-control"',
    "instance_id = " + q(identity.instanceId),
    "source_revision = 1",
    "projection_revision = 1",
    'update_state = "clean"',
    'pending_operation_id = ""',
    'pending_event_id = ""',
    'pending_signal_id = ""',
    'pending_trigger_id = ""',
    'pending_source_ref = ""',
    "base_revision = 1",
    "updated_at = " + q(identity.createdAt),
    "",
  ].join("\n"));
  sources.set("instance/maps/signal-map.toml", [
    "schema_version = 1",
    'map_id = "cross-session-signals"',
    "instance_id = " + q(identity.instanceId),
    'state = "current"',
    "source_revision = 1",
    "generated_at = " + q(identity.createdAt),
    "budget_bytes = 1536",
    "overflow = false",
    "active_count = 0",
    "scheduled_count = " + timeMap.scheduledCount,
    "next_wakeup_at = " + q(timeMap.nextWakeupAt),
    'next_wakeup_ref = "instance/maps/time-trigger-map.toml"',
    "",
  ].join("\n"));
  sources.set("instance/evolution/index.toml", [
    "schema_version = 1",
    'index_id = "evolution-candidates"',
    "instance_id = " + q(identity.instanceId),
    'state = "empty"',
    "source_revision = 0",
    "generated_at = " + q(identity.createdAt),
    "budget_bytes = 32768",
    "overflow = false",
    "candidate_count = 0",
    "indexed_count = 0",
    "active_count = 0",
    "",
  ].join("\n"));
  sources.set("instance/validations/index.toml", [
    "schema_version = 1",
    'index_id = "result-validations"',
    "instance_id = " + q(identity.instanceId),
    'state = "empty"',
    "source_revision = 0",
    'generated_at = ""',
    "budget_bytes = 262144",
    "overflow = false",
    "record_count = 0",
    "",
  ].join("\n"));
  sources.set("instance/components/registry.toml", [
    "schema_version = 1",
    'record_type = "ai-carry-instance-component-registry"',
    "instance_id = " + q(identity.instanceId),
    'adoption_state = "current"',
    "revision = 1",
    "component_count = 0",
    "",
  ].join("\n"));
  sources.set("instance/hosts/registry.toml", [
    "schema_version = 1",
    'record_type = "host-registry"',
    'registry_id = "host-connections"',
    "instance_id = " + q(identity.instanceId),
    "revision = 1",
    "updated_at = " + q(identity.createdAt),
    'load_policy = "post-route-light-resume-or-full-integration-only"',
    "maximum_bytes = 8192",
    'overflow_policy = "remove-ineligible-entries-from-light-map-but-preserve-profile-files"',
    "",
    "[[hosts]]",
    "profile_id = " + q(request.host.profileId),
    "label = " + q(request.host.label),
    'status = "active"',
    "profile_ref = " + q("instance/hosts/profiles/" + request.host.profileId + ".toml"),
    "match_hints = " + q([request.host.matchHint]),
    "last_verified_at = " + q(identity.createdAt),
    "",
  ].join("\n"));
  sources.set("instance/hosts/profiles/" + request.host.profileId + ".toml", [
    "schema_version = 1",
    'record_type = "host-profile"',
    "record_id = " + q(request.host.profileId),
    "profile_id = " + q(request.host.profileId),
    "instance_id = " + q(identity.instanceId),
    'source = "ai-carry"',
    "label = " + q(request.host.label),
    'status = "active"',
    'protocol_version = "1.0"',
    "created_at = " + q(identity.createdAt),
    "last_verified_at = " + q(identity.createdAt),
    "maximum_bytes = 16384",
    "",
    "[observed_host]",
    "product_name = " + q(request.host.productName),
    "product_version = " + q(request.host.productVersion),
    "model_name = " + q(request.host.modelName),
    "model_selection_label = " + q(request.host.modelSelectionLabel),
    "request_model_name = " + q(request.host.requestModelName),
    "model_routing_mode = " + q(request.host.modelRoutingMode),
    "auxiliary_model_names = []",
    "model_observation_basis = " + q(request.host.modelObservationBasis),
    "environment = " + q(request.host.environment),
    "observation_basis = " + q(request.host.observationBasis),
    "",
    "[connection]",
    "integration_mode = " + q(request.host.integrationMode),
    'access_scope = "ai-carry-root"',
    'write_capability = "confirmed-first-instantiation"',
    'persistence = "local-files"',
    'retention = "instance-owned-metadata"',
    'last_capsule_id = ""',
    "profile_match_basis = " + q(request.host.matchHint),
    "limitations = " + q(request.host.limitations),
    "",
    "[capability_catalog]",
    'scope = "integration-relevant-at-last-handshake"',
    "complete = false",
    "",
    "[host_memory]",
    'inventory_status = "not-started"',
    "category_summaries = []",
    "migrated_asset_refs = []",
    "conflicts = []",
    "details_stored_here = false",
    'automatic_context_status = "unknown"',
    "automatic_context_categories = []",
    "automatic_context_details_stored_here = false",
    "",
    "[governance]",
    "contains_secrets = false",
    "contains_full_host_memory = false",
    "unresolved = []",
    "",
  ].join("\n"));
  sources.set("instance/skills/requirements.toml", [
    "schema_version = 1",
    "instance_id = " + q(identity.instanceId),
    "generated_at = " + q(identity.createdAt),
    'status = "current"',
    "",
  ].join("\n"));
  return sources;
}

function writeCandidateSources(root, sources) {
  for (const [ref, source] of sources) {
    const path = resolve(root, ...ref.split("/"));
    mkdirSync(dirname(path), { recursive: true });
    if (existsSync(path)) {
      const info = lstatSync(path);
      if (!info.isFile() || info.isSymbolicLink()) fail("candidate target is not a physical file: " + ref);
    }
    writeFileSync(path, source, "utf8");
    if (readFileSync(path, "utf8") !== source || source.includes("\r") || source.startsWith("\uFEFF")) {
      fail("candidate did not round-trip as canonical UTF-8/LF: " + ref);
    }
  }
}

function runSnapshotSync(root) {
  const script = resolve(root, "dashboard/scripts/sync-snapshot.mjs");
  const result = spawnSync(process.execPath, [script], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) fail("snapshot synchronization could not start: " + result.error.message);
  if (result.status !== 0) fail("snapshot synchronization failed: " + (result.stderr || result.stdout).trim());
  try {
    return JSON.parse(result.stdout.trim());
  } catch {
    fail("snapshot synchronization returned invalid output");
  }
}

function rootInstanceId(source, ref) {
  const matches = [...source.matchAll(/^instance_id = "([^"]+)"$/gmu)];
  if (matches.length !== 1) fail(ref + " does not contain exactly one root instance_id");
  return matches[0][1];
}

function countFormalFiles(root, directoryRef) {
  const directory = resolve(root, ...directoryRef.split("/"));
  let count = 0;
  const queue = [directory];
  while (queue.length) {
    const current = queue.shift();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = resolve(current, entry.name);
      const info = lstatSync(path);
      if (info.isSymbolicLink()) fail(directoryRef + " contains a link");
      if (info.isDirectory()) queue.push(path);
      else if (info.isFile() && entry.name !== "README.md" && entry.name !== "index.toml") count += 1;
      else if (!info.isFile()) fail(directoryRef + " contains a non-regular entry");
    }
  }
  return count;
}

function verifyCandidate(root, request, identity, sources) {
  const manifestSource = readFileSync(resolve(root, "instance/manifest.toml"), "utf8");
  if (manifestSource.includes("\r") || manifestSource.startsWith("\uFEFF")) fail("manifest is not canonical UTF-8/LF");
  const manifest = validateInstanceManifestStructure(parseSectionedToml(manifestSource, "instance manifest"));
  if (manifest.root.instance_id !== identity.instanceId || manifest.root.state !== "instance"
    || manifest.root.created_at !== identity.createdAt || manifest.direction.type !== request.direction.type
    || manifest.direction.domain_id !== request.direction.domainId || manifest.direction.locked !== true
    || manifest.profile.guidance_mode !== request.guidanceMode || manifest.profile.display_name !== request.displayName
    || manifest.profile.mission !== request.mission || manifest.profile.user_preferences_ref !== "instance/profile/approved-profile.md") {
    fail("manifest readback does not match the confirmed request");
  }
  for (const [ref, source] of sources) {
    if (readFileSync(resolve(root, ...ref.split("/")), "utf8") !== source) fail("primary source readback drifted: " + ref);
  }

  const expectedIdentityRefs = [...templateIdentityRefs, "instance/hosts/profiles/" + request.host.profileId + ".toml"].sort();
  const actualIdentityRefs = discoverIdentityRefs(root);
  if (actualIdentityRefs.length !== expectedIdentityRefs.length
    || actualIdentityRefs.some((item, index) => item.ref !== expectedIdentityRefs[index] || item.instanceId !== identity.instanceId)) {
    fail("identity-bearing files do not close against one instance ID");
  }
  const capsule = inspectStartupCapsule(root);
  if (capsule.decision !== "startup-capsule-valid" || capsule.instance_id !== identity.instanceId
    || capsule.state !== "instance" || capsule.migration_required !== false) fail("startup capsule strict readback failed");
  const component = inspectInstanceComponents(root);
  if (component.decision !== "instance-components-valid" || component.instanceId !== identity.instanceId
    || component.adoptionState !== "current" || component.revision !== 1 || component.componentCount !== 0
    || component.unregisteredPaths.length !== 0) fail("zero-component registry strict readback failed");

  const derived = repairOperationalDerivedStateOnce(root);
  if (derived.decision !== "operational-derived-state-current" || derived.attempted !== false) {
    fail("candidate, signal, or time projection was not already canonical");
  }
  const startupSignals = inspectCrossSessionSignalStartup(root, { now: identity.createdAt });
  if (startupSignals.decision !== "startup-ordinary-route" || startupSignals.scheduledCount !== 3) {
    fail("new instance signal startup did not preserve the three governance schedules");
  }

  for (const directory of [
    "instance/memory", "instance/capabilities", "instance/sops", "instance/experiences",
    "instance/evolution", "instance/todo", "instance/deferred",
  ]) {
    if (countFormalFiles(root, directory) !== 0) fail(directory + " contains a pre-created formal item");
  }
  const validation = readFileSync(resolve(root, "instance/validations/index.toml"), "utf8");
  if (!validation.includes('state = "empty"') || !validation.includes("record_count = 0") || validation.includes("[[validations]]")) {
    fail("result validation index is not a zero-record instance-bound empty index");
  }
  const evolution = readFileSync(resolve(root, "instance/evolution/index.toml"), "utf8");
  if (!evolution.includes('state = "empty"') || !evolution.includes("candidate_count = 0")
    || evolution.includes("[[candidates]]") || !evolution.includes("generated_at = " + q(identity.createdAt))) {
    fail("evolution index is not a timestamped zero-candidate instance-bound empty index");
  }
  const domainMap = readFileSync(resolve(root, "instance/maps/domain-map.toml"), "utf8");
  if ((domainMap.match(/\[\[routes\]\]/gu) ?? []).length !== 1 || !domainMap.includes('asset_kind = "task-family"')
    || !domainMap.includes("id = " + q(request.firstTask.id))
    || !domainMap.includes("title = " + q(request.firstTask.title))
    || !domainMap.includes("summary = " + q(request.firstTask.summary))
    || !domainMap.includes("triggers = " + q([request.firstTask.trigger]))
    || /asset_kind = "(?:memory|capability|sop|experience)"/u.test(domainMap)) fail("initial task family became a formal asset or drifted from the confirmed request");

  const publicBytes = readFileSync(resolve(root, "dashboard/public/snapshot.js"));
  const distBytes = readFileSync(resolve(root, "dashboard/dist/snapshot.js"));
  if (!publicBytes.equals(distBytes)) fail("public and dist snapshots are not byte-identical");
  const snapshot = parseCurrentSnapshotEnvelope(publicBytes.toString("utf8"), "first-instantiation snapshot");
  validateSnapshotSemantics(snapshot, "first-instantiation snapshot");
  const identityRef = "ac-" + sha256(Buffer.from(identity.instanceId, "utf8")).slice(0, 12);
  const expectedCounts = { memory: 0, sops: 0, capabilities: 0, experiences: 0, evolution: 0, todo: 0, governance: 3, skills: 0 };
  if (snapshot.meta.state !== "instance" || snapshot.meta.identity_ref !== identityRef
    || publicBytes.toString("utf8").includes(identity.instanceId)
    || !Object.entries(expectedCounts).every(([key, count]) => snapshot.assets[key] === count)
    || snapshot.memories.length !== 0 || snapshot.capabilities.length !== 0 || snapshot.sops.length !== 0
    || snapshot.experiences.length !== 0 || snapshot.evolution.length !== 0 || snapshot.todo.length !== 0
    || snapshot.deferred.length !== 0 || snapshot.governance.length !== 3 || snapshot.skills.count !== 0) {
    fail("snapshot does not represent an empty new instance with three governance cards");
  }
  return Object.freeze({ identityRef, snapshotSha256: sha256(publicBytes) });
}

function writeSetForRequest(request) {
  return Object.freeze([
    ...firstInstantiationWriteSet,
    "instance/hosts/profiles/" + request.host.profileId + ".toml",
  ]);
}

function freezeWriteSet(root, refs) {
  return new Map(refs.map((ref) => {
    const path = resolve(root, ...ref.split("/"));
    if (!existsSync(path)) return [ref, Object.freeze({ exists: false, bytes: null })];
    const info = lstatSync(path);
    if (!info.isFile() || info.isSymbolicLink()) fail("write-set preimage is not a physical file: " + ref);
    return [ref, Object.freeze({ exists: true, bytes: readFileSync(path) })];
  }));
}

function verifyFrozenWriteSet(root, frozen) {
  for (const [ref, state] of frozen) {
    const path = resolve(root, ...ref.split("/"));
    if (!state.exists) {
      if (existsSync(path)) fail("missing preimage changed before commit: " + ref);
    } else if (!existsSync(path) || !readFileSync(path).equals(state.bytes)) {
      fail("write-set preimage changed before commit: " + ref);
    }
  }
}

function ensureTargetParent(root, target, createdDirectories) {
  const rootReal = realpathSync(root);
  const missing = [];
  let current = dirname(target);
  while (!existsSync(current)) {
    missing.push(current);
    current = dirname(current);
  }
  const currentReal = realpathSync(current);
  if (currentReal !== rootReal && !currentReal.startsWith(rootReal + sep)) fail("write target parent escapes the repository");
  const parentInfo = lstatSync(current);
  if (!parentInfo.isDirectory() || parentInfo.isSymbolicLink()) fail("write target parent is unsafe");
  for (const directory of missing.reverse()) {
    mkdirSync(directory);
    createdDirectories.push(directory);
  }
}

function restoreRecords(records, createdDirectories) {
  for (const record of [...records].reverse()) {
    if (record.installed && existsSync(record.target)) unlinkSync(record.target);
    if (record.oldMoved && existsSync(record.backup)) renameSync(record.backup, record.target);
    if (existsSync(record.stage)) unlinkSync(record.stage);
  }
  for (const directory of [...createdDirectories].reverse()) {
    if (existsSync(directory) && readdirSync(directory).length === 0) rmdirSync(directory);
  }
}

function installCandidateWriteSet(root, candidateRoot, refs, frozen, verifyInstalled, { testFaultAfterInstall = 0 } = {}) {
  const operationId = randomUUID();
  const backupRoot = resolve(dirname(root), "." + basename(root) + ".first-instantiation-preimages-" + operationId);
  mkdirSync(backupRoot, { recursive: false });
  const records = [];
  const createdDirectories = [];
  let installedCount = 0;
  try {
    verifyFrozenWriteSet(root, frozen);
    for (const ref of refs) {
      const sourcePath = physicalFile(candidateRoot, ref);
      const bytes = readFileSync(sourcePath);
      const target = resolve(root, ...ref.split("/"));
      ensureTargetParent(root, target, createdDirectories);
      const stage = target + ".first-instantiation-stage-" + operationId;
      const backup = resolve(backupRoot, String(records.length).padStart(3, "0") + ".bin");
      const record = { ref, target, stage, backup, oldMoved: false, installed: false };
      records.push(record);
      writeFileSync(stage, bytes, { flag: "wx" });
      if (!readFileSync(stage).equals(bytes)) fail("staged write did not round-trip: " + ref);
      if (existsSync(target)) {
        renameSync(target, backup);
        record.oldMoved = true;
      }
      renameSync(stage, target);
      record.installed = true;
      installedCount += 1;
      if (!readFileSync(target).equals(bytes)) fail("installed write did not round-trip: " + ref);
      if (testFaultAfterInstall === installedCount) throw new Error("injected-after-write-" + installedCount);
    }
    const verification = verifyInstalled();
    rmSync(backupRoot, { recursive: true, force: true });
    return Object.freeze({ verification, installedCount, cleanupWarning: "" });
  } catch (error) {
    try {
      restoreRecords(records, createdDirectories);
      verifyFrozenWriteSet(root, frozen);
      rmSync(backupRoot, { recursive: true, force: true });
      error.templatePreserved = true;
    } catch (rollbackError) {
      error.templatePreserved = false;
      error.rollbackError = rollbackError.message;
      error.transactionScene = backupRoot;
    }
    throw error;
  }
}

function requestMatchesExisting(manifest, request) {
  return manifest.direction.type === request.direction.type
    && manifest.direction.domain_id === request.direction.domainId
    && manifest.direction.label === request.direction.label
    && manifest.direction.scope_statement === request.direction.scopeStatement
    && manifest.profile.guidance_mode === request.guidanceMode
    && manifest.profile.display_name === request.displayName
    && manifest.profile.mission === request.mission
    && (manifest.profile.language ?? "zh-CN") === request.language
    && manifest.learningPolicy === request.learningPolicy;
}

function readCurrentPrimarySources(root, request) {
  const excluded = new Set([
    "instance/startup-capsule.toml",
    "dashboard/public/snapshot.js",
    "dashboard/dist/snapshot.js",
  ]);
  return new Map(writeSetForRequest(request)
    .filter((ref) => !excluded.has(ref))
    .map((ref) => [ref, readFileSync(physicalFile(root, ref), "utf8")]));
}

function stageCandidate(root, candidateRoot, request, identity, { testFaultAfterCapsule = false } = {}) {
  copyCandidate(root, candidateRoot);
  const sources = buildPrimarySources(candidateRoot, request, identity);
  writeCandidateSources(candidateRoot, sources);
  const capsuleResult = syncStartupCapsule(candidateRoot, { write: true });
  if (!["startup-capsule-updated", "startup-capsule-current"].includes(capsuleResult.decision)) {
    fail("startup capsule synchronization returned an unexpected state");
  }
  if (testFaultAfterCapsule) throw new Error("injected-after-capsule-before-snapshot");
  const snapshotResult = runSnapshotSync(candidateRoot);
  const verification = verifyCandidate(candidateRoot, request, identity, sources);
  return Object.freeze({ sources, capsuleResult, snapshotResult, verification });
}

export function inspectFirstInstantiationRequest(repository, input) {
  const root = realpathSync(repository);
  const request = normalizeFirstInstantiationRequest(input);
  const manifest = flexibleManifest(root);
  if (manifest.parsed.root.state !== "template") {
    return Object.freeze({
      decision: "first-instantiation-not-applicable",
      status: "unchanged",
      reason: "target-is-already-an-instance",
      executable: false,
      warnings: request.warnings,
      user_report: Object.freeze({
        summary: "当前 AI Carry 已经是正式实例，本次没有重做首次创建，也没有改动任何文件。",
        next_step: "继续使用当前实例；如果要创建另一个方向，请从干净模板建立新的独立实例。",
      }),
    });
  }
  const repairs = assertTemplatePreflight(root, manifest);
  const manifestBytes = inspectManifestBudget(root, request);
  return Object.freeze({
    decision: "first-instantiation-request-valid",
    status: "ready",
    executable: false,
    direction: request.direction.type,
    display_name: request.displayName,
    first_task: request.firstTask.title,
    write_target_count: writeSetForRequest(request).length,
    manifest_bytes: manifestBytes,
    manifest_limit: MAX_MANIFEST_BYTES,
    user_preview: userPreview(request),
    repairs,
    warnings: request.warnings,
    user_report: Object.freeze({
      summary: "创建请求已通过本地检查；模板尚未改动。",
      next_step: "向用户展示完整预览并得到明确确认后，再执行同一个请求的原子写入。",
    }),
  });
}

export function executeFirstInstantiation(repository, input, {
  testIdentity = undefined,
  testFaultAfterCapsule = false,
  testFaultAfterInstall = 0,
} = {}) {
  const root = realpathSync(repository);
  const request = normalizeFirstInstantiationRequest(input);
  const manifest = flexibleManifest(root);
  if (manifest.parsed.root.state === "template") inspectManifestBudget(root, request);
  if (manifest.parsed.root.state === "instance") {
    if (!requestMatchesExisting(manifest.parsed, request)) {
      return Object.freeze({
        decision: "first-instantiation-not-applicable",
        status: "unchanged",
        reason: "existing-instance-does-not-match-request",
        executable: false,
        user_report: Object.freeze({
          summary: "当前目录已经是正式实例，而且这份创建请求与现有方向或档案不同；本次没有覆盖或重做实例化。",
          next_step: "继续使用当前实例，或从干净模板创建另一个独立实例。",
        }),
      });
    }
    const identity = Object.freeze({
      instanceId: manifest.parsed.root.instance_id,
      createdAt: manifest.parsed.root.created_at,
    });
    const expectedProfile = approvedProfileSource(request, identity);
    const currentProfile = readFileSync(resolve(root, "instance/profile/approved-profile.md"), "utf8");
    if (currentProfile !== expectedProfile) {
      return Object.freeze({
        decision: "first-instantiation-not-applicable",
        status: "unchanged",
        reason: "existing-instance-has-evolved",
        executable: false,
        user_report: Object.freeze({
          summary: "当前实例已经存在后续变化，本次没有把它重置成首次创建状态。",
          next_step: "继续当前实例的普通使用或升级流程，不要重跑首次实例化。",
        }),
      });
    }
    const candidateRoot = root + ".first-instantiation-idempotence-" + randomUUID();
    try {
      copyCandidate(root, candidateRoot);
      const capsuleResult = syncStartupCapsule(candidateRoot, { write: true });
      const snapshotResult = runSnapshotSync(candidateRoot);
      const sources = readCurrentPrimarySources(candidateRoot, request);
      const verification = verifyCandidate(candidateRoot, request, identity, sources);
      if (sourceTreeFingerprint(root) !== sourceTreeFingerprint(candidateRoot)
        || capsuleResult.updated !== false || snapshotResult.updated !== false) {
        return Object.freeze({
          decision: "first-instantiation-not-applicable",
          status: "unchanged",
          reason: "existing-instance-requires-a-different-maintenance-route",
          executable: false,
          failure_scene: candidateRoot,
          user_report: Object.freeze({
            summary: "当前实例没有被重写；检查发现它需要走普通修复或升级路线，而不是再次实例化。",
            next_step: "保留现场，让 Agent 按当前版本的修复或升级入口处理。",
          }),
        });
      }
      rmSync(candidateRoot, { recursive: true, force: true });
      return Object.freeze({
        decision: "first-instantiation-current",
        status: "passed",
        updated: false,
        instance_id: identity.instanceId,
        created_at: identity.createdAt,
        capsuleResult,
        snapshotResult,
        verification,
        executable: false,
        user_report: Object.freeze({
          summary: "同一份创建请求已经完整生效；第二次执行没有改动文件或刷新时间。",
          next_step: "直接开始第一项真实任务即可。",
        }),
      });
    } catch (error) {
      error.failureScene = candidateRoot;
      throw error;
    }
  }
  if (manifest.parsed.root.state !== "template") fail("manifest state is unsupported");

  const repairs = assertTemplatePreflight(root, manifest);
  const identity = identityForRequest(request, testIdentity);
  const beforeFingerprint = sourceTreeFingerprint(root);
  const candidateRoot = root + ".first-instantiation-candidate-" + randomUUID();
  const refs = writeSetForRequest(request);
  const frozen = freezeWriteSet(root, refs);
  try {
    const staged = stageCandidate(root, candidateRoot, request, identity, { testFaultAfterCapsule });
    if (sourceTreeFingerprint(root) !== beforeFingerprint) fail("live template changed while the candidate was being prepared");
    const installed = installCandidateWriteSet(
      root,
      candidateRoot,
      refs,
      frozen,
      () => verifyCandidate(root, request, identity, staged.sources),
      { testFaultAfterInstall },
    );
    let cleanupWarning = installed.cleanupWarning;
    try {
      rmSync(candidateRoot, { recursive: true, force: true });
    } catch {
      cleanupWarning = "The successful temporary candidate could not be removed automatically.";
    }
    return Object.freeze({
      decision: "first-instantiation-complete",
      status: "passed",
      updated: true,
      instance_id: identity.instanceId,
      created_at: identity.createdAt,
      identity_ref: installed.verification.identityRef,
      snapshot_sha256: installed.verification.snapshotSha256,
      write_target_count: refs.length,
      repairs,
      warnings: request.warnings,
      cleanup_warning: cleanupWarning,
      capsuleResult: staged.capsuleResult,
      snapshotResult: staged.snapshotResult,
      verification: installed.verification,
      executable: false,
      user_report: Object.freeze({
        summary: "助手已经从完整预览原子创建，并通过启动、身份、治理日程和双快照回读。",
        next_step: request.firstTask.startAfterInstantiation
          ? "按用户已经确认的选择直接进入第一项真实任务；不要再重复询问是否开始。任务尚未执行，也没有预先生成记忆、SOP 或能力。"
          : "询问用户是否现在开始第一项真实任务；任务尚未执行，也没有预先生成记忆、SOP 或能力。",
      }),
    });
  } catch (error) {
    const currentFingerprint = sourceTreeFingerprint(root);
    const preserved = currentFingerprint === beforeFingerprint && error.templatePreserved !== false;
    error.failureScene = candidateRoot;
    error.templatePreserved = preserved;
    if (testFaultAfterCapsule && error.message === "injected-after-capsule-before-snapshot" && preserved) {
      return Object.freeze({
        decision: "first-instantiation-injected-failure-recovered",
        status: "passed",
        updated: false,
        injectedFailureRecovered: true,
        failure_scene: candidateRoot,
        template_preserved: true,
        executable: false,
      });
    }
    throw error;
  }
}

const cliHelp = [
  "AI Carry first instantiation",
  "",
  "1. Save the compact request JSON as a UTF-8 file (maximum 64 KiB).",
  "2. Inspect without writing:",
  '   node dashboard/scripts/first-instantiation-transaction.mjs --root "<AI Carry root>" --request-file "<request.json>"',
  "3. Show the returned user_preview exactly and wait for explicit confirmation.",
  "4. Write the same file atomically:",
  '   node dashboard/scripts/first-instantiation-transaction.mjs --root "<AI Carry root>" --request-file "<request.json>" --write --acknowledge-complete-preview',
  "",
  "Use --example to print the JSON field shape. Do not paste JSON text as a command argument.",
  "--request remains a compatibility alias for --request-file.",
].join("\n");

function parseCli(argumentsList) {
  const result = { root: defaultRepository, requestFile: "", write: false, acknowledged: false, example: false, help: false };
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--root") result.root = argumentsList[++index] ?? "";
    else if (argument === "--request-file" || argument === "--request") result.requestFile = argumentsList[++index] ?? "";
    else if (argument === "--write") result.write = true;
    else if (argument === "--acknowledge-complete-preview") result.acknowledged = true;
    else if (argument === "--example") result.example = true;
    else if (argument === "--help" || argument === "-h") result.help = true;
    else fail("an unknown command argument was provided; run --help for the supported form");
  }
  if (result.example || result.help) return result;
  if (result.root === "" || result.requestFile === "") fail("--root and --request-file are required; run --help for an example");
  return result;
}

const invoked = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (invoked) {
  try {
    const cli = parseCli(process.argv.slice(2));
    if (cli.help) {
      process.stdout.write(cliHelp + "\n");
    } else if (cli.example) {
      process.stdout.write(JSON.stringify(requestExample, null, 2) + "\n");
    } else {
      const request = readRequestFile(cli.requestFile);
      if (!cli.write) {
        process.stdout.write(JSON.stringify(inspectFirstInstantiationRequest(cli.root, request)) + "\n");
      } else if (!cli.acknowledged) {
        process.stdout.write(JSON.stringify({
          decision: "first-instantiation-preview-confirmation-required",
          status: "unchanged",
          executable: false,
          user_report: {
            summary: "请求已读取，但没有证明当前 Agent 正在执行用户刚确认的完整预览；模板没有改动。",
            next_step: "先向用户展示完整预览并取得明确确认，再带确认参数重试。",
          },
        }) + "\n");
      } else {
        process.stdout.write(JSON.stringify(executeFirstInstantiation(cli.root, request)) + "\n");
      }
    }
  } catch (error) {
    process.stdout.write(JSON.stringify({
      decision: "first-instantiation-stopped-safely",
      status: "failed",
      error: error.message,
      template_preserved: error.templatePreserved !== false,
      failure_scene: error.failureScene ?? "",
      transaction_scene: error.transactionScene ?? "",
      rollback_error: error.rollbackError ?? "",
      ordinary_assistant_usable: true,
      executable: false,
      user_report: {
        summary: error.templatePreserved === false
          ? "首次创建没有完成，而且回滚无法证明完整；已保留全部现场，没有继续猜改。"
          : "首次创建没有完成；原模板已保留，普通对话和无关能力仍可继续。",
        next_step: "把上面的具体错误交给 Agent，只修当前创建事务后再重试；不要手写正式文件或降低校验。",
      },
    }) + "\n");
    process.exitCode = 1;
  }
}
