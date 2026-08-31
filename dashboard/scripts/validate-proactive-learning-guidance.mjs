import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function read(relative) {
  return readFileSync(resolve(repository, ...relative.split("/")), "utf8").replaceAll("\r\n", "\n");
}

function expect(condition, message) {
  if (!condition) throw new Error(`Proactive learning guidance validation failed: ${message}`);
}

function includesAll(source, fragments, label) {
  for (const fragment of fragments) expect(source.includes(fragment), `${label} is missing: ${fragment}`);
}

const assistant = read("assistant.toml");
const rootInstructions = read("AGENTS.md");
const userGuidance = read("core/protocols/USER_GUIDANCE.md");
const lifecycle = read("core/protocols/ASSET_LIFECYCLE.md");
const evolutionGuide = read("docs/asset-evolution.md");
const readmeZh = read("README.md");
const readmeEn = read("README.en.md");
const runtime = read("dashboard/scripts/learning-capture-transaction.mjs");
const runtimeValidator = read("dashboard/scripts/validate-learning-capture-transaction.mjs");
const closeoutRuntime = read("dashboard/scripts/task-closeout-contract.mjs");
const closeoutValidator = read("dashboard/scripts/validate-task-closeout-contract.mjs");
const packageSource = read("dashboard/package.json");
const componentMap = read("core/maps/component-map.toml");

includesAll(assistant, [
  'proactive_learning = "at-meaningful-substages-and-task-end-notice-reusable-habits-corrections-and-methods-report-observed-versus-saved-and-recallable-in-separate-brief-receipts-with-fixed-sprout-heading-finding-status-and-future-use-icons-then-place-them-before-final-plain-language-user-action-guidance-that-asks-whether-they-should-be-kept-when-a-real-learning-decision-remains-without-asking-the-user-to-classify-the-asset"',
  'formal_asset_activation = "explicit-user-or-verified-existing-approval-only"',
], "assistant product authority");

includesAll(rootInstructions, [
  "任务中一个有价值的小阶段或任务结束",
  "尚未持久保存",
  "写入／回读／自然语言召回",
  "这一步我学到了",
  "不把内部资产分类交给用户",
  "即使用户上一句话已经说“记住”",
  "仍须由当前宿主真实展示精确预览并等待用户选择",
  "`🧠` 使用回执和 `🌱` 学习回执都放在它之前",
  "task-closeout-contract.mjs",
  "--template",
  "宿主不能运行脚本时按同四项事实透明降级自检",
  "绝不能扣住已经完成的业务结果或迫使任务重跑",
], "root progressive guidance");

includesAll(userGuidance, [
  "Agent 负责发现重复习惯、可复用方法和重要纠正，也负责判断它更适合成为记忆、能力、固定流程还是经验",
  "用户已经说“以后都这样”时，不再用四个选项重复询问",
  "再只问一句“按这个范围留下，可以吗？”",
  "得到这一次真实选择后，才执行授权范围内的写入",
  "使用与学习回执要短、独立、说真话",
  "> **🧠 这次用上了**",
  "| 🌱 这一步还在学习 | 内容 |",
  "| 🌱 这一步我学到了 | 内容 |",
  "| 💡 新发现 |",
  "| 📌 当前状态 |",
  "⏳ 还在学习",
  "✅ 已保存并验证可召回",
  "| ➡️ 以后会 |",
  "已按你的选择留作观察，暂不自动使用",
  "现场已保留，但召回验证未闭合；暂不说学会",
  "回复最后必须回到用户下一步",
  "> **👉 接下来**",
  "先回到用户当前的总体目标",
  "不能把子步骤的完成状态当成总体完成状态",
  "某一项不用再确认",
  "只突出一项首选行动",
  "不能只问“还需要什么帮助”",
  "复杂任务在发送前闭合一次收尾",
  "task-closeout-repair-required",
  "task-closeout-degraded",
  "不能阻止已确认的业务结果交付",
  "宿主确实不能运行本地 Node 脚本时",
], "novice-facing guidance");
expect(userGuidance.indexOf("### 2.2 使用与学习回执要短、独立、说真话")
  < userGuidance.indexOf("### 2.3 回复最后必须回到用户下一步")
  && userGuidance.indexOf("### 2.3 回复最后必须回到用户下一步")
    < userGuidance.indexOf("## 3. 复用 Agent 已经知道的信息"),
"learning receipts are not ordered before the final user-action guidance");
expect(!userGuidance.includes("再执行授权范围内的写入。模型自己推断"), "explicit request still permits a write before the focused preview choice");

includesAll(lifecycle, [
  "Agent 主动发现，用户只判断“要不要以后继续”",
  "在当前小阶段结果已经交付或修正完成的自然停点",
  "阶段报告与持久决定是两件事",
  "只有正式正文与路线原子写入、严格回读、日常说法召回全部通过后",
  "不要问“要不要形成 SOP、能力还是经验”",
  "用户原消息已经明确说“记住这个”“以后这样做”时，也必须进入上面的精确预览",
  "用户选择“不保存”或没有回应时，不产生持久候选",
], "asset lifecycle");

includesAll(evolutionGuide, [
  "AI Carry 负责在有价值的小阶段或任务结束时发现重复习惯、可复用方法和重要纠正",
  "用户无需回答“这是记忆、能力还是 SOP”",
  "如果有真实价值，Agent 不应等待用户准确说“请形成 SOP”",
  "只有正式资产写入、回读和日常说法召回都通过",
  "不创建候选、正式资产、信号或提醒",
  "回执不会成为整次回复的结尾",
], "public evolution guide");

includesAll(readmeZh, [
  "你不必主动说“形成记忆或 SOP”",
  "它会在真实任务的自然停点说明发现了什么",
  "你不需要判断“这应该叫记忆、能力、经验还是 SOP”",
  "当前宿主必须真的展示预览并等待你的回复",
  "🧠 这次用上了",
  "🌱 这一步还在学习",
  "🌱 这一步我学到了",
  "👉 接下来",
], "Chinese README");
includesAll(readmeEn, [
  "At a natural checkpoint in real work, the Agent explains what it noticed",
  "You do not have to decide whether something is a memory, capability, experience, or SOP",
  "the current host must actually show the preview and wait for your reply",
  "🧠 Used this time",
  "🌱 Still learning",
  "🌱 Learned this step",
  "👉 What's next",
], "English README");

includesAll(runtime, [
  "export function createLearningCaptureChoiceChallenge",
  "export function confirmLearningCaptureChoice",
  "export function closeLearningCaptureWithoutResponse",
  "export function buildLearningCaptureTransactionPlan",
  "export function validateLearningCaptureTransactionPlan",
  "export function rollbackPersistentLearningCaptureTransaction",
  'decision: "learning-capture-direct-formal-host-transaction-preview"',
], "learning capture runtime");
includesAll(runtimeValidator, [
  "testNoSelfSignedDirectUserBypassAndStandardKeep();",
  "testNoResponseAndDiscard();",
  "testKeepWritesExactFormalRouteAndSnapshots();",
  "testObserveCommitIdempotenceAndDuplicate();",
  "testInterruptedWriteRecoveryAndRollback();",
], "learning capture regression scenarios");

includesAll(closeoutRuntime, [
  "export function evaluateTaskCloseout",
  "export function degradedTaskCloseout",
  "export function taskCloseoutInputTemplate",
  'decision: "task-closeout-degraded"',
  "businessDeliveryAllowed: true",
  "receipt_visible_at_handoff",
  "next-is-not-final-visible-block",
], "task closeout runtime");
includesAll(closeoutValidator, [
  "the incident-shaped omission was accepted",
  "serialized context-compaction facts changed the closeout result",
  "a simple task was burdened with empty use, learning, or file receipts",
  "invalid closeout metadata did not degrade locally while preserving the business result",
  "the real stdin CLI path did not accept the corrected closeout",
  "the local CLI did not expose a bounded fill-in template",
], "task closeout focused regression scenarios");

includesAll(packageSource, [
  '"check:proactive-learning": "node scripts/validate-proactive-learning-guidance.mjs"',
  '"check:task-closeout": "node scripts/validate-task-closeout-contract.mjs"',
  "npm run check:proactive-learning",
  "npm run check:task-closeout",
], "dashboard build gate");
expect(componentMap.includes("dashboard/scripts/validate-proactive-learning-guidance.mjs"), "component registry does not own the proactive-learning gate");
expect(componentMap.includes("dashboard/scripts/task-closeout-contract.mjs")
  && componentMap.includes("dashboard/scripts/validate-task-closeout-contract.mjs"),
"component registry does not own the task-closeout runtime and focused gate");

console.log("Proactive learning guidance validation passed.");
