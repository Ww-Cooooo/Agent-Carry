import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { inspectInstanceComponentCompatibility, inspectInstanceComponents } from "./instance-component-contract.mjs";
import { parseSnapshotEnvelope } from "./snapshot-envelope.mjs";
import { validateSnapshotSemantics } from "./snapshot-semantics.mjs";
import { inspectStartupCapsule } from "./startup-capsule-contract.mjs";

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
  "query-startup-capsule.mjs",
  "模型上下文外",
  "原始 `assistant.toml`、`instance/manifest.toml`",
  "启动不得自行打开原始信号 TOML",
  "日期未到时不得读取时间索引",
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
  "记忆、能力、SOP、经验、学习候选、普通待办和 Skill 计数全部为 0",
  "三张长期治理卡单独计为",
  "instance/profile/approved-profile.md",
  "不得让正式实例继续引用会被模板升级替换的 `instance/profile/README.md`",
  "instance/validations/index.toml",
  "不得创建任何 `[[validations]]`",
  "instance/components/registry.toml",
  "胶囊已更新、验证索引仍是 template",
  "相同完整预览第二次执行",
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
  "instance/startup-capsule.toml",
  "instance/validations/index.toml",
  'record_count = 0',
  "不得把尚未执行的第一项任务",
  "generated_at` 使用本次真实实例化时间",
  "instance/components/registry.toml",
  'adoption_state = "current"',
  'revision = 1',
  "只有物理普通文件 `README.md` 和 `registry.toml`",
  "完整允许路径集合",
  "完整模板态",
  "governance = 3",
  "记忆、能力、SOP、经验、学习候选、普通待办和 Skill 计数全部为 0",
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
  "atomic-instance-identity-set",
  "validation-index-component-registry",
  "restore-the-complete-frozen-template-preimage",
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
  "空结果验证索引",
  "零组件注册表",
  "adoption_state=current、revision=1、component_count=0",
  "只有物理普通文件 README.md 和 registry.toml",
  "generated_at=本次原子实例化的带时区真实时间",
  "相同输入第二次执行不得刷新候选索引 generated_at",
  "不得把尚未执行的第一项任务伪造成记录",
  "相同输入第二次执行必须零变化",
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
  'import generatedDashboardActions from "../generated/dashboard-actions.json"',
  "generatedDashboardActions.map((action) => ({ ...action }))",
  "function assetReliability(item: any): string",
  'status === "review"',
  'status === "provisional"',
  "reliability: assetReliability(s)",
  "reliability: assetReliability(c)",
]);
requireFragments("dashboard/src/generated/dashboard-actions.json", [
  '"target": "core/guides/first-use-execution-gates.md"',
  "B. 首项任务开始前的实例化交接门",
  "C. 实例化写入门",
  "准备索取当天金额或真实文件前",
  "不得索取当天金额、真实业务文件或执行首项任务",
  "只有我已经明确确认当前模型处于 Level 3 才能进入实例结构设计",
  "快照中记忆、能力、SOP、经验、候选、待办和 Skill 计数都应为 0",
  "不能把候选任务、计划路线或缺失正文的条目算成资产",
  "正式实例按 Snapshot Schema 从 instance_id 生成 ac- 加 SHA-256 前 12 位的匿名稳定引用",
  "空结果验证索引",
  "零组件注册表",
  "adoption_state=current、revision=1、component_count=0",
  "只有物理普通文件 README.md 和 registry.toml",
  "generated_at=本次原子实例化的带时区真实时间",
  "相同输入第二次执行不得刷新候选索引 generated_at",
  "不得把尚未执行的第一项任务伪造成记录",
  "相同输入第二次执行必须零变化",
]);
requireFragments("core/schemas/instance-manifest.schema.md", [
  "validation.evidence_index_ref",
  "模板和新实例即使记录数为 0",
  "任一失败恢复整组前像",
]);
requireFragments("core/schemas/result-validation-evidence-index.schema.md", [
  "必须等于实例清单身份；模板为 `template`",
  "record_count`：必须等于实际 `[[validations]]` 数量",
]);
requireFragments("core/schemas/instance-component.schema.md", [
  "必须与严格实例清单一致；空模板为 `template`",
  "实例化、首次纳管、升级、迁移、修复",
  "严格发布审计",
  "自然语言用户报告",
]);
requireFragments("core/upgrade/release-manifest-1.4.1.toml", [
  'migrate = ["instance/manifest.toml", "instance/startup-capsule.toml", "instance/components/registry.toml"',
  '"instance/evolution/index.toml", "instance/validations/index.toml"]',
  "validation_overlap_note",
  "component_overlap_note",
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
requireFragments("core/upgrade/release-manifest-1.2.1.toml", [
  'release = "1.2.1"',
  'extension_manifest_schema = "1.0"',
  '"workspace/**"',
  "registered-workspace-paths-classified-without-recursive-guessing",
  "legacy-profile-and-task-family-migrations-apply-to-1.2.0-sources",
  "merged-instance-truth-rebuilds-public-and-dist-snapshots-byte-identically",
  "startup-budget-preserved",
]);

forbidFragments("INSTALL.md", ["完成后只告诉我", "## 8. 安装完成报告"]);
forbidFragments("START-HERE.txt", ["以及我唯一需要回答的下一步"]);
forbidFragments("README.md", ["完成后告诉我安装位置、看板入口、实际打开结果"]);
forbidFragments("BOOTSTRAP.md", ["第一条面向用户的话先让用户选择当前舒服的交流方式"]);
forbidFragments("core/guides/instantiation-guide.md", ["用一两行说明即可"]);
forbidFragments("INSTALL.md", ["最后才用一两行附上必要安装事实"]);
forbidFragments("START-HERE.txt", ["在我确认交流方式和最终方向前保持模板空态"]);

const fixtureCreatedAt = new Date().toISOString();
const fixtureDueAt = new Date(Date.parse(fixtureCreatedAt) + 180 * 24 * 60 * 60 * 1000).toISOString();
const fixtureScenarios = Object.freeze([
  Object.freeze({
    id: "general-minimal",
    instanceId: "ac-first-run-general",
    directionType: "general",
    domainId: "",
    directionLabel: "通用个人助手",
    scopeStatement: "使用完全虚构资料验证通用首次创建闭包。",
    guidanceMode: "balanced",
    guidanceLabel: "适度引导",
    displayName: "通用首次创建测试助手",
    mission: "验证通用实例的首次身份、空态与派生快照。",
    taskFamilyId: "task-family.first-check",
    taskTitle: "核对虚构清单",
    taskSummary: "核对一份完全虚构清单的结构和缺项。",
    taskTrigger: "帮我核对这份清单",
    taskAlias: "检查清单",
    topicKey: "list-check",
    subjectKey: "general-personal-work",
    hostProfileId: "host.first-run-general",
    hostLabel: "通用隔离测试宿主",
    hostMatchHint: "isolated-first-run-general",
  }),
  Object.freeze({
    id: "domain-video-editing",
    instanceId: "ac-first-run-video-editing",
    directionType: "domain",
    domainId: "video-editing",
    directionLabel: "剪辑工作助手",
    scopeStatement: "帮助规划剪辑任务、素材整理与交付检查；不执行真实媒体处理。",
    guidanceMode: "step-by-step",
    guidanceLabel: "分步引导",
    displayName: "剪辑首次创建测试助手",
    mission: "验证剪辑领域实例无需预装资产也能完成首次创建。",
    taskFamilyId: "task-family.video-editing-first-project",
    taskTitle: "规划第一项剪辑任务",
    taskSummary: "根据完全虚构的素材说明整理一项剪辑任务。",
    taskTrigger: "帮我规划这次剪辑",
    taskAlias: "剪辑任务规划",
    topicKey: "video-editing-project-plan",
    subjectKey: "video-editing",
    hostProfileId: "host.first-run-video-editing",
    hostLabel: "剪辑隔离测试宿主",
    hostMatchHint: "isolated-first-run-video-editing",
  }),
]);
const localPlaceholderFiles = new Set([
  ".assistant-local/.gitkeep",
  ".assistant-local/dashboard/.gitkeep",
  ".assistant-local/indexes/.gitkeep",
  ".assistant-local/skills/.gitkeep",
  ".assistant-local/task-handoffs/.gitkeep",
  ".assistant-local/upgrade-inbox/.gitkeep",
  ".assistant-private/.gitkeep",
  ".assistant-private/assets/.gitkeep",
  ".assistant-private/inbox/.gitkeep",
]);
const firstInstantiationWriteSet = Object.freeze([
  "instance/manifest.toml",
  "instance/startup-capsule.toml",
  "instance/profile/approved-profile.md",
  "instance/maps/domain-map.toml",
  "instance/signals/control.toml",
  "instance/maps/signal-map.toml",
  "instance/maps/time-trigger-map.toml",
  "instance/evolution/index.toml",
  "instance/validations/index.toml",
  "instance/components/registry.toml",
  "instance/hosts/registry.toml",
  "instance/skills/requirements.toml",
  "instance/governance/consistency-governance-card.md",
  "instance/governance/memory-governance-card.md",
  "instance/governance/network-security-governance-card.md",
  "dashboard/public/snapshot.js",
  "dashboard/dist/snapshot.js",
]);

function writeSetForScenario(scenario) {
  return [...firstInstantiationWriteSet, `instance/hosts/profiles/${scenario.hostProfileId}.toml`];
}

function integrationAssert(condition, message) {
  if (!condition) fail(`isolated instantiation integration: ${message}`);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function relativeRef(root, path) {
  return relative(root, path).split(sep).join("/");
}

function discoverTemplateIdentityRefs(root) {
  const refs = [];
  const queue = [resolve(root, "instance")];
  while (queue.length) {
    const directory = queue.shift();
    const entries = readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
    for (const entry of entries) {
      const path = resolve(directory, entry.name);
      const info = lstatSync(path);
      const ref = relativeRef(root, path);
      integrationAssert(!info.isSymbolicLink(), `template identity audit encountered a link: ${ref}`);
      if (info.isDirectory()) queue.push(path);
      else if (info.isFile() && entry.name.endsWith(".toml")
        && /^instance_id = "template"$/mu.test(readFileSync(path, "utf8"))) refs.push(ref);
      else if (!info.isFile()) fail(`isolated instantiation identity audit found a non-regular entry: ${ref}`);
    }
  }
  return refs.sort();
}

const templateIdentityRefs = Object.freeze(discoverTemplateIdentityRefs(repositoryDirectory));
integrationAssert(templateIdentityRefs.length > 0, "template identity audit found no identity files");
integrationAssert(templateIdentityRefs.every((ref) => firstInstantiationWriteSet.includes(ref)),
  "a template identity file is missing from the atomic first-instantiation write set");

function templateCopyFilter(path) {
  const ref = relativeRef(repositoryDirectory, path);
  if (!ref) return true;
  if (ref === ".git" || ref.startsWith(".git/") || ref === "maintainer-private" || ref.startsWith("maintainer-private/")
    || ref === "workspace" || ref.startsWith("workspace/") || ref === "AGENTS.override.md"
    || ref === "node_modules" || ref.startsWith("node_modules/") || ref === "dashboard/node_modules" || ref.startsWith("dashboard/node_modules/")) return false;
  if (ref === ".assistant-local" || ref.startsWith(".assistant-local/") || ref === ".assistant-private" || ref.startsWith(".assistant-private/")) {
    if (![...localPlaceholderFiles].some((allowed) => allowed === ref || allowed.startsWith(`${ref}/`))) return false;
  }
  const info = lstatSync(path);
  if (info.isSymbolicLink()) fail(`isolated instantiation source contains a link: ${ref}`);
  return true;
}

function copyFreshTemplate(destination) {
  integrationAssert(!existsSync(destination), `fresh destination already exists: ${destination}`);
  cpSync(repositoryDirectory, destination, { recursive: true, errorOnExist: true, filter: templateCopyFilter });
  integrationAssert(!existsSync(resolve(destination, ".git")), "fresh template copy contains .git");
  integrationAssert(!existsSync(resolve(destination, "maintainer-private")), "fresh template copy contains maintainer-private");
  integrationAssert(!existsSync(resolve(destination, "AGENTS.override.md")), "fresh template copy contains AGENTS.override.md");
}

function treeFingerprint(root) {
  const lines = [];
  const queue = [root];
  while (queue.length) {
    const directory = queue.shift();
    const entries = readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
    for (const entry of entries) {
      const path = resolve(directory, entry.name);
      const info = lstatSync(path);
      const ref = relativeRef(root, path);
      if (info.isSymbolicLink()) fail(`isolated instantiation tree contains a link: ${ref}`);
      if (info.isDirectory()) {
        lines.push(`D\t${ref}\n`);
        queue.push(path);
      } else if (info.isFile()) {
        const bytes = readFileSync(path);
        lines.push(`F\t${ref}\t${bytes.length}\t${sha256(bytes)}\n`);
      } else fail(`isolated instantiation tree contains a non-regular entry: ${ref}`);
    }
  }
  return sha256(Buffer.from(lines.sort().join(""), "utf8"));
}

function freezeWriteSet(root, scenario) {
  return new Map(writeSetForScenario(scenario).map((ref) => {
    const path = resolve(root, ...ref.split("/"));
    if (!existsSync(path)) return [ref, Object.freeze({ exists: false, bytes: null })];
    const info = lstatSync(path);
    integrationAssert(info.isFile() && !info.isSymbolicLink(), `write-set preimage is not a physical file: ${ref}`);
    return [ref, Object.freeze({ exists: true, bytes: readFileSync(path) })];
  }));
}

function restoreWriteSet(root, frozen) {
  for (const [ref, state] of frozen) {
    const path = resolve(root, ...ref.split("/"));
    if (!state.exists) {
      if (existsSync(path)) unlinkSync(path);
      continue;
    }
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, state.bytes);
  }
}

function fixtureRead(root, ref) {
  return readFileSync(resolve(root, ...ref.split("/")), "utf8");
}

function fixtureWrite(root, ref, text) {
  const path = resolve(root, ...ref.split("/"));
  mkdirSync(dirname(path), { recursive: true });
  if (existsSync(path)) {
    const info = lstatSync(path);
    integrationAssert(info.isFile() && !info.isSymbolicLink(), `write target is not a physical file: ${ref}`);
  }
  writeFileSync(path, text, "utf8");
}

function replaceUnique(text, from, to, label) {
  const first = text.indexOf(from);
  integrationAssert(first >= 0 && text.indexOf(from, first + from.length) < 0, `${label} replacement is not unique`);
  return `${text.slice(0, first)}${to}${text.slice(first + from.length)}`;
}

function replaceTomlField(text, field, value, label) {
  const expression = new RegExp(`^${field} = .*?$`, "gmu");
  const matches = [...text.matchAll(expression)];
  integrationAssert(matches.length === 1, `${label} field ${field} is not unique`);
  return text.replace(expression, `${field} = ${value}`);
}

function instanceManifestSource(scenario) {
  let manifest = source("instance/manifest.toml");
  manifest = replaceUnique(manifest, 'instance_id = "template"', `instance_id = "${scenario.instanceId}"`, "manifest instance_id");
  manifest = replaceUnique(manifest, 'state = "template"', 'state = "instance"', "manifest state");
  manifest = replaceUnique(manifest, 'created_at = ""', `created_at = "${fixtureCreatedAt}"`, "manifest created_at");
  manifest = replaceUnique(manifest, 'type = "unselected"', `type = "${scenario.directionType}"`, "manifest direction type");
  manifest = replaceUnique(manifest, "locked = false", "locked = true", "manifest direction lock");
  manifest = replaceUnique(manifest, 'domain_id = ""', `domain_id = "${scenario.domainId}"`, "manifest domain_id");
  manifest = replaceUnique(manifest, 'label = ""', `label = "${scenario.directionLabel}"`, "manifest direction label");
  manifest = replaceUnique(manifest, 'scope_statement = ""', `scope_statement = "${scenario.scopeStatement}"`, "manifest direction scope");
  manifest = replaceUnique(manifest, 'status = "not-instantiated"', 'status = "active"', "manifest profile status");
  manifest = replaceUnique(manifest, 'guidance_mode = "unselected"', `guidance_mode = "${scenario.guidanceMode}"`, "manifest guidance mode");
  manifest = replaceUnique(manifest, 'display_name = ""', `display_name = "${scenario.displayName}"`, "manifest display name");
  manifest = replaceUnique(manifest, 'mission = ""', `mission = "${scenario.mission}"`, "manifest mission");
  manifest = replaceUnique(manifest, 'user_preferences_ref = "instance/profile/README.md"', 'user_preferences_ref = "instance/profile/approved-profile.md"', "manifest profile ref");
  return manifest;
}

function initializeGovernanceCard(text, ref) {
  let updated = replaceTomlField(text, "schedule_state", JSON.stringify("scheduled"), ref);
  updated = replaceTomlField(updated, "schedule_anchor_at", JSON.stringify(fixtureCreatedAt), ref);
  updated = replaceTomlField(updated, "next_due_at", JSON.stringify(fixtureDueAt), ref);
  updated = replaceTomlField(updated, "trigger_revision", "1", ref);
  return updated;
}

function applyFirstInstantiationIdentity(root, scenario) {
  fixtureWrite(root, "instance/manifest.toml", instanceManifestSource(scenario));
  fixtureWrite(root, "instance/profile/approved-profile.md", `# 已确认实例档案

- instance_id: \`${scenario.instanceId}\`
- 实例方向：${scenario.directionLabel}
- 协作方式：${scenario.guidanceLabel}
- 第一项真实任务：${scenario.taskTitle}；本任务尚未执行。
- 学习边界：真实任务结束并获得对应授权后才形成长期资产或验证记录。
`);
  fixtureWrite(root, "instance/maps/domain-map.toml", `schema_version = 1
map_id = "instance-domain"
instance_id = "${scenario.instanceId}"
direction = "${scenario.directionType === "domain" ? scenario.domainId : "general"}"
status = "active"

[budget]
soft_max_bytes = 32768
hard_max_bytes = 49152
soft_max_routes = 96
hard_max_routes = 128
max_route_bytes = 2048
candidate_limit = 3
overflow_state = "ok"

[[routes]]
id = "${scenario.taskFamilyId}"
title = "${scenario.taskTitle}"
summary = "${scenario.taskSummary}"
triggers = ["${scenario.taskTrigger}"]
asset_kind = "task-family"
topic_key = "${scenario.topicKey}"
subject_key = "${scenario.subjectKey}"
aliases = ["${scenario.taskAlias}"]
scope = ["用户提供的完全虚构清单"]
conditions = ["这只是任务族，不表示能力或SOP已经形成", "真实执行结束后再进入结果验证"]
excludes = ["不把尚未执行的任务写成正式资产"]
related_asset_ids = []
target = "instance/profile/approved-profile.md"
state = "on-demand"
minimum_level = 1
confirmation = "none"
`);
  fixtureWrite(root, "instance/signals/control.toml", `schema_version = 1
record_type = "cross-session-signal-control"
instance_id = "${scenario.instanceId}"
source_revision = 1
projection_revision = 1
update_state = "clean"
pending_operation_id = ""
pending_event_id = ""
pending_signal_id = ""
pending_trigger_id = ""
pending_source_ref = ""
base_revision = 1
updated_at = "${fixtureCreatedAt}"
`);
  fixtureWrite(root, "instance/maps/signal-map.toml", `schema_version = 1
map_id = "cross-session-signals"
instance_id = "${scenario.instanceId}"
state = "current"
source_revision = 1
generated_at = "${fixtureCreatedAt}"
budget_bytes = 1536
overflow = false
active_count = 0
scheduled_count = 3
next_wakeup_at = "${fixtureDueAt}"
next_wakeup_ref = "instance/maps/time-trigger-map.toml"
`);
  fixtureWrite(root, "instance/maps/time-trigger-map.toml", `schema_version = 1
map_id = "time-triggers"
instance_id = "${scenario.instanceId}"
state = "current"
source_revision = 1
generated_at = "${fixtureCreatedAt}"
scheduled_count = 3
next_wakeup_at = "${fixtureDueAt}"
`);
  fixtureWrite(root, "instance/evolution/index.toml", `schema_version = 1
index_id = "evolution-candidates"
instance_id = "${scenario.instanceId}"
state = "empty"
source_revision = 0
generated_at = "${fixtureCreatedAt}"
budget_bytes = 32768
overflow = false
candidate_count = 0
indexed_count = 0
active_count = 0
`);
  fixtureWrite(root, "instance/validations/index.toml", `schema_version = 1
index_id = "result-validations"
instance_id = "${scenario.instanceId}"
state = "empty"
source_revision = 0
generated_at = ""
budget_bytes = 262144
overflow = false
record_count = 0
`);
  fixtureWrite(root, "instance/components/registry.toml", `schema_version = 1
record_type = "agent-carry-instance-component-registry"
instance_id = "${scenario.instanceId}"
adoption_state = "current"
revision = 1
component_count = 0
`);
  fixtureWrite(root, "instance/hosts/registry.toml", `schema_version = 1
record_type = "host-registry"
registry_id = "host-connections"
instance_id = "${scenario.instanceId}"
revision = 1
updated_at = "${fixtureCreatedAt}"
load_policy = "post-route-light-resume-or-full-integration-only"
maximum_bytes = 8192
overflow_policy = "remove-ineligible-entries-from-light-map-but-preserve-profile-files"

[[hosts]]
profile_id = "${scenario.hostProfileId}"
label = "${scenario.hostLabel}"
status = "active"
profile_ref = "instance/hosts/profiles/${scenario.hostProfileId}.toml"
match_hints = ["${scenario.hostMatchHint}"]
last_verified_at = "${fixtureCreatedAt}"
`);
  fixtureWrite(root, `instance/hosts/profiles/${scenario.hostProfileId}.toml`, `schema_version = 1
record_type = "host-profile"
record_id = "${scenario.hostProfileId}"
profile_id = "${scenario.hostProfileId}"
instance_id = "${scenario.instanceId}"
source = "agent-carry"
label = "${scenario.hostLabel}"
status = "active"
protocol_version = "1.0"
created_at = "${fixtureCreatedAt}"
last_verified_at = "${fixtureCreatedAt}"
maximum_bytes = 16384

[observed_host]
product_name = ""
product_version = ""
model_name = ""
model_selection_label = ""
request_model_name = ""
model_routing_mode = "unknown"
auxiliary_model_names = []
model_observation_basis = []
environment = "isolated-test"
observation_basis = "current-local-fixture"

[connection]
integration_mode = "local-fixture"
access_scope = "unknown"
write_capability = "unknown"
persistence = "unknown"
retention = "unknown"
last_capsule_id = ""
profile_match_basis = "${scenario.hostMatchHint}"
limitations = []

[capability_catalog]
scope = "integration-relevant-at-last-handshake"
complete = false

[host_memory]
inventory_status = "not-started"
category_summaries = []
migrated_asset_refs = []
conflicts = []
details_stored_here = false
automatic_context_status = "unknown"
automatic_context_categories = []
automatic_context_details_stored_here = false

[governance]
contains_secrets = false
contains_full_host_memory = false
unresolved = []
`);
  fixtureWrite(root, "instance/skills/requirements.toml", `schema_version = 1
instance_id = "${scenario.instanceId}"
generated_at = "${fixtureCreatedAt}"
status = "current"
`);
  for (const ref of [
    "instance/governance/consistency-governance-card.md",
    "instance/governance/memory-governance-card.md",
    "instance/governance/network-security-governance-card.md",
  ]) fixtureWrite(root, ref, initializeGovernanceCard(fixtureRead(root, ref), ref));
}

function runFixtureNode(root, scriptRef, args = []) {
  const script = resolve(root, ...scriptRef.split("/"));
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) fail(`isolated instantiation could not start ${scriptRef}: ${result.error.message}`);
  if (result.status !== 0) fail(`isolated instantiation ${scriptRef} failed: ${(result.stderr || result.stdout).trim()}`);
  return result.stdout.trim() ? JSON.parse(result.stdout.trim()) : {};
}

function instanceIdFrom(text, ref) {
  const matches = [...text.matchAll(/^instance_id = "([^"]+)"$/gmu)];
  integrationAssert(matches.length === 1, `${ref} does not contain exactly one root instance_id`);
  return matches[0][1];
}

function countFormalFiles(root, directoryRef) {
  const directory = resolve(root, ...directoryRef.split("/"));
  let count = 0;
  const queue = [directory];
  while (queue.length) {
    const current = queue.shift();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = resolve(current, entry.name);
      const info = lstatSync(path);
      integrationAssert(!info.isSymbolicLink(), `${directoryRef} contains a link`);
      if (info.isDirectory()) queue.push(path);
      else if (info.isFile() && entry.name !== "README.md") count += 1;
      else if (!info.isFile()) fail(`isolated instantiation ${directoryRef} contains a non-regular entry`);
    }
  }
  return count;
}

function verifyInstantiatedFixture(root, scenario) {
  const identityRefs = [...templateIdentityRefs, `instance/hosts/profiles/${scenario.hostProfileId}.toml`];
  for (const ref of identityRefs) integrationAssert(instanceIdFrom(fixtureRead(root, ref), ref) === scenario.instanceId, `${ref} identity drifted`);
  integrationAssert(fixtureRead(root, "instance/profile/approved-profile.md").includes(`instance_id: \`${scenario.instanceId}\``), "approved profile identity drifted");

  const manifestSource = fixtureRead(root, "instance/manifest.toml");
  integrationAssert(manifestSource.includes(`type = "${scenario.directionType}"`)
    && manifestSource.includes(`domain_id = "${scenario.domainId}"`)
    && manifestSource.includes(`guidance_mode = "${scenario.guidanceMode}"`),
  `manifest did not preserve the ${scenario.id} direction and guidance choices`);

  const capsule = inspectStartupCapsule(root);
  integrationAssert(capsule.decision === "startup-capsule-valid" && capsule.instance_id === scenario.instanceId && capsule.state === "instance" && capsule.migration_required === false,
    "strict startup capsule did not validate as the new instance");

  const componentInspection = inspectInstanceComponents(root);
  integrationAssert(componentInspection.decision === "instance-components-valid" && componentInspection.instanceId === scenario.instanceId
    && componentInspection.adoptionState === "current" && componentInspection.revision === 1 && componentInspection.componentCount === 0
    && componentInspection.unregisteredPaths.length === 0,
  "zero-component registry did not close against the instance identity");

  const validationSource = fixtureRead(root, "instance/validations/index.toml");
  integrationAssert(validationSource.includes('state = "empty"') && validationSource.includes("source_revision = 0")
    && validationSource.includes('generated_at = ""') && validationSource.includes("budget_bytes = 262144")
    && validationSource.includes("overflow = false") && validationSource.includes("record_count = 0")
    && !validationSource.includes("[[validations]]"), "result validation index is not an identity-bound zero-record empty index");

  const evolutionSource = fixtureRead(root, "instance/evolution/index.toml");
  integrationAssert(evolutionSource.includes('state = "empty"') && evolutionSource.includes("source_revision = 0")
    && evolutionSource.includes(`generated_at = "${fixtureCreatedAt}"`) && evolutionSource.includes("budget_bytes = 32768")
    && evolutionSource.includes("overflow = false") && evolutionSource.includes("candidate_count = 0")
    && evolutionSource.includes("indexed_count = 0") && evolutionSource.includes("active_count = 0")
    && !evolutionSource.includes("[[candidates]]"), "evolution index is not an identity-bound timestamped zero-candidate empty index");

  const domainMap = fixtureRead(root, "instance/maps/domain-map.toml");
  integrationAssert((domainMap.match(/\[\[routes\]\]/gu) ?? []).length === 1 && domainMap.includes('asset_kind = "task-family"')
    && domainMap.includes(`direction = "${scenario.directionType === "domain" ? scenario.domainId : "general"}`)
    && !/asset_kind = "(?:memory|capability|sop|experience)"/u.test(domainMap), "initial task-family became a formal asset route or lost its direction");

  for (const directory of ["instance/memory", "instance/capabilities", "instance/sops", "instance/experiences", "instance/todo", "instance/deferred"]) {
    integrationAssert(countFormalFiles(root, directory) === 0, `${directory} contains a pre-created formal item`);
  }

  const publicBytes = readFileSync(resolve(root, "dashboard/public/snapshot.js"));
  const distBytes = readFileSync(resolve(root, "dashboard/dist/snapshot.js"));
  integrationAssert(Buffer.compare(publicBytes, distBytes) === 0, "public and dist snapshots are not byte-identical");
  const snapshot = parseSnapshotEnvelope(publicBytes.toString("utf8"), "first-instantiation integration snapshot");
  validateSnapshotSemantics(snapshot, "first-instantiation integration snapshot");
  const expectedIdentityRef = `ac-${sha256(Buffer.from(scenario.instanceId, "utf8")).slice(0, 12)}`;
  integrationAssert(snapshot.meta.state === "instance" && snapshot.meta.identity_ref === expectedIdentityRef
    && !publicBytes.toString("utf8").includes(scenario.instanceId), "snapshot identity is not the deterministic anonymous projection");
  const expectedCounts = { memory: 0, sops: 0, capabilities: 0, experiences: 0, evolution: 0, todo: 0, governance: 3, skills: 0 };
  integrationAssert(Object.entries(expectedCounts).every(([key, value]) => snapshot.assets[key] === value), "snapshot asset or governance counts are wrong");
  integrationAssert(snapshot.memories.length === 0 && snapshot.capabilities.length === 0 && snapshot.sops.length === 0
    && snapshot.experiences.length === 0 && snapshot.evolution.length === 0 && snapshot.todo.length === 0
    && snapshot.deferred.length === 0 && snapshot.governance.length === 3 && snapshot.skills.count === 0,
  "snapshot projected a task-family or pre-created item as an asset");

  const governanceFiles = readdirSync(resolve(root, "instance/governance"))
    .filter((name) => name.endsWith(".md") && name !== "README.md");
  integrationAssert(governanceFiles.length === 3 && governanceFiles.every((name) => {
    const card = fixtureRead(root, `instance/governance/${name}`);
    return card.includes(`schedule_anchor_at = "${fixtureCreatedAt}"`) && card.includes(`next_due_at = "${fixtureDueAt}"`);
  }), "governance cards are not the three separately scheduled long-term cards");
  return Object.freeze({ scenarioId: scenario.id, snapshotSha256: sha256(publicBytes), identityRef: expectedIdentityRef });
}

function verifyTemplateFixture(root, expectedTreeFingerprint, scenario) {
  integrationAssert(treeFingerprint(root) === expectedTreeFingerprint, "fault recovery did not restore the complete template tree");
  integrationAssert(instanceIdFrom(fixtureRead(root, "instance/manifest.toml"), "template manifest") === "template", "fault recovery left an instantiated manifest");
  integrationAssert(instanceIdFrom(fixtureRead(root, "instance/validations/index.toml"), "template validation index") === "template", "fault recovery left an instantiated validation index");
  integrationAssert(instanceIdFrom(fixtureRead(root, "instance/components/registry.toml"), "template component registry") === "template", "fault recovery left an instantiated component registry");
  integrationAssert(!existsSync(resolve(root, "instance/profile/approved-profile.md"))
    && !existsSync(resolve(root, "instance/hosts/profiles", `${scenario.hostProfileId}.toml`)), "fault recovery left a newly created identity file");
  const capsule = inspectStartupCapsule(root);
  integrationAssert(capsule.decision === "startup-capsule-valid" && capsule.state === "template" && capsule.instance_id === "template",
    "fault recovery did not restore the strict template capsule");
  const publicSource = fixtureRead(root, "dashboard/public/snapshot.js");
  const distSource = fixtureRead(root, "dashboard/dist/snapshot.js");
  integrationAssert(publicSource === distSource && parseSnapshotEnvelope(publicSource, "restored template snapshot").meta.state === "template",
    "fault recovery did not restore both template snapshots");
}

function stageInstantiationCandidate(liveRoot, candidateRoot, scenario, { injectAfterCapsule = false } = {}) {
  cpSync(liveRoot, candidateRoot, { recursive: true, errorOnExist: true });
  applyFirstInstantiationIdentity(candidateRoot, scenario);
  const capsuleResult = runFixtureNode(candidateRoot, "dashboard/scripts/sync-startup-capsule.mjs",
    [candidateRoot, "--write", "--acknowledge-manifest-change"]);
  integrationAssert(["startup-capsule-updated", "startup-capsule-current"].includes(capsuleResult.decision), "capsule synchronization returned an unexpected state");
  integrationAssert(inspectStartupCapsule(candidateRoot).decision === "startup-capsule-valid", "candidate capsule failed strict readback");
  if (injectAfterCapsule) throw new Error("injected-after-capsule-before-snapshot");
  const snapshotResult = runFixtureNode(candidateRoot, "dashboard/scripts/sync-snapshot.mjs");
  const verification = verifyInstantiatedFixture(candidateRoot, scenario);
  return Object.freeze({ capsuleResult, snapshotResult, verification });
}

function executeFirstInstantiation(liveRoot, scenario, { injectAfterCapsule = false } = {}) {
  const beforeTree = treeFingerprint(liveRoot);
  const frozen = freezeWriteSet(liveRoot, scenario);
  const candidateRoot = `${liveRoot}.candidate-${randomUUID()}`;
  const backupRoot = `${liveRoot}.backup-${randomUUID()}`;
  let liveMoved = false;
  let candidateInstalled = false;
  try {
    const staged = stageInstantiationCandidate(liveRoot, candidateRoot, scenario, { injectAfterCapsule });
    const candidateTree = treeFingerprint(candidateRoot);
    if (candidateTree === beforeTree) {
      rmSync(candidateRoot, { recursive: true, force: true });
      return Object.freeze({ updated: false, ...staged });
    }
    renameSync(liveRoot, backupRoot); liveMoved = true;
    renameSync(candidateRoot, liveRoot); candidateInstalled = true;
    verifyInstantiatedFixture(liveRoot, scenario);
    rmSync(backupRoot, { recursive: true, force: true }); liveMoved = false;
    return Object.freeze({ updated: true, ...staged });
  } catch (error) {
    if (existsSync(candidateRoot)) rmSync(candidateRoot, { recursive: true, force: true });
    if (liveMoved) {
      if (candidateInstalled && existsSync(liveRoot)) rmSync(liveRoot, { recursive: true, force: true });
      if (existsSync(backupRoot)) renameSync(backupRoot, liveRoot);
      liveMoved = false;
    }
    restoreWriteSet(liveRoot, frozen);
    integrationAssert(treeFingerprint(liveRoot) === beforeTree, `rollback verification failed after ${error.message}`);
    if (injectAfterCapsule && error.message === "injected-after-capsule-before-snapshot") {
      return Object.freeze({ updated: false, injectedFailureRecovered: true });
    }
    throw error;
  }
}

function validateRealFirstInstantiationChain() {
  const integrationRoot = mkdtempSync(join(tmpdir(), "agent-carry-first-instantiation-integration-"));
  let completed = false;
  try {
    const faultScenario = fixtureScenarios[0];
    const faultLive = resolve(integrationRoot, "fault-live");
    copyFreshTemplate(faultLive);
    const faultRegistryRef = resolve(faultLive, "instance/components/registry.toml");
    const faultRegistry = readFileSync(faultRegistryRef, "utf8")
      .replace("component_count = 0", "component_count = 7")
      .replaceAll("\n", "\r\n");
    writeFileSync(faultRegistryRef, faultRegistry, "utf8");
    const repairableTemplate = inspectInstanceComponentCompatibility(faultLive);
    integrationAssert(repairableTemplate.outcome === "auto-repairable"
      && repairableTemplate.repairPlan.some((item) => item.action.includes("component_count"))
      && repairableTemplate.userReport.headline.includes("自动修复"),
    "repairable zero-component template drift did not produce a transparent repair plan");
    const faultTemplateFingerprint = treeFingerprint(faultLive);
    const faultResult = executeFirstInstantiation(faultLive, faultScenario, { injectAfterCapsule: true });
    integrationAssert(faultResult.injectedFailureRecovered === true, "capsule-before-snapshot fault was not recovered");
    verifyTemplateFixture(faultLive, faultTemplateFingerprint, faultScenario);

    const scenarios = [];
    for (const scenario of fixtureScenarios) {
      const successLive = resolve(integrationRoot, `success-${scenario.id}`);
      copyFreshTemplate(successLive);
      if (scenario.id === fixtureScenarios[0].id) {
        const registryRef = resolve(successLive, "instance/components/registry.toml");
        const driftedRegistry = readFileSync(registryRef, "utf8")
          .replace('instance_id = "template"', 'instance_id = "stale-template-id"')
          .replaceAll("\n", "\r\n");
        writeFileSync(registryRef, driftedRegistry, "utf8");
        const diagnosis = inspectInstanceComponentCompatibility(successLive);
        integrationAssert(diagnosis.outcome === "auto-repairable" && diagnosis.componentCount === 0
          && diagnosis.userReport.requiresUserDecision === false,
        "repairable template identity drift incorrectly required a user decision");
      }
      const first = executeFirstInstantiation(successLive, scenario);
      integrationAssert(first.updated === true && first.snapshotResult.updated === true,
        `${scenario.id} did not install a new instance snapshot`);
      const firstFingerprint = treeFingerprint(successLive);
      const firstSnapshot = readFileSync(resolve(successLive, "dashboard/public/snapshot.js"));
      const second = executeFirstInstantiation(successLive, scenario);
      integrationAssert(second.updated === false && second.capsuleResult.updated === false && second.snapshotResult.updated === false,
        `${scenario.id} second identical instantiation was not idempotent`);
      integrationAssert(treeFingerprint(successLive) === firstFingerprint
        && Buffer.compare(firstSnapshot, readFileSync(resolve(successLive, "dashboard/public/snapshot.js"))) === 0,
      `${scenario.id} second identical instantiation changed bytes or snapshot time`);
      scenarios.push(first.verification);
    }
    completed = true;
    return Object.freeze({
      decision: "first-run-contract-valid",
      status: "passed",
      templateIdentityFileCount: templateIdentityRefs.length,
      scenarioCount: scenarios.length,
      scenarios: Object.freeze(scenarios),
      proofs: Object.freeze({
        oneCanonicalTemplate: true,
        strictStartupCapsule: true,
        byteIdenticalSnapshots: true,
        zeroBusinessAndLearningAssets: true,
        governanceCount: 3,
        idempotentSecondRun: true,
        capsuleBeforeSnapshotFailureRecovered: true,
      }),
    });
  } finally {
    if (completed) rmSync(integrationRoot, { recursive: true, force: true });
    else process.stderr.write(`First-run integration failure scene preserved at ${integrationRoot}\n`);
  }
}

const commandArguments = process.argv.slice(2);
integrationAssert(commandArguments.every((argument) => argument === "--json"), `unknown command argument: ${commandArguments.find((argument) => argument !== "--json")}`);
const integration = validateRealFirstInstantiationChain();
if (commandArguments.includes("--json")) console.log(JSON.stringify(integration));
else console.log(`First-run contract check passed: Level 1 welcome + Dashboard/chat handoff + Level 3 atomic instantiation are aligned; ${integration.templateIdentityFileCount} template identity files closed across ${integration.scenarioCount} scenarios (${integration.scenarios.map(({ scenarioId }) => scenarioId).join(", ")}).`);
