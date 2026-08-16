import { useId, type ElementType, type ReactNode } from "react";
import { Check, CircleHelp, ClipboardCopy, Copy, Sparkles } from "lucide-react";
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
}

export interface DetailState {
  kind: DashboardActionKind;
  item: DetailItem;
}

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
  confirmed: "已确认",
  unconfirmed: "未确认",
  unvalidated: "待验证",
  provisional: "待验证",
  practiced: "可使用",
  reliable: "可使用",
  portable: "可使用",
  review: "需要复核",
  "未评估": "待验证",
  "试用中": "待验证",
  "已实践": "可使用",
  "已验证": "可使用",
  "跨宿主验证": "可使用",
};

const STATUS_HELP: Record<string, string> = {
  "待验证": "已经整理好，但还没有在真实任务中完成验证。",
  "需要复核": "以前使用过，但证据、适用范围或当前环境需要重新检查。",
  "可使用": "已经通过真实任务验证，可以在适用范围内直接使用。",
  "待处理": "这项待办还没有完成。",
  "已完成": "事情已经完成，记录仍保存在本地，可以从看板隐藏。",
  "稍后处理": "现在不处理，之后仍可回来继续。",
  "待观察": "目前证据还不够，先保留观察。",
  "进行中": "这项内容正在处理。",
  "已确认": "这项内容已经得到确认。",
  "未确认": "这项内容还没有得到确认。",
  "待确认": "需要你确认后才能继续。",
  "等待下次提醒": "日期到了才会提醒，不会在后台自动开始。",
};

function normalizeStatus(value: string): string {
  return STATUS_LABELS[value] ?? value;
}

export function StatusBadge({ value, showHelp = true }: { value?: string; showHelp?: boolean }) {
  const tooltipId = useId();
  if (!value) return null;
  const label = normalizeStatus(value);
  const help = STATUS_HELP[label] ?? `这条内容当前处于“${label}”状态。`;
  const tone =
    label.includes("未确认") || label.includes("待") || label.includes("复核") || label.includes("稍后")
      ? "warm"
      : label.includes("完成") || label.includes("可使用") || label.includes("确认")
        ? "success"
        : "neutral";
  return (
    <span className="status-with-help">
      <Badge className={`status-badge status-badge--${tone}`}>{label}</Badge>
      {showHelp ? (
        <span className="status-help" tabIndex={0} aria-label={`了解“${label}”`} aria-describedby={tooltipId}>
          <CircleHelp aria-hidden="true" />
          <span id={tooltipId} role="tooltip">{help}</span>
        </span>
      ) : null}
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
  async function copyAgain() {
    try {
      await navigator.clipboard.writeText(state.text);
    } catch {
      document.getElementById("agent-carry-copy-text")?.focus();
    }
  }

  return (
    <Dialog open={state.open} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="copy-dialog sm:max-w-[640px]">
        <DialogHeader>
          <div className={`copy-dialog__mark ${state.copied ? "is-success" : ""}`}>
            {state.copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          </div>
          <DialogTitle>{state.copied ? "完整指令已复制" : "请手动复制完整指令"}</DialogTitle>
          <DialogDescription>
            把它发给当前 Agent 即可。看板只负责生成指令，不会直接修改文件或执行操作。
          </DialogDescription>
        </DialogHeader>
        <label className="sr-only" htmlFor="agent-carry-copy-text">要发送给 Agent 的完整指令</label>
        <textarea id="agent-carry-copy-text" className="copy-dialog__text" readOnly value={state.text} />
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
  const action = detail ? buildDashboardAction(detail.kind, detail.item) : null;
  const category = detail ? categoryFor(detail.kind) : null;
  const status = detail?.item.reliability ?? detail?.item.status;

  return (
    <Dialog open={Boolean(detail)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className={`item-dialog sm:max-w-[620px] ${detail?.kind === "memories" ? "item-dialog--memories" : ""} ${detail?.kind === "evolution" ? "item-dialog--evolution" : ""}`}>
        {detail && category ? (
          <>
            <DialogHeader className={detail.kind === "memories" ? "memory-dialog__header" : undefined}>
              <div className="item-dialog__category" style={{ color: category.color }}>
                <category.icon aria-hidden="true" />
                {category.label}
                {detail.kind === "memories" ? <span>默认自动按需读取</span> : null}
              </div>
              <DialogTitle className="item-dialog__title">{detail.item.title}</DialogTitle>
              <DialogDescription className="item-dialog__summary">
                {detail.item.summary || "这条内容还没有用途说明，请让 Agent 补充后重新生成看板数据。"}
              </DialogDescription>
            </DialogHeader>

            {detail.kind === "memories" ? (
              <section className="memory-dialog__usage" aria-label="这条记忆怎样使用">
                <div>
                  <span>默认方式</span>
                  <strong>任务相关时自动读取</strong>
                  <p>你正常告诉 Agent 要做什么即可。极小目录命中这条记忆后，Agent 才会读取正文。</p>
                </div>
                <div>
                  <span>补充方式</span>
                  <strong>需要时手动指定</strong>
                  <p>如果你想确保当前任务明确参考这一条，可以使用下方按钮；它不会把全部记忆一起载入。</p>
                </div>
              </section>
            ) : null}

            <div className="item-dialog__facts">
              <div><span>记录编号</span><strong>{detail.item.id ?? "未登记"}</strong></div>
              {status ? <div><span>当前状态</span><StatusBadge value={status} /></div> : null}
              {detail.item.frequency ? <div><span>建议周期</span><strong>{detail.item.frequency}</strong></div> : null}
            </div>

            {detail.kind === "evolution" ? (
              <section className="evolution-dialog__trail" aria-label="这条学习建议的来源、建议去向和下一步">
                <article>
                  <span>01 · 从哪里发现</span>
                  <strong>{detail.item.sourceSummary || "来源说明待补充"}</strong>
                </article>
                <article>
                  <span>02 · 可能保存成</span>
                  <strong>{detail.item.targetLabel || "去向待判断"}</strong>
                  <small>这是当前建议，不代表已经生成正式资产。</small>
                </article>
                <article>
                  <span>03 · 下一步</span>
                  <strong>{detail.item.nextStep || "先核对来源、范围、风险和证据，再决定怎样处理。"}</strong>
                </article>
              </section>
            ) : null}

            {detail.item.purpose ? (
              <section className="item-dialog__section">
                <h3>它负责什么</h3>
                <p>{detail.item.purpose}</p>
              </section>
            ) : null}

            {detail.item.triggers?.length ? (
              <section className="item-dialog__section">
                <h3>你可以这样说</h3>
                <ul className="prompt-examples">
                  {detail.item.triggers.slice(0, 3).map((trigger) => <li key={trigger}>“{trigger}”</li>)}
                </ul>
              </section>
            ) : null}

            {detail.item.steps?.length ? (
              <section className="item-dialog__section">
                <h3>启动后会做</h3>
                <ol className="detail-steps">
                  {detail.item.steps.map((step) => <li key={step}>{step}</li>)}
                </ol>
              </section>
            ) : null}

            <DialogFooter className="item-dialog__footer">
              <Button variant="outline" className="control-button" onClick={onClose}>关闭</Button>
              {action ? (
                <Button
                  className={`control-button ${detail.kind === "memories" ? "control-button--memory" : ""}`}
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
