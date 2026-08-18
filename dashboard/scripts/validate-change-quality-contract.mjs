import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryDirectory = resolve(scriptDirectory, "..", "..");

function source(relativePath) {
  return readFileSync(resolve(repositoryDirectory, relativePath), "utf8");
}

function fail(message) {
  throw new Error(`Formal change-quality contract check failed: ${message}`);
}

function requireFragments(relativePath, fragments) {
  const text = source(relativePath);
  for (const fragment of fragments) {
    if (!text.includes(fragment)) fail(`${relativePath} is missing: ${fragment}`);
  }
}

function requireOrdered(relativePath, fragments) {
  const text = source(relativePath);
  let cursor = -1;
  for (const fragment of fragments) {
    const next = text.indexOf(fragment, cursor + 1);
    if (next < 0) fail(`${relativePath} is missing ordered fragment: ${fragment}`);
    if (next <= cursor) fail(`${relativePath} has the wrong priority order near: ${fragment}`);
    cursor = next;
  }
}

function routeBlock(relativePath, routeId) {
  const routes = source(relativePath).split("[[routes]]").slice(1);
  const route = routes.find((block) => block.includes(`id = "${routeId}"`));
  if (!route) fail(`${relativePath} is missing route: ${routeId}`);
  return route;
}

requireFragments("AGENTS.md", [
  "准备对 Agent Carry 的正式内容执行新增、修改、删除、重命名、移动、迁移、升级或发布时",
  "core/protocols/COMPONENT_CHANGE.md",
  "实例正式资产同时走资产生命周期",
  "只读检查、普通任务和既有资产的正常使用不加载这份完整协议",
]);

requireFragments("BOOTSTRAP.md", [
  "durable_change_protocol",
  "只读任务、普通使用和临时草稿不加载",
  "新增具体触发规则不得继续扩写本启动文件",
]);

requireFragments("assistant.toml", [
  'durable_change_protocol = "core/protocols/COMPONENT_CHANGE.md"',
  "only-after-a-formal-add-modify-delete-rename-move-migrate-upgrade-or-publish-intent",
  "never-for-read-only-or-ordinary-use",
  'startup_reads = ["instance/signals/control.toml", "instance/maps/signal-map.toml"]',
]);

const componentChangeRoute = routeBlock("core/maps/assistant-maintenance.toml", "component-change");
for (const fragment of [
  'target = "core/protocols/COMPONENT_CHANGE.md"',
  'state = "maintenance-only"',
  "minimum_level = 3",
  'confirmation = "before-durable-change"',
  "迁移正式内容",
  "准备发布",
]) {
  if (!componentChangeRoute.includes(fragment)) fail(`component-change route is missing: ${fragment}`);
}

requireOrdered("core/protocols/COMPONENT_CHANGE.md", [
  "问题必须从根因上修好",
  "用户数据和使用可靠性必须得到证明",
  "在前两项成立后，再减少无意义的流程和用户负担",
]);

requireFragments("core/protocols/COMPONENT_CHANGE.md", [
  "内部修得扎实，用户侧仍然清亮",
  "只读检查、普通任务、既有资产的正常使用",
  "模板、核心、Schema、路由、安全边界、升级、发布和跨组件架构必须由 Level 3",
  "实例正式资产与状态",
  "目录说明、派生投影或模板占位文件如果被旧实例引用为用户正文",
  "先逐字节迁移并更新引用",
  "发布选择规则",
  "公开产品、私密排除或本地不入库",
  "未分类的新产品文件不能被发布候选静默省略",
  "第二次执行应不再产生差异",
  "普通启动预算和渐进路由保持不变",
]);

requireFragments("core/protocols/ASSET_LIFECYCLE.md", [
  "准备把学习结果正式写入、修改、迁移、替代、归档或删除前",
  "core/protocols/COMPONENT_CHANGE.md",
  "只在持久变更已经成立时加载",
  "普通资产读取和没有长期价值的任务不加载",
  "所有 `active`、`provisional` 或 `review`",
  "只读取地图与 frontmatter",
  "错误或用户纠正是一次学习信号，不是自动写入长期资产的许可",
  "先依据当前任务的正式来源和用户反馈修正本次结果",
  "没有复用价值的失误、临时调试输出和完整错误日志在任务结束后丢弃",
]);

requireFragments("core/maps/root-map.toml", [
  "用户指出错误",
  "从错误中学习",
  "以后不要再犯",
]);

const evolutionReviewRoute = routeBlock("core/maps/evolution-model.toml", "evolution-review");
for (const fragment of [
  'target = "core/protocols/ASSET_LIFECYCLE.md"',
  "先修正并验证当前结果",
  "用户指出错误",
  "从错误中学习",
]) {
  if (!evolutionReviewRoute.includes(fragment)) fail(`evolution-review route is missing: ${fragment}`);
}

requireFragments("core/upgrade/UPGRADE-CONTRACT.md", [
  "存在实时引用",
  "逐字节",
  "已经固定身份",
  "node_modules",
  "第二次对同一候选执行迁移不得继续产生差异",
]);

requireFragments("core/upgrade/release-manifest-1.1.3.toml", [
  'schema_version = 2',
  'release = "1.1.3"',
  'id = "legacy-profile-readme-to-approved-profile"',
  'destination = "instance/profile/approved-profile.md"',
  'id = "normalize-task-family-route-state"',
  'forbidden_segments = [".git", "node_modules"',
  '"formal-change-quality-route-hits-before-durable-write"',
  '"ordinary-read-only-does-not-load-full-change-protocol"',
  '"correction-learning-route-fixes-and-validates-current-result-before-candidate"',
  '"one-off-error-and-full-log-do-not-become-assets-or-startup-context"',
  '"upgrade-second-run-idempotent"',
]);

requireFragments("core/guides/instantiation-guide.md", [
  "instance/profile/approved-profile.md",
  "`instance/profile/README.md` 只保留模板目录说明，不写入用户正文",
]);

requireFragments("core/schemas/instance-manifest.schema.md", [
  "instance/profile/approved-profile.md",
  "不得继续引用升级时会被替换的 `instance/profile/README.md`",
]);

requireFragments("core/maps/trigger-registry.toml", [
  'id = "component-change-impact"',
  'formal_owner = "core/protocols/COMPONENT_CHANGE.md"',
  'startup_policy = "keep-only-the-small-formal-change-event-family-at-startup-never-load-the-full-protocol-for-read-only-or-ordinary-use-and-never-project-completed-checks"',
  'id = "task-learning-value-gate"',
  "user-points-out-an-error-current-result-is-corrected",
  "an-error-or-correction-is-evidence-not-automatic-asset-authorization",
]);

console.log("Formal change-quality contract validated: hit/non-hit routing, Level 3 ownership, root-cause priority, instance-asset reachability, template distribution sync, migration safety, startup budget, and idempotence.");
