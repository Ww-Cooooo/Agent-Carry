import { Buffer } from "node:buffer";
import { PRODUCT_IDENTITY } from "./product-identity.mjs";

export const SNAPSHOT_PREFIX = "// AI Carry snapshot envelope v1\nwindow.AI_CARRY_IS_REAL = true;\nwindow.AI_CARRY_SNAPSHOT = ";
export const DEMO_SNAPSHOT_PREFIX = "// AI Carry demo snapshot envelope v1\nwindow.AI_CARRY_DEMO = true;\nwindow.AI_CARRY_IS_REAL = true;\nwindow.AI_CARRY_SNAPSHOT = ";
export const SNAPSHOT_SUFFIX = ";\nwindow.AGENT_CARRY_DEMO = window.AI_CARRY_DEMO === true;\nwindow.AGENT_CARRY_IS_REAL = window.AI_CARRY_IS_REAL;\nwindow.AGENT_CARRY_SNAPSHOT = window.AI_CARRY_SNAPSHOT;\n";
export const SNAPSHOT_MAX_BYTES = 8 * 1024 * 1024;

// One-major-version read compatibility for snapshots generated before the product rename.
export const LEGACY_SNAPSHOT_PREFIX = "// Agent Carry snapshot envelope v1\nwindow.AGENT_CARRY_IS_REAL = true;\nwindow.AGENT_CARRY_SNAPSHOT = ";
export const LEGACY_DEMO_SNAPSHOT_PREFIX = "// Agent Carry demo snapshot envelope v1\nwindow.AGENT_CARRY_DEMO = true;\nwindow.AGENT_CARRY_IS_REAL = true;\nwindow.AGENT_CARRY_SNAPSHOT = ";
export const LEGACY_SNAPSHOT_SUFFIX = ";\n";

const forbiddenKeys = new Set(["__proto__", "prototype", "constructor"]);

function assertJsonData(value, path = "$") {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`snapshot contains a non-finite number at ${path}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertJsonData(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new Error(`snapshot contains a non-JSON value at ${path}`);
  }
  for (const [key, item] of Object.entries(value)) {
    if (forbiddenKeys.has(key)) throw new Error(`snapshot contains a forbidden key at ${path}.${key}`);
    assertJsonData(item, `${path}.${key}`);
  }
}

export function serializeSnapshotEnvelope(snapshot, { demo = false } = {}) {
  assertJsonData(snapshot);
  const source = `${demo ? DEMO_SNAPSHOT_PREFIX : SNAPSHOT_PREFIX}${JSON.stringify(snapshot, null, 2)}${SNAPSHOT_SUFFIX}`;
  if (Buffer.byteLength(source, "utf8") > SNAPSHOT_MAX_BYTES) {
    throw new Error(`snapshot envelope exceeds ${SNAPSHOT_MAX_BYTES} bytes`);
  }
  return source;
}

export function parseSnapshotEnvelope(source, label = "snapshot", { allowDemo = false, requireDemo = false } = {}) {
  if (typeof source !== "string") throw new Error(`${label} must be UTF-8 text`);
  if (Buffer.byteLength(source, "utf8") > SNAPSHOT_MAX_BYTES) {
    throw new Error(`${label} exceeds ${SNAPSHOT_MAX_BYTES} bytes`);
  }
  const shapes = [
    { prefix: DEMO_SNAPSHOT_PREFIX, suffix: SNAPSHOT_SUFFIX, demo: true },
    { prefix: SNAPSHOT_PREFIX, suffix: SNAPSHOT_SUFFIX, demo: false },
    { prefix: LEGACY_DEMO_SNAPSHOT_PREFIX, suffix: LEGACY_SNAPSHOT_SUFFIX, demo: true },
    { prefix: LEGACY_SNAPSHOT_PREFIX, suffix: LEGACY_SNAPSHOT_SUFFIX, demo: false },
  ];
  const shape = shapes.find(({ prefix, suffix }) => source.startsWith(prefix) && source.endsWith(suffix));
  const isDemo = shape?.demo === true;
  if (!shape || (isDemo && !allowDemo) || (requireDemo && !isDemo)) {
    throw new Error(`${label} does not use the exact snapshot envelope`);
  }
  const payload = source.slice(shape.prefix.length, -shape.suffix.length);
  let snapshot;
  try {
    snapshot = JSON.parse(payload);
  } catch (error) {
    throw new Error(`${label} payload is not strict JSON: ${error.message}`);
  }
  assertJsonData(snapshot);
  return snapshot;
}

// New product-owned output must use the current AI Carry envelope and product
// name. The generic parser above remains deliberately tolerant so existing
// 1.4.x instances and cached pages can still be read and migrated.
export function parseCurrentSnapshotEnvelope(source, label = "snapshot", { demo = false, expectedProduct = PRODUCT_IDENTITY.productName } = {}) {
  if (typeof source !== "string") throw new Error(`${label} must be UTF-8 text`);
  const expectedPrefix = demo ? DEMO_SNAPSHOT_PREFIX : SNAPSHOT_PREFIX;
  if (!source.startsWith(expectedPrefix) || !source.endsWith(SNAPSHOT_SUFFIX)) {
    throw new Error(`${label} does not use the current AI Carry snapshot envelope`);
  }
  const snapshot = parseSnapshotEnvelope(source, label, { allowDemo: demo, requireDemo: demo });
  if (expectedProduct && snapshot?.overview?.product !== expectedProduct) {
    throw new Error(`${label} does not declare the current ${expectedProduct} product identity`);
  }
  return snapshot;
}
