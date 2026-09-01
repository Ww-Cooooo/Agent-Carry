import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildStartupCapsule, inspectStartupCapsule } from "./startup-capsule-contract.mjs";
import { inspectCrossSessionSignalStartup } from "./cross-session-signal-transaction.mjs";
import { syncStartupCapsule } from "./sync-startup-capsule.mjs";

export const modelVisibleStartupFiles = Object.freeze(["AGENTS.md", "BOOTSTRAP.md", "core/maps/root-map.toml"]);

function startupRepairReport() {
  return Object.freeze({
    state: "repaired",
    attempt_count: 1,
    impact: "只重建了启动胶囊这一份派生文件。",
    data_state: "实例清单、用户资产和其他文件没有改动。",
    recoverability: "新胶囊已经按正式清单生成并严格回读通过。",
    still_usable: "普通启动和其他能力可以继续。",
    next_step: "无需额外操作；继续当前任务即可。",
    user_summary: "发现启动胶囊与正式清单不一致，已在本机自动重建并验证通过；实例数据没有改动，现在继续启动。",
  });
}

function startupFallbackReport({ repairAttempted }) {
  return Object.freeze({
    state: "fallback-active",
    attempt_count: repairAttempted ? 1 : 0,
    impact: "启动胶囊暂未恢复；本次改用严格清单生成的最小只读启动投影。",
    data_state: "实例清单和用户资产没有改动；原胶囊已保留或恢复。",
    recoverability: "问题仍局限在启动胶囊，可稍后单独重建。",
    still_usable: "普通对话、查看信息和不需要持久写入的任务可以继续。",
    next_step: "继续当前任务；准备持久保存、升级或外发前，让 Agent 只重试启动胶囊修复。",
    user_summary: "启动胶囊暂未修复，但正式清单有效；我已切换到最小只读启动方式继续，用户数据没有改动。持久变更前会先重试胶囊修复。",
  });
}

const allowedSignalFields = ["decision", "reason", "operationId", "sourceRevision", "projectionRevision", "nextWakeupAt", "nextWakeupRef",
  "deferredSignalId", "signalId", "routeId", "selectionPolicy", "overflow", "scheduledCount", "bodyReads"];

function signalSummary(root) {
  const signal = inspectCrossSessionSignalStartup(root);
  if (signal.decision === "startup-recovery-required") {
    return Object.freeze({
      decision: "startup-signal-degraded",
      reason: signal.reason,
      affectedScope: "cross-session-reminders-only",
      ordinaryWorkAllowed: true,
      bodyReads: signal.bodyReads ?? 0,
      userSummary: "跨会话提醒暂未初始化或需要修复；普通对话、当前任务、记忆召回和其他能力继续可用。",
      nextStep: "先继续当前任务；真正需要跨会话提醒时再初始化或修复这一项。",
    });
  }
  return Object.freeze(Object.fromEntries(allowedSignalFields
    .filter((field) => Object.hasOwn(signal, field))
    .map((field) => [field, signal[field]])));
}

function degradedStartupProjection(root, reason, { repairAttempted = false } = {}) {
  try {
    const expected = buildStartupCapsule(root);
    return Object.freeze({
      decision: "startup-degraded",
      reason,
      executable: false,
      persistence_limited: true,
      ...expected.values,
      repair: startupFallbackReport({ repairAttempted }),
      signal: signalSummary(root),
    });
  } catch {
    return null;
  }
}

function sourceRepairRequired(reason = "manifest-or-core-contract-invalid") {
  return Object.freeze({
    decision: "startup-repair-required",
    reason,
    repairable: false,
    executable: false,
    affected_scope: "identity-dependent-persistent-actions",
    ordinary_work_allowed: true,
    user_summary: "启动身份真源需要修复；我不会猜测身份或继续持久写入，但普通对话、解释问题和不依赖实例身份的只读协助仍可继续。",
    next_step: "先继续说明当前目标；准备保存、升级或外发前，只修复实例清单或核心身份这一处。",
  });
}

export function buildVerifiedStartupProjection(repository, { repairDerived = false, testFaultAfterInstall = false } = {}) {
  const root = resolve(repository);
  let capsule = inspectStartupCapsule(root);
  let repair = null;
  if (repairDerived && capsule.decision === "startup-repair-required" && capsule.repairable === true) {
    try {
      syncStartupCapsule(root, { write: true, testFaultAfterInstall });
      capsule = inspectStartupCapsule(root);
      if (capsule.decision !== "startup-capsule-valid") throw new Error("startup capsule did not validate after one repair attempt");
      repair = startupRepairReport();
    } catch {
      return degradedStartupProjection(root, "capsule-auto-repair-failed", { repairAttempted: true })
        ?? sourceRepairRequired();
    }
  }
  if (capsule.decision !== "startup-capsule-valid") {
    return degradedStartupProjection(root, capsule.reason) ?? sourceRepairRequired(capsule.reason);
  }
  return Object.freeze({ ...capsule, ...(repair ? { repair } : {}), signal: signalSummary(root) });
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
  else process.stdout.write(`${JSON.stringify(buildVerifiedStartupProjection(root, { repairDerived: true }))}\n`);
}
