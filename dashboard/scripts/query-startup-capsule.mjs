import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildStartupCapsule, inspectStartupCapsule } from "./startup-capsule-contract.mjs";
import { inspectCrossSessionSignalStartup } from "./cross-session-signal-transaction.mjs";

export const modelVisibleStartupFiles = Object.freeze(["AGENTS.md", "BOOTSTRAP.md", "core/maps/root-map.toml"]);

export function buildVerifiedStartupProjection(repository) {
  const root = resolve(repository);
  const capsule = inspectStartupCapsule(root);
  if (capsule.decision !== "startup-capsule-valid") return capsule;
  const signal = inspectCrossSessionSignalStartup(root);
  const allowedSignalFields = ["decision", "reason", "operationId", "sourceRevision", "projectionRevision", "nextWakeupAt", "nextWakeupRef",
    "deferredSignalId", "signalId", "routeId", "selectionPolicy", "overflow", "scheduledCount", "bodyReads"];
  const signalSummary = Object.fromEntries(allowedSignalFields.filter((field) => Object.hasOwn(signal, field)).map((field) => [field, signal[field]]));
  return Object.freeze({ ...capsule, signal: Object.freeze(signalSummary) });
}

export function measureModelVisibleStartupContext(repository) {
  const root = resolve(repository);
  const projection = buildVerifiedStartupProjection(root);
  const projectionSource = JSON.stringify(projection);
  const characters = (value) => [...value.replaceAll("\r\n", "\n").normalize("NFC")].length;
  const breakdown = Object.fromEntries(modelVisibleStartupFiles.map((ref) => [ref, characters(readFileSync(resolve(root, ...ref.split("/")), "utf8"))]));
  breakdown["verified-startup-query-output"] = characters(projectionSource);
  return Object.freeze({ projection, projectionSource, breakdown: Object.freeze(breakdown), totalCharacters: Object.values(breakdown).reduce((sum, value) => sum + value, 0) });
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const root = resolve(process.argv[2] ?? defaultRoot);
  if (process.argv.includes("--expected-source")) process.stdout.write(buildStartupCapsule(root).source);
  else process.stdout.write(`${JSON.stringify(buildVerifiedStartupProjection(root))}\n`);
}
