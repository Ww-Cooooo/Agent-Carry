import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildStartupCapsule, inspectStartupCapsule } from "./startup-capsule-contract.mjs";
import { inspectCrossSessionSignalStartup } from "./cross-session-signal-transaction.mjs";
import { syncStartupCapsule } from "./sync-startup-capsule.mjs";

export const modelVisibleStartupFiles = Object.freeze(["AGENTS.md", "BOOTSTRAP.md", "core/maps/root-map.toml"]);

function startupRepairReport({ repaired }) {
  return Object.freeze(repaired ? {
    state: "repaired",
    attempt_count: 1,
    impact: "只重建了启动胶囊这一份派生文件。",
    data_state: "实例清单、用户资产和其他文件没有改动。",
    recoverability: "新胶囊已经按正式清单生成并严格回读通过。",
    still_usable: "普通启动和其他能力可以继续。",
    next_step: "无需额外操作；继续当前任务即可。",
    user_summary: "发现启动胶囊与正式清单不一致，已在本机自动重建并验证通过；实例数据没有改动，现在继续启动。",
  } : {
    state: "repair-failed",
    attempt_count: 1,
    impact: "启动胶囊仍未通过严格回读，本次普通启动暂未继续。",
    data_state: "实例清单和用户资产未改动；原胶囊已保留或恢复。",
    recoverability: "问题仍局限在启动胶囊，可再次检查真源和文件状态。",
    still_usable: "磁盘上的实例数据仍在，但当前启动路由不能把未验证状态当成有效。",
    next_step: "让 Agent 检查启动胶囊文件状态和正式清单，不要删除或猜测重建其他资产。",
    user_summary: "启动胶囊自动修复没有通过验证；实例清单和用户资产没有改动。请让 Agent 只检查启动胶囊和正式清单。",
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
      repair = startupRepairReport({ repaired: true });
    } catch {
      return Object.freeze({ decision: "startup-repair-required", reason: "capsule-auto-repair-failed",
        repairable: true, executable: false, repair: startupRepairReport({ repaired: false }) });
    }
  }
  if (capsule.decision !== "startup-capsule-valid") return capsule;
  const signal = inspectCrossSessionSignalStartup(root);
  const allowedSignalFields = ["decision", "reason", "operationId", "sourceRevision", "projectionRevision", "nextWakeupAt", "nextWakeupRef",
    "deferredSignalId", "signalId", "routeId", "selectionPolicy", "overflow", "scheduledCount", "bodyReads"];
  const signalSummary = Object.fromEntries(allowedSignalFields.filter((field) => Object.hasOwn(signal, field)).map((field) => [field, signal[field]]));
  return Object.freeze({ ...capsule, ...(repair ? { repair } : {}), signal: Object.freeze(signalSummary) });
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
