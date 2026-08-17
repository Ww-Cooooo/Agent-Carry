import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const dashboardDirectory = resolve(scriptDirectory, "..");
const repositoryDirectory = resolve(dashboardDirectory, "..");

function source(relativePath) {
  return readFileSync(resolve(repositoryDirectory, relativePath), "utf8");
}

function fail(message) {
  throw new Error(`First-run contract check failed: ${message}`);
}

function requireFragments(relativePath, fragments) {
  const text = source(relativePath);
  for (const fragment of fragments) {
    if (!text.includes(fragment)) fail(`${relativePath} is missing: ${fragment}`);
  }
}

function forbidFragments(relativePath, fragments) {
  const text = source(relativePath);
  for (const fragment of fragments) {
    if (text.includes(fragment)) fail(`${relativePath} still contains obsolete handoff text: ${fragment}`);
  }
}

function routeBlock(routeId) {
  const routes = source("core/maps/domain-lifecycle.toml").split("[[routes]]").slice(1);
  const route = routes.find((block) => block.includes(`id = "${routeId}"`));
  if (!route) fail(`core/maps/domain-lifecycle.toml is missing route: ${routeId}`);
  return route;
}

function requireRouteLevel(routeId, expectedLevel) {
  const route = routeBlock(routeId);
  if (!route.includes(`minimum_level = ${expectedLevel}`)) {
    fail(`route ${routeId} must use minimum_level = ${expectedLevel}`);
  }
}

function requireRouteFragments(routeId, fragments) {
  const route = routeBlock(routeId);
  for (const fragment of fragments) {
    if (!route.includes(fragment)) fail(`route ${routeId} is missing: ${fragment}`);
  }
}

function forbidRouteFragments(routeId, fragments) {
  const route = routeBlock(routeId);
  for (const fragment of fragments) {
    if (route.includes(fragment)) fail(`route ${routeId} contains an early trigger: ${fragment}`);
  }
}

requireFragments("core/guides/instantiation-guide.md", [
  "## 安装成功后的第一条回复（强制）",
  "接下来，我带你把这份空白模板创建成真正属于你的 Agent Carry 助手",
  "首页右侧的“第一次使用”卡片",
  "两个入口会进入同一套创建流程",
  "第一次接触 Agent",
  "已经用过一些",
  "经常使用 Agent",
  "生成创建指令",
  "交回当前 Agent",
  "整体状态是 `[完整完成或有限完成]`",
  "看板入口名称是 `[实际名称]`，位于 `[实际位置]`",
  "完成渐进访谈、看过完整预览并得到你的明确确认前",
  "直接告诉我你的职业、目前最困扰或最耗时间的事情，以及你希望 AI 帮你完成什么",
  "不得把“需要 Level 3”当成安装后不引导用户的理由",
]);

requireFragments("INSTALL.md", [
  "安装成功后的第一条回复",
  "不得用安装报告结束对话",
  "看板“创建我的助手”和当前聊天两种入口",
  "首页右侧的“第一次使用”卡片",
  "生成创建指令",
  "交回当前 Agent／聊天",
  "展示完整预览并得到用户明确确认前",
  "第一条用户回复的主要任务是带用户开始创建助手",
]);

requireFragments("START-HERE.txt", [
  "不要用安装位置、版本、提交、快捷方式或安全清单作为主要回复后结束",
  "不看或打不开看板也可以直接在当前聊天继续",
  "生成创建指令",
  "展示完整预览并得到我的明确确认前",
  "再只问我这一个选择",
]);

requireFragments("BOOTSTRAP.md", [
  "不得用安装报告、版本／路径清单或一句没有解释的交流方式问题结束对话",
  "first-run-guidance",
  "Level 3 的 `instantiation`",
  "生成创建指令",
  "怎样从首页右侧的“第一次使用”卡片进入“创建我的助手”",
  "用户不知道时允许直接说职业、困难和目标",
]);

requireFragments("README.md", [
  "安装完成后，Agent 会直接带你创建助手",
  "两种入口不需要重复回答",
  "生成创建指令",
  "发回当前 Agent／聊天",
  "你只需回复 `1`、`2`、`3`",
]);

requireFragments("core/maps/root-map.toml", ["安装后第一条回复", "创建我的助手"]);
requireFragments("core/maps/domain-lifecycle.toml", ["安装后第一条回复", "创建我的助手", "first-run-guidance"]);
requireRouteLevel("first-run-guidance", 1);
requireRouteLevel("instantiation", 3);
requireRouteFragments("first-run-guidance", ["创建我的助手", "选择通用或领域", "先帮我判断"]);
requireRouteFragments("instantiation", ["已完成交流方式与助手方向两项首次选择", "开始渐进访谈", "生成完整预览"]);
forbidRouteFragments("instantiation", ["\"创建我的助手\"", "\"选择通用或领域\"", "\"先帮我判断\"", "\"开始实例化\""]);
requireFragments("core/maps/trigger-registry.toml", [
  'id = "first-instantiation"',
  "level-1-first-run-guidance-must-welcome-and-collect-both-guidance-mode-and-direction-intent",
  "user-explicitly-confirms-the-complete-preview-before-write",
]);
requireFragments("dashboard/src/components/dashboard/Views.tsx", ["第一次使用", "创建我的助手"]);
requireFragments("dashboard/src/components/dashboard/OnboardingDialog.tsx", [
  'label: "第一次接触 Agent"',
  'label: "已经用过一些"',
  'label: "经常使用 Agent"',
  "生成创建指令",
]);
requireFragments("core/upgrade/release-manifest-1.1.1.toml", [
  "post-install-first-response-onboarding-valid",
  "first-run-guidance-level-route-valid",
  "first-run-instantiation-trigger-boundary-valid",
  "dashboard-generated-instruction-handoff-valid",
  "dashboard-and-chat-first-run-paths-aligned",
]);

forbidFragments("INSTALL.md", ["完成后只告诉我", "## 8. 安装完成报告"]);
forbidFragments("START-HERE.txt", ["以及我唯一需要回答的下一步"]);
forbidFragments("README.md", ["完成后告诉我安装位置、看板入口、实际打开结果"]);
forbidFragments("BOOTSTRAP.md", ["第一条面向用户的话先让用户选择当前舒服的交流方式"]);
forbidFragments("core/guides/instantiation-guide.md", ["用一两行说明即可"]);
forbidFragments("INSTALL.md", ["最后才用一两行附上必要安装事实"]);
forbidFragments("START-HERE.txt", ["在我确认交流方式和最终方向前保持模板空态"]);

console.log("First-run contract check passed: Level 1 welcome + Dashboard/chat handoff + Level 3 confirmed instantiation are aligned.");
