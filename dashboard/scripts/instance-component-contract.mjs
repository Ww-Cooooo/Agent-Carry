import { createHash } from "node:crypto";
import {
  closeSync,
  fstatSync,
  lstatSync,
  openSync,
  readSync,
  readdirSync,
  realpathSync,
} from "node:fs";
import { relative, resolve, sep } from "node:path";
import {
  parseArrayTableDocument,
  parseSectionedToml,
  validateInstanceManifestStructure,
} from "./asset-route-contract.mjs";

const REGISTRY_REF = "instance/components/registry.toml";
const REGISTRY_LIMIT = 32 * 1024;
const MANIFEST_LIMIT = 32 * 1024;
const COMPONENT_LIMIT = 128;
const ENTRY_LIMIT = 4096;
const PORTABLE_FILE_LIMIT = 64 * 1024 * 1024;
const PORTABLE_TOTAL_LIMIT = 256 * 1024 * 1024;
const stableId = /^[a-z0-9](?:[a-z0-9.-]{1,62}[a-z0-9])$/u;
const interfaceId = /^[a-z0-9](?:[a-z0-9.-]{1,94}[a-z0-9])@[0-9]+$/u;
const semver = /^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)$/u;
const unsafeText = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u;
const componentKinds = new Set(["instance-module", "capability-adapter", "local-tool-adapter", "integration-adapter"]);
const componentStates = new Set(["review", "active", "disabled"]);
const adoptionStates = new Set(["template", "required", "current", "conflict"]);
const activations = new Set(["immediate", "next-session", "restart-required", "migration-required"]);
const rootFields = new Set(["schema_version", "record_type", "component_id", "instance_id", "kind", "status", "title", "summary", "component_version", "root", "load_policy"]);
const ownershipFields = new Set(["portable_paths", "derived_paths", "device_local_paths", "private_collection_refs", "unclassified_policy"]);
const interfaceFields = new Set(["provides", "requires"]);
const upgradeFields = new Set(["criticality", "activation", "compatible_action", "incompatible_action", "migration_ids", "second_run"]);
const nativeInstancePrefixes = [
  "instance/memory/",
  "instance/capabilities/",
  "instance/sops/",
  "instance/experiences/",
  "instance/evolution/",
  "instance/todo/",
  "instance/deferred/",
  "instance/skills/",
  "instance/signals/",
  "instance/hosts/",
  "instance/validations/",
  "instance/governance/",
  "instance/profile/",
  "instance/maps/",
];
const nativeInstanceFiles = new Set(["instance/manifest.toml", "instance/startup-capsule.toml"]);
const frameworkLocalPrefixes = [
  ".assistant-local/runtime/",
  ".assistant-local/dashboard/",
  ".assistant-local/indexes/",
  ".assistant-local/skills/",
  ".assistant-local/upgrade-inbox/",
  ".assistant-local/task-handoffs/",
];
const templateRootFiles = new Set([
  "README.md", "README.en.md", "INSTALL.md", "INSTALL.en.md", "START-HERE.txt", "START-HERE.en.txt",
  "AGENTS.md", "BOOTSTRAP.md", "assistant.toml", ".gitattributes", ".gitignore", "LICENSE",
  "THIRD_PARTY_NOTICES.md", "CONTRIBUTING.md", "SECURITY.md", "dashboard.html", "dashboard.en.html",
]);
const templatePrefixes = ["core/", "docs/", "dashboard/", "_data/", ".github/"];

function fail(message) {
  throw new Error(`Instance component contract failed: ${message}`);
}

function exactKeys(value, expected) {
  return value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).length === expected.size
    && Object.keys(value).every((key) => expected.has(key) && !["__proto__", "prototype", "constructor"].includes(key));
}

function clean(value, maximum, allowEmpty = false) {
  return typeof value === "string" && (allowEmpty || value.length > 0) && [...value].length <= maximum
    && value.normalize("NFC") === value && !unsafeText.test(value);
}

function cleanList(value, maximumItems, validator) {
  return Array.isArray(value) && value.length <= maximumItems && new Set(value).size === value.length && value.every(validator);
}

function ordinal(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sameIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.size === right.size
    && left.mtimeNs === right.mtimeNs && left.ctimeNs === right.ctimeNs;
}

function portableSegment(part) {
  const base = part.replace(/\..*$/u, "").toLowerCase();
  return part && part !== "." && part !== ".." && !/[. ]$/u.test(part) && !/[<>"|*]/u.test(part)
    && !["con", "prn", "aux", "nul", "clock$"].includes(base) && !/^(?:com|lpt)[1-9]$/u.test(base);
}

function portableRef(value, { prefix = "", maximum = 240 } = {}) {
  if (!clean(value, maximum) || value.includes("\\") || value.includes(":") || value.includes("?") || value.includes("#")) return false;
  if (!value.split("/").every(portableSegment)) return false;
  return !prefix || value.startsWith(prefix);
}

function componentRelativeRef(value) {
  return portableRef(value, { maximum: 200 }) && !value.startsWith("instance/") && !value.startsWith(".assistant-");
}

function privateRef(value) {
  return clean(value, 240) && /^private:\/\/[a-z0-9][a-z0-9._:-]{0,159}\/[a-z0-9][a-z0-9._/-]{0,199}$/u.test(value)
    && !value.slice("private://".length).includes("//")
    && value.slice("private://".length).split("/").every((part) => part !== "." && part !== "..");
}

function pathsOverlap(left, right) {
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}

function resolvePhysical(repositoryReal, ref, label, { allowMissing = false } = {}) {
  if (!portableRef(ref)) fail(`${label} has an unsafe path: ${ref}`);
  let cursor = repositoryReal;
  try {
    for (const part of ref.split("/")) {
      cursor = resolve(cursor, part);
      const info = lstatSync(cursor, { bigint: true });
      if (info.isSymbolicLink()) fail(`${label} crosses a link or reparse point: ${ref}`);
    }
  } catch (error) {
    if (String(error?.message ?? "").startsWith("Instance component contract failed:")) throw error;
    if (allowMissing && error?.code === "ENOENT") return null;
    fail(`${label} does not exist: ${ref}`);
  }
  const physical = realpathSync(cursor);
  const fromRoot = relative(repositoryReal, physical);
  if (fromRoot === ".." || fromRoot.startsWith(`..${sep}`)) fail(`${label} escapes Agent Carry: ${ref}`);
  return physical;
}

function readBounded(repositoryReal, ref, label, maximum) {
  const path = resolvePhysical(repositoryReal, ref, label);
  const descriptor = openSync(path, "r");
  try {
    const before = fstatSync(descriptor, { bigint: true });
    if (!before.isFile() || before.size > BigInt(maximum)) fail(`${label} is not a regular file or exceeds ${maximum} bytes`);
    const buffer = Buffer.alloc(Number(before.size));
    let offset = 0;
    while (offset < buffer.length) {
      const count = readSync(descriptor, buffer, offset, buffer.length - offset, offset);
      if (count === 0) break;
      offset += count;
    }
    const after = fstatSync(descriptor, { bigint: true });
    if (offset !== buffer.length || !sameIdentity(before, after)) fail(`${label} changed during its bounded read`);
    let decoded;
    try { decoded = new TextDecoder("utf-8", { fatal: true }).decode(buffer); }
    catch { fail(`${label} is not valid UTF-8`); }
    if (buffer.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])) || buffer.includes(0) || decoded.includes("\r")) {
      fail(`${label} is not portable UTF-8 LF text`);
    }
    return Object.freeze({ text: decoded, sha256: digest(buffer), byteLength: buffer.length });
  } finally {
    closeSync(descriptor);
  }
}

function hashFileIdentity(path, relativeRef, hasher, budget) {
  const descriptor = openSync(path, "r");
  try {
    const before = fstatSync(descriptor, { bigint: true });
    if (!before.isFile()) fail(`portable component path is not a regular file: ${relativeRef}`);
    if (before.size > BigInt(PORTABLE_FILE_LIMIT)) fail(`portable component file exceeds ${PORTABLE_FILE_LIMIT} bytes: ${relativeRef}`);
    if (budget) {
      budget.portableBytes += before.size;
      if (budget.portableBytes > BigInt(PORTABLE_TOTAL_LIMIT)) fail(`portable component inspection exceeds ${PORTABLE_TOTAL_LIMIT} bytes`);
    }
    hasher.update(`file\0${relativeRef}\0${before.size}\0`);
    const buffer = Buffer.alloc(64 * 1024);
    let offset = 0n;
    while (offset < before.size) {
      const wanted = Number(before.size - offset > BigInt(buffer.length) ? BigInt(buffer.length) : before.size - offset);
      const count = readSync(descriptor, buffer, 0, wanted, null);
      if (count === 0) break;
      hasher.update(buffer.subarray(0, count));
      offset += BigInt(count);
    }
    const after = fstatSync(descriptor, { bigint: true });
    if (offset !== before.size || !sameIdentity(before, after)) fail(`portable component path changed during hashing: ${relativeRef}`);
  } finally {
    closeSync(descriptor);
  }
}

function collectTree(repositoryReal, ref, { hashBytes, allowMissing = false, budget } = {}) {
  const rootPath = resolvePhysical(repositoryReal, ref, `declared component path ${ref}`, { allowMissing });
  if (!rootPath) return Object.freeze({ entries: Object.freeze([]), fingerprint: `missing:${ref}` });
  const hasher = createHash("sha256");
  const entries = [];
  const queue = [{ physical: rootPath, ref }];
  while (queue.length) {
    const current = queue.shift();
    if (budget && !budget.entries.has(current.ref)) {
      budget.entries.add(current.ref);
      if (budget.entries.size > ENTRY_LIMIT) fail(`component inspection exceeds ${ENTRY_LIMIT} unique entries`);
    }
    const info = lstatSync(current.physical, { bigint: true });
    if (info.isSymbolicLink()) fail(`declared component path crosses a link or reparse point: ${current.ref}`);
    if (info.isDirectory()) {
      hasher.update(`dir\0${current.ref}\0`);
      entries.push(current.ref);
      const children = readdirSync(current.physical, { withFileTypes: true }).sort((left, right) => ordinal(left.name.normalize("NFC"), right.name.normalize("NFC")));
      for (const child of children) {
        if (child.name.normalize("NFC") !== child.name || !portableSegment(child.name)) fail(`component tree has a non-portable entry: ${current.ref}/${child.name}`);
        queue.push({ physical: resolve(current.physical, child.name), ref: `${current.ref}/${child.name}` });
      }
    } else if (info.isFile()) {
      entries.push(current.ref);
      if (hashBytes) hashFileIdentity(current.physical, current.ref, hasher, budget);
      else hasher.update(`local\0${current.ref}\0${info.size}\0${info.mtimeNs}\0${info.ctimeNs}\0`);
    } else {
      fail(`component tree contains a non-regular entry: ${current.ref}`);
    }
  }
  return Object.freeze({ entries: Object.freeze(entries), fingerprint: hasher.digest("hex") });
}

function validateRegistry(parsed, instanceId, instanceState) {
  const expectedRoot = new Set(["schema_version", "record_type", "instance_id", "adoption_state", "revision", "component_count"]);
  if (!exactKeys(parsed.root, expectedRoot)
    || parsed.root.schema_version !== 1
    || parsed.root.record_type !== "agent-carry-instance-component-registry"
    || parsed.root.instance_id !== instanceId
    || !adoptionStates.has(parsed.root.adoption_state)
    || !Number.isSafeInteger(parsed.root.revision) || parsed.root.revision < 0
    || !Number.isSafeInteger(parsed.root.component_count) || parsed.root.component_count !== parsed.entries.length
    || parsed.entries.length > COMPONENT_LIMIT) fail("component registry root, identity, count or budget is invalid");
  if (instanceState === "template" && (parsed.root.adoption_state !== "template" || parsed.entries.length !== 0)) fail("blank template component registry is not empty");
  if (instanceState === "instance" && parsed.root.adoption_state === "template") fail("instantiated component registry still claims template state");
  let previous = "";
  const expectedEntry = new Set(["id", "kind", "manifest_ref", "state"]);
  for (const entry of parsed.entries) {
    if (!exactKeys(entry, expectedEntry) || !stableId.test(entry.id ?? "") || !componentKinds.has(entry.kind)
      || !componentStates.has(entry.state) || entry.manifest_ref !== `instance/components/${entry.id}/component.toml`
      || (previous && ordinal(previous, entry.id) >= 0)) fail("component registry entries are malformed, duplicated or unsorted");
    previous = entry.id;
  }
  return parsed;
}

function validateManifest(parsed, entry, instanceId) {
  const sections = Object.keys(parsed);
  if (sections.length !== 4 || !["", "ownership", "interfaces", "upgrade"].every((name) => sections.includes(name))) fail(`component ${entry.id} has unknown or missing sections`);
  const root = parsed[""] ?? {};
  const ownership = parsed.ownership ?? {};
  const interfaces = parsed.interfaces ?? {};
  const upgrade = parsed.upgrade ?? {};
  if (!exactKeys(root, rootFields) || !exactKeys(ownership, ownershipFields) || !exactKeys(interfaces, interfaceFields) || !exactKeys(upgrade, upgradeFields)) fail(`component ${entry.id} has unknown or missing fields`);
  if (root.schema_version !== 1 || root.record_type !== "agent-carry-instance-component" || root.component_id !== entry.id
    || root.instance_id !== instanceId || root.kind !== entry.kind || root.status !== entry.state
    || !clean(root.title, 120) || !clean(root.summary, 500) || !semver.test(root.component_version ?? "")
    || root.root !== `instance/components/${entry.id}` || root.load_policy !== "on-demand-only") fail(`component ${entry.id} identity or root is invalid`);
  if (!cleanList(ownership.portable_paths, 128, componentRelativeRef) || !ownership.portable_paths.includes("component.toml")
    || !cleanList(ownership.derived_paths, 128, componentRelativeRef)
    || !cleanList(ownership.device_local_paths, 32, (value) => portableRef(value, { prefix: ".assistant-local/" }))
    || !cleanList(ownership.private_collection_refs, 32, privateRef)
    || ownership.unclassified_policy !== "stop-and-preview") fail(`component ${entry.id} ownership is invalid`);
  const allComponentPaths = [...ownership.portable_paths, ...ownership.derived_paths];
  for (let left = 0; left < allComponentPaths.length; left += 1) {
    for (let right = left + 1; right < allComponentPaths.length; right += 1) {
      if (pathsOverlap(allComponentPaths[left], allComponentPaths[right])) fail(`component ${entry.id} has overlapping portable or derived paths`);
    }
  }
  if (!cleanList(interfaces.provides, 32, (value) => interfaceId.test(value))
    || !cleanList(interfaces.requires, 32, (value) => interfaceId.test(value))
    || !interfaces.requires.includes("agent-carry.instance-component@1")) fail(`component ${entry.id} interface declaration is invalid`);
  if (!new Set(["optional", "required"]).has(upgrade.criticality) || !activations.has(upgrade.activation)
    || upgrade.compatible_action !== "preserve"
    || (upgrade.criticality === "optional" && upgrade.incompatible_action !== "disable-and-preserve")
    || (upgrade.criticality === "required" && upgrade.incompatible_action !== "stop-and-preserve")
    || !cleanList(upgrade.migration_ids, 32, (value) => stableId.test(value))
    || upgrade.second_run !== "no-change") fail(`component ${entry.id} upgrade declaration is invalid`);
  return Object.freeze({ root, ownership, interfaces, upgrade });
}

function parseComponentManifest(source, label) {
  const headers = [...source.matchAll(/^\[([^\]]+)\]\s*$/gmu)].map((match) => match[1]);
  if (JSON.stringify(headers) !== JSON.stringify(["ownership", "interfaces", "upgrade"])) {
    fail(`${label} has duplicated, missing, unknown or reordered sections`);
  }
  return parseSectionedToml(source, label);
}

function inspectComponentRoot(repositoryReal, entry, manifest, sourceParts, budget) {
  const rootRef = `instance/components/${entry.id}`;
  const rootPath = resolvePhysical(repositoryReal, rootRef, `component ${entry.id} root`);
  const rootInfo = lstatSync(rootPath);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) fail(`component ${entry.id} root is not a physical directory`);
  const declared = [...manifest.ownership.portable_paths, ...manifest.ownership.derived_paths];
  const rootTree = collectTree(repositoryReal, rootRef, { hashBytes: false, budget });
  const unclassified = rootTree.entries
    .filter((value) => value !== rootRef)
    .map((value) => value.slice(rootRef.length + 1))
    .filter((value) => !declared.some((owner) => value === owner || value.startsWith(`${owner}/`)));
  if (unclassified.length) fail(`component ${entry.id} has unclassified paths: ${unclassified.slice(0, 4).join(", ")}`);
  const portableFingerprints = [];
  for (const item of manifest.ownership.portable_paths) {
    const snapshot = collectTree(repositoryReal, `${rootRef}/${item}`, { hashBytes: true, budget });
    portableFingerprints.push(`${item}:${snapshot.fingerprint}`);
  }
  const derivedFingerprints = [];
  for (const item of manifest.ownership.derived_paths) {
    const snapshot = collectTree(repositoryReal, `${rootRef}/${item}`, { hashBytes: false, allowMissing: true, budget });
    derivedFingerprints.push(`${item}:${snapshot.fingerprint}`);
  }
  const localFingerprints = [];
  for (const item of manifest.ownership.device_local_paths) {
    const snapshot = collectTree(repositoryReal, item, { hashBytes: false, allowMissing: true, budget });
    localFingerprints.push(`${item}:${snapshot.fingerprint}`);
  }
  sourceParts.push(`${entry.id}:portable:${portableFingerprints.join("|")}`);
  sourceParts.push(`${entry.id}:derived:${derivedFingerprints.join("|")}`);
  sourceParts.push(`${entry.id}:local:${localFingerprints.join("|")}`);
  return Object.freeze({
    unclassified: Object.freeze(unclassified),
    portableFingerprints: Object.freeze(portableFingerprints),
    derivedFingerprints: Object.freeze(derivedFingerprints),
    localFingerprints: Object.freeze(localFingerprints),
  });
}

export function inspectInstanceComponents(repository) {
  const inspectionBudget = { entries: new Set(), portableBytes: 0n };
  let repositoryReal;
  try { repositoryReal = realpathSync(repository); } catch { fail("Agent Carry root does not exist"); }
  const instanceRead = readBounded(repositoryReal, "instance/manifest.toml", "instance manifest", 2560);
  const instance = validateInstanceManifestStructure(parseSectionedToml(instanceRead.text, "instance manifest"));
  const registryRead = readBounded(repositoryReal, REGISTRY_REF, "instance component registry", REGISTRY_LIMIT);
  const registry = validateRegistry(
    parseArrayTableDocument(registryRead.text, "components", "instance component registry"),
    instance.root.instance_id,
    instance.root.state,
  );
  const registeredIds = new Set(registry.entries.map((entry) => entry.id));
  const componentRoot = resolvePhysical(repositoryReal, "instance/components", "instance component root");
  const unregistered = [];
  for (const item of readdirSync(componentRoot, { withFileTypes: true })) {
    if (["README.md", "registry.toml"].includes(item.name)) continue;
    if (!item.isDirectory() || item.isSymbolicLink() || !registeredIds.has(item.name)) unregistered.push(`instance/components/${item.name}`);
  }
  const sourceParts = [`manifest:${instanceRead.sha256}`, `registry:${registryRead.sha256}`];
  const components = [];
  for (const entry of registry.entries) {
    const read = readBounded(repositoryReal, entry.manifest_ref, `component ${entry.id} manifest`, MANIFEST_LIMIT);
    const manifest = validateManifest(parseComponentManifest(read.text, `component ${entry.id} manifest`), entry, instance.root.instance_id);
    sourceParts.push(`${entry.id}:manifest:${read.sha256}`);
    const tree = inspectComponentRoot(repositoryReal, entry, manifest, sourceParts, inspectionBudget);
    components.push(Object.freeze({
      id: entry.id,
      kind: entry.kind,
      state: entry.state,
      provides: Object.freeze([...manifest.interfaces.provides]),
      requires: Object.freeze([...manifest.interfaces.requires]),
      portablePaths: Object.freeze([...manifest.ownership.portable_paths]),
      derivedPaths: Object.freeze([...manifest.ownership.derived_paths]),
      deviceLocalPaths: Object.freeze([...manifest.ownership.device_local_paths]),
      privateCollectionRefs: Object.freeze([...manifest.ownership.private_collection_refs]),
      criticality: manifest.upgrade.criticality,
      activation: manifest.upgrade.activation,
      incompatibleAction: manifest.upgrade.incompatible_action,
      migrationIds: Object.freeze([...manifest.upgrade.migration_ids]),
      tree,
    }));
  }
  for (let left = 0; left < components.length; left += 1) {
    for (let right = left + 1; right < components.length; right += 1) {
      for (const leftPath of components[left].deviceLocalPaths) {
        if (components[right].deviceLocalPaths.some((rightPath) => pathsOverlap(leftPath, rightPath))) {
          fail(`components ${components[left].id} and ${components[right].id} overlap device-local ownership`);
        }
      }
    }
  }
  sourceParts.push(`unregistered:${unregistered.sort(ordinal).join("|")}`);
  return Object.freeze({
    decision: unregistered.length ? "instance-components-conflict" : "instance-components-valid",
    instanceId: instance.root.instance_id,
    instanceState: instance.root.state,
    adoptionState: registry.root.adoption_state,
    revision: registry.root.revision,
    componentCount: components.length,
    components: Object.freeze(components),
    unregisteredPaths: Object.freeze(unregistered),
    sourceFingerprint: digest(Buffer.from(sourceParts.join("\n"), "utf8")),
    bodyReads: 0,
    executable: false,
  });
}

function coveredByComponent(component, ref) {
  const componentRoot = `instance/components/${component.id}`;
  if (ref === componentRoot || ref.startsWith(`${componentRoot}/`)) {
    const relativeRef = ref === componentRoot ? "" : ref.slice(componentRoot.length + 1);
    return component.portablePaths.some((owner) => relativeRef === owner || relativeRef.startsWith(`${owner}/`))
      || component.derivedPaths.some((owner) => relativeRef === owner || relativeRef.startsWith(`${owner}/`));
  }
  return component.deviceLocalPaths.some((owner) => ref === owner || ref.startsWith(`${owner}/`));
}

export function classifyInstanceMutation(repository, { paths = [], componentId = "" } = {}) {
  if (!Array.isArray(paths) || paths.length < 1 || paths.length > 128 || new Set(paths).size !== paths.length
    || paths.some((value) => !portableRef(value))) fail("mutation path set is empty, duplicated, oversized or unsafe");
  if (componentId && !stableId.test(componentId)) fail("mutation component ID is invalid");
  const inspection = inspectInstanceComponents(repository);
  const component = componentId ? inspection.components.find((item) => item.id === componentId) : null;
  if (componentId && !component) fail(`mutation component is not registered: ${componentId}`);
  const actions = paths.map((ref) => {
    const componentOwners = inspection.components.filter((item) => coveredByComponent(item, ref));
    const ownedBySelectedComponent = component && componentOwners.some((item) => item.id === component.id);
    if (templateRootFiles.has(ref) || templatePrefixes.some((prefix) => ref.startsWith(prefix))) return Object.freeze({ path: ref, action: "deny-template-core-direct-write" });
    if (ref === "instance/components/registry.toml" || ref === "instance/components/README.md") return Object.freeze({ path: ref, action: componentId ? "deny-registry-owner-mismatch" : "native-instance-metadata" });
    if (ref.startsWith("instance/components/")) return Object.freeze({ path: ref, action: ownedBySelectedComponent ? "registered-component" : "deny-unregistered-component-path" });
    if (ref.startsWith(".assistant-local/")) {
      if (ownedBySelectedComponent) return Object.freeze({ path: ref, action: "registered-device-local" });
      if (componentOwners.length) return Object.freeze({ path: ref, action: "deny-component-owner-mismatch" });
      if (!componentId && frameworkLocalPrefixes.some((prefix) => ref.startsWith(prefix))) return Object.freeze({ path: ref, action: "native-framework-local" });
      return Object.freeze({ path: ref, action: "deny-unregistered-device-local" });
    }
    if (nativeInstanceFiles.has(ref) || nativeInstancePrefixes.some((prefix) => ref.startsWith(prefix))) return Object.freeze({ path: ref, action: componentId ? "deny-native-owner-mismatch" : "native-instance-owner" });
    if (ref.startsWith("workspace/")) return Object.freeze({ path: ref, action: componentId ? "deny-professional-extension-owner-mismatch" : "delegate-professional-extension-contract" });
    if (ref.startsWith(".assistant-private/")) return Object.freeze({ path: ref, action: componentId ? "deny-private-owner-mismatch" : "delegate-private-asset-contract" });
    return Object.freeze({ path: ref, action: "deny-unowned-path" });
  });
  const conflict = inspection.decision !== "instance-components-valid" || actions.some((item) => item.action.startsWith("deny-"));
  return Object.freeze({
    decision: conflict ? "instance-mutation-conflict" : "instance-mutation-compatible",
    componentId,
    actions: Object.freeze(actions),
    sourceFingerprint: inspection.sourceFingerprint,
    compatibilityRegistrationAddsConfirmation: false,
    executable: false,
  });
}

function validatedInterfaceSet(value, label) {
  if (!cleanList(value, 256, (item) => interfaceId.test(item))) fail(`${label} is invalid`);
  return new Set(value);
}

function validatedStableIdSet(value, label) {
  if (!cleanList(value, 256, (item) => stableId.test(item))) fail(`${label} is invalid`);
  return new Set(value);
}

export function planInstanceComponentUpgrade(repository, { targetInterfaces = [], migrationIds = [] } = {}) {
  const inspection = inspectInstanceComponents(repository);
  const available = validatedInterfaceSet(targetInterfaces, "target interface set");
  const migrationSet = validatedStableIdSet(migrationIds, "migration ID set");
  const pending = inspection.components.filter((component) => component.state === "active");
  let changed = true;
  while (changed) {
    changed = false;
    for (let index = pending.length - 1; index >= 0; index -= 1) {
      if (pending[index].requires.every((required) => available.has(required))) {
        for (const provided of pending[index].provides) available.add(provided);
        pending.splice(index, 1);
        changed = true;
      }
    }
  }
  const unresolved = new Map(pending.map((component) => [component.id, component.requires.filter((required) => !available.has(required))]));
  const actions = inspection.components.map((component) => {
    if (component.state !== "active") return Object.freeze({ id: component.id, action: "preserve-disabled", missingInterfaces: Object.freeze([]), deviceLocalAction: "preserve-in-place" });
    const missing = unresolved.get(component.id) ?? [];
    if (!missing.length) return Object.freeze({ id: component.id, action: "preserve", missingInterfaces: Object.freeze([]), deviceLocalAction: component.deviceLocalPaths.length ? "preserve-in-place-and-reverify" : "none" });
    if (component.migrationIds.some((id) => migrationSet.has(id))) return Object.freeze({ id: component.id, action: "migrate-and-recheck", missingInterfaces: Object.freeze(missing), deviceLocalAction: "preserve-in-place" });
    return Object.freeze({ id: component.id, action: component.incompatibleAction, missingInterfaces: Object.freeze(missing), deviceLocalAction: "preserve-in-place" });
  });
  let decision = "instance-upgrade-compatible";
  if (inspection.decision !== "instance-components-valid" || inspection.adoptionState === "conflict") decision = "instance-upgrade-conflict";
  else if (inspection.instanceState === "instance" && inspection.adoptionState !== "current") decision = "instance-upgrade-adoption-required";
  else if (actions.some((item) => item.action === "stop-and-preserve")) decision = "instance-upgrade-conflict";
  else if (actions.some((item) => item.action === "migrate-and-recheck")) decision = "instance-upgrade-migration-required";
  return Object.freeze({
    decision,
    sourceFingerprint: inspection.sourceFingerprint,
    actions: Object.freeze(actions),
    unregisteredPaths: inspection.unregisteredPaths,
    deviceLocalMigrationPolicy: "never-copy-or-delete-reverify-on-target-device",
    secondRun: "no-change",
    executable: false,
  });
}

export function instanceComponentPlanIsFresh(repository, plan) {
  if (!plan || typeof plan !== "object" || typeof plan.sourceFingerprint !== "string") return false;
  try { return inspectInstanceComponents(repository).sourceFingerprint === plan.sourceFingerprint; }
  catch { return false; }
}
