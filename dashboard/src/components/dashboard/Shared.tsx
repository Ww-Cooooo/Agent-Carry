import { createElement, useCallback, useEffect, useId, useRef, useState, type ElementType, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, CircleHelp, CircleSlash2, ClipboardCopy, Copy, PencilLine, RefreshCw, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { categoryFor } from "@/dashboard-config";
import {
  buildDashboardAction,
  buildHabitCorrectionAction,
  buildHabitForgetAction,
  assetAuthorizationStatusToken,
  assetLifecycleStatusToken,
  assetMaturityStatusToken,
  assetUsagePresentation,
  habitPresentation,
  type DashboardActionKind,
  type DashboardActionTarget,
} from "@/lib/data";

export interface CopyState {
  open: boolean;
  copied: boolean;
  text: string;
  label: string;
}

export const EMPTY_COPY: CopyState = { open: false, copied: false, text: "", label: "" };

export interface DetailItem extends DashboardActionTarget {
  id?: string;
  reliability?: string;
  status?: string;
  triggers?: string[];
  frequency?: string;
  purpose?: string;
  steps?: string[];
  visible?: boolean;
  sourceSummary?: string;
  targetKind?: string;
  targetLabel?: string;
  nextStep?: string;
  subtype?: string;
  scopeSummary?: string;
}

export interface DetailState {
  kind: DashboardActionKind;
  item: DetailItem;
}

/**
 * Renders content that came from an instantiated assistant or another source
 * file without passing it through the product-interface translation catalog.
 * Product labels around it still follow the selected dashboard language.
 */
export function SourceText({
  children,
  as = "span",
  className,
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
}) {
  return createElement(
    as,
    {
      className,
      translate: "no",
      "data-ai-carry-source-text": "true",
    },
    children,
  );
}

Object.defineProperty(SourceText, "aiCarrySourceText", { value: true });

export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <span className={`carry-logo ${className}`} aria-hidden="true">
      <span className="carry-logo__planet" />
      <span className="carry-logo__orbit" />
      <span className="carry-logo__moon" />
    </span>
  );
}

export function SectionEyebrow({ children, icon: Icon }: { children: ReactNode; icon?: ElementType }) {
  return (
    <p className="section-eyebrow">
      {Icon ? <Icon aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
      <span>{children}</span>
    </p>
  );
}

const STATUS_LABELS: Record<string, string> = {
  pending: "待处理",
  done: "已完成",
  deferred: "稍后处理",
  candidate: "待观察",
  active: "进行中",
  available: "可使用",
  unavailable: "暂不可用",
  draft: "本地草稿",
  ready: "可以分享",
  "habit-enabled": "已启用",
  "habit-trial": "试用中",
  "habit-pending": "等待确认",
  "habit-review": "需要复核",
  "habit-history": "已停止沿用",
  "habit-unknown": "状态待核对",
  "asset-active": "可按需使用",
  "asset-trial": "限定试用",
  "asset-review": "需要复核",
  "asset-history": "仅作历史",
  "asset-pending": "尚未可用",
  "asset-unknown": "状态待核对",
  "asset-legacy-unclassified": "旧版信息待补齐",
  confirmed: "已确认",
  unconfirmed: "未确认",
  unvalidated: "待验证",
  provisional: "待验证",
  practiced: "已实践",
  reliable: "可靠",
  portable: "可迁移",
  review: "需要复核",
  "未评估": "待验证",
  "试用中": "待验证",
  "已实践": "已实践",
  "已验证": "可靠",
  "跨宿主验证": "可迁移",
  "lifecycle-active": "活动中",
  "lifecycle-provisional": "试用状态",
  "lifecycle-candidate": "候选",
  "lifecycle-review": "复核中",
  "lifecycle-history": "历史状态",
  "lifecycle-unknown": "状态待核对",
  "authorization-explicit": "用户已确认",
  "authorization-policy-low": "旧授权需要复核",
  "authorization-unknown": "授权待核对",
  "maturity-unknown": "成熟度待核对",
};

const STATUS_HELP: Record<string, string> = {
  "待验证": "已经整理好，但还没有在真实任务中完成验证。",
  "需要复核": "以前使用过，但证据、适用范围或当前环境需要重新检查。",
  "可使用": "已经通过真实任务验证，可以在适用范围内直接使用。",
  "已实践": "已经在至少一项真实任务中成功并核对过结果，但还需要更多不同情境的证据。",
  "可靠": "已经在多项独立真实任务中稳定成功，且没有未解决的重要失败。",
  "可迁移": "已经可靠，并在不同宿主或环境变化中验证过可携带使用。",
  "活动中": "这条正式记录处于活动状态；能否用于当前任务仍要单独核对授权、范围和风险。",
  "试用状态": "这条正式记录只处于限定试用阶段，不能自动扩大适用范围。",
  "候选": "这条内容仍是候选，尚不能作为正式资产使用。",
  "复核中": "这条记录正在复核；复核完成前暂停用于普通任务。",
  "历史状态": "这条记录只作为历史保留，不参与普通任务。",
  "用户已确认": "授权字段与用户确认布尔值一致，可以继续结合状态、范围和风险判断。",
  "旧授权需要复核": "这条记录使用 1.2 的旧政策授权组合。1.3 不把它视为正式授权；回读原明确授权或请你确认前不会使用。",
  "授权待核对": "授权字段缺失或彼此冲突；核对前不能把这条内容显示为可用。",
  "成熟度待核对": "看板没有读到可识别的成熟度；不能用生命周期或授权状态代替。",
  "待处理": "这项待办还没有完成。",
  "已完成": "事情已经完成，记录仍保存在本地，可以从看板隐藏。",
  "稍后处理": "现在不处理，之后仍可回来继续。",
  "待观察": "目前证据还不够，先保留观察。",
  "进行中": "这项内容正在处理。",
  "暂不可用": "这个 Skill 当前不能使用，但其他 Skill 和 AI Carry 主体不受影响。",
  "本地草稿": "这个 Skill 仍是本地草稿，没有自动上传、发送或公开。",
  "可以分享": "这个本地 Skill 已通过当前检查；发送或公开仍需要你指定目标并授权。",
  "已启用": "这项习惯已经由你确认，并会在适用任务命中时按需沿用。",
  "试用中": "你已经确认先试用；只在正式记录声明的范围内按需采用，随时可以停止。",
  "等待确认": "内容或适用范围还没有得到你的确认，因此暂不自动沿用。",
  "已停止沿用": "这项习惯只保留为按需历史，不再参与普通任务的自动匹配。",
  "状态待核对": "看板无法确认正式状态；核对前不会声明这项习惯会自动沿用。",
  "可按需使用": "状态与授权信息可以核验；任务命中后仍只加载必要正文。",
  "限定试用": "只允许在正式记录声明的狭窄范围内试用，不能自动扩大适用范围。",
  "仅作历史": "这条内容只保留用于解释、审计或以后恢复，不参与普通任务。",
  "尚未可用": "这条内容仍是候选或等待处理，不能当作正式资产执行。",
  "已确认": "这项内容已经得到确认。",
  "未确认": "这项内容还没有得到确认。",
  "待确认": "需要你确认后才能继续。",
  "等待下次提醒": "日期到了才会提醒，不会在后台自动开始。",
};

function normalizeStatus(value: string): string {
  return STATUS_LABELS[value] ?? value;
}

interface StatusTooltipPosition {
  left: number;
  top: number;
  placement: "top" | "bottom";
}

type InfoHintMode = "closed" | "hover" | "focus" | "pinned";

export function InfoHint({ label, help }: { label: string; help: string }) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [mode, setMode] = useState<InfoHintMode>("closed");
  const [position, setPosition] = useState<StatusTooltipPosition | null>(null);
  const open = mode !== "closed";
  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const edge = Math.min(170, Math.max(24, window.innerWidth / 2 - 12));
    const placement = rect.top >= 150 ? "top" : "bottom";
    setPosition({
      left: Math.min(Math.max(rect.left + rect.width / 2, edge), window.innerWidth - edge),
      top: placement === "top" ? rect.top - 10 : rect.bottom + 10,
      placement,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const sync = () => updatePosition();
    window.addEventListener("resize", sync);
    document.addEventListener("scroll", sync, true);
    return () => {
      window.removeEventListener("resize", sync);
      document.removeEventListener("scroll", sync, true);
    };
  }, [open, updatePosition]);

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className="status-help"
        aria-label={`了解“${label}”`}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onMouseEnter={() => {
          updatePosition();
          setMode((current) => current === "closed" ? "hover" : current);
        }}
        onMouseLeave={() => setMode((current) => current === "hover" ? "closed" : current)}
        onFocus={(event) => {
          if (!event.currentTarget.matches(":focus-visible")) return;
          updatePosition();
          setMode((current) => current === "closed" ? "focus" : current);
        }}
        onBlur={() => setMode("closed")}
        onClick={() => {
          updatePosition();
          setMode((current) => current === "pinned" ? "closed" : "pinned");
        }}
        onKeyDown={(event) => { if (event.key === "Escape") setMode("closed"); }}
      >
        <CircleHelp aria-hidden="true" />
      </button>
      {open && position && typeof document !== "undefined" ? createPortal(
        <span
          id={id}
          role="tooltip"
          className="status-help-tooltip"
          data-placement={position.placement}
          style={{ left: position.left, top: position.top }}
        >
          {help}
        </span>,
        document.body,
      ) : null}
    </>
  );
}

export function StatusBadge({ value, showHelp = true, helpText }: { value?: string; showHelp?: boolean; helpText?: string }) {
  if (!value) return null;
  const label = normalizeStatus(value);
  const help = helpText ?? STATUS_HELP[label] ?? `这条内容当前处于“${label}”状态。`;
  const tone =
    ["本地草稿", "尚未检查完成", "待完善", "仅本机保留"].includes(label)
      ? "info"
      : label.includes("未确认") || label.includes("待") || label.includes("复核") || label.includes("需要") || label.includes("稍后")
      ? "warm"
       : label.includes("完成") || label.includes("可使用") || label.includes("确认") || label.includes("启用")
           || ["已实践", "可靠", "可迁移", "可以分享", "适合整理", "ZIP 已准备", "分享文件夹已准备", "分享链接已准备"].includes(label)
         ? "success"
         : "neutral";
  return (
    <span className="status-with-help">
      <Badge className={`status-badge status-badge--${tone}`}>{label}</Badge>
      {showHelp ? <InfoHint label={label} help={help} /> : null}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: ElementType;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon"><Icon aria-hidden="true" /></span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  );
}

export function CopyDialog({ state, onClose }: { state: CopyState; onClose: () => void }) {
  const isAssistantCreation = state.label === "创建我的助手";
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  async function copyAgain() {
    try {
      await navigator.clipboard.writeText(state.text);
    } catch {
      document.getElementById("ai-carry-copy-text")?.focus();
    }
  }

  return (
    <Dialog open={state.open} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="copy-dialog sm:max-w-[640px]"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          titleRef.current?.focus({ preventScroll: true });
        }}
      >
        <DialogHeader>
          <div className={`copy-dialog__mark ${state.copied ? "is-success" : ""}`}>
            {state.copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          </div>
          <DialogTitle ref={titleRef} tabIndex={-1}>{state.copied ? "完整指令已复制" : "请手动复制完整指令"}</DialogTitle>
          <DialogDescription>
            {state.copied
              ? isAssistantCreation
                ? "下一步：回到当前 Agent，它会继续完成创建。"
                : "下一步：回到当前 Agent，让它继续处理这项请求。"
              : "自动复制没有成功，下面已经显示完整内容；请手动复制后发给当前 Agent。"}
          </DialogDescription>
        </DialogHeader>
        <label className="sr-only" htmlFor="ai-carry-copy-text">要发送给 Agent 的完整指令</label>
        {state.copied ? (
          <>
            <p className="copy-dialog__boundary">看板不会直接执行。<InfoHint label="为什么还要发给 Agent" help="看板只生成并复制请求；当前 Agent 会读取相应路线、说明影响，并在需要你决定时继续询问。" /></p>
            <details className="detail-disclosure copy-dialog__disclosure">
              <summary>
                <span className="copy-dialog__preview-head">
                  <span><strong>完整指令预览</strong><small>已经复制，可以展开检查全部内容。</small></span>
                  <span className="copy-dialog__preview-toggle copy-dialog__preview-toggle--closed">展开完整指令</span>
                  <span className="copy-dialog__preview-toggle copy-dialog__preview-toggle--open">收起完整指令</span>
                </span>
                <span className="copy-dialog__preview" aria-hidden="true">
                  <span className="copy-dialog__preview-text">{state.text}</span>
                </span>
              </summary>
              <div className="detail-disclosure__body">
                <textarea id="ai-carry-copy-text" className="copy-dialog__text" readOnly value={state.text} />
              </div>
            </details>
          </>
        ) : (
          <textarea id="ai-carry-copy-text" className="copy-dialog__text" readOnly value={state.text} />
        )}
        <DialogFooter className="copy-dialog__footer">
          <Button variant="outline" className="control-button" onClick={onClose}>关闭</Button>
          <Button className="control-button" onClick={() => void copyAgain()}>
            <ClipboardCopy aria-hidden="true" />
            再复制一次
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ItemDialog({
  detail,
  onClose,
  onCopy,
}: {
  detail: DetailState | null;
  onClose: () => void;
  onCopy: (text: string, label: string) => void;
}) {
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const action = detail ? buildDashboardAction(detail.kind, detail.item) : null;
  const category = detail ? categoryFor(detail.kind) : null;
  const isHabit = detail?.kind === "memories" && detail.item.subtype === "habit";
  const habit = isHabit ? habitPresentation(detail?.item.status, detail?.item.approvalState, detail?.item.activationBasis, detail?.item.riskTier, detail?.item.approvedByUser) : null;
  const libraryKind = detail && ["memories", "sops", "capabilities", "experiences"].includes(detail.kind)
    ? detail.kind as "memories" | "sops" | "capabilities" | "experiences"
    : null;
  const usage = libraryKind && !isHabit ? assetUsagePresentation(libraryKind, detail!.item) : null;
  const lifecycleStatus = libraryKind ? assetLifecycleStatusToken(detail!.item.status) : null;
  const authorizationStatus = libraryKind ? assetAuthorizationStatusToken(libraryKind, detail!.item) : null;
  const maturityStatus = libraryKind ? assetMaturityStatusToken(libraryKind, detail!.item) : undefined;
  const status = libraryKind ? null : detail?.item.reliability ?? detail?.item.status;
  const habitCorrection = isHabit ? buildHabitCorrectionAction(detail.item) : null;
  const habitForget = isHabit ? buildHabitForgetAction(detail.item) : null;
  const hasSupplementalDetails = Boolean(
    detail && (
      detail.item.id
      || detail.item.frequency
      || detail.item.triggers?.length
      || detail.item.steps?.length
      || (isHabit && detail.item.sourceSummary)
      || detail.kind === "evolution"
    )
  );

  return (
    <Dialog open={Boolean(detail)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className={`item-dialog sm:max-w-[620px] ${detail?.kind === "memories" ? "item-dialog--memories" : ""} ${detail?.kind === "evolution" ? "item-dialog--evolution" : ""}`}
        onOpenAutoFocus={(event) => {
          openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
          event.preventDefault();
          titleRef.current?.focus({ preventScroll: true });
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          openerRef.current?.focus({ preventScroll: true });
          openerRef.current = null;
        }}
      >
        {detail && category ? (
          <>
            <DialogHeader className={detail.kind === "memories" ? "memory-dialog__header" : undefined}>
              <div className="item-dialog__category" style={{ color: category.color }}>
                <category.icon aria-hidden="true" />
                {category.label}
                {detail.kind === "memories" ? <span>{habit ? `我的习惯 · ${habit.groupLine}` : usage?.behaviorTitle ?? "状态待核对"}</span> : null}
              </div>
              <DialogTitle ref={titleRef} tabIndex={-1} className="item-dialog__title"><SourceText>{detail.item.title}</SourceText></DialogTitle>
              <DialogDescription className="item-dialog__summary">
                {detail.item.summary ? <SourceText>{detail.item.summary}</SourceText> : "这条内容还没有用途说明，请让 Agent 补充后重新生成看板数据。"}
              </DialogDescription>
            </DialogHeader>

            {detail.kind === "memories" ? (
              <section className="memory-dialog__usage" aria-label="这条记忆怎样使用">
                <div>
                  <span className="detail-label-with-help">
                    使用方式：默认自动，按需手动
                    <InfoHint
                      label={isHabit ? "怎样管理这项习惯" : "补充使用方式"}
                      help={isHabit
                        ? `${habit?.key === "history" ? "这条记录已经停止；以后仍可单独要求恢复或删除。" : "可以纠正、缩小范围或停止沿用。"} 看板只生成请求，当前 Agent 会先说明影响并让你核对。`
                        : usage?.usable
                          ? "想确保当前任务明确参考这一条时，可以使用下方按钮；它只会按需读取这一项。"
                          : "当前状态核对完成前，下方按钮只会生成核对请求，不会执行正文。"}
                    />
                  </span>
                  <strong>{habit?.automatic || usage?.usable ? "任务相关时自动使用；手动按钮只是备用" : habit ? habit.behaviorTitle : usage?.behaviorTitle ?? "先核对正式状态"}</strong>
                  <p>{habit ? habit.behaviorSummary : usage?.behaviorSummary ?? "看板无法确认这条记忆当前是否允许使用。"}</p>
                </div>
              </section>
            ) : null}

            <div className={`item-dialog__facts item-dialog__facts--primary ${maturityStatus ? "item-dialog__facts--three" : ""}`}>
              {libraryKind && lifecycleStatus ? <div><span>记录状态</span><StatusBadge value={lifecycleStatus} /></div> : null}
              {libraryKind && authorizationStatus ? <div><span>使用授权</span><StatusBadge value={authorizationStatus} /></div> : null}
              {maturityStatus ? <div><span>成熟度</span><StatusBadge value={maturityStatus} /></div> : null}
              {status ? <div><span>当前状态</span><StatusBadge value={status} /></div> : null}
            </div>

            {isHabit ? (
              <section className="habit-dialog__context" aria-label="这项习惯的适用范围和来源">
                <article>
                  <span className="detail-label-with-help">
                    什么时候会用
                    <InfoHint label="这项习惯怎样留下" help={detail.item.sourceSummary ?? "来源说明未投影到看板；需要时可让 Agent 核对正式记录。"} />
                  </span>
                  {detail.item.scopeSummary ? <SourceText as="p">{detail.item.scopeSummary}</SourceText> : <p>适用范围还没有单独说明；使用时会先结合当前任务判断。</p>}
                </article>
              </section>
            ) : null}

            {detail.kind === "evolution" ? (
              <section className="evolution-dialog__trail" aria-label="这条学习建议的来源、建议去向和下一步">
                <article>
                  <span>可能保存成</span>
                  <strong>{detail.item.targetLabel || "去向待判断"}</strong>
                  <InfoHint label="建议去向" help="这是当前建议，不代表已经生成正式资产。" />
                </article>
                <article>
                  <span>下一步</span>
                  <strong>{detail.item.nextStep ? <SourceText>{detail.item.nextStep}</SourceText> : "先核对来源、范围、风险和证据，再决定怎样处理。"}</strong>
                </article>
              </section>
            ) : null}

            {detail.item.purpose ? (
              <section className="item-dialog__section">
                <h3>它负责什么</h3>
                <SourceText as="p">{detail.item.purpose}</SourceText>
              </section>
            ) : null}

            {hasSupplementalDetails ? (
              <details className="detail-disclosure">
                <summary>查看使用方式与记录信息</summary>
                <div className="detail-disclosure__body">
                  {detail.item.id || detail.item.frequency ? (
                    <dl className="detail-record-list">
                      {detail.item.id ? <div><dt>记录编号</dt><dd>{detail.item.id}</dd></div> : null}
                      {detail.item.frequency ? <div><dt>建议周期</dt><dd><SourceText>{detail.item.frequency}</SourceText></dd></div> : null}
                    </dl>
                  ) : null}
                  {detail.kind === "evolution" ? (
                    <section className="item-dialog__section">
                      <h3>来源与观察状态</h3>
                      <p>{detail.item.sourceSummary ? <SourceText>{detail.item.sourceSummary}</SourceText> : "来源说明待补充"}</p>
                      <p>{detail.item.observationState === "explicit" && ["explicit-user", "existing-approved-migration"].includes(detail.item.observationBasis ?? "") ? "已允许观察；不等于已经允许正式使用。" : "授权待核对；不会自动累计或晋升。"}</p>
                    </section>
                  ) : null}
                  {detail.item.triggers?.length ? (
                    <section className="item-dialog__section">
                      <h3>你可以这样说</h3>
                      <ul className="prompt-examples">
                        {detail.item.triggers.slice(0, 3).map((trigger) => <SourceText as="li" key={trigger}>“{trigger}”</SourceText>)}
                      </ul>
                    </section>
                  ) : null}
                  {detail.item.steps?.length ? (
                    <section className="item-dialog__section">
                      <h3>启动后会做</h3>
                      <ol className="detail-steps">
                        {detail.item.steps.map((step) => <SourceText as="li" key={step}>{step}</SourceText>)}
                      </ol>
                    </section>
                  ) : null}
                </div>
              </details>
            ) : null}

            {isHabit && habitCorrection && habitForget ? (
              <section className="habit-dialog__manage" aria-label="管理这项习惯">
                <div>
                  <span className="detail-label-with-help">
                    <strong>{habit?.key === "history" ? "这条记录已经停止" : "你始终可以改正或停止它"}</strong>
                    <InfoHint
                      label="管理操作说明"
                      help={habit?.key === "active" || habit?.key === "trial" ? "按钮只生成请求。纠正时会先给你看预览；停止沿用只会转为可恢复历史，不会永久删除资料。" : "按钮只生成请求。当前 Agent 会先回读真实状态；恢复或永久删除仍要由你明确提出。"}
                    />
                  </span>
                </div>
                <div className="habit-dialog__actions">
                  <Button variant="outline" className="control-button" onClick={() => { onClose(); onCopy(habitCorrection.text, habitCorrection.buttonLabel); }}>
                    <PencilLine aria-hidden="true" />纠正这项习惯
                  </Button>
                  <Button variant="outline" className="control-button control-button--forget" onClick={() => { onClose(); onCopy(habitForget.text, habitForget.buttonLabel); }}>
                    {habit?.key === "active" || habit?.key === "trial" ? <CircleSlash2 aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}{habit?.manageLabel ?? "管理保存状态"}
                  </Button>
                </div>
              </section>
            ) : null}

            <DialogFooter className="item-dialog__footer">
              <Button variant="outline" className="control-button" onClick={onClose}>关闭</Button>
              {action ? (
                <Button
                  variant={isHabit ? "outline" : undefined}
                  className={`control-button ${detail.kind === "memories" ? "control-button--memory" : ""} ${isHabit ? "control-button--memory-secondary" : ""}`}
                  onClick={() => {
                    onClose();
                    onCopy(action.text, action.buttonLabel);
                  }}
                >
                  <ClipboardCopy aria-hidden="true" />
                  {action.buttonLabel}
                </Button>
              ) : null}
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
