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
const packageSource = read("dashboard/package.json");
const componentMap = read("core/maps/component-map.toml");

includesAll(assistant, [
  'proactive_learning = "at-natural-task-checkpoints-notice-reusable-habits-corrections-and-methods-then-ask-in-plain-language-whether-they-should-be-kept-without-asking-the-user-to-classify-the-asset"',
  'formal_asset_activation = "explicit-user-or-verified-existing-approval-only"',
], "assistant product authority");

includesAll(rootInstructions, [
  "任务结束只在出现真实学习价值时进入资产生命周期",
  "在自然停点使用用户当前交流语言、用容易理解的话说明发现与未来用途",
  "不把内部资产分类交给用户",
  "即使用户上一句话已经说“记住”",
  "仍须由当前宿主真实展示精确预览并等待用户选择",
], "root progressive guidance");

includesAll(userGuidance, [
  "Agent 负责发现重复习惯、可复用方法和重要纠正，也负责判断它更适合成为记忆、能力、固定流程还是经验",
  "用户已经说“以后都这样”时，不再用四个选项重复询问",
  "再只问一句“按这个范围留下，可以吗？”",
  "得到这一次真实选择后，才执行授权范围内的写入",
], "novice-facing guidance");
expect(!userGuidance.includes("再执行授权范围内的写入。模型自己推断"), "explicit request still permits a write before the focused preview choice");

includesAll(lifecycle, [
  "Agent 主动发现，用户只判断“要不要以后继续”",
  "在当前结果已经交付或修正完成的自然停点",
  "不要问“要不要形成 SOP、能力还是经验”",
  "用户原消息已经明确说“记住这个”“以后这样做”时，也必须进入上面的精确预览",
  "用户选择“不保存”或没有回应时，不产生持久候选",
], "asset lifecycle");

includesAll(evolutionGuide, [
  "Agent Carry 负责在自然停点发现重复习惯、可复用方法和重要纠正",
  "用户无需回答“这是记忆、能力还是 SOP”",
  "如果有真实价值，Agent 不应等待用户准确说“请形成 SOP”",
  "不创建候选、正式资产、信号或提醒",
], "public evolution guide");

includesAll(readmeZh, [
  "你不必主动说“形成记忆或 SOP”",
  "它会在真实任务的自然停点说明发现了什么",
  "你不需要判断“这应该叫记忆、能力、经验还是 SOP”",
  "当前宿主必须真的展示预览并等待你的回复",
], "Chinese README");
includesAll(readmeEn, [
  "At a natural checkpoint in real work, the Agent explains what it noticed",
  "You do not have to decide whether something is a memory, capability, experience, or SOP",
  "the current host must actually show the preview and wait for your reply",
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

includesAll(packageSource, [
  '"check:proactive-learning": "node scripts/validate-proactive-learning-guidance.mjs"',
  "npm run check:proactive-learning",
], "dashboard build gate");
expect(componentMap.includes("dashboard/scripts/validate-proactive-learning-guidance.mjs"), "component registry does not own the proactive-learning gate");

console.log("Proactive learning guidance validation passed.");
