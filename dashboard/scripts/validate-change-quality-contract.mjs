import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { firstInstantiationWriteSet } from "./first-instantiation-transaction.mjs";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function fail(message) {
  throw new Error(`Formal change-quality contract check failed: ${message}`);
}

function source(ref) {
  return readFileSync(resolve(repository, ...ref.split("/")), "utf8");
}

function includesAll(ref, fragments) {
  const text = source(ref);
  for (const fragment of fragments) if (!text.includes(fragment)) fail(`${ref} is missing: ${fragment}`);
  return text;
}

function excludesAll(ref, fragments) {
  const text = source(ref);
  for (const fragment of fragments) if (text.includes(fragment)) fail(`${ref} still carries retired coupling: ${fragment}`);
}

const expectedFirstCreation = [
  "instance/manifest.toml",
  "instance/profile/approved-profile.md",
  "instance/maps/domain-map.toml",
];
if (JSON.stringify(firstInstantiationWriteSet) !== JSON.stringify(expectedFirstCreation)) {
  fail("first creation is no longer the three-file identity transaction");
}

includesAll("core/protocols/COMPONENT_CHANGE.md", [
  "充分且针对性的检查",
  "语义耦合",
  "一个失败不回滚",
  "可重建投影",
  "不能因为格式、空值或普通漂移单独阻断",
]);
excludesAll("core/protocols/COMPONENT_CHANGE.md", [
  "只要一次正式动作会同时改变两个或更多耐久文件",
  "必须由 Level 3 负责判断与验收",
]);

includesAll("core/guides/first-use-execution-gates.md", [
  "首次创建只原子写入三个",
  "模板身份和空态不是创建失败",
  "不能阻止普通对话、第一项任务、学习或其他无关能力",
  "模型等级是任务复杂度建议",
]);
excludesAll("core/guides/first-use-execution-gates.md", [
  "三张长期治理卡单独计为",
  "只有用户已经明确确认当前模型处于 Level 3",
]);

includesAll("core/protocols/INSTANCE_EVOLUTION_COMPATIBILITY.md", [
  "按动作影响自动命中",
  "不规定固定字段名",
  "只隔离当前项",
  "不做全量回归",
  "本机与私密内容没有进入公开",
]);

const maintenanceMap = source("core/maps/assistant-maintenance.toml");
function maintenanceRoute(id) {
  return maintenanceMap.match(new RegExp(`\\[\\[routes\\]\\]\\s*id = "${id}"[\\s\\S]*?(?=\\n\\[\\[routes\\]\\]|$)`, "u"))?.[0] ?? "";
}
const compatibilityRoute = maintenanceRoute("instance-evolution-compatibility");
if (!compatibilityRoute.includes('target = "core/protocols/INSTANCE_EVOLUTION_COMPATIBILITY.md"')
  || !compatibilityRoute.includes("实例持久变更")
  || !compatibilityRoute.includes("自我学习形成资产")
  || !compatibilityRoute.includes("实例升级兼容")) {
  fail("durable instance changes do not converge on the shared compatibility agreement");
}
if (!maintenanceRoute("template-upgrade").includes("同时加载实例持续变化兼容协定")) {
  fail("the mother-template upgrade route does not load the shared compatibility agreement");
}
const dashboardActions = JSON.parse(source("dashboard/src/generated/dashboard-actions.json"));
const upgradeAction = dashboardActions.find((action) => action.action_id === "instance.upgrade-template");
if (!upgradeAction?.request.includes("core/protocols/INSTANCE_EVOLUTION_COMPATIBILITY.md")
  || !upgradeAction.request.includes("保留、适配、重连、重建或局部隔离")) {
  fail("the executable upgrade request does not use the shared compatibility agreement");
}

includesAll("core/protocols/TASK_ORCHESTRATION_SOP.md", [
  "普通任务、同一 Agent 内的连续工作和简单验证不创建任务包",
  "默认只创建一个 `TASK.md`",
  "才再写一个 `RESULT.md`",
  "一个子任务失败只影响该子任务",
]);
excludesAll("core/protocols/TASK_ORCHESTRATION_SOP.md", [
  "00-START-HERE.md",
  "10-CONTEXT.md",
  "result/EVIDENCE.md",
]);

includesAll("BOOTSTRAP.md", [
  "普通对话、自然语言召回、学习和不依赖提醒的任务继续",
  "单项保存失败只影响这一项",
  "`👉`",
]);

const lifecycle = source("core/maps/domain-lifecycle.toml");
const instantiationBlock = lifecycle.match(/\[\[routes\]\]\s*id = "instantiation"[\s\S]*?(?=\n\[\[routes\]\]|$)/u)?.[0] ?? "";
if (!instantiationBlock.includes("minimum_level = 1") || !instantiationBlock.includes("explicit-complete-preview-before-write")) {
  fail("instantiation route still treats a model label as an authorization gate");
}

const packageRoot = JSON.parse(source("dashboard/package.json"));
if (packageRoot.scripts.build.includes("check:change-quality") || packageRoot.scripts.build.includes("check:release")) {
  fail("ordinary build still replays maintenance or release audits");
}
if (!packageRoot.scripts.build.includes("check:actions") || !packageRoot.scripts.build.includes("check:journeys")) {
  fail("ordinary build lost its compact user-journey checks");
}

process.stdout.write(JSON.stringify({
  decision: "change-quality-contract-passed",
  first_creation_core_files: expectedFirstCreation.length,
  task_handoff_default_files: 1,
  ordinary_build_uses_release_audit: false,
  failure_scope: "local",
}) + "\n");
