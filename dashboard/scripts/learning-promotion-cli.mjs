#!/usr/bin/env node

import { closeSync, fstatSync, lstatSync, openSync, readSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import {
  cleanupPersistentPromotionTransactions,
  closePersistentPromotionTransaction,
  executePersistentPromotionTransaction,
  inspectPersistentPromotionTransaction,
  persistPreparedPromotionTransaction,
  preparePersistentPromotionFromHandoff,
  resumePersistentPromotionTransaction,
  rollbackPersistentPromotionTransaction,
} from "./learning-promotion-transaction.mjs";
import { operationalUserReport, withOperationalUserReport } from "./operational-user-report.mjs";

const decoder = new TextDecoder("utf-8", { fatal: true });

function readBoundedJson(path, label) {
  const target = realpathSync(resolve(path)); const info = lstatSync(target);
  if (!info.isFile() || info.isSymbolicLink() || info.size > 256 * 1024) {
    throw new Error(`${label} must be one bounded physical JSON file`);
  }
  const descriptor = openSync(target, "r");
  try {
    const before = fstatSync(descriptor, { bigint: true }); const buffer = Buffer.alloc(Number(before.size)); let offset = 0;
    while (offset < buffer.length) {
      const count = readSync(descriptor, buffer, offset, buffer.length - offset, offset);
      if (count === 0) break; offset += count;
    }
    const after = fstatSync(descriptor, { bigint: true });
    if (offset !== buffer.length || before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size
      || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs) throw new Error(`${label} changed during read`);
    return JSON.parse(decoder.decode(buffer));
  } finally { closeSync(descriptor); }
}
function exact(value, fields) {
  return value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).length === fields.length && fields.every((field) => Object.hasOwn(value, field));
}
function actionArgs(request, label) {
  if (!exact(request, ["transaction_id", "transaction_nonce"])) throw new Error(`${label} request fields are invalid`);
  return { transactionId: request.transaction_id, transactionNonce: request.transaction_nonce };
}
function boundedReason(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 240
    || value.includes("/") || value.includes("\\") || /[\r\n\u0000-\u001f]/u.test(value)
    || !/^[\p{L}\p{N} .,:'"()_-]+$/u.test(value)) return "bounded-validation-failed";
  return value;
}
function summarize(result) {
  const allowed = [
    "decision", "reason", "executable", "transactionId", "transactionNonce", "planDigest", "status", "updated",
    "idempotent", "candidateId", "formalId", "writeTargetCount", "stepCount", "relatedSignalCount",
    "authorizationBasis", "contentIncluded", "checkpoint", "writeCount", "restoredTargetCount", "resumable",
    "closedState", "recoveryEvidencePreserved", "inspectedCount", "removedPreparedCount", "preservedCount",
  ];
  const summary = Object.fromEntries(allowed.filter((field) => Object.hasOwn(result ?? {}, field))
    .map((field) => [field, field === "reason" ? boundedReason(result[field]) : result[field]]));
  const userReport = operationalUserReport(result, { operation: "learning-promotion" });
  return userReport ? { ...summary, userReport } : summary;
}

function run() {
  const [command, repository, requestPath] = process.argv.slice(2);
  if (!command || !repository) {
    throw new Error("usage: learning-promotion-cli <prepare-handoff|persist|inspect|execute|resume|rollback|close|cleanup> <repository> [request.json]");
  }
  const repositoryReal = realpathSync(resolve(repository));
  if (command === "cleanup") return cleanupPersistentPromotionTransactions(repositoryReal);
  if (!requestPath) throw new Error(`${command} requires one bounded request JSON file`);
  const request = readBoundedJson(requestPath, `${command} request`);
  if (command === "prepare-handoff") {
    // This command only reuses an already persisted and cross-checked Level 3
    // handoff. It never treats request JSON as proof of a current-user role.
    return preparePersistentPromotionFromHandoff(repositoryReal, request);
  }
  const args = actionArgs(request, command);
  if (command === "persist") return persistPreparedPromotionTransaction(repositoryReal, args);
  if (command === "inspect") return inspectPersistentPromotionTransaction(repositoryReal, args);
  if (command === "execute") {
    const enabled = process.env.AI_CARRY_PROMOTION_TEST_FAULTS === "1";
    const requested = Number.parseInt(process.env.AI_CARRY_PROMOTION_FAIL_AFTER_STEP ?? "0", 10);
    return executePersistentPromotionTransaction(repositoryReal, { ...args,
      faultAfterStep: enabled && Number.isSafeInteger(requested) && requested > 0 ? requested : 0 });
  }
  if (command === "resume") return resumePersistentPromotionTransaction(repositoryReal, args);
  if (command === "rollback") return rollbackPersistentPromotionTransaction(repositoryReal, args);
  if (command === "close") return closePersistentPromotionTransaction(repositoryReal, args);
  throw new Error(`unsupported learning promotion command: ${command}`);
}

try {
  const result = summarize(run()); process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (String(result.decision ?? "").endsWith("-denied") || String(result.decision ?? "").includes("recovery-required")) process.exitCode = 2;
} catch (error) {
  const result = withOperationalUserReport({ decision: "learning-promotion-cli-denied", reason: boundedReason(error.message),
    executable: false, contentIncluded: false }, { operation: "learning-promotion" });
  process.stderr.write(`${JSON.stringify(result)}\n`);
  process.exitCode = 2;
}
