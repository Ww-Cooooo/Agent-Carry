import { useCallback, useContext, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  CircleHelp,
  ClipboardCopy,
  Clock3,
  Cpu,
  Database,
  Download,
  FileArchive,
  FileCheck2,
  FileText,
  GitBranch,
  HardDrive,
  History,
  KeyRound,
  Library,
  Lightbulb,
  LockKeyhole,
  MessageCircleMore,
  PackageOpen,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  Workflow,
  X,
} from "lucide-react";
import Core from "@/components/three/Core";
import { AssetValidationGuide, ExperienceExplainer, HabitLearningGuide, MemoryAccessGuide } from "@/components/dashboard/AssetGuides";
import GrowthGuide from "@/components/dashboard/GrowthGuide";
import { GuidanceModeDialog, OnboardingDialog } from "@/components/dashboard/OnboardingDialog";
import { Button } from "@/components/ui/button";
import { localizeText } from "@/lib/i18n";
import { DashboardScrollRootContext } from "@/lib/scroll-root";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CATEGORIES,
  GROWTH_KINDS,
  LIBRARY_KINDS,
  ORBIT_PLANETS,
  categoryFor,
  routeForOrbit,
  type GrowthKind,
  type LibraryKind,
  type RouteState,
} from "@/dashboard-config";
import {
  advanced,
  assets,
  buildDashboardAction,
  capabilities,
  changes,
  evolution,
  experiences,
  getGlobalActions,
  getSnapshotStatus,
  governance,
  assetMaturityStatusToken,
  assetUsagePresentation,
  habitPresentation,
  memories,
  meta,
  overview,
  profile,
  skills,
  sops,
  todo,
  type GlobalActionDef,
} from "@/lib/data";
import {
  EmptyState,
  SectionEyebrow,
  SourceText,
  StatusBadge,
  type DetailItem,
  type DetailState,
} from "@/components/dashboard/Shared";

type Navigate = (route: RouteState) => void;
type CopyRequest = (text: string, label: string) => void;
type Inspect = (detail: DetailState) => void;

function findAction(id: string): GlobalActionDef | undefined {
  return getGlobalActions().find((action) => action.action_id === id);
}

function categoryCount(key: string): number {
  const counts: Record<string, number> = {
    memories: memories.length,
    sops: sops.length,
    capabilities: capabilities.length,
    todos: todo.filter((item) => item.visible).length,
    experiences: experiences.length,
    governance: governance.length,
    evolution: evolution.length,
    model: profile.modelStatus === "confirmed" ? 1 : 0,
  };
  return counts[key] ?? 0;
}

function carriedAssetCount(): number {
  return (
    memories.length +
    sops.length +
    capabilities.length +
    experiences.length +
    evolution.length +
    governance.length +
    todo.filter((item) => item.visible).length
  );
}

function libraryAssetCount(): number {
  return memories.length + sops.length + capabilities.length + experiences.length;
}

const REVEAL_INITIAL = { opacity: 0, y: 28, scale: 0.988 };
const REVEAL_VISIBLE = { opacity: 1, y: 0, scale: 1 };
const REVEAL_VIEWPORT = { once: true, amount: 0.12, margin: "0px 0px -8% 0px" } as const;
const REVEAL_EASE = [0.16, 0.84, 0.3, 1] as const;

function revealTransition(delay = 0) {
  return { duration: 0.56, delay, ease: REVEAL_EASE };
}

function useRevealViewport() {
  const root = useContext(DashboardScrollRootContext);
  return root ? { ...REVEAL_VIEWPORT, root } : REVEAL_VIEWPORT;
}

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduced = useReducedMotion();
  const viewport = useRevealViewport();
  return (
    <motion.div
      className={className}
      data-reveal-surface
      initial={reduced ? false : REVEAL_INITIAL}
      whileInView={reduced ? undefined : REVEAL_VISIBLE}
      viewport={viewport}
      transition={reduced ? undefined : revealTransition(delay)}
    >
      {children}
    </motion.div>
  );
}

function StartActionButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <div className="start-cta-wrap">
      <Button className="primary-cta start-cta" onClick={onClick}>
        <span className="start-cta__label"><Sparkles aria-hidden="true" />{children}</span>
        <ArrowRight aria-hidden="true" />
      </Button>
    </div>
  );
}

export function HomeView({
  onNavigate,
  onCopy,
}: {
  onNavigate: Navigate;
  onCopy: CopyRequest;
}) {
  const reduced = useReducedMotion();
  const revealViewport = useRevealViewport();
  const isTemplate = profile.state === "template";
  const pending = todo.filter((item) => item.visible && item.status !== "done");
  const instantiate = findAction("instance.instantiate");
  const firstTodoAction = pending[0] ? buildDashboardAction("todos", pending[0]) : null;
  const carryCount = carriedAssetCount();
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const selectOrbit = useCallback((key: string) => onNavigate(routeForOrbit(key)), [onNavigate]);

  const headline = isTemplate
    ? "先创建一个真正属于你的助手"
    : `待办事项 ${pending.length} 个`;
  const intro = isTemplate
    ? "先选择你舒服的交流方式。无论是否熟悉 Agent，都可以创建通用助手或专业领域助手。"
    : "今天，从这里开始。";

  const statCards = [
    { key: "memories", label: "记住了什么", value: memories.length, note: "事实、偏好和要求", icon: Database },
    { key: "sops", label: "已有流程", value: sops.length, note: "重复任务可以直接使用", icon: Workflow },
    { key: "capabilities", label: "已有能力", value: capabilities.length, note: "需要时再调用", icon: Sparkles },
    { key: "experiences", label: "任务经验", value: experiences.length, note: "成功做法和失败教训", icon: History },
  ];

  return (
    <div className="page-stack home-view">
      <section className="welcome-row" aria-labelledby="home-title">
        <div>
          <p className="welcome-kicker">{isTemplate ? "你的 AI 随身助手" : <>当前助手 · <SourceText>{profile.displayName}</SourceText></>}</p>
          <h1 id="home-title">{headline}</h1>
          <p>{intro}</p>
        </div>
        <div className="carry-count" aria-label={`当前可携带资产 ${carryCount} 项`}>
          <span>已经保存</span>
          <strong>{carryCount}</strong>
          <small>项内容</small>
        </div>
      </section>

      <section className="home-hero" aria-label="助手核心与下一步">
        <div className="orbit-card">
          <div className="orbit-card__head">
            <SectionEyebrow icon={Sparkles}>助手内容</SectionEyebrow>
            <span className="local-indicator"><i /> 保存在本机</span>
          </div>
          <div className="orbit-card__copy">
            <h2>你的记忆、流程和能力，都保存在 Agent Carry 里</h2>
            <p>当前任务需要什么，Agent 才会读取什么。点击周围的卫星，可以查看每一类内容。</p>
          </div>
          <Core
            planets={ORBIT_PLANETS}
            onSelect={selectOrbit}
            className="orbit-card__stage"
          />
          <div className="orbit-card__dock" aria-label="助手内容分类">
            {CATEGORIES.map((category) => (
              <button
                key={category.key}
                type="button"
                onClick={() => onNavigate(routeForOrbit(category.key))}
                style={{ "--category-color": category.color } as React.CSSProperties}
              >
                <span />
                {category.shortLabel}
                <strong>{categoryCount(category.key)}</strong>
              </button>
            ))}
          </div>
        </div>

        <aside className="next-card">
          <div className="next-card__number">{isTemplate ? "01" : pending.length ? String(pending.length).padStart(2, "0") : "OK"}</div>
          <SectionEyebrow icon={Lightbulb}>{isTemplate ? "第一次使用" : pending.length ? "今天先做这个" : "今天没有待办"}</SectionEyebrow>
          {isTemplate ? (
            <>
              <h2>先选交流方式，再决定把它培养成什么助手</h2>
              <p>第一次接触 Agent，可以一步步来；已经很熟悉，也可以直接讨论专业标准。正式保存前，你会先看到完整预览。</p>
              <ol className="onboarding-steps">
                <li><span>1</span><div><strong>选择交流方式</strong><small>一步步引导、适度引导或直接协作</small></div></li>
                <li><span>2</span><div><strong>选择助手方向</strong><small>通用、专业，或先让 Agent 帮你判断</small></div></li>
                <li><span>3</span><div><strong>核对后交给 Agent 创建</strong><small>网页不会直接修改或锁定任何内容</small></div></li>
              </ol>
              {instantiate ? (
                <StartActionButton onClick={() => setOnboardingOpen(true)}>
                  创建我的助手
                </StartActionButton>
              ) : null}
            </>
          ) : pending.length ? (
            <>
              <SourceText as="h2">{pending[0].title}</SourceText>
              <SourceText as="p">{pending[0].summary}</SourceText>
              <div className="next-card__queue">
                {pending.slice(0, 3).map((item, index) => (
                  <button key={item.id} type="button" onClick={() => onNavigate({ page: "growth", kind: "todos" })}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <SourceText as="strong">{item.title}</SourceText>
                    <ChevronRight aria-hidden="true" />
                  </button>
                ))}
              </div>
              {firstTodoAction ? (
                <StartActionButton onClick={() => onCopy(firstTodoAction.text, firstTodoAction.buttonLabel)}>
                  继续这项待办
                </StartActionButton>
              ) : null}
            </>
          ) : (
            <>
              <h2>现在没有需要继续的待办</h2>
              <p>直接告诉 Agent 今天想做什么即可。需要用到的记忆、流程或能力，会在任务开始后再读取。</p>
              <div className="quiet-state">
                <CheckCircle2 aria-hidden="true" />
                <div><strong>不会一次读完所有内容</strong><small>当前任务需要什么，就读取什么</small></div>
              </div>
              <Button variant="outline" className="secondary-cta" onClick={() => onNavigate({ page: "library", kind: "memories" })}>
                查看随身资产
                <ArrowRight aria-hidden="true" />
              </Button>
            </>
          )}
        </aside>
      </section>

      <Reveal>
        <section className="asset-overview render-deferred" aria-labelledby="asset-overview-title">
          <div className="section-heading">
            <div>
              <SectionEyebrow icon={Library}>随身资产</SectionEyebrow>
              <h2 id="asset-overview-title">你的长期积累都保存在这里</h2>
            </div>
            <Button variant="ghost" className="text-link" onClick={() => onNavigate({ page: "library", kind: "memories" })}>
              查看全部 <ArrowRight aria-hidden="true" />
            </Button>
          </div>
          <div className="asset-stat-grid">
            {statCards.map((card, index) => (
              <motion.button
                key={card.key}
                type="button"
                className="asset-stat"
                data-reveal-card
                initial={reduced ? false : REVEAL_INITIAL}
                whileInView={reduced ? undefined : REVEAL_VISIBLE}
                viewport={revealViewport}
                transition={reduced ? undefined : revealTransition(index * 0.055)}
                onClick={() => onNavigate(routeForOrbit(card.key))}
              >
                <span className="asset-stat__icon"><card.icon aria-hidden="true" /></span>
                <span className="asset-stat__copy"><strong>{card.label}</strong><small>{card.note}</small></span>
                <span className="asset-stat__value">{card.value}</span>
              </motion.button>
            ))}
          </div>
        </section>
      </Reveal>

      <div className="home-lower-grid">
        <motion.section
          className="changes-card render-deferred"
          data-reveal-card
          initial={reduced ? false : REVEAL_INITIAL}
          whileInView={reduced ? undefined : REVEAL_VISIBLE}
          viewport={revealViewport}
          transition={reduced ? undefined : revealTransition()}
        >
          <SectionEyebrow icon={Clock3}>最近变化</SectionEyebrow>
          <h2>最近更新了什么</h2>
          {changes.length ? (
            <ol className="change-list">
              {changes.slice(0, 5).map((change, index) => (
                <li key={`${change.date}-${index}`}>
                  <SourceText as="time">{change.date}</SourceText>
                  <SourceText>{change.summary}</SourceText>
                </li>
              ))}
            </ol>
          ) : (
            <div className="small-empty">
              <span />
              <p>{isTemplate ? "创建助手后，重要变化会从这里开始记录。" : "最近没有需要你关注的资产变化。"}</p>
            </div>
          )}
        </motion.section>

        <motion.section
          className="trust-card render-deferred"
          data-reveal-card
          initial={reduced ? false : REVEAL_INITIAL}
          whileInView={reduced ? undefined : REVEAL_VISIBLE}
          viewport={revealViewport}
          transition={reduced ? undefined : revealTransition(0.085)}
        >
          <SectionEyebrow icon={ShieldCheck}>换设备时不用重来</SectionEyebrow>
          <h2>换电脑或换 Agent 后，原来的内容仍然属于你</h2>
          <ul>
            <li><HardDrive aria-hidden="true" /><div><strong>内容保存在本地文件里</strong><span>你可以查看、复制和备份，不会被锁在某个平台中。</span></div></li>
            <li><LockKeyhole aria-hidden="true" /><div><strong>密钥不会写进助手文件</strong><span>API 密钥、密码和登录状态只通过当前 Agent 的安全方式使用。</span></div></li>
            <li><GitBranch aria-hidden="true" /><div><strong>远程备份和隐私迁移分开</strong><span>普通内容可以备份到 GitHub，隐私正文只放进本地迁移包。</span></div></li>
          </ul>
          <Button variant="outline" className="secondary-cta" onClick={() => onNavigate({ page: "transfer" })}>
            查看备份和迁移方法 <ArrowRight aria-hidden="true" />
          </Button>
        </motion.section>
      </div>
      {instantiate ? (
        <OnboardingDialog
          open={onboardingOpen}
          onOpenChange={setOnboardingOpen}
          baseRequest={instantiate.request}
          onCopy={onCopy}
        />
      ) : null}
    </div>
  );
}

function libraryItems(kind: LibraryKind): DetailItem[] {
  if (kind === "memories") return memories.map((item) => ({ ...item }));
  if (kind === "sops") return sops.map((item) => ({ ...item }));
  if (kind === "capabilities") return capabilities.map((item) => ({ ...item }));
  return experiences.map((item) => ({ ...item }));
}

const LIBRARY_EMPTY: Record<LibraryKind, { title: string; description: string }> = {
  memories: { title: "还没有长期记忆", description: "先正常使用助手。以后还会用到的事实、偏好和要求，会保存到这里。" },
  sops: { title: "还没有固定流程", description: "当一种任务重复出现，并且做法已经在真实任务中验证过，才会整理成固定流程。" },
  capabilities: { title: "还没有记录能力", description: "助手会在真实任务中记录自己会做什么，并逐步验证这些能力是否可靠。" },
  experiences: { title: "还没有任务经验", description: "完成真实任务后，值得保留的成功做法和失败教训会记录在这里。" },
};

export function LibraryView({
  kind,
  onNavigate,
  onCopy,
  onInspect,
}: {
  kind: LibraryKind;
  onNavigate: Navigate;
  onCopy: CopyRequest;
  onInspect: Inspect;
}) {
  const reduced = useReducedMotion();
  const revealViewport = useRevealViewport();
  const [query, setQuery] = useState("");
  const items = libraryItems(kind);
  const category = categoryFor(kind);
  const normalized = query.trim().toLocaleLowerCase();
  const filtered = useMemo(
    () => items.filter((item) => {
      if (!normalized) return true;
      const searchable = [
        item.title,
        item.summary,
        item.scopeSummary,
        item.sourceSummary,
        ...(item.triggers ?? []),
      ].filter(Boolean).join(" ").toLocaleLowerCase();
      return searchable.includes(normalized);
    }),
    [items, normalized],
  );
  const habitItems = kind === "memories" ? filtered.filter((item) => item.subtype === "habit") : [];
  const regularItems = kind === "memories" ? filtered.filter((item) => item.subtype !== "habit") : filtered;
  const instantiate = findAction("instance.instantiate");
  const showValidationGuide = kind === "sops" || kind === "capabilities";

  const renderAssetCards = (cardItems: DetailItem[], section?: { title: string; description: string; tone: "habit" | "regular" }) => (
    <div className={`library-asset-section ${section ? `library-asset-section--${section.tone}` : ""}`}>
      {section ? (
        <header className="library-asset-section__head">
          <div><span>{section.tone === "habit" ? "正常说任务就会命中 · 由你管理" : "长期保留 · 任务命中后读取"}</span><h2>{section.title}</h2></div>
          <p>{section.description}</p>
        </header>
      ) : null}
      <section className="asset-card-grid" aria-live="polite">
        {cardItems.map((item, index) => {
          const action = buildDashboardAction(kind, item);
          const isHabit = kind === "memories" && item.subtype === "habit";
          const habit = isHabit ? habitPresentation(item.status, item.approvalState, item.activationBasis, item.riskTier, item.approvedByUser) : null;
          const usage = isHabit ? null : assetUsagePresentation(kind, item);
          const maturityStatus = !isHabit ? assetMaturityStatusToken(kind, item) : undefined;
          return (
            <motion.article
              key={`${item.id || "missing-asset"}-${index}`}
              className={`content-card content-card--${kind} render-deferred ${isHabit ? `content-card--habit content-card--habit-${habit?.key}` : ""}`}
              data-reveal-card
              style={{ "--category-color": category.color } as React.CSSProperties}
              initial={reduced ? false : REVEAL_INITIAL}
              whileInView={reduced ? undefined : REVEAL_VISIBLE}
              viewport={revealViewport}
              transition={reduced ? undefined : revealTransition((index % 2) * 0.075)}
            >
              <button type="button" className="content-card__open" onClick={() => onInspect({ kind, item })}>
                <span className="content-card__icon"><category.icon aria-hidden="true" /></span>
                <SourceText className="content-card__title">{item.title}</SourceText>
                <ChevronRight aria-hidden="true" />
              </button>
              {item.summary ? <SourceText as="p">{item.summary}</SourceText> : <p>这条内容还没有用途说明，请让 Agent 补充后重新生成看板数据。</p>}
              <div className="content-card__meta">
                {kind === "memories" ? (
                  isHabit ? (
                    <>
                      <span className="habit-memory-badge"><Sparkles aria-hidden="true" />我的习惯 · {habit?.label}</span>
                      <span className="content-card__trigger">{item.scopeSummary ? <SourceText>{item.scopeSummary}</SourceText> : habit?.groupLine}</span>
                    </>
                  ) : (
                    <>
                      <span className="content-card__states">
                        <span><small>使用</small><StatusBadge value={usage?.statusToken} showHelp={false} /></span>
                      </span>
                      <span className="content-card__trigger">{usage?.behaviorTitle}</span>
                    </>
                  )
                ) : (
                  <>
                    <span className="content-card__states">
                      <span><small>使用</small><StatusBadge value={usage?.statusToken} showHelp={false} /></span>
                      {maturityStatus ? <span><small>成熟度</small><StatusBadge value={maturityStatus} showHelp={false} /></span> : null}
                    </span>
                    {item.triggers?.[0] ? <span className="content-card__trigger">可以这样告诉 Agent：“<SourceText>{item.triggers[0]}</SourceText>”</span> : null}
                  </>
                )}
              </div>
              {isHabit ? (
                <Button variant="ghost" className="card-action card-action--memory card-action--habit-manage" onClick={() => onInspect({ kind, item })}>
                  <Sparkles aria-hidden="true" />
                  查看与管理
                </Button>
              ) : (
                <Button variant="ghost" className={`card-action ${kind === "memories" ? "card-action--memory" : ""}`} onClick={() => onCopy(action.text, action.buttonLabel)}>
                  <ClipboardCopy aria-hidden="true" />
                  {action.buttonLabel}
                </Button>
              )}
            </motion.article>
          );
        })}
      </section>
    </div>
  );

  return (
    <div className="page-stack">
      <section className="page-intro">
        <div>
          <SectionEyebrow icon={Library}>随身资产</SectionEyebrow>
          <h1>这里保存了助手长期积累的内容</h1>
          <p>记忆、流程、能力和经验都保存在本地文件中。换 Agent 或模型后仍能继续使用，任务需要时才会读取详情。</p>
        </div>
        <div className="page-intro__number"><strong>{libraryAssetCount()}</strong><span>项内容</span></div>
      </section>

      <div className="category-toolbar">
        <div className="category-tabs" role="tablist" aria-label="随身资产分类">
          {LIBRARY_KINDS.map((tab) => {
            const metaItem = categoryFor(tab);
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={tab === kind}
                onClick={() => onNavigate({ page: "library", kind: tab })}
              >
                <metaItem.icon aria-hidden="true" />
                <span>{metaItem.label}</span>
                <strong>{categoryCount(tab)}</strong>
              </button>
            );
          })}
        </div>
        <label className="search-field">
          <Search aria-hidden="true" />
          <span className="sr-only">搜索当前分类，可匹配标题、触发语和适用范围</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题、常用说法或适用范围" />
          {query ? <button type="button" aria-label="清除搜索" onClick={() => setQuery("")}><X aria-hidden="true" /></button> : null}
        </label>
      </div>

      {showValidationGuide ? <Reveal><div className="render-deferred library-guide-deferred"><AssetValidationGuide /></div></Reveal> : null}
      {kind === "experiences" ? <Reveal><div className="render-deferred library-guide-deferred"><ExperienceExplainer /></div></Reveal> : null}

      {filtered.length ? (
        kind === "memories" ? (
          <>
            {habitItems.length ? renderAssetCards(habitItems, { title: "我的习惯", description: "直接像平常一样说要做什么；相关任务命中后，已启用习惯会自动沿用，试用习惯只在确认范围内使用。需要复核或已经停止的记录不会自动使用。", tone: "habit" }) : null}
            {regularItems.length ? renderAssetCards(regularItems, habitItems.length ? { title: "其他长期记忆", description: "保存稳定事实、背景和长期要求；只在当前任务相关时读取。", tone: "regular" } : undefined) : null}
          </>
        ) : renderAssetCards(regularItems)
      ) : (
        <EmptyState
          icon={category.icon}
          title={query ? "没有找到相关内容" : LIBRARY_EMPTY[kind].title}
          description={query ? "换一个更短的关键词，或者清除搜索查看全部内容。" : LIBRARY_EMPTY[kind].description}
          action={profile.state === "template" && instantiate ? (
            <Button className="primary-cta" onClick={() => onNavigate({ page: "home" })}>回到总览创建助手</Button>
          ) : undefined}
        />
      )}

      {kind === "memories" && !query ? (
        <Reveal>
          <details className="library-help-disclosure render-deferred">
            <summary>
              <span><Sparkles aria-hidden="true" /><strong>点击展开：习惯怎样形成，记忆怎样参与任务</strong></span>
              <small>了解主动学习、自然语言召回和手动备用入口</small>
              <ChevronRight aria-hidden="true" />
            </summary>
            <div className="library-help-disclosure__body">
              <HabitLearningGuide count={memories.filter((item) => item.subtype === "habit").length} />
              <MemoryAccessGuide />
            </div>
          </details>
        </Reveal>
      ) : null}
    </div>
  );
}

function growthItems(kind: GrowthKind): DetailItem[] {
  if (kind === "todos") return todo.filter((item) => item.visible).map((item) => ({ ...item }));
  if (kind === "evolution") return evolution.map((item) => ({ ...item }));
  return governance.map((item) => ({ ...item }));
}

const GROWTH_COPY: Record<GrowthKind, { title: string; intro: string; empty: string }> = {
  todos: {
    title: "你的待办事项",
    intro: "这里只显示你明确要求保存的待办。完成后可以从看板隐藏，记录仍会保留在本地。",
    empty: "目前没有待办。直接告诉 Agent 今天想做什么即可。",
  },
  evolution: {
    title: "看看助手最近学到了什么",
    intro: "这里是从真实任务中发现、还没有正式保存的做法。先确认以后是否有用，再决定保存成记忆、能力、经验或固定流程。",
    empty: "目前没有需要确认的学习建议。没有新发现时，任务会正常结束。",
  },
  governance: {
    title: "定期看看助手有没有更好的做法",
    intro: "这里有三项长期改进：记忆与检索、组件配合、安全防护。日期到了只提醒一次；你选中一项后，Level 3 才开始调研。",
    empty: profile.state === "template"
      ? "模板包含三项长期改进，但不会带入示例日期。创建助手后，第一次提醒日期会从实际创建时间开始计算。"
      : "目前没有长期改进项目。它们不会自动联网，也不会在后台运行。",
  },
};

export function GrowthView({
  kind,
  onNavigate,
  onCopy,
  onInspect,
}: {
  kind: GrowthKind;
  onNavigate: Navigate;
  onCopy: CopyRequest;
  onInspect: Inspect;
}) {
  const reduced = useReducedMotion();
  const revealViewport = useRevealViewport();
  const items = growthItems(kind);
  const category = categoryFor(kind);
  const copy = GROWTH_COPY[kind];

  return (
    <div className="page-stack">
      <section className="page-intro">
        <div>
          <SectionEyebrow icon={Sparkles}>待办与成长</SectionEyebrow>
          <h1>{copy.title}</h1>
          <p>{copy.intro}</p>
        </div>
        <div className="page-intro__number"><strong>{items.length}</strong><span>{category.shortLabel}</span></div>
      </section>

      <div className="category-tabs growth-tabs" role="tablist" aria-label="成长与待办分类">
        {GROWTH_KINDS.map((tab) => {
          const metaItem = categoryFor(tab);
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={tab === kind}
              onClick={() => onNavigate({ page: "growth", kind: tab })}
            >
              <metaItem.icon aria-hidden="true" />
              <span>{metaItem.label}</span>
              <strong>{categoryCount(tab)}</strong>
            </button>
          );
        })}
      </div>

      <Reveal>
        <div className="render-deferred growth-guide-deferred">
          <GrowthGuide kind={kind} count={items.length} />
        </div>
      </Reveal>

      {items.length ? (
        <section className="growth-list">
          {items.map((item, index) => {
            const action = buildDashboardAction(kind, item);
            const done = kind === "todos" && item.status === "done";
            return (
              <motion.article
                key={`${item.id || "missing-growth-item"}-${index}`}
                className={`growth-row render-deferred ${done ? "is-done" : ""}`}
                data-reveal-card
                initial={reduced ? false : REVEAL_INITIAL}
                whileInView={reduced ? undefined : REVEAL_VISIBLE}
                viewport={revealViewport}
                transition={reduced ? undefined : revealTransition(Math.min(index, 3) * 0.045)}
              >
                <div className="growth-row__index">
                  {done ? <CheckCircle2 aria-hidden="true" /> : kind === "todos" ? <Circle aria-hidden="true" /> : <span>{String(index + 1).padStart(2, "0")}</span>}
                </div>
                <button type="button" className="growth-row__main" onClick={() => onInspect({ kind, item })}>
                  <SourceText className="growth-row__title">{item.title}</SourceText>
                  {item.summary ? <SourceText className="growth-row__summary">{item.summary}</SourceText> : <span className="growth-row__summary">这条内容还没有用途说明，请让 Agent 补充后重新生成看板数据。</span>}
                  {kind === "evolution" ? (
                    <span className="growth-row__context">
                      <span><small>来源</small>{item.sourceSummary ? <SourceText>{item.sourceSummary}</SourceText> : "待补充"}</span>
                      <span><small>建议去向</small>{item.targetLabel || "待判断"}</span>
                    </span>
                  ) : null}
                </button>
                <div className="growth-row__status">
                  <StatusBadge value={item.reliability ?? item.status} />
                  {item.frequency ? <SourceText>{item.frequency}</SourceText> : null}
                </div>
                <Button variant="outline" className={`row-action ${done ? "row-action--hide" : ""}`} onClick={() => onCopy(action.text, action.buttonLabel)}>
                  <ClipboardCopy aria-hidden="true" />
                  <span>{action.buttonLabel}</span>
                </Button>
              </motion.article>
            );
          })}
        </section>
      ) : (
        <EmptyState icon={category.icon} title={`暂无${category.label}`} description={copy.empty} />
      )}

    </div>
  );
}

const GITHUB_BACKUP_STEP = {
  id: "instance.prepare-git-safe-copy",
  title: "备份到 GitHub 私有仓库",
  description: "Agent 会先在本地排除隐私、密钥和临时文件，再把账号、仓库名和准备上传的内容给你确认。只有你确认后才会上传，仓库默认不公开，也不会自动添加协作者。",
  buttonLabel: "复制 GitHub 脱敏备份指令",
};

const PRIVATE_PACKAGE_STEPS = [
  {
    id: "instance.export-private-package",
    number: "01",
    title: "从这台电脑导出隐私资料",
    description: "Agent 会先核对已登记和已引用的资料，再生成一个或多个本地分卷。资料多也只需保存同一个输出文件夹，不经过 GitHub。",
    buttonLabel: "开始导出本地隐私资料",
    icon: Download,
    tone: "mint",
  },
  {
    id: "instance.import-private-package",
    number: "02",
    title: "在另一台电脑恢复隐私资料",
    description: "把完整输出文件夹交给新电脑上的 Agent。它会校验全部分卷并恢复资料，不沿用旧电脑的绝对路径，也不会从 GitHub 下载。",
    buttonLabel: "开始在新电脑导入隐私资料",
    icon: Upload,
    tone: "amber",
  },
];

const SECONDARY_ACTION_META = {
  "dashboard.refresh-snapshot": {
    icon: RefreshCw,
    description: "当看板内容和实际文件不一致，或更新时间明显过旧时，让 Agent 从正式内容重新生成看板数据。",
  },
  "preference.reuse-from-instance": {
    icon: Sparkles,
    description: "创建另一个 Agent Carry 实例时，只复用沟通方式、输出习惯和工作节奏，不复制领域身份与具体资料。",
  },
  "instance.upgrade-template": {
    icon: Upload,
    description: "需要时让 Agent 从登记的官方发布源检查版本，先说明更新内容和个人资料如何保留，确认后再升级。",
  },
} as const;

type MigrationGuideMode = "complete" | "coverage" | "private-export" | "private-import";
type MigrationGuideChoice = "current" | "supplement" | "unsure";

function choiceInstruction(mode: MigrationGuideMode, choice: MigrationGuideChoice): string {
  if (mode === "complete") {
    if (choice === "current") {
      return "我已在看板选择“按当前清单继续迁移”。请先用普通语言列出你已经知道并将纳入的助手内容与本地资料，然后按当前清单继续；不要重新询问同一选择，也不要让我重新提供你已经知道的路径。";
    }
    if (choice === "supplement") {
      return "我已在看板选择“先补充以前的资料，再继续迁移”。请先一步一步帮助我补充接入 Agent Carry 前已有、由其他软件产生或被我手动移动的资料；补充并确认后在同一次对话中直接继续完整迁移，不要让我返回看板重新复制指令。";
    }
    return "我已在看板选择“我不确定，请帮我检查”。请先根据我的职业、最近任务和已经登记的内容，列出可能遗漏的资料类别；不要扫描整台电脑，一次只问一个真正会改变迁移范围的问题。判断完成后在同一次对话中继续完整迁移。";
  }

  if (mode === "private-export") {
    if (choice === "current") {
      return "我已在看板选择“按当前资料范围直接导出”。请先用普通语言列出已经登记、正式引用和准备纳入的本地隐私资料；确认范围后，在本地生成完整隐私资料输出文件夹。不要让我重新提供你已经知道的路径，不要上传到 GitHub 或其他远程位置。";
    }
    if (choice === "supplement") {
      return "我已在看板选择“先补充以前的资料，再导出”。请先一步一步帮助我补充接入 Agent Carry 前已有、由其他软件产生或被我手动移动的资料；补充并确认后，在同一次对话中继续生成本地隐私资料输出文件夹，不要让我返回看板重新开始。";
    }
    return "我已在看板选择“我不确定，请帮我检查”。请根据我的职业、最近任务和已经登记的内容提示可能遗漏的资料类别；不要扫描整台电脑，一次只问一个会改变导出范围的问题。判断并确认后，在同一次对话中继续本地导出。";
  }

  if (mode === "private-import") {
    if (choice === "current") {
      return "我已在看板选择“我有完整的输出文件夹”。请让我用普通语言告诉你这个文件夹的位置；先校验入口、全部分卷、文件清单、摘要和冲突，再给我恢复预览。没有通过校验前不要写入，不能只导入其中一个 ZIP。";
    }
    if (choice === "supplement") {
      return "我已在看板选择“我不确定手里的文件是否完整”。请先用普通语言告诉我怎样识别完整输出文件夹，再根据我提供的位置核对入口、全部分卷和清单；不要扫描整台电脑。材料不完整时明确告诉我缺什么，不要勉强恢复。";
    }
    return "我已在看板选择“我还没有从旧电脑导出”。现在不要假装执行导入。请先告诉我应在旧电脑打开 Agent Carry 看板的“迁移与安全”，点击“开始导出本地隐私资料”；如果旧电脑无法使用，再逐项说明仍然可行的恢复办法和限制。";
  }

  if (choice === "current") {
    return "我已在看板选择“只查看当前清单”。请用普通语言列出你已经知道、已经登记、正式引用和仍需复核的资料；不要新增范围，不要让我重新提供你已经知道的路径，也不要开始打包。";
  }
  if (choice === "supplement") {
    return "我已在看板选择“补充以前的资料”。请先列出你已经知道的内容，再一步一步帮助我补充接入 Agent Carry 前已有、由其他软件产生或被我手动移动的资料；每次只问一个必要问题，写入前用我当前交流语言给我一份清楚预览。";
  }
  return "我已在看板选择“我不确定，请帮我检查”。请根据我的职业、最近任务和已经登记的内容，列出可能遗漏的资料类别；不要扫描整台电脑，一次只问一个真正会改变登记范围的问题，最后再让我决定是否补充。";
}

function MigrationGuideDialog({
  mode,
  completeAction,
  coverageAction,
  exportAction,
  importAction,
  onClose,
  onCopy,
}: {
  mode: MigrationGuideMode;
  completeAction?: GlobalActionDef;
  coverageAction?: GlobalActionDef;
  exportAction?: GlobalActionDef;
  importAction?: GlobalActionDef;
  onClose: () => void;
  onCopy: CopyRequest;
}) {
  const reduced = useReducedMotion();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [choice, setChoice] = useState<MigrationGuideChoice | null>(null);
  const action = mode === "complete"
    ? completeAction
    : mode === "coverage"
      ? coverageAction
      : mode === "private-export"
        ? exportAction
        : importAction;
  const isComplete = mode === "complete";
  const isPrivateExport = mode === "private-export";
  const isPrivateImport = mode === "private-import";
  const visibleAssetCount = carriedAssetCount();

  const scopeOptions = [
    {
      id: "current" as const,
      icon: CheckCircle2,
      title: isComplete
        ? "按当前清单继续迁移"
        : isPrivateExport
          ? "按当前资料范围直接导出"
          : "只查看当前清单",
      description: isComplete
        ? "适合主要资料都由当前 Agent 创建或整理、没有其他旧资料需要补充的情况。"
        : isPrivateExport
          ? "Agent 先列出已经登记和正式引用的资料，你确认后直接在本地导出。"
          : "先让 Agent 列出已知、已登记和需要复核的内容，不新增资料，也不开始打包。",
      note: isComplete || isPrivateExport ? "最快开始" : "不会修改",
    },
    {
      id: "supplement" as const,
      icon: History,
      title: isComplete
        ? "先补充以前的资料，再继续"
        : isPrivateExport
          ? "先补充以前的资料，再导出"
          : "补充以前的资料",
      description: "适合接入 Agent Carry 前已有、由其他软件生成，或后来被你手动移动的资料。",
      note: "一步一步引导",
    },
    {
      id: "unsure" as const,
      icon: CircleHelp,
      title: "我不确定，请帮我检查",
      description: "Agent 会根据你的职业和真实任务提示可能遗漏的类别，一次只问一个问题，不扫描整台电脑。",
      note: "适合不熟悉文件的人",
    },
  ];
  const importOptions = [
    {
      id: "current" as const,
      icon: FileArchive,
      title: "我有完整的输出文件夹",
      description: "文件夹里有恢复说明、总清单和全部隐私分卷。Agent 会先完整校验，再展示恢复预览。",
      note: "可以开始核对",
    },
    {
      id: "supplement" as const,
      icon: Search,
      title: "我不确定手里的文件是否完整",
      description: "把你知道的位置告诉 Agent，它会帮你识别缺少的入口、分卷或清单，不会勉强恢复。",
      note: "先检查再决定",
    },
    {
      id: "unsure" as const,
      icon: CircleHelp,
      title: "我还没有从旧电脑导出",
      description: "Agent 会先告诉你回到旧电脑怎样导出；旧电脑无法使用时，再说明其他恢复办法和限制。",
      note: "先完成导出",
    },
  ];
  const options = isPrivateImport ? importOptions : scopeOptions;

  const selected = options.find((option) => option.id === choice);
  const title = step === 1
    ? (isComplete
      ? "先看清哪些内容会跟着助手走"
      : isPrivateExport
        ? "先看清这次会导出哪些本地资料"
        : isPrivateImport
          ? "先确认你准备的是完整输出文件夹"
          : "先看清 Agent 已经掌握了什么")
    : step === 2
      ? (isPrivateImport ? "你现在手里的资料是哪种情况？" : "还有没有需要补充的旧资料？")
      : "请核对你刚刚选择的信息";
  const description = step === 1
    ? (isPrivateImport
      ? "导入时需要的是旧电脑生成的整个输出文件夹，不是其中一个 ZIP，也不是 GitHub 下载包。看板先把区别说清楚。"
      : "你不需要自己维护文件路径。看板先把范围说清楚，真正的本地清单由当前 Agent 在执行时读取并用你当前交流语言列给你。")
    : step === 2
      ? "请选择最符合当前情况的一项。拿不准也没关系，第三项会让 Agent 帮你判断。"
      : "下面只是只读核对，不需要再点卡片。信息正确就点击窗口底部醒目的按钮；需要修改则返回上一步。";
  const modeLabel = isComplete
    ? "完整换机迁移"
    : isPrivateExport
      ? "导出本地隐私资料"
      : isPrivateImport
        ? "导入本地隐私资料"
        : "本地资料范围";
  const stepPhase = step === 1 ? "先了解" : step === 2 ? "做选择" : "只核对";
  const firstStepPrompt = isPrivateImport
    ? "先了解完整输出文件夹需要包含什么；这一页不用选择，下一步再说明你手里的资料情况。"
    : "先了解会处理什么、不会处理什么；这一页不用选择，下一步再决定怎样继续。";
  const finalButtonLabel = isComplete
    ? "核对无误，复制完整换机指令"
    : isPrivateExport
      ? "核对无误，复制隐私资料导出指令"
      : isPrivateImport
        ? "核对无误，复制隐私资料导入指令"
        : "核对无误，复制查看与补充指令";
  const reviewSteps = isPrivateImport
    ? [
      ["把指令发给新电脑上的 Agent", "Agent 会承接你刚才选择的情况，不让你重新判断一次。"],
      [choice === "current" ? "校验整个输出文件夹" : choice === "supplement" ? "先判断材料是否完整" : "先引导旧电脑完成导出", "不会只看一个 ZIP，也不会在材料不完整时勉强恢复。"],
      ["通过检查后再展示恢复预览", "确认目标位置、冲突和秘密重新配置要求后，才会写入新电脑。"],
    ]
    : isPrivateExport
      ? [
        ["把指令发给当前 Agent", "看板会把刚才的选择写进指令，不会让你重新选择。"],
        [choice === "supplement" ? "先补充，再确认导出范围" : choice === "unsure" ? "先帮你判断可能遗漏的资料" : "先列出当前资料范围", "Agent 复用已知位置，只对真正不知道的部分提问。"],
        ["在本地生成完整输出文件夹", "资料多时会自动分卷；不会上传 GitHub、网站或其他远程位置。"],
      ]
      : [
        ["把完整指令发给当前 Agent", "看板会把刚刚的选择写进指令；当前 Agent 不会让你从头重新选择。"],
        [choice === "supplement" ? "先补充，再确认范围" : choice === "unsure" ? "先帮你判断可能遗漏的资料" : "先列出当前清单", "Agent 会复用已知位置，只对真正不知道或会改变结果的地方提问。"],
        [isComplete ? "在同一次对话中继续生成迁移套件" : "确认后更新本地资料范围", isComplete ? "完成后会告诉你套件保存位置、检查结果和发给新 Agent 的固定恢复话术。" : "这里只查看或登记范围，不会自动打包、上传、移动或删除文件。"],
      ];

  function copyGuidedRequest() {
    if (!action || !choice) return;
    const request = `${action.request}\n\n【我已经在看板完成的选择】\n${choiceInstruction(mode, choice)}`;
    onClose();
    window.setTimeout(() => onCopy(request, action.label), 0);
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="migration-guide-dialog sm:max-w-[860px]">
        <DialogHeader className="migration-guide-dialog__header">
          <div className="migration-guide-dialog__meta">
            <span>{modeLabel}</span>
            <strong>{localizeText(`第 ${step} 步，共 3 步 · ${stepPhase}`)}</strong>
          </div>
          <div className="migration-guide-dialog__progress" aria-label={`当前第 ${step} 步，共 3 步`}>
            {[1, 2, 3].map((item) => <i key={item} className={item <= step ? "is-active" : ""} />)}
          </div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="migration-guide-dialog__stage" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${mode}-${step}`}
              initial={reduced ? false : { opacity: 0, x: step === 1 ? 0 : 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduced ? undefined : { opacity: 0, x: -10 }}
              transition={{ duration: 0.2, ease: [0.16, 0.84, 0.3, 1] }}
            >
              {step === 1 ? (
                <section className="migration-guide-explainer" aria-label="本页只用于了解流程，不需要选择">
                  <header className="migration-guide-explainer__hero">
                    <span><FileText aria-hidden="true" /></span>
                    <div><small>第 1 步 · 流程说明</small><strong>这一页没有需要选择的内容</strong><p>{firstStepPrompt}</p></div>
                    <em>无需选择</em>
                  </header>
                  <ol className="migration-guide-explainer__flow">
                    <li>
                      <span className="migration-guide-explainer__number">01</span>
                      <span className="migration-guide-explainer__icon">{isPrivateImport ? <FileArchive aria-hidden="true" /> : isPrivateExport ? <Database aria-hidden="true" /> : <PackageOpen aria-hidden="true" />}</span>
                      <div>
                        <strong>{isPrivateImport ? "需要整个输出文件夹" : isPrivateExport ? "已经登记或正式引用的资料" : "Agent Carry 里的积累"}</strong>
                        <p>{isPrivateImport
                          ? "不要只挑一个 ZIP。请保留旧电脑导出时生成的恢复说明、总清单和全部分卷。"
                          : isPrivateExport
                            ? "只导出本地隐私资料，不重复打包 Agent Carry 主体；真正导出前还会重新核对范围。"
                            : profile.state === "instance"
                              ? `看板目前可确认 ${visibleAssetCount} 项随身资产，迁移时还会按正式文件重新核对。`
                              : "当前还是空白模板；创建助手后，记忆、能力、SOP 和成长内容会随主体包迁移。"}</p>
                      </div>
                    </li>
                    <li>
                      <span className="migration-guide-explainer__number">02</span>
                      <span className="migration-guide-explainer__icon">{isPrivateImport ? <FileCheck2 aria-hidden="true" /> : <Database aria-hidden="true" />}</span>
                      <div>
                        <strong>{isPrivateImport ? "先校验，再恢复" : "当前 Agent 知道的本地资料"}</strong>
                        <p>{isPrivateImport
                          ? "新电脑上的 Agent 会先核对全部分卷、文件清单和摘要；材料不完整就停止并说明缺什么。"
                          : "它创建、移动、整理或已经登记的资料会复用实际位置，不需要你重新寻找路径。"}</p>
                      </div>
                    </li>
                    <li>
                      <span className="migration-guide-explainer__number">03</span>
                      <span className="migration-guide-explainer__icon"><ShieldCheck aria-hidden="true" /></span>
                      <div>
                        <strong>{isPrivateImport ? "不会直接覆盖现有资料" : "明确不会自动带走的内容"}</strong>
                        <p>{isPrivateImport
                          ? "发现目标位置冲突、危险路径或摘要不一致时会先停止；密钥和登录状态仍需重新配置。"
                          : "密钥、密码和登录状态不进迁移包；电脑其他位置也不会被偷偷扫描。"}</p>
                      </div>
                    </li>
                  </ol>
                  <footer className="migration-guide-explainer__footnote">
                    <ShieldCheck aria-hidden="true" />
                    <p>
                      <strong>{isPrivateImport ? "这里说的不是 GitHub 下载包" : "为什么看板不直接显示具体文件名和路径？"}</strong>
                      <span>{isPrivateImport
                        ? "本地隐私输出文件夹由旧电脑单独生成，不经过 GitHub。把完整文件夹交给新电脑上的 Agent，它才有条件校验和恢复。"
                        : "这是为了避免把隐私目录投影到页面。完整指令交给当前 Agent 后，它会从本地正式记录读取，并先用你当前交流语言说明清单。"}</span>
                    </p>
                  </footer>
                </section>
              ) : null}

              {step === 2 ? (
                <fieldset className="migration-guide-choices">
                  <legend className="sr-only">选择怎样处理当前资料范围</legend>
                  {options.map((option) => {
                    const Icon = option.icon;
                    const active = choice === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        className={active ? "is-selected" : ""}
                        aria-pressed={active}
                        onClick={() => setChoice(option.id)}
                      >
                        <span className="migration-guide-choices__icon"><Icon aria-hidden="true" /></span>
                        <span className="migration-guide-choices__copy"><small>{option.note}</small><strong>{option.title}</strong><p>{option.description}</p></span>
                        <span className="migration-guide-choices__state" aria-hidden="true">{active ? <Check /> : <ChevronRight />}</span>
                      </button>
                    );
                  })}
                </fieldset>
              ) : null}

              {step === 3 && selected ? (
                <section className="wizard-review-sheet wizard-review-sheet--migration" aria-label="迁移处理方式核对单">
                  <header className="wizard-review-sheet__hero">
                    <span className="wizard-review-sheet__mark"><CheckCircle2 aria-hidden="true" /></span>
                    <div>
                      <small>第 3 步 · 核对单</small>
                      <strong>这一步没有任何选项</strong>
                      <p>只需检查处理方式和接下来的步骤。内容正确就点击窗口底部的“核对无误”；需要调整就返回修改。</p>
                    </div>
                    <span className="wizard-review-sheet__badge">无需选择 · 只需核对</span>
                  </header>
                  <div className="migration-guide-review__summary">
                    <span><selected.icon aria-hidden="true" /></span>
                    <div><small>本次处理方式</small><strong>{selected.title}</strong><p>{selected.description}</p></div>
                    <em><Check aria-hidden="true" />已选择</em>
                  </div>
                  <div className="migration-guide-review__route">
                    <span>确认后，Agent 会按这个顺序继续</span>
                    <ol>
                      {reviewSteps.map(([heading, detail], index) => (
                        <li key={heading}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{heading}</strong><p>{detail}</p></div></li>
                      ))}
                    </ol>
                  </div>
                  <footer className="wizard-review-sheet__footnote">
                    <ShieldCheck aria-hidden="true" />
                    <p>看板不会读取隐私正文、扫描整台电脑或执行迁移；真正操作前，当前 Agent 仍会按你的选择展示必要预览。</p>
                  </footer>
                </section>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="migration-guide-dialog__footer">
          <Button variant="outline" className="control-button" onClick={step === 1 ? onClose : () => setStep((step - 1) as 1 | 2)}>
            {step === 1 ? "暂时不处理" : <><ArrowLeft aria-hidden="true" />{step === 3 ? "返回修改" : "返回上一步"}</>}
          </Button>
          {step < 3 ? (
            <Button className="control-button migration-guide-dialog__next" disabled={step === 2 && !choice} onClick={() => setStep((step + 1) as 2 | 3)}>
              {step === 1 ? (isPrivateImport ? "我了解了，下一步说明情况" : "我了解了，下一步做选择") : "选好了，进入核对"}
              <ArrowRight aria-hidden="true" />
            </Button>
          ) : (
            <div className="wizard-final-action">
              <Button className="control-button migration-guide-dialog__next migration-guide-dialog__next--final" disabled={!action || !choice} onClick={copyGuidedRequest}>
                <CheckCircle2 aria-hidden="true" />
                {finalButtonLabel}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TransferView({ onCopy }: { onCopy: CopyRequest }) {
  const [guideMode, setGuideMode] = useState<MigrationGuideMode | null>(null);
  const guideOpenerRef = useRef<HTMLButtonElement | null>(null);
  const secondaryIds = ["dashboard.refresh-snapshot", "preference.reuse-from-instance", "instance.upgrade-template"];
  const secondary = secondaryIds.map(findAction).filter((action): action is GlobalActionDef => Boolean(action));
  const githubAction = findAction(GITHUB_BACKUP_STEP.id);
  const localAgentAction = findAction("host.prepare-agent-switch");
  const completeMigrationAction = findAction("instance.prepare-complete-migration");
  const privateCoverageAction = findAction("instance.review-private-coverage");
  const privateExportAction = findAction("instance.export-private-package");
  const privateImportAction = findAction("instance.import-private-package");

  const openGuide = (mode: MigrationGuideMode, opener: HTMLButtonElement) => {
    guideOpenerRef.current = opener;
    setGuideMode(mode);
  };

  const closeGuide = () => {
    const opener = guideOpenerRef.current;
    setGuideMode(null);
    queueMicrotask(() => {
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    });
  };

  return (
    <div className="page-stack">
      <section className="page-intro transfer-intro">
        <div>
          <SectionEyebrow icon={PackageOpen}>迁移与安全</SectionEyebrow>
          <h1>换电脑或换 Agent 后，也能继续使用原来的内容</h1>
          <p>先看你是只想在这台电脑上换一个 Agent，还是要把整个助手带到另一台电脑。下面还保留 GitHub 私有仓库脱敏备份和隐私包导入导出，方便你按需单独操作。</p>
        </div>
        <div className="transfer-intro__mark"><FileArchive aria-hidden="true" /><span>先选去向<br />再准备内容</span></div>
      </section>

      <Reveal>
        <section className="assistant-relocation" aria-labelledby="assistant-relocation-title">
          <div className="assistant-relocation__head">
            <div>
              <SectionEyebrow icon={PackageOpen}>把整个助手继续带在身边</SectionEyebrow>
              <h2 id="assistant-relocation-title">你要去的是另一个本地 Agent，还是另一台电脑？</h2>
              <p>实例身份、方向、交流方式、记忆、能力、固定流程、经验、成长内容、待办和长期状态都属于你的可携带积累。选对去向后，Agent 会采用相应方式准备。</p>
            </div>
            <span className="assistant-relocation__badge">两种去向 · 两种做法</span>
          </div>

          <div className="assistant-relocation__grid">
            <article className="relocation-scenario relocation-scenario--local">
              <div className="relocation-scenario__top">
                <span className="relocation-scenario__icon"><Cpu aria-hidden="true" /></span>
                <span className="relocation-scenario__place">同一台电脑</span>
              </div>
              <h3>换到另一个本地 Agent 继续使用</h3>
              <p>例如从 Codex 换到 Claude Code、Trae 或其他本地 Agent。它们直接接入当前这份 Agent Carry，不需要把整套内容再复制一遍。</p>
              <div className="relocation-local-route" aria-label="同一台电脑换 Agent 的接入路线">
                <span><HardDrive aria-hidden="true" /><strong>同一份 Agent Carry</strong><small>可携带资产主本</small></span>
                <ArrowRight aria-hidden="true" />
                <span><Cpu aria-hidden="true" /><strong>另一个本地 Agent</strong><small>按需读取，不一次全载入</small></span>
              </div>
              <p className="relocation-scenario__note"><ShieldCheck aria-hidden="true" />如果目标 Agent 只能接收文字，才生成当前任务所需的极小文字胶囊，不导出全部长期资产。</p>
              {localAgentAction ? (
                <Button className="relocation-scenario__action" onClick={() => onCopy(localAgentAction.request, localAgentAction.label)}>
                  <ClipboardCopy aria-hidden="true" />
                  复制本机 Agent 接入指令
                </Button>
              ) : null}
            </article>

            <article className="relocation-scenario relocation-scenario--computer">
              <div className="relocation-scenario__top">
                <span className="relocation-scenario__icon"><PackageOpen aria-hidden="true" /></span>
                <span className="relocation-scenario__place">另一台电脑</span>
              </div>
              <h3>把完整的 Agent Carry 迁移过去</h3>
              <p>Agent 会先列出已经知道的助手资产和本地资料，只请你补充它不知道的部分；确认后在同一次对话中生成迁移套件，不要求你先学会管理文件。</p>
              <div className="relocation-kit" aria-label="完整换机迁移套件包含三部分">
                <span><FileArchive aria-hidden="true" /><strong>助手主体包</strong><small>记忆、能力、SOP、经验和成长内容</small></span>
                <span><KeyRound aria-hidden="true" /><strong>本地隐私分卷</strong><small>资料多时自动拆分，仍放在同一文件夹</small></span>
                <span><FileText aria-hidden="true" /><strong>START-RESTORE.md</strong><small>新电脑上的 Agent 从这里开始恢复</small></span>
              </div>
              <div className="relocation-handoff" aria-label="迁移套件完成后的交接话术">
                <FileText aria-hidden="true" />
                <div>
                  <strong>打包完成后，当前 Agent 会给你一句可以直接发给新 Agent 的话</strong>
                  <p>请先读取迁移套件里的 START-RESTORE.md，按照里面的步骤帮我恢复 Agent Carry，完成后告诉我检查结果。</p>
                </div>
              </div>
              <p className="relocation-scenario__note"><ShieldCheck aria-hidden="true" />API 密钥、密码和登录状态不会进入迁移包，需要在新电脑上重新配置；GitHub 私有仓库脱敏备份是可选项，不是迁移前提。</p>
              {completeMigrationAction ? (
                <Button className="relocation-scenario__action relocation-scenario__action--primary" onClick={(event) => openGuide("complete", event.currentTarget)}>
                  <PackageOpen aria-hidden="true" />
                  开始准备换电脑
                </Button>
              ) : null}
            </article>
          </div>

          <p className="assistant-relocation__footnote"><ShieldCheck aria-hidden="true" />这里会先用三步引导帮你确认资料范围，最后才生成完整操作指令。看板不会自行打包、上传或删除任何内容；实际执行仍由当前 Agent 按指令检查并向你报告。</p>
        </section>
      </Reveal>

      <Reveal>
        <section className="transfer-channel transfer-channel--github" aria-labelledby="github-backup-title">
          <div className="transfer-channel__head">
            <div>
              <SectionEyebrow icon={GitBranch}>远程备份</SectionEyebrow>
              <h2 id="github-backup-title">把不含隐私正文的内容备份到 GitHub 私有仓库</h2>
              <p>这个仓库保存在 GitHub，默认只有你自己的账号可以访问。隐私内容和密钥不会上传。</p>
            </div>
            <span className="transfer-channel__badge">远程 · GitHub</span>
          </div>

          <div className="github-backup-layout">
            <div className="github-backup-route" aria-label="GitHub 私有仓库脱敏备份过程">
              <div><HardDrive aria-hidden="true" /><strong>当前 Agent Carry</strong><span>选择可以备份的内容</span></div>
              <span className="transfer-route-arrow" aria-hidden="true"><ArrowRight /></span>
              <div><ShieldCheck aria-hidden="true" /><strong>先在本地检查</strong><span>排除隐私和密钥，再请你确认</span></div>
              <span className="transfer-route-arrow" aria-hidden="true"><ArrowRight /></span>
              <div><GitBranch aria-hidden="true" /><strong>GitHub 私有仓库</strong><span>远程保存，默认只有本人可以访问</span></div>
            </div>
            <article className="transfer-action-card transfer-action-card--github">
              <span className="transfer-action-card__number">单独操作</span>
              <h3>{GITHUB_BACKUP_STEP.title}</h3>
              <p>{GITHUB_BACKUP_STEP.description}</p>
              {githubAction ? (
                <Button className="transfer-step__action transfer-step__action--primary" onClick={() => onCopy(githubAction.request, githubAction.label)}>
                  <ClipboardCopy aria-hidden="true" />
                  {GITHUB_BACKUP_STEP.buttonLabel}
                </Button>
              ) : null}
            </article>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="transfer-channel transfer-channel--private" aria-labelledby="private-package-title">
          <div className="transfer-channel__head">
            <div>
              <SectionEyebrow icon={KeyRound}>迁移本地隐私</SectionEyebrow>
              <h2 id="private-package-title">导出或恢复本地隐私资料</h2>
              <p>不需要先去页面别处管理资料。点击“开始导出”后，弹窗会先让你查看当前范围、补充以前的资料，或请 Agent 帮你判断，然后在同一次对话中继续导出。</p>
            </div>
            <span className="transfer-channel__badge transfer-channel__badge--private">本地 · 不上传</span>
          </div>

          <div className="private-package-flow">
            {PRIVATE_PACKAGE_STEPS.map((step, index) => {
              const action = findAction(step.id);
              return (
                <div className="private-package-flow__unit" key={step.id}>
                  <article className={`transfer-action-card transfer-action-card--${step.tone}`}>
                    <div className="transfer-step__top"><span>{step.number}</span><step.icon aria-hidden="true" /></div>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                    {action ? (
                      index === 0 ? (
                        <div className="private-package-actions">
                          <Button className="transfer-step__action transfer-step__action--primary" onClick={(event) => openGuide("private-export", event.currentTarget)}>
                            <Download aria-hidden="true" />
                            {step.buttonLabel}
                          </Button>
                          {privateCoverageAction ? (
                            <Button variant="outline" className="private-package-actions__secondary" onClick={(event) => openGuide("coverage", event.currentTarget)}>
                              <Database aria-hidden="true" />
                              暂时不导出，只查看或补充范围
                            </Button>
                          ) : null}
                        </div>
                      ) : (
                        <Button className="transfer-step__action transfer-step__action--primary" onClick={(event) => openGuide("private-import", event.currentTarget)}>
                          <Upload aria-hidden="true" />
                          {step.buttonLabel}
                        </Button>
                      )
                    ) : null}
                  </article>
                  {index === 0 ? (
                    <div className="private-package-connector" aria-hidden="true">
                      <FileArchive />
                      <span>把整个输出文件夹带到另一台电脑</span>
                      <ArrowRight />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="safety-panel safety-panel--user-note">
          <div className="safety-panel__lead">
            <span><ShieldCheck aria-hidden="true" /></span>
            <div><SectionEyebrow icon={LockKeyhole}>安全提醒</SectionEyebrow><h2>下面是给你看的提醒，不需要复制给 Agent</h2></div>
          </div>
          <p className="safety-panel__plain-note">只有写着“复制……指令”的按钮才会生成给 Agent 的请求。下面三条只是帮助你判断哪些内容可以提供、哪些内容不能发送。</p>
          <ol className="safety-grid">
            <li><span>01</span><div><strong>只提供任务真正需要的隐私内容</strong><p>姓名、地址、工作或健康资料可以在任务需要时交给当前模型，但不用一次提供整个隐私目录。</p></div></li>
            <li><span>02</span><div><strong>不要把密钥粘贴进对话或迁移文件</strong><p>API 密钥、密码、令牌、Cookie、私钥、恢复码和登录状态，应通过当前 Agent 的登录或密钥管理功能使用。</p></div></li>
            <li><span>03</span><div><strong>发到其他地方前，先确认接收方</strong><p>网站、邮件、插件、其他 Agent、其他人和远程仓库都是新的接收方。确认对方确实需要，再发送必要内容。</p></div></li>
          </ol>
        </section>
      </Reveal>

      {secondary.length ? (
        <Reveal>
        <section className="secondary-actions">
          <div className="secondary-actions__head">
            <SectionEyebrow icon={FileCheck2}>按需操作</SectionEyebrow>
            <h2>偶尔会用到的功能</h2>
            <p>每一项都会先复制一份完整指令，由你交给当前 Agent。看板本身不会直接修改文件或开始迁移。</p>
          </div>
          <div className="secondary-actions__list">
            {secondary.map((action) => {
              const item = SECONDARY_ACTION_META[action.action_id as keyof typeof SECONDARY_ACTION_META];
              const Icon = item?.icon ?? FileCheck2;
              return (
                <button key={action.action_id} type="button" onClick={() => onCopy(action.request, action.label)}>
                  <span className="secondary-actions__icon"><Icon aria-hidden="true" /></span>
                  <span className="secondary-actions__copy"><strong>{action.label}</strong><small>{item?.description ?? "复制完整操作指令，并交给当前 Agent 处理。"}</small></span>
                  <ChevronRight className="secondary-actions__chevron" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </section>
        </Reveal>
      ) : null}
      {guideMode ? (
        <MigrationGuideDialog
          mode={guideMode}
          completeAction={completeMigrationAction}
          coverageAction={privateCoverageAction}
          exportAction={privateExportAction}
          importAction={privateImportAction}
          onClose={closeGuide}
          onCopy={onCopy}
        />
      ) : null}
    </div>
  );
}

const MODEL_LEVELS = [
  {
    level: 1,
    title: "日常任务",
    bestFor: "目标清楚、步骤明确，或者可以照着现成流程完成的任务。",
    value: "速度快、成本低。普通工作优先使用；遇到需要判断的地方，再交给 Level 2。",
    icon: Workflow,
  },
  {
    level: 2,
    title: "需要判断的任务",
    bestFor: "整理学习建议、判断两条记忆是否属于同一类，或者处理范围和风险不够明确的任务。",
    value: "更擅长归纳和判断。遇到架构、安全规则或高风险决定时，再交给 Level 3。",
    icon: Search,
  },
  {
    level: 3,
    title: "重要决策和设计",
    bestFor: "创建助手、修改核心架构或安全规则、作出长期决定，以及处理多个部分一起变化的升级。",
    value: "负责把重要问题想完整，也可以为 Level 1 写清执行计划；日常工作不需要都用 Level 3。",
    icon: ShieldCheck,
  },
] as const;

export function SystemView({ onRefresh, onCopy, refreshIn, refreshFailed = false }: { onRefresh: () => void; onCopy: CopyRequest; refreshIn: number; refreshFailed?: boolean }) {
  const snapshot = getSnapshotStatus(refreshFailed);
  const [guidanceOpen, setGuidanceOpen] = useState(false);
  const guidanceAction = findAction("profile.adjust-guidance-mode");
  const startupBudget = Math.max(Number(profile.startupBudget ?? 0), 1);
  const startupChars = Math.max(Number(profile.startupChars ?? 0), 0);
  const budgetRatio = Math.min((startupChars / startupBudget) * 100, 100);

  return (
    <div className="page-stack">
      <section className="page-intro">
        <div>
          <SectionEyebrow icon={Cpu}>当前状态</SectionEyebrow>
          <h1>这里可以查看助手现在的状态</h1>
          <p>你可以看到当前模型、学习方式、三个等级分别适合什么任务、看板数据是否正常，以及助手怎样按需读取内容。技术信息放在页面底部。</p>
        </div>
        <Button variant="outline" className="refresh-button" onClick={onRefresh}>
          <RefreshCw aria-hidden="true" />
          重新读取看板数据 · {refreshIn}s
        </Button>
      </section>

      <section className="health-grid" aria-label="当前系统概况">
        <article className={`health-card health-card--${snapshot.healthTone}`}>
          <span><HardDrive aria-hidden="true" /></span><div><small>看板数据</small><strong>{snapshot.label}</strong><p>{snapshot.cardDetail}</p></div>
        </article>
        <article className="health-card">
          <span><Cpu aria-hidden="true" /></span><div><small>当前模型</small>{profile.state === "instance" ? <SourceText as="strong">{profile.model}</SourceText> : <strong>{profile.model}</strong>}<p>{profile.modelLevel != null ? `Level ${profile.modelLevel} · ` : ""}{profile.state === "instance" ? <SourceText>{profile.modelPlatform}</SourceText> : profile.modelPlatform}</p></div>
        </article>
        <article className="health-card">
          <span><Database aria-hidden="true" /></span><div><small>已经保存的内容</small><strong>{carriedAssetCount()} 项</strong><p>从看板隐藏的记录仍保存在本地；模型和本地扩展不计入</p></div>
        </article>
        <article className="health-card">
          <span><Sparkles aria-hidden="true" /></span><div><small>本地扩展</small><strong>{skills.count ?? assets.skills} 项</strong><p>{skills.status ?? "按真实任务需要再加载"}</p></div>
        </article>
        <article className="health-card">
          <span><Lightbulb aria-hidden="true" /></span><div><small>学习方式</small><strong>{profile.learningPolicyLabel}</strong><p>{profile.learningPolicy === "risk-tiered" ? "第一次发现仍会先问你；风险只决定候选先验证、先复核，变成正式资产前仍要你明确确认。" : profile.learningPolicy === "manual-only" ? "发现值得留下的内容时会先问你；候选观察、复核和正式采用都等你确认。" : "创建助手时选择；无论哪种方式，第一次发现和正式采用都会问你。"}</p></div>
        </article>
      </section>

      <Reveal>
      <section className="model-level-panel render-deferred" aria-labelledby="model-level-title">
        <div className="model-level-panel__head">
          <div>
            <SectionEyebrow icon={Cpu}>模型等级怎么选</SectionEyebrow>
            <h2 id="model-level-title">选模型时，先看任务有多复杂、多重要</h2>
            <p>等级表示这次任务需要多少理解和判断，不代表某个模型永远只能属于一个等级。</p>
          </div>
          <span className="model-level-panel__current">
            {profile.modelLevel != null ? `当前确认：Level ${profile.modelLevel}` : "当前等级尚未确认"}
          </span>
        </div>
        <div className="model-level-grid">
          {MODEL_LEVELS.map((item) => {
            const isCurrent = profile.modelLevel === item.level;
            return (
              <article key={item.level} className={isCurrent ? "is-current" : undefined}>
                <div className="model-level-card__top">
                  <span className="model-level-card__icon"><item.icon aria-hidden="true" /></span>
                  <span className="model-level-card__number">Level {item.level}</span>
                  {isCurrent ? <strong>当前任务</strong> : null}
                </div>
                <h3>{item.title}</h3>
                <p>{item.bestFor}</p>
                <div><span>它的价值</span><p>{item.value}</p></div>
              </article>
            );
          })}
        </div>
        <p className="model-level-panel__note">如果任务需要更高等级，Agent 会说明原因、建议切到哪个等级以及切换后要做什么，并等待你确认。它不会自行切换或偷偷降低等级。</p>
      </section>
      </Reveal>

      <Reveal>
      <section className="context-panel render-deferred">
        <div className="context-panel__copy">
          <SectionEyebrow icon={Lightbulb}>按需读取</SectionEyebrow>
          <h2>先看目录，真正用到时再读取内容</h2>
          <p>记忆、安全规则、学习方法和固定流程（SOP）都保存在本地，但不会在每次启动时一次全部交给模型。</p>
          <div className="budget-meter">
            <div><span>当前启动字符</span><strong>{startupChars.toLocaleString()} / {startupBudget.toLocaleString()}</strong></div>
            <span className="budget-meter__track"><i style={{ width: `${budgetRatio}%` }} /></span>
          </div>
        </div>
        <ol className="route-story">
          <li><span>01</span><div><strong>先确认助手现在是什么状态</strong><p>只查看身份、未完成操作和内容目录。</p></div></li>
          <li><span>02</span><div><strong>找到当前任务需要的内容</strong><p>例如有关的记忆、能力或安全说明。</p></div></li>
          <li><span>03</span><div><strong>只读取这些内容的详情</strong><p>任务完成后，再判断有没有值得长期保存的新发现。</p></div></li>
        </ol>
      </section>
      </Reveal>

      <Reveal>
      <section className="system-details-grid render-deferred">
        <article>
          <SectionEyebrow icon={ShieldCheck}>长期改进</SectionEyebrow>
          <h2>{governance.length ? `${governance.length} 项长期改进计划` : "模板没有预设提醒日期"}</h2>
          <p>{governance.length ? "日期到了只提醒一次。你选择后才会读取那一项的说明，并交给 Level 3 调研。" : "新助手会从实际创建时间计算第一次提醒日期。平时不读取详细内容，也不会在后台联网。"}</p>
        </article>
        <article>
          <SectionEyebrow icon={FileText}>当前身份</SectionEyebrow>
          {profile.state === "instance" ? <SourceText as="h2">{profile.displayName}</SourceText> : <h2>{profile.displayName}</h2>}
          {profile.mission ? profile.state === "instance" ? <SourceText as="p">{profile.mission}</SourceText> : <p>{profile.mission}</p> : <p>尚未设置使命。</p>}
          <dl>
            <div><dt>状态</dt><dd>{profile.state === "template" ? "等待第一次设置" : profile.state === "snapshot-unavailable" ? "看板数据不可用" : "已经创建"}</dd></div>
            <div><dt>方向</dt><dd>{profile.state === "template" ? "尚未选择" : overview.domain || profile.domainId ? <SourceText>{overview.domain || profile.domainId}</SourceText> : "尚未设置"}</dd></div>
            <div><dt>交流方式</dt><dd>{profile.guidanceLabel}</dd></div>
          </dl>
          {profile.state === "instance" && guidanceAction ? (
            <Button variant="outline" className="identity-guidance-action" onClick={() => setGuidanceOpen(true)}>
              <MessageCircleMore aria-hidden="true" />调整交流方式
            </Button>
          ) : null}
        </article>
      </section>
      </Reveal>

      <details className="advanced-details render-deferred">
        <summary><span><FileText aria-hidden="true" />维护者技术信息</span><ChevronRight aria-hidden="true" /></summary>
        <div>
          <dl className="technical-list">
            <div><dt>产品版本</dt><dd>{profile.version}</dd></div>
            <div><dt>快照 Schema</dt><dd>{meta.schema_version ?? "—"}</dd></div>
            <div><dt>正式文件数</dt><dd>{advanced.file_count ?? 0}</dd></div>
            <div><dt>来源摘要</dt><dd>{meta.source_digest || "—"}</dd></div>
          </dl>
          <div className="entry-files">
            {(advanced.entry_files ?? []).map((file) => <code key={file}>{file}</code>)}
          </div>
        </div>
      </details>
      {guidanceAction ? (
        <GuidanceModeDialog
          open={guidanceOpen}
          onOpenChange={setGuidanceOpen}
          currentMode={profile.guidanceMode}
          baseRequest={guidanceAction.request}
          onCopy={onCopy}
        />
      ) : null}
    </div>
  );
}
