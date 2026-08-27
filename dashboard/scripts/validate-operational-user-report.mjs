import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { operationalUserReport, withOperationalUserReport } from "./operational-user-report.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const requiredFields = ["impact", "data_state", "recoverability", "still_usable", "next_step", "user_summary"];

function assert(condition, message) {
  if (!condition) throw new Error(`Operational user report self-test failed: ${message}`);
}

function assertReport(report, label) {
  assert(report && requiredFields.every((field) => typeof report[field] === "string" && report[field].length > 0),
    `${label} did not contain the complete natural-language report`);
}

for (const [label, file] of [
  ["learning capture", "learning-capture-cli.mjs"],
  ["learning promotion", "learning-promotion-cli.mjs"],
  ["cross-session signal", "cross-session-signal-cli.mjs"],
]) {
  const run = spawnSync(process.execPath, [resolve(scriptDir, file)], { encoding: "utf8", windowsHide: true });
  const source = (run.stdout || run.stderr).trim();
  const parsed = JSON.parse(source);
  assert(run.status === 2 && String(parsed.decision).endsWith("-denied"), `${label} CLI did not preserve its machine failure decision`);
  assertReport(parsed.userReport, label);
}

const recovery = withOperationalUserReport({ decision: "operation-recovery-required", executable: false }, { operation: "operation" });
assertReport(recovery.userReport, "recovery state");
assert(recovery.userReport.data_state.includes("恢复证据") && recovery.userReport.next_step.includes("继续"),
  "recovery guidance did not preserve evidence or recommend a bounded next action");

const existing = Object.freeze({
  impact: "局部影响。", data_state: "数据保留。", recoverability: "可以恢复。",
  still_usable: "其他能力可用。", next_step: "继续当前任务。", user_summary: "已自动修复并继续。",
});
const reused = operationalUserReport({ decision: "operational-derived-state-repaired", userReport: existing }, { operation: "operation" });
assertReport(reused, "automatic repair");
assert(reused.user_summary === existing.user_summary, "an explicit automatic-repair report was replaced by generic wording");
assert(operationalUserReport({ decision: "operation-complete" }, { operation: "operation" }) === null,
  "healthy success was burdened with an unnecessary failure report");

console.log("Operational user reports passed three CLI failures, recovery guidance, automatic-repair preservation, and healthy-success silence.");
