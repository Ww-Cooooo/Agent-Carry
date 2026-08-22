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

requireFragments("AGENTS.md", [
  "默认用户可能不熟悉 Agent、编程、路径或内部术语",
  "整个交流过程都先给人能理解的结果与背景",
  "任务创建、移动或交付用户可见文件后",
  "core/protocols/USER_GUIDANCE.md",
]);

requireFragments("BOOTSTRAP.md", [
  "所有面向用户的交流都遵守",
  "不能用功能名、路径、状态码或技术报告代替引导",
  "不得让用户重新提供 Agent 已知路径",
  "user-decision-guidance",
]);

requireFragments("assistant.toml", [
  "[interaction]",
  'baseline = "assume-the-user-may-be-new-to-agents-or-programming"',
  'durable_file_output = "after-creating-moving-or-delivering-user-visible-files-reuse-known-locations-and-resolve-long-term-carry-intent"',
  'guidance_modes = "change-detail-and-pace-not-decision-completeness"',
  'protocol = "core/protocols/USER_GUIDANCE.md"',
  'load_policy = "full-body-only-for-multistep-technical-risky-durable-or-user-uncertain-decisions"',
]);

requireFragments("core/protocols/USER_GUIDANCE.md", [
  "本协议是 Agent Carry 的全局人机交流原则",
  "整个交流过程都要让用户知道下一步",
  "开始任务时",
  "完成任务时",
  "遇到错误或限制时",
  "发生长期学习或资料登记时",
  "2～4 个互斥、可执行的选项",
  "我不确定，请帮我判断",
  "不能随后要求用户自己寻找或重新输入这些位置",
  "全部带走",
  "只带素材和工程文件",
  "都不带走",
  "不能扫描整台电脑",
]);

const userGuidanceRoute = routeBlock("core/maps/domain-lifecycle.toml", "user-decision-guidance");
for (const fragment of [
  'target = "core/protocols/USER_GUIDANCE.md"',
  'state = "on-demand-for-nontrivial-user-decision"',
  "minimum_level = 1",
  'confirmation = "none-the-protocol-prepares-the-real-choice"',
]) {
  if (!userGuidanceRoute.includes(fragment)) fail(`user-decision-guidance route is missing: ${fragment}`);
}

requireFragments("core/templates/integration/manual-host-entry.md", [
  "默认用户可能第一次接触 Agent、很少使用 Agent",
  "2～4 个带后果的完整选项",
  "core/protocols/USER_GUIDANCE.md",
]);

requireFragments("core/templates/integration/host-wakeup.md", [
  "面向用户时默认其可能不熟悉 Agent",
  "交流方式只能压缩篇幅，不能省略决定所需信息",
  "core/protocols/USER_GUIDANCE.md",
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
  'id = "user-decision-guidance"',
  "after-creating-or-changing-user-visible-durable-files",
  'formal_owner = "core/protocols/USER_GUIDANCE.md"',
  "assistant-toml-compact-interaction-baseline-only-never-load-the-full-protocol-for-every-ordinary-message",
  "reuse-known-facts-explain-context-provide-two-to-four-options-with-consequences-and-recommendation-allow-unsure",
]);

requireFragments("dashboard/src/components/dashboard/Views.tsx", [
  "type MigrationGuideMode",
  '"private-export"',
  '"private-import"',
  "localizeText(`第 ${step} 步，共 3 步 · ${stepPhase}`)",
  "先看清哪些内容会跟着助手走",
  "按当前清单继续迁移",
  "补充以前的资料",
  "我不确定，请帮我检查",
  "请核对你刚刚选择的信息",
  'className="migration-guide-explainer"',
  "这一页没有需要选择的内容",
  "我了解了，下一步做选择",
  "选好了，进入核对",
  'className="wizard-review-sheet wizard-review-sheet--migration"',
  "这一步没有任何选项",
  "无需选择 · 只需核对",
  "核对无误，复制隐私资料导出指令",
  "核对无误，复制隐私资料导入指令",
  "暂时不导出，只查看或补充范围",
  "【我已经在看板完成的选择】",
  "在同一次对话中继续生成迁移套件",
  'openGuide("complete", event.currentTarget)',
  'openGuide("coverage", event.currentTarget)',
  'openGuide("private-export", event.currentTarget)',
  'openGuide("private-import", event.currentTarget)',
  'opener.focus({ preventScroll: true })',
]);

requireFragments("dashboard/src/components/dashboard/OnboardingDialog.tsx", [
  'className="wizard-review-sheet wizard-review-sheet--onboarding"',
  "这一步没有需要选择的内容",
  "无需选择 · 只需核对",
  "返回修改",
  "核对无误，生成创建指令",
]);

requireFragments("dashboard/src/index.css", [
  "height: min(720px, calc(100dvh - 28px))",
  "grid-template-rows: auto auto minmax(0, 1fr) auto",
  ".onboarding-dialog__body",
  "min-height: 0",
  "overscroll-behavior: contain",
  "scrollbar-gutter: stable",
]);

for (const relativePath of ["dashboard/src/components/dashboard/Views.tsx", "dashboard/src/components/dashboard/OnboardingDialog.tsx", "dashboard/src/index.css"]) {
  if (source(relativePath).includes("wizard-final-action__cue") || source(relativePath).includes("核对单正确就点这里")) {
    fail(`A self-explanatory final confirmation button must not be accompanied by a duplicate helper cue: ${relativePath}`);
  }
}

for (const legacyClass of ["wizard-review-notice", "onboarding-summary", "migration-guide-scope__grid", "migration-guide-review__choice"]) {
  if (source("dashboard/src/components/dashboard/Views.tsx").includes(legacyClass)
      || source("dashboard/src/components/dashboard/OnboardingDialog.tsx").includes(legacyClass)) {
    fail(`Explanation, choice, and review pages must remain visually distinct; legacy card-like class returned: ${legacyClass}`);
  }
}

if (source("dashboard/src/components/dashboard/Views.tsx").includes("private-coverage-check")) {
  fail("Private asset scope management must stay inside the export card and guided flow; the detached private-coverage-check block must not return.");
}

requireFragments("dashboard/src/Dashboard.tsx", [
  'onClick={() => navigate({ page: "transfer" })}',
  "带走本地资料",
  "换电脑前查看并准备",
]);

requireFragments("core/protocols/DASHBOARD_ACTIONS.md", [
  "分步引导只能使用快照里的非隐私摘要",
  "说明页、选择页和核对页必须使用三种不同的视觉与语义结构",
  "说明页用一个非交互的线性流程",
  "选择页才出现可点击、带选中状态的选项",
  "核对页使用一张完整只读核对单",
  "最终请求必须带上用户已经在看板完成的选择",
  "不得让用户返回看板、重新复制指令或重复回答同一个问题",
  "长页面、滚动与三维动效",
  "不使用面向数千行同高数据的虚拟列表",
  "content-visibility: auto",
  "电脑端主内容只有一个平滑滚动所有者",
  "agent-carry:scroll-state",
  "动画推进按真实时间差计算",
]);

requireFragments("dashboard/src/Dashboard.tsx", [
  'const SCROLL_STATE_EVENT = "agent-carry:scroll-state"',
  'wrapper.dataset.scrollState = active ? "active" : "idle"',
  'wrapper.addEventListener("scroll", onScroll, { passive: true })',
  "new CustomEvent(SCROLL_STATE_EVENT, { detail: active })",
  "respectReducedMotion: true",
  'wrapper.dataset.scrollEngine = "lenis"',
  "DashboardScrollRootContext.Provider",
  '<AnimatePresence mode="wait">',
]);

if (source("dashboard/src/Dashboard.tsx").includes('<AnimatePresence mode="wait" initial={false}>')) {
  fail("The route presence layer must not suppress first-load card reveal states.");
}

requireFragments("dashboard/src/lib/scroll-root.ts", [
  "DashboardScrollRootContext",
  "RefObject<HTMLElement | null>",
]);

requireFragments("dashboard/src/components/dashboard/Views.tsx", [
  'const REVEAL_VIEWPORT = { once: true, amount: 0.12, margin: "0px 0px -8% 0px" } as const',
  "data-reveal-surface",
  "data-reveal-card",
  "useContext(DashboardScrollRootContext)",
  "{ ...REVEAL_VIEWPORT, root }",
  "revealTransition((index % 2) * 0.075)",
  "revealTransition(Math.min(index, 3) * 0.045)",
  'className="asset-overview render-deferred"',
  "library-guide-deferred",
  "growth-guide-deferred",
  "content-card--${kind} render-deferred",
  "growth-row render-deferred",
  "model-level-panel render-deferred",
  '<div className="start-cta-wrap">',
]);

if (source("dashboard/src/components/dashboard/Views.tsx").includes("scale: [1, 1.012, 1]")) {
  fail("The primary action hit target must stay still; breathing motion belongs to its pointer-free glow layer.");
}

if (source("dashboard/src/components/dashboard/Views.tsx").includes('margin: "0px 0px 280px 0px"')) {
  fail("Card reveal must remain visible to the user instead of finishing hundreds of pixels before the card enters the viewport.");
}

for (const oversizedDeferredClass of ["assistant-relocation render-deferred", "transfer-channel--github render-deferred", "transfer-channel--private render-deferred", "safety-panel--user-note render-deferred", "secondary-actions render-deferred"]) {
  if (source("dashboard/src/components/dashboard/Views.tsx").includes(oversizedDeferredClass)) {
    fail(`A heterogeneous transfer section must pre-layout instead of shifting its full cost into active scroll: ${oversizedDeferredClass}`);
  }
}

requireFragments("dashboard/src/components/three/Core.tsx", [
  'const SCROLL_STATE_EVENT = "agent-carry:scroll-state"',
  "const IDLE_FRAME_INTERVAL = 1000 / 60",
  "const SCROLL_FRAME_INTERVAL = 1000 / 30",
  "const frameScale = lastFrameAt === 0",
  "CORE_ARCS[index].speed * frameScale",
  "ORBITS[index].speed * frameScale",
  "const onScrollState = (event: Event)",
  "window.addEventListener(SCROLL_STATE_EVENT, onScrollState)",
  "window.clearTimeout(frameTimer)",
]);

requireFragments("dashboard/src/index.css", [
  ".render-deferred",
  "content-visibility: auto",
  "contain-intrinsic-size: auto var(--deferred-block-size, 420px)",
  ".content-card.render-deferred",
  ".growth-row.render-deferred",
  ".model-level-panel.render-deferred",
  "@media (max-width: 1080px)",
  "scroll-behavior: auto",
  ".start-cta-wrap::before",
  "animation: start-cta-glow 3.8s ease-in-out infinite",
  "@keyframes start-cta-glow",
]);

if (source("dashboard/src/index.css").includes("scroll-behavior: smooth")) {
  fail("Lenis is the sole desktop smooth-scroll owner; CSS smooth scrolling must not be layered on top.");
}

requireFragments("docs/dashboard-design.md", [
  "跳过屏外卡片的布局与绘制",
  "卡片进入可视区后才用一次性的透明度、向上位移和极轻缩放逐张呈现",
  "不能被路由容器的首次动画设置取消",
  "平滑滚动只允许一个所有者",
  "首页 Three.js 在静止时最高约 60 帧／秒",
  "滚动时保持约 30 帧／秒",
  "可点击按钮及其命中区域保持固定",
  "只有不接收指针事件的独立光晕层改变透明度和缩放",
  "MDN：content-visibility",
  "Three.js：Rendering on Demand",
]);

requireFragments("core/upgrade/release-manifest-1.2.0.toml", [
  "Repeated-card pages keep semantic DOM while using native offscreen rendering",
  "Reveal observers use the actual .app-main scroll root",
  "dashboard_motion_restore",
  "clickable control and hit target remain stationary",
  '"dashboard-progressive-offscreen-paint-valid"',
  '"dashboard-card-reveal-uses-main-scroll-root-and-is-visible-on-first-load"',
  '"dashboard-single-scroll-owner-and-reduced-motion-fallback-valid"',
  '"dashboard-three-yields-during-scroll-and-pauses-offscreen-valid"',
  '"dashboard-scroll-no-overflow-layout-shift-or-remote-resource"',
  '"public-dashboard-build-is-self-contained-without-maintainer-private-files"',
  '"public-dashboard-build-checkout-line-endings-are-deterministic"',
]);

requireFragments("README.md", [
  "卡片真正滚动进屏幕时逐张、平顺地出现",
  "三维核心会自动让出资源",
]);

console.log("Formal change-quality contract validated: hit/non-hit routing, Level 3 ownership, root-cause priority, novice-safe guidance, visually distinct explanation/choice/review steps, continuous private export/import guidance, progressive offscreen rendering, visible card entry rooted to the main scroll container, one scroll owner, adaptive Three.js cadence, known-file handoff, cross-host propagation, instance-asset reachability, template distribution sync, migration safety, startup budget, and idempotence.");
