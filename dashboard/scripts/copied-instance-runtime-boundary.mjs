import { createHash } from "node:crypto";
import {
  closeSync,
  fstatSync,
  lstatSync,
  openSync,
  readSync,
  realpathSync,
} from "node:fs";
import { isAbsolute, posix, relative, resolve, sep, win32 } from "node:path";
import { fileURLToPath } from "node:url";
import { parseSectionedToml } from "./asset-route-contract.mjs";

const BINDING_LIMIT = 256 * 1024;
const BINDING_COUNT_LIMIT = 16;
const VALUE_COUNT_LIMIT = 4096;
const VALUE_DEPTH_LIMIT = 16;
const unsafeText = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u;
const dynamicPath = /^(?:~[\\/]|%[A-Za-z_][A-Za-z0-9_]*%[\\/]|\$env:[A-Za-z_][A-Za-z0-9_]*[\\/]|\$\{[A-Za-z_][A-Za-z0-9_]*\}[\\/])/u;
const pathKey = /(?:^|[._~/-])(?:path|paths|root|dir|directory|folder|file|cache|runtime|binary|exe|executable|command|workspace|install|output|temp|tool)(?:$|[._~/-])/iu;
const explicitRelativePath = /^(?:\.{1,2}[\\/]|[A-Za-z]:[^\\/]|file:)/iu;
const uriWithAuthority = /^[A-Za-z][A-Za-z0-9+.-]*:\/\//u;

function fail(message) {
  throw new Error(`Copied instance runtime boundary failed: ${message}`);
}

function portableSegment(value) {
  return value && value !== "." && value !== ".." && value.normalize("NFC") === value
    && !/[<>:"|?*]/u.test(value) && !/[. ]$/u.test(value) && !unsafeText.test(value);
}

function bindingRef(value) {
  return typeof value === "string" && value.startsWith(".assistant-local/")
    && value.length <= 240 && !value.includes("\\") && value.split("/").every(portableSegment)
    && [".json", ".toml"].some((extension) => value.endsWith(extension));
}

function rootIdentity(value, label) {
  if (typeof value !== "string" || !value) fail(`${label} is missing`);
  let stated;
  try { stated = resolve(value); } catch { fail(`${label} is invalid`); }
  let info;
  try { info = lstatSync(stated); } catch { fail(`${label} does not exist`); }
  if (!info.isDirectory() || info.isSymbolicLink() || info.isReparsePoint?.()) fail(`${label} is not a physical directory`);
  const physical = realpathSync(stated);
  return Object.freeze({ stated, physical, comparable: comparableAbsolute(physical) });
}

function comparableAbsolute(value) {
  if (win32.isAbsolute(value)) {
    const normalized = win32.normalize(value.replaceAll("/", "\\")).replace(/[\\]+$/u, "");
    return Object.freeze({ style: "win32", value: normalized.toLowerCase(), separator: "\\" });
  }
  if (posix.isAbsolute(value)) {
    const normalized = posix.normalize(value).replace(/\/+$/u, "") || "/";
    return Object.freeze({ style: "posix", value: normalized, separator: "/" });
  }
  fail("an absolute path could not be normalized");
}

function sameOrInside(candidate, owner) {
  return candidate.style === owner.style
    && (candidate.value === owner.value
      || (owner.value === owner.separator ? candidate.value.startsWith(owner.separator) : candidate.value.startsWith(`${owner.value}${owner.separator}`)));
}

function physicalBindingPath(candidateReal, ref) {
  if (!bindingRef(ref)) fail(`binding reference is unsafe or unsupported: ${String(ref)}`);
  let cursor = candidateReal;
  for (const part of ref.split("/")) {
    cursor = resolve(cursor, part);
    let info;
    try { info = lstatSync(cursor); } catch { fail(`binding file does not exist: ${ref}`); }
    if (info.isSymbolicLink() || info.isReparsePoint?.()) fail(`binding file crosses a link or reparse point: ${ref}`);
  }
  const physical = realpathSync(cursor);
  const fromCandidate = relative(candidateReal, physical);
  if (fromCandidate === ".." || fromCandidate.startsWith(`..${sep}`) || isAbsolute(fromCandidate)) {
    fail(`binding file escapes the candidate: ${ref}`);
  }
  return physical;
}

function readBoundedBinding(candidateReal, ref) {
  const path = physicalBindingPath(candidateReal, ref);
  const descriptor = openSync(path, "r");
  try {
    const before = fstatSync(descriptor, { bigint: true });
    if (!before.isFile() || before.size > BigInt(BINDING_LIMIT)) fail(`binding file is not regular or exceeds ${BINDING_LIMIT} bytes: ${ref}`);
    const buffer = Buffer.alloc(Number(before.size));
    let offset = 0;
    while (offset < buffer.length) {
      const count = readSync(descriptor, buffer, offset, buffer.length - offset, offset);
      if (count === 0) break;
      offset += count;
    }
    const after = fstatSync(descriptor, { bigint: true });
    if (offset !== buffer.length || before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size
      || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs) fail(`binding file changed during its bounded read: ${ref}`);
    const content = buffer.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])) ? buffer.subarray(3) : buffer;
    let text;
    try { text = new TextDecoder("utf-8", { fatal: true }).decode(content); }
    catch { fail(`binding file is not valid UTF-8: ${ref}`); }
    if (content.includes(0)) fail(`binding file contains a NUL byte: ${ref}`);
    return Object.freeze({ text, sha256: createHash("sha256").update(buffer).digest("hex") });
  } finally {
    closeSync(descriptor);
  }
}

function parseBinding(read, ref) {
  try {
    return ref.endsWith(".json") ? JSON.parse(read.text) : parseSectionedToml(read.text, `runtime binding ${ref}`);
  } catch (error) {
    fail(`binding file cannot be parsed safely: ${ref}; ${String(error?.message ?? error)}`);
  }
}

function pointerPart(value) {
  return String(value).replaceAll("~", "~0").replaceAll("/", "~1");
}

function collectStrings(value, pointer, state, depth = 0) {
  if (depth > VALUE_DEPTH_LIMIT) fail(`binding values exceed the depth limit at ${pointer || "/"}`);
  state.values += 1;
  if (state.values > VALUE_COUNT_LIMIT) fail(`binding values exceed the ${VALUE_COUNT_LIMIT} item limit`);
  if (typeof value === "string") {
    state.strings.push(Object.freeze({ pointer: pointer || "/", value }));
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectStrings(item, `${pointer}/${index}`, state, depth + 1));
    return;
  }
  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) => collectStrings(item, `${pointer}/${pointerPart(key)}`, state, depth + 1));
  }
}

function localAbsolute(value) {
  if (typeof value !== "string" || !value || unsafeText.test(value)) return null;
  if (value.startsWith("file:")) {
    try {
      const native = fileURLToPath(value);
      return Object.freeze({ comparable: comparableAbsolute(native), native });
    } catch { return null; }
  }
  if (win32.isAbsolute(value) || posix.isAbsolute(value)) return Object.freeze({ comparable: comparableAbsolute(value), native: value });
  return null;
}

function validateExternalRoots(values, source, candidate) {
  if (!Array.isArray(values) || values.length > 16 || new Set(values).size !== values.length) fail("allowed external roots are malformed or exceed 16 entries");
  return Object.freeze(values.map((value, index) => {
    if (typeof value !== "string" || !value || (!win32.isAbsolute(value) && !posix.isAbsolute(value))) fail("an allowed external root is not absolute");
    const external = rootIdentity(value, `allowed external root ${index + 1}`);
    if (sameOrInside(external.comparable, source.comparable) || sameOrInside(source.comparable, external.comparable)
      || sameOrInside(external.comparable, candidate.comparable) || sameOrInside(candidate.comparable, external.comparable)) {
      fail("an allowed external root overlaps the source or candidate instance");
    }
    return external;
  }));
}

function existingPathStaysInside(pathValue, owner) {
  let absolute;
  try { absolute = resolve(pathValue); } catch { return false; }
  const fromOwner = relative(owner.physical, absolute);
  if (fromOwner === ".." || fromOwner.startsWith(`..${sep}`) || isAbsolute(fromOwner)) return false;
  let cursor = owner.physical;
  for (const part of fromOwner.split(sep).filter(Boolean)) {
    cursor = resolve(cursor, part);
    let info;
    try { info = lstatSync(cursor); } catch { return true; }
    if (info.isSymbolicLink() || info.isReparsePoint?.()) return false;
  }
  try {
    return sameOrInside(comparableAbsolute(realpathSync(absolute)), owner.comparable);
  } catch { return true; }
}

function unresolvedPathLike(value, pointer) {
  if (typeof value !== "string" || !value) return false;
  if (unsafeText.test(value) || dynamicPath.test(value) || explicitRelativePath.test(value)) return true;
  return pathKey.test(pointer) && /[\\/]/u.test(value) && !uriWithAuthority.test(value);
}

function userReport(decision, counts) {
  if (decision === "runtime-execution-compatible") {
    return Object.freeze({
      headline: "副本运行边界检查通过。",
      impact: `已只读核对 ${counts.bindingFileCount} 个明确绑定文件，没有发现回指正式源实例或尚未说明的外部运行时。`,
      dataSafety: "检查没有启动工具，也没有改写源实例、副本或外部运行时。",
      recommendation: "可以继续当前组件的代表性行为验证；其他能力不需要重复检查。",
      requiresUserDecision: false,
      sourceLanguage: "zh-CN",
    });
  }
  const reasons = [
    counts.sourceReferenceCount ? `${counts.sourceReferenceCount} 个绑定仍回指正式源实例` : "",
    counts.unreviewedExternalCount ? `${counts.unreviewedExternalCount} 个外部运行时尚未声明隔离边界` : "",
    counts.dynamicReferenceCount ? `${counts.dynamicReferenceCount} 个动态或相对路径尚未解析` : "",
  ].filter(Boolean).join("，");
  return Object.freeze({
    headline: "当前组件的副本运行已局部暂停。",
    impact: `发现${reasons}。只暂停这个组件的执行；AI Carry、对话和其他无关能力仍可继续。`,
    dataSafety: "预检没有启动该工具，也没有改写、覆盖或删除源实例、副本和用户数据。",
    recommendation: "让当前 Agent 在一次性隔离候选中把这些绑定重连到副本专用运行时，或改做非执行只读检查；重新预检通过后再运行该组件。",
    requiresUserDecision: false,
    sourceLanguage: "zh-CN",
  });
}

export function auditCopiedInstanceRuntimeBoundary({
  sourceRoot,
  candidateRoot,
  bindingRefs = [],
  allowedExternalRoots = [],
} = {}) {
  const source = rootIdentity(sourceRoot, "source instance root");
  const candidate = rootIdentity(candidateRoot, "candidate instance root");
  if (sameOrInside(source.comparable, candidate.comparable) || sameOrInside(candidate.comparable, source.comparable)) {
    fail("source and candidate roots overlap");
  }
  if (!Array.isArray(bindingRefs) || bindingRefs.length === 0 || bindingRefs.length > BINDING_COUNT_LIMIT
    || new Set(bindingRefs).size !== bindingRefs.length || !bindingRefs.every(bindingRef)) {
    fail(`binding references must contain 1 to ${BINDING_COUNT_LIMIT} unique .assistant-local JSON or TOML files`);
  }
  const allowed = validateExternalRoots(allowedExternalRoots, source, candidate);
  const issues = [];
  const bindingDigests = [];
  let checkedStringCount = 0;
  let candidateReferenceCount = 0;
  let allowedExternalReferenceCount = 0;
  let sourceReferenceCount = 0;
  let unreviewedExternalCount = 0;
  let dynamicReferenceCount = 0;

  for (const ref of bindingRefs) {
    const read = readBoundedBinding(candidate.physical, ref);
    bindingDigests.push(`${ref}:${read.sha256}`);
    const state = { values: 0, strings: [] };
    collectStrings(parseBinding(read, ref), "", state);
    checkedStringCount += state.strings.length;
    for (const item of state.strings) {
      const absolute = localAbsolute(item.value);
      if (!absolute) {
        if (unresolvedPathLike(item.value, item.pointer)) {
          dynamicReferenceCount += 1;
          issues.push(Object.freeze({ code: "binding-relative-or-dynamic-path-unresolved", bindingRef: ref, valueRef: item.pointer }));
        }
        continue;
      }
      if (sameOrInside(absolute.comparable, source.comparable)) {
        sourceReferenceCount += 1;
        issues.push(Object.freeze({ code: "binding-reaches-source-instance", bindingRef: ref, valueRef: item.pointer }));
      } else if (sameOrInside(absolute.comparable, candidate.comparable) && existingPathStaysInside(absolute.native, candidate)) candidateReferenceCount += 1;
      else if (allowed.some((root) => sameOrInside(absolute.comparable, root.comparable) && existingPathStaysInside(absolute.native, root))) allowedExternalReferenceCount += 1;
      else {
        unreviewedExternalCount += 1;
        issues.push(Object.freeze({ code: "binding-external-runtime-unreviewed", bindingRef: ref, valueRef: item.pointer }));
      }
    }
  }

  const executionAllowed = issues.length === 0;
  const decision = executionAllowed ? "runtime-execution-compatible" : "runtime-execution-component-isolated";
  const counts = Object.freeze({
    bindingFileCount: bindingRefs.length,
    checkedStringCount,
    candidateReferenceCount,
    allowedExternalReferenceCount,
    sourceReferenceCount,
    unreviewedExternalCount,
    dynamicReferenceCount,
  });
  return Object.freeze({
    decision,
    executionAllowed,
    affectedScope: executionAllowed ? "none" : "current-component-only",
    capabilityStatus: executionAllowed ? "ready" : "limited",
    counts,
    issues: Object.freeze(issues),
    userReport: userReport(decision, counts),
    sourceFingerprint: createHash("sha256").update([
      source.comparable.value,
      candidate.comparable.value,
      ...bindingDigests,
      ...allowed.map((item) => item.comparable.value),
    ].join("\n")).digest("hex"),
    executable: false,
  });
}

function parseCli(argumentsGiven) {
  const options = { bindingRefs: [], allowedExternalRoots: [] };
  for (let index = 0; index < argumentsGiven.length; index += 1) {
    const option = argumentsGiven[index];
    const value = argumentsGiven[index + 1];
    if (!["--source", "--candidate", "--binding", "--allow-external-root"].includes(option) || value === undefined) {
      fail(`unknown or incomplete CLI option: ${String(option)}`);
    }
    index += 1;
    if (option === "--source") options.sourceRoot = value;
    else if (option === "--candidate") options.candidateRoot = value;
    else if (option === "--binding") options.bindingRefs.push(value);
    else options.allowedExternalRoots.push(value);
  }
  return options;
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  try {
    const result = auditCopiedInstanceRuntimeBoundary(parseCli(process.argv.slice(2)));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (!result.executionAllowed) process.exitCode = 2;
  } catch (error) {
    process.stderr.write(`${String(error?.message ?? error)}\n`);
    process.exitCode = 2;
  }
}
