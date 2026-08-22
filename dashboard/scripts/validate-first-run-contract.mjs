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

function requireRouteTarget(routeId, expectedTarget) {
  const route = routeBlock(routeId);
  if (!route.includes(`target = "${expectedTarget}"`)) {
    fail(`route ${routeId} must target ${expectedTarget}`);
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

requireFragments("assistant.toml", [
  'startup_reads = ["instance/signals/control.toml", "instance/maps/signal-map.toml"]',
  "projections` is the complete transaction output set, not a startup read list",
  "not-at-startup-unless-signal-map-next_wakeup_at-is-due",
]);

requireFragments("BOOTSTRAP.md", [
  "[signals].startup_reads",
  "[signals].projections",
  "不是启动读取清单",
  "日期未到时不得读取 `instance/maps/time-trigger-map.toml`",
]);

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
  "A. 安装完成后的回复门",
  "B. 首项任务开始前的实例化交接门",
  "用户明确确认当前模型处于 Level 3",
  "C. 实例化写入门",
  'asset_kind = "task-family"',
  "尚未做过真实任务时，看板的资产计数通常全部为 0",
  "instance/profile/approved-profile.md",
  "不得让正式实例继续引用会被模板升级替换的 `instance/profile/README.md`",
  "D. 第一项真实任务结束门",
]);

requireFragments("core/guides/first-use-execution-gates.md", [
  "命中检查点时必须重新打开相应一节",
  "## A. 安装完成后的回复门",
  "三种路线有完整解释",
  "不能替用户选择",
  "不把 `.git` 元数据、缓存和临时文件混入数量",
  "## B. 首项任务开始前的实例化交接门",
  "模板态可以讨论首项任务能得到什么结果",
  "不能提前索取当天金额、真实业务文件",
  "只有用户已经明确确认当前模型处于 Level 3",
  "不能根据模型品牌、价格、宿主标签或自身感觉猜测等级",
  "## C. 实例化写入门",
  'asset_kind = "task-family"',
  "禁止",
  "三张状态为 `active` 的治理卡都有带时区的 `schedule_anchor_at` 和 `next_due_at`",
  "当前宿主的一份最小档案",
  "instance/skills/requirements.toml",
  "不得扫描全部 Skill",
  'status = "current"',
  'status = "deferred"',
  "快照中的 `assets` 计数等于正式资产文件数",
  "instance/profile/approved-profile.md",
  "禁止写入用户正文",
  "资产计数通常全部为 0",
  "## D. 第一项真实任务结束门",
  "结果正确不自动授权新资产",
  "以后继续使用／保存这套方法",
  'maturity = "practiced"',
  "不能只在原任务族上追加 `related_asset_ids`",
  "不能复用实例创建时间、旧快照时间或治理锚点",
  "不要填十五段空样板",
  "这次方法尚未保存进 Agent Carry",
]);

requireFragments("core/guides/skill-init-guide.md", [
  "极小需求判断",
  "这不是宿主 Skill 全量盘点，也不授权安装任何东西",
  "模板的 `status = \"scan-after-instantiation\"` 只是一条待完成标记",
]);

requireFragments("core/protocols/ASSET_LIFECYCLE.md", [
  "不以章节数量证明认真",
  "不能复用实例创建时间、治理锚点或旧快照时间",
  "不能只给它追加关联 ID 代替正式路线",
  "沿用旧 `generated_at`／`source_digest` 不算重建完成",
]);

requireFragments("core/schemas/dashboard-snapshot.schema.md", [
  "跨平台确定性口径",
  "排除文件名为 `README.md`",
  "Unicode NFC",
  "普通启动",
  "identity_ref",
  "`instance_id` 的 UTF-8 SHA-256 前 12 位",
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
  "就在发送第一条用户回复前",
  "A. 安装完成后的回复门",
  "ac_kind",
  "匿名 `ac_ref`",
  "若当前宿主不能可靠读取地址栏",
]);

requireFragments("START-HERE.txt", [
  "不要用安装位置、版本、提交、快捷方式或安全清单作为主要回复后结束",
  "不看或打不开看板也可以直接在当前聊天继续",
  "生成创建指令",
  "展示完整预览并得到我的明确确认前",
  "再只问我这一个选择",
  "准备给我第一条回复时",
  "不要替我选择",
]);

requireFragments("BOOTSTRAP.md", [
  "不得用安装报告、版本／路径清单或一句没有解释的交流方式问题结束对话",
  "first-run-guidance",
  "Level 3 的 `instantiation`",
  "生成创建指令",
  "怎样从首页右侧的“第一次使用”卡片进入“创建我的助手”",
  "用户不知道时允许直接说职业、困难和目标",
  "A. 安装完成后的回复门",
  "B. 首项任务开始前的实例化交接门",
  "等待用户明确确认当前模型处于 Level 3",
  "C. 实例化写入门",
  "不预先制造记忆、能力、SOP、经验、学习建议或普通待办",
]);

requireFragments("README.md", [
  "安装完成后，Agent 会直接带你创建助手",
  "两种入口不需要重复回答",
  "生成创建指令",
  "发回当前 Agent／聊天",
  "你只需回复 `1`、`2`、`3`",
  "不要替我选择",
  "首次使用回复门重新检查第一条回复",
]);

requireFragments("core/maps/root-map.toml", ["安装后第一条回复", "创建我的助手", "模板态准备开始首项任务"]);
requireFragments("core/maps/domain-lifecycle.toml", ["安装后第一条回复", "创建我的助手", "first-run-guidance", "模板态准备开始首项任务"]);
requireRouteLevel("first-run-guidance", 1);
requireRouteLevel("instantiation", 3);
requireRouteTarget("first-run-guidance", "core/guides/instantiation-guide.md");
requireRouteTarget("instantiation", "core/guides/first-use-execution-gates.md");
requireRouteFragments("first-run-guidance", ["创建我的助手", "选择通用或领域", "先帮我判断"]);
requireRouteFragments("instantiation", ["已完成交流方式与助手方向两项首次选择", "开始渐进访谈", "生成完整预览"]);
forbidRouteFragments("instantiation", ["\"创建我的助手\"", "\"选择通用或领域\"", "\"先帮我判断\"", "\"开始实例化\""]);
requireFragments("core/maps/trigger-registry.toml", [
  'id = "first-instantiation"',
  "level-1-must-reopen-the-post-install-reply-gate-before-first-response",
  "before-real-task-input-reopen-the-instantiation-handoff-gate",
  "user-confirmed-level-3",
  "user-explicitly-confirms-the-complete-preview-before-an-allowlisted-write",
  "user-confirms-the-result-correct-user-asks-to-continue-or-save-the-method",
]);
requireFragments("core/maps/domain-work.toml", [
  "结果正确",
  "以后可以继续使用",
  "保存这套方法",
  "用户确认结果正确",
]);
requireFragments("core/maps/evolution-model.toml", [
  "结果正确",
  "以后可以继续使用",
  "保存这套方法",
]);
requireFragments("instance/maps/domain-map.toml", [
  'asset_kind = "task-family"',
  'state = "on-demand"',
  "不表示能力或SOP已经形成",
  "没有正式文件的计划、候选或任务族不得计入看板资产",
]);
requireFragments("core/schemas/map-entry.schema.md", [
  'asset_kind = "task-family"',
  "非资产路由标记",
  "不能进入资产生命周期、资产计数、看板资产数组",
]);
requireFragments("core/protocols/CONTEXT_ROUTING.md", [
  'asset_kind = "task-family"',
  "不进入资产匹配、成熟度或看板计数",
]);
requireFragments("instance/profile/README.md", [
  'asset_kind = "task-family"',
  "只有任务真实完成、结果通过核对并获得相应保存授权后",
  "本文件只是模板拥有的目录说明",
  "instance/profile/approved-profile.md",
]);
requireFragments("core/protocols/ASSET_LIFECYCLE.md", [
  "结果正确",
  "以后可以继续使用",
  "只确认结果正确不自动授权新资产",
  "maturity=practiced",
]);
requireFragments("docs/snapshot-contract.md", [
  "真实存在、类型一致的正式资产正文",
  "初始任务族、规划路线、聊天候选和只有地图条目而没有正式资产正文的目标",
  "各资产数组长度与 `assets` 计数一致",
]);
requireFragments("core/schemas/dashboard-snapshot.schema.md", [
  "初始任务族、计划路线、聊天候选或不存在正文的地图条目",
  "稳定 ID 和 `kind` 与目标数组一致",
]);
requireFragments("core/maps/dashboard-actions.toml", [
  'target = "core/guides/first-use-execution-gates.md"',
  "B. 首项任务开始前的实例化交接门",
  "C. 实例化写入门",
  "不得在模板态索取首项任务的当天金额、真实文件或开始执行",
  "不得在用户确认 Level 3 前进入实例结构设计",
  "不得把初始任务族、计划路线、聊天候选或缺失正文的地图条目计为正式资产",
  "三张治理卡按真实创建时间计算的首轮排期",
]);
requireFragments("dashboard/src/components/dashboard/Views.tsx", ["第一次使用", "创建我的助手", "当前助手 ·"]);
requireFragments("dashboard/src/Dashboard.tsx", ["rail-instance-card", "当前助手：", "尚未创建助手", "这个入口和实际加载的助手不一致", "已暂停复制执行指令"]);
requireFragments("dashboard/src/lib/identity.ts", ["ac_kind", "ac_ref", "ac_version", "templateBecomingInstance", "legacy-instance"]);
requireFragments("dashboard/src/components/dashboard/OnboardingDialog.tsx", [
  'label: "第一次接触 Agent"',
  'label: "已经用过一些"',
  'label: "经常使用 Agent"',
  "生成创建指令",
]);
requireFragments("dashboard/src/lib/data.ts", [
  'target: "core/guides/first-use-execution-gates.md"',
  "B. 首项任务开始前的实例化交接门",
  "C. 实例化写入门",
  "function assetReliability(item: any): string",
  'status === "review"',
  'status === "provisional"',
  "reliability: assetReliability(s)",
  "reliability: assetReliability(c)",
  "不得在模板态索取首项任务的当天金额、真实文件或开始执行",
  "不得在用户确认 Level 3 前进入实例结构设计",
  "首个真实任务前资产计数通常全部为 0",
  "不得把任务族、计划路线或缺失正文的条目计入看板资产",
  "正式实例按 Snapshot Schema 从 instance_id 生成 ac- 加 SHA-256 前 12 位的匿名稳定引用",
]);
requireFragments("core/upgrade/release-manifest-1.2.0.toml", [
  "replace_instance_guides",
  "instance/profile/README.md",
  "instance-directory-guides-current",
  "legacy-profile-readme-to-approved-profile",
  "normalize-task-family-route-state",
  "formal-change-quality-route-hits-before-durable-write",
  "ordinary-read-only-does-not-load-full-change-protocol",
  "target-file-allowlist-excludes-development-junk-and-private-maintainer-content",
  "formal-active-provisional-review-assets-have-direct-kind-matching-routes",
]);

forbidFragments("INSTALL.md", ["完成后只告诉我", "## 8. 安装完成报告"]);
forbidFragments("START-HERE.txt", ["以及我唯一需要回答的下一步"]);
forbidFragments("README.md", ["完成后告诉我安装位置、看板入口、实际打开结果"]);
forbidFragments("BOOTSTRAP.md", ["第一条面向用户的话先让用户选择当前舒服的交流方式"]);
forbidFragments("core/guides/instantiation-guide.md", ["用一两行说明即可"]);
forbidFragments("INSTALL.md", ["最后才用一两行附上必要安装事实"]);
forbidFragments("START-HERE.txt", ["在我确认交流方式和最终方向前保持模板空态"]);

console.log("First-run contract check passed: Level 1 welcome + Dashboard/chat handoff + Level 3 confirmed instantiation are aligned.");
