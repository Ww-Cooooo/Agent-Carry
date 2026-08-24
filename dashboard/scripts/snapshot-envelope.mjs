import { Buffer } from "node:buffer";

export const SNAPSHOT_PREFIX = "// Agent Carry snapshot envelope v1\nwindow.AGENT_CARRY_IS_REAL = true;\nwindow.AGENT_CARRY_SNAPSHOT = ";
export const DEMO_SNAPSHOT_PREFIX = "// Agent Carry demo snapshot envelope v1\nwindow.AGENT_CARRY_DEMO = true;\nwindow.AGENT_CARRY_IS_REAL = true;\nwindow.AGENT_CARRY_SNAPSHOT = ";
export const SNAPSHOT_SUFFIX = ";\n";
export const SNAPSHOT_MAX_BYTES = 8 * 1024 * 1024;

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
  const isDemo = source.startsWith(DEMO_SNAPSHOT_PREFIX);
  const prefix = isDemo ? DEMO_SNAPSHOT_PREFIX : SNAPSHOT_PREFIX;
  if ((isDemo && !allowDemo) || (requireDemo && !isDemo) || !source.startsWith(prefix) || !source.endsWith(SNAPSHOT_SUFFIX)) {
    throw new Error(`${label} does not use the exact snapshot envelope`);
  }
  const payload = source.slice(prefix.length, -SNAPSHOT_SUFFIX.length);
  let snapshot;
  try {
    snapshot = JSON.parse(payload);
  } catch (error) {
    throw new Error(`${label} payload is not strict JSON: ${error.message}`);
  }
  assertJsonData(snapshot);
  return snapshot;
}
