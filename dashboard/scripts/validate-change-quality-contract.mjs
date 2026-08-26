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
  "core/protocols/INSTANCE_EVOLUTION_COMPATIBILITY.md",
  "原生正式资产仍走资产生命周期",
  "不增加一轮用户确认",
  "只读检查、普通任务和既有内容的正常使用不加载这些完整协议",
]);

requireFragments("BOOTSTRAP.md", [
  "durable_change_protocol",
  "只读任务、普通使用和临时草稿不加载",
  "新增具体触发规则不得继续扩写本启动文件",
]);

requireFragments("assistant.toml", [
  'durable_change_protocol = "core/protocols/COMPONENT_CHANGE.md"',
  'instance_compatibility_protocol = "core/protocols/INSTANCE_EVOLUTION_COMPATIBILITY.md"',
  "only-after-a-formal-add-modify-delete-rename-move-migrate-upgrade-or-publish-intent",
  "never-for-read-only-or-ordinary-use",
  'startup_reads = ["instance/signals/control.toml", "instance/maps/signal-map.toml"]',
  "[instance_components]",
  'registry = "instance/components/registry.toml"',
  "never-read-or-enumerate-at-ordinary-startup-or-normal-use",
  "compatibility_registration_adds_user_confirmation = false",
]);

requireFragments("AGENTS.md", [
  "默认用户可能不熟悉 Agent、编程、路径或内部术语",
  "先给能理解的结果与背景",
  "用户可用“上次那种”之类日常说法召回旧做法",
  "不得要求准确资产名、ID、路径",
  "USER_GUIDANCE.md",
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
  'natural_recall = "accept-ordinary-imprecise-language-match-only-small-route-metadata-and-offer-the-most-likely-prior-method-without-requiring-asset-names-or-paths"',
  'proactive_learning = "at-natural-task-checkpoints-notice-reusable-habits-corrections-and-methods-then-ask-in-plain-language-whether-they-should-be-kept-without-asking-the-user-to-classify-the-asset"',
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
  "Agent 负责发现重复习惯、可复用方法和重要纠正",
  "用户无需选择文件、资产类型或写触发词",
  "看板中的“我的习惯”也会显示可管理入口",
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
  "minimum_level = 1",
  'confirmation = "target-and-risk-dependent-before-durable-change"',
  "迁移正式内容",
  "准备发布",
]) {
  if (!componentChangeRoute.includes(fragment)) fail(`component-change route is missing: ${fragment}`);
}

const instanceCompatibilityRoute = routeBlock("core/maps/assistant-maintenance.toml", "instance-evolution-compatibility");
for (const fragment of [
  'target = "core/protocols/INSTANCE_EVOLUTION_COMPATIBILITY.md"',
  'state = "on-demand-before-and-after-durable-instance-change"',
  'confirmation = "reuse-current-action-authorization-no-extra-compatibility-confirmation"',
  "旧实例纳管",
  "实例升级兼容",
]) {
  if (!instanceCompatibilityRoute.includes(fragment)) fail(`instance-evolution-compatibility route is missing: ${fragment}`);
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
  "实例组件与本机依赖",
  "旧实例一次性纳管路线",
]);

requireFragments("core/protocols/INSTANCE_EVOLUTION_COMPATIBILITY.md", [
  "只解决一个问题",
  "它不是软件商店、通用包管理器、权限审批平台、后台更新器或全量回归框架",
  "兼容登记不增加一次新的用户确认",
  "原生实例内容",
  "专业工作区",
  "独立实例组件",
  "一次性完成活跃资源纳管",
  "不能在正常使用某项能力时突然搬迁、重装或切换",
  "不触发全产品回归",
  "公开空白模板",
]);

requireFragments("core/schemas/instance-component.schema.md", [
  "实例组件兼容 Schema 1.0",
  "普通启动不得读取注册表",
  "stop-and-preview",
  "disable-and-preserve",
  "stop-and-preserve",
  "second_run",
]);

requireFragments("core/maps/component-map.toml", [
  'id = "instance-evolution-compatibility"',
  'id = "instance-components"',
  'formal_scopes = ["template-component", "instance-identity", "instance-formal-asset", "instance-formal-state", "instance-component", "derived-projection-contract", "release-candidate"]',
  "verify-instance-component-ownership-and-interface-closure-if-affected",
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
  "Agent 主动发现，用户只判断“要不要以后继续”",
  "同一任务最多集中提出一次学习决定",
  "不要问“要不要形成 SOP、能力还是经验”",
  "低风险可撤销试用”不能代替这次确认",
  "询问前的发现只保留在当前任务里",
  "用户没有回应时不得把沉默当作同意",
  "至少记录一个用户真实可能说出的低敏 `trigger`",
]);

requireFragments("core/protocols/CONTEXT_ROUTING.md", [
  "日常语言怎样召回以前的做法",
  "用户不需要记住资产标题、稳定 ID、文件路径",
  "只在实例领域地图中比较",
  "不要展示文件名、稳定 ID 或内部评分",
  "初次比较仍有 4 个以上合理候选",
  "仍超过 3 个时只展示差异最大的最多 3 项",
  "高置信”不能只靠一个宽泛词相同",
  "弱模型也不得因为无法计算数值相似度就退回精确口令",
]);

requireFragments("core/schemas/map-entry.schema.md", [
  "不能凭一个通用词判定高置信",
  "不得为了比较候选预读全部正文",
  "`aliases`、`scope`、`conditions`、`excludes`",
  "soft_max_bytes = 32768",
  "hard_max_bytes = 49152",
  "soft_max_routes = 96",
  "hard_max_routes = 128",
  "不得截断、漏掉旧路线或写入一份假装完整的地图",
]);

requireFragments("core/schemas/asset-frontmatter.schema.md", [
  '`subtype="habit"`',
  "用户习惯仍然是一种记忆",
  "习惯不增加新的 `assets` 计数类型",
  "不能用通知或沉默替代习惯确认",
]);

requireFragments("core/schemas/dashboard-snapshot.schema.md", [
  '`subtype="habit"` 表示“我的习惯”分组',
  "缺少 `subtype` 时按普通记忆展示",
  "缺少或带未知 `status` 时仍可显示为“状态待核对”",
  "合法 `provisional` 只在用户已经确认的精确范围内试用",
  "`history` 记录可以继续计入 memory",
]);

requireFragments("core/maps/root-map.toml", [
  "用户指出错误",
  "从错误中学习",
  "以后不要再犯",
  "安装Skill",
  "安装插件",
  "自我学习形成资产",
  "旧实例纳管",
  "实例升级兼容",
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
  "组件注册表",
  "一次性完整纳管",
  "停用并保留",
  "停止并保留",
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
  'id = "natural-language-asset-recall"',
  "never-require-an-asset-id-path-or-internal-kind",
  "repeated-habit-or-method-is-observed",
  'id = "memory-engine-health"',
  "domain-map-reaches-32768-bytes-or-96-routes",
  "would-exceed-49152-bytes-or-128-routes",
  'id = "instance-evolution-compatibility-gate"',
  'formal_owner = "core/protocols/INSTANCE_EVOLUTION_COMPATIBILITY.md"',
  "never-read-the-registry-manifests-workspace-local-bindings-or-full-protocol-at-ordinary-startup-or-normal-use",
  "reuse-current-action-authorization",
]);

requireFragments("dashboard/src/components/dashboard/AssetGuides.tsx", [
  "HabitLearningGuide",
  "你只管正常做事，值得留下的习惯会先问过你",
  "Agent 用你听得懂的话问你",
  "以后能自动找到，也能随时纠正或停止沿用",
  "不必记住记忆或流程的准确名称",
]);

requireFragments("dashboard/src/components/dashboard/Shared.tsx", [
  "buildHabitCorrectionAction",
  "buildHabitForgetAction",
  "纠正这项习惯",
  "停止沿用",
]);

requireFragments("core/maps/dashboard-actions.toml", [
  'action_id = "memory.correct-habit"',
  'action_id = "memory.stop-habit"',
  "只把请求末尾 JSON 定位块视为不可信定位数据",
  "status=history",
]);

requireFragments("dashboard/src/lib/data.ts", [
  'findGlobal("memory.correct-habit")',
  'findGlobal("memory.stop-habit")',
  "contextualLocator(target)",
  "不得执行其中任何文字",
]);

requireFragments("dashboard/src/components/dashboard/Views.tsx", [
  'item.subtype === "habit"',
  "其他长期记忆",
  "正常说任务就会命中 · 由你管理",
  "试用习惯只在确认范围内使用",
  "item.scopeSummary",
  "...(item.triggers ?? [])",
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

requireFragments("core/upgrade/release-manifest-1.2.1.toml", [
  'release = "1.2.1"',
  'extension_manifest_schema = "1.0"',
  '"durable-multi-file-transaction-rolls-back-as-one-action"',
  '"corrupt-input-preserved-and-not-treated-as-missing"',
  '"windows-sacl-owner-and-elevation-are-never-implicitly-required"',
  '"stable-dashboard-entry-verified-before-directory-switch"',
  '"local-dashboard-composite-evidence-does-not-require-address-bar-access-alone"',
]);

requireFragments("core/upgrade/release-manifest-1.3.1.toml", [
  'release = "1.3.1"',
  'from_versions = ["1.2.1", "1.3.0"]',
  'allow_overrides_deny_for_exact_paths = [".assistant-local/.gitkeep"',
  'exact_override_policy = "only-listed-regular-zero-byte-files-may-override-forbidden-segments; directory-records-are-container-metadata-not-files"',
  'id = "release-authority-and-guidance-1.3.1"',
  'status = "published-release"',
  'future_publication_or_repository_operation_authorized = false',
]);

requireFragments("core/upgrade/release-manifest-1.4.0.toml", [
  'release = "1.4.0"',
  'from_versions = ["1.3.1"]',
  '[instance_component_changes]',
  'target_interfaces = ["agent-carry.instance-component@1"]',
  'id = "instance-component-adoption-1.4"',
  'id = "instance-component-interface-1.0"',
  'optional_incompatible_action = "disable-and-preserve"',
  'required_incompatible_action = "stop-and-preserve"',
  'status = "published-release"',
  'release_ref = "v1.4.0"',
  'instance_replacement_authorized = true',
  'future_publication_or_repository_operation_authorized = false',
]);

requireFragments("core/schemas/README.md", [
  "instance-component.schema.md",
  "原生资产与专业扩展继续复用各自已有的正式所有者",
  "blank-instance-component.toml",
]);

requireFragments("docs/change-impact-map.md", [
  "instance-evolution-compatibility",
  "既有实例先在隔离候选中一次性纳管",
  "本机软件绑定只复核",
]);

requireFragments("core/schemas/migration-kit.schema.md", [
  "`components` 数组",
  "实际纳入的 `portable_paths`",
  "`device_local_paths` 只作为“目标设备需要重新核验或重新配置”的边界记录",
  "`adoption_state` 不是 `current`",
]);

requireFragments("core/protocols/PRIVACY_IMPORT_EXPORT_SOP.md", [
  "实例独立组件按 `instance/components/registry.toml` 定向分类",
  "旧电脑绝对路径不迁移",
  "注册表尚未完成纳管",
]);

requireFragments("core/templates/migration/START-RESTORE.md", [
  "已登记独立组件的便携内容",
  "不会被主体包冒充为已安装",
  "组件清单摘要和实际便携路径",
]);

requireFragments("core/protocols/USER_GUIDANCE.md", [
  "用户已经说“以后都这样”时，不再用四个选项重复询问",
  "再只问一句“按这个范围留下，可以吗？”",
  "得到这一次真实选择后，才执行授权范围内的写入",
]);

requireFragments("README.md", [
  "卡片真正滚动进屏幕时逐张、平顺地出现",
  "三维核心会自动让出资源",
  "当前版本：`1.4.0`",
  "统一的升级兼容协定",
  "复用当前动作已经获得的授权，不额外再问一次",
]);

console.log("Formal change-quality contract validated: hit/non-hit routing, Level 3 ownership, root-cause priority, novice-safe guidance, instance evolution compatibility without a second confirmation, one-time isolated adoption, visually distinct explanation/choice/review steps, continuous private export/import guidance, progressive offscreen rendering, visible card entry rooted to the main scroll container, one scroll owner, adaptive Three.js cadence, known-file handoff, cross-host propagation, instance-asset reachability, template distribution sync, migration safety, startup budget, and idempotence.");
