#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import {
  cleanupExpiredPersistentCrossSessionSignalTransactions,
  closePersistentCrossSessionSignalTransaction,
  inspectPersistentCrossSessionSignalTransaction,
  resumePersistentCrossSessionSignalTransaction,
  rollbackPersistentCrossSessionSignalTransaction,
} from "./cross-session-signal-transaction.mjs";
import { operationalUserReport, withOperationalUserReport } from "./operational-user-report.mjs";

const STDOUT_MAX_BYTES = 4096;
const SUMMARY_LIST_MAX = 16;
const operationIdPattern = /^[a-z0-9][a-z0-9._-]{0,159}$/u;

function safeReason(value) {
  return typeof value === "string" && value.length <= 160 && !/[\\/\r\n]/u.test(value)
    ? value : value ? "details-withheld" : "";
}

function summarize(result) {
  const summary = {
    decision: String(result?.decision ?? "cross-session-signal-cli-denied"),
    executable: false,
  };
  for (const key of [
    "operationId", "state", "checkpoint", "stepCount", "expired", "idempotent", "writeCount",
    "restoredTargetCount", "priorState", "operationalBundleRemoved", "recoveryEvidencePreserved",
    "atomicRepairRequired", "operationCount", "inspectedCount", "removedCount", "rollbackRequiredCount",
    "recoveryRequiredCount", "orphanStageRemovedCount",
  ]) if (Object.hasOwn(result ?? {}, key)) summary[key] = result[key];
  if (result?.reason) summary.reason = safeReason(result.reason);
  if (Array.isArray(result?.transactions)) {
    summary.transactions = result.transactions.slice(0, SUMMARY_LIST_MAX).map((item) => ({
      operationId: item.operationId, state: item.state, checkpoint: item.checkpoint, expired: item.expired,
    }));
    summary.truncated = result.transactions.length > SUMMARY_LIST_MAX;
  }
  const userReport = operationalUserReport(result, { operation: "cross-session-signal" });
  if (userReport) summary.userReport = userReport;
  return summary;
}

function output(value) {
  let bytes = Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
  if (bytes.length > STDOUT_MAX_BYTES) {
    bytes = Buffer.from(`${JSON.stringify({ decision: value.decision, executable: false, summaryTruncated: true })}\n`, "utf8");
  }
  process.stdout.write(bytes);
}

function run() {
  const [command, repository, operationId = ""] = process.argv.slice(2);
  if (!command || !repository || !["inspect", "resume", "rollback", "close", "cleanup"].includes(command)) {
    throw new Error("usage: cross-session-signal <inspect|resume|rollback|close|cleanup> <repository> [operation-id]");
  }
  if (["resume", "rollback", "close"].includes(command) && !operationIdPattern.test(operationId)) {
    throw new Error(`${command} requires one bounded operation ID`);
  }
  if (command === "cleanup" && operationId !== "") throw new Error("cleanup does not accept an operation ID");
  if (command === "inspect" && operationId !== "" && !operationIdPattern.test(operationId)) throw new Error("inspect operation ID is invalid");
  const repositoryReal = realpathSync(resolve(repository));
  if (command === "cleanup") return cleanupExpiredPersistentCrossSessionSignalTransactions(repositoryReal);
  if (command === "inspect") return inspectPersistentCrossSessionSignalTransaction(repositoryReal, { operationId });
  if (command === "resume") return resumePersistentCrossSessionSignalTransaction(repositoryReal, { operationId });
  if (command === "rollback") return rollbackPersistentCrossSessionSignalTransaction(repositoryReal, { operationId });
  return closePersistentCrossSessionSignalTransaction(repositoryReal, { operationId });
}

try {
  const result = summarize(run()); output(result);
  if (String(result.decision).endsWith("-denied") || String(result.decision).endsWith("-recovery-required")) process.exitCode = 2;
} catch (error) {
  const result = withOperationalUserReport({ decision: "cross-session-signal-cli-denied", reason: safeReason(error.message),
    executable: false }, { operation: "cross-session-signal" });
  process.stderr.write(`${JSON.stringify(result)}\n`);
  process.exitCode = 2;
}
