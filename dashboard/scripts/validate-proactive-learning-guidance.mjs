import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (ref) => readFileSync(resolve(repository, ...ref.split("/")), "utf8").replaceAll("\r\n", "\n");
const assert = (condition, message) => { if (!condition) throw new Error(`Proactive learning guidance failed: ${message}`); };
const matches = (source, patterns, label) => {
  for (const pattern of patterns) assert(pattern.test(source), `${label}: ${pattern}`);
};

const assistant = read("assistant.toml");
const root = read("AGENTS.md");
const guidance = read("core/protocols/USER_GUIDANCE.md");
const lifecycle = read("core/protocols/ASSET_LIFECYCLE.md");
const readmeZh = read("README.md");
const readmeEn = read("README.en.md");
const packageSource = read("dashboard/package.json");
const componentMap = read("core/maps/component-map.toml");

// Protect the visible user journey, not every sentence used to describe it.
matches(assistant, [/proactive_learning\s*=\s*"[^"]+"/u, /formal_asset_activation\s*=\s*"explicit-user-or-verified-existing-approval-only"/u], "assistant policy");
matches(root, [/有价值的小阶段|任务结束/u, /🌱/u, /🧠/u, /USER_GUIDANCE\.md/u, /不能阻止已确认的业务结果/u], "root guidance");

const receipt = guidance.indexOf("### 2.2 使用与学习回执要短、独立、说真话");
const next = guidance.indexOf("### 2.3 回复最后必须回到用户下一步");
assert(receipt >= 0 && next > receipt, "learning receipts must appear before the real next step");
matches(guidance, [/这一步还在学习/u, /这一步我学到了/u, /task-closeout-(?:repair-required|degraded)/u, /不能阻止已确认的业务结果/u], "user guidance");

matches(lifecycle, [
  /Agent 主动发现/u,
  /留下/u,
  /先观察/u,
  /以后提醒/u,
  /不保存/u,
  /正式资产正文/u,
  /实例领域路线/u,
  /看板.*可重建投影/us,
  /一个 Skill 失败只影响该 Skill/u,
], "asset lifecycle");
assert(!/(十分钟|10\s*分钟).*?(失效|过期|必须)/u.test(lifecycle), "an arbitrary reply timer returned as a learning gate");

matches(readmeZh, [/你不必主动说/u, /当前宿主必须真的展示预览并等待你的回复/u, /🧠 这次用上了/u, /🌱 这一步我学到了/u, /👉 接下来/u], "Chinese README");
matches(readmeEn, [/You do not have to decide whether something is a memory/u, /current host first shows one exact, content-bound preview/u, /🧠 Used this time/u, /🌱 Learned this step/u, /👉 What's next/u], "English README");

assert(packageSource.includes('"check:proactive-learning": "node scripts/validate-proactive-learning-guidance.mjs"'), "package script is missing");
assert(packageSource.includes("npm run check:task-closeout"), "release path lost the closeout journey");
assert(componentMap.includes("dashboard/scripts/validate-proactive-learning-guidance.mjs"), "component ownership is missing");

console.log("Proactive learning guidance passed the visible learn, recall, receipt, and next-step journey without freezing copy wording.");
