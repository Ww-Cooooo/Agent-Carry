import { useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { BookOpen, ChevronRight, CircleHelp, ClipboardCopy, Download, FileArchive, FolderOpen, Link2, PackageOpen, ShieldCheck, Sparkles, Upload, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionEyebrow, SourceText, StatusBadge } from "@/components/dashboard/Shared";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  buildSkillCreateAction,
  buildSkillExportAction,
  capabilities,
  getGlobalActions,
  profile,
  skills,
  sops,
  type AssetItem,
  type ExportedSkillItem,
} from "@/lib/data";
import { recommendForSkillWorkshop, type SkillWorkshopSourceKind } from "@/lib/skill-workshop";

type CopyRequest = (text: string, label: string) => void;

interface WorkshopAsset {
  kind: SkillWorkshopSourceKind;
  item: AssetItem;
}

type WorkshopTab = "methods" | "mine" | "installed" | "import";

interface ExportedSkillView {
  label: string;
  help: string;
  deliveryTitle: string;
  deliveryCopy: string;
  nextStep: string;
}

function exportedSkillView(item: ExportedSkillItem): ExportedSkillView {
  if (item.state === "draft") return {
    label: "待完善",
    help: "这份 Skill 的可编辑真源已经保存在本机，但检查还没完成。原方法不受影响，其他 Skill 和助手能力照常使用。",
    deliveryTitle: "还没有生成分享文件",
    deliveryCopy: "继续完成触发、隐私和使用边界检查后，Agent 会请你选择 ZIP、独立文件夹、链接或只保留在本机。",
    nextStep: "让 Agent 继续完善这一份 Skill；检查通过后，它会接着询问一次分享方式并生成你选择的本地载体。",
  };
  if (item.state === "review") return {
    label: "需要复核",
    help: "这份 Skill 的内容或依赖有一项需要理解。它会原样保留并只暂停这一份，其他 Skill 和助手能力不受影响。",
    deliveryTitle: "复核完成前不生成新载体",
    deliveryCopy: "已有文件不会被删除或覆盖。Agent 会先说明具体命中项，再按你的决定继续。",
    nextStep: "让 Agent 打开检查结果，用自然语言说明问题、影响和可选处理方式。",
  };
  const views: Record<ExportedSkillItem["deliveryState"], ExportedSkillView> = {
    unselected: {
      label: "分享方式待选择",
      help: "Skill 本身已经通过检查，只是还没有选择怎样交给别人。旧版生成的 Skill 会自然进入这个状态，不需要先迁移。",
      deliveryTitle: "可编辑 Skill 已就绪",
      deliveryCopy: "选择 ZIP、独立文件夹、链接或只保留在本机后，Agent 会直接生成相应载体。",
      nextStep: "让 Agent 问你一次分享方式；如果你不确定，它会推荐最合适的一种。",
    },
    "local-only": {
      label: "仅本机保留",
      help: "你之前选择先不分享。可编辑 Skill 仍安全保留，随时可以改选 ZIP、文件夹或链接。",
      deliveryTitle: "当前没有额外分享文件",
      deliveryCopy: "这是主动选择，不是错误，也不会影响 Skill 继续完善或以后分享。",
      nextStep: "如果现在想分享，让 Agent 重新询问交付方式并生成相应载体。",
    },
    "artifact-ready": {
      label: item.deliveryMethod === "folder" ? "分享文件夹已准备" : "ZIP 已准备",
      help: item.deliveryMethod === "folder" ? "一个独立 Skill 文件夹已经在本机生成，可以复制给别人；可编辑真源仍是原来的那一份。" : "一个可直接发送的 Skill ZIP 已经在本机生成；可编辑真源仍是原来的那一份。",
      deliveryTitle: item.deliveryMethod === "folder" ? "独立文件夹可以交付" : "ZIP 可以直接交付",
      deliveryCopy: "看板不公开本机路径。点击下方按钮后，Agent 会告诉你准确位置，并可按你的目标继续处理。",
      nextStep: "让 Agent 打开实际位置；你可以自己发送，也可以明确接收方后让 Agent 继续。",
    },
    "target-needed": {
      label: "分享链接尚未完成",
      help: "用于链接分享的本地 ZIP 已准备好，但还没有成功登记可用链接：可能尚未给出目标，也可能上次外部操作没有完成。",
      deliveryTitle: "本地 ZIP 已准备",
      deliveryCopy: "Agent 会先复用当前对话里仍然有效的目标与授权；无法回读时才请你补充，不会把失败说成你从未给过目标。",
      nextStep: "让 Agent 继续准备链接；有有效目标就直接重试，没有时再告诉它放到哪里、谁可以看到。",
    },
    "link-ready": {
      label: "分享链接已准备",
      help: "本地载体和实际链接都已登记。这里不展示地址，避免把来源或私密位置暴露到看板。",
      deliveryTitle: "链接已经可以使用",
      deliveryCopy: "点击下方按钮后，Agent 会回读当前记录并告诉你实际链接和适用范围。",
      nextStep: "让 Agent 打开分享信息，或在内容变化后重新生成一个新版本。",
    },
    stale: {
      label: "分享文件需要更新",
      help: "可编辑 Skill 后来发生了变化，或原来的分享载体已缺失。旧载体会保留，但不再冒充最新版本。",
      deliveryTitle: "当前载体不是最新内容",
      deliveryCopy: "Agent 会从现在的可编辑真源生成一个新的、不覆盖旧文件的载体。",
      nextStep: "让 Agent 重新生成分享文件；完成后它会报告新位置和摘要核对结果。",
    },
    review: {
      label: "分享信息需复核",
      help: "Skill 内容仍可保留，但分享方式、载体记录或链接信息有一项不闭合。问题只影响这一份交付信息。",
      deliveryTitle: "先核对这一份分享记录",
      deliveryCopy: "Agent 会根据实际真源和已有载体修复可推导的信息，不删除或覆盖用户文件。",
      nextStep: "让 Agent 说明并复核分享信息；能安全修复的会修复，仍需决定的只问一个问题。",
    },
  };
  return views[item.deliveryState];
}

const INSTALLED_SKILL_HELP: Record<string, string> = {
  available: "这个 Skill 已登记并可在相关任务命中时按需读取；仍只会加载完成当前任务所需的内容。",
  review: "这个 Skill 的入口、依赖、权限或兼容状态需要复核。让 Agent 只检查这一个 Skill；复核前不会启用它，其他能力不受影响。",
  unavailable: "这个 Skill 当前不能使用。Agent 会保留它的记录和恢复入口，其他 Skill 与 AI Carry 主体仍可继续工作。",
};

function MethodTicket({ asset, onCopy }: { asset: WorkshopAsset; onCopy: CopyRequest }) {
  const recommendation = recommendForSkillWorkshop(asset.kind, asset.item);
  const action = buildSkillCreateAction(asset.kind, asset.item);
  return (
    <article className={`method-ticket method-ticket--${recommendation.state}`}>
      <div className="method-ticket__rail" aria-hidden="true"><i /><i /><i /></div>
      <div className="method-ticket__body">
        <div className="method-ticket__meta">
          <span>{asset.kind === "sop" ? "固定流程（SOP）" : "能力中的流程"}</span>
          <StatusBadge value={asset.item.reliability} />
        </div>
        <SourceText as="h3">{asset.item.title}</SourceText>
        <SourceText as="p">{asset.item.summary}</SourceText>
        <div className="method-ticket__decision">
          <StatusBadge value={recommendation.label} helpText={recommendation.help} />
          <span>{recommendation.reason}</span>
        </div>
        {recommendation.state !== "refine" ? (
          <Button variant="outline" onClick={() => onCopy(action.text, action.buttonLabel)}>
            <ClipboardCopy aria-hidden="true" />
            {recommendation.state === "ready" ? "整理并选择分享方式" : "让 Agent 判断"}
          </Button>
        ) : null}
      </div>
    </article>
  );
}

function ExportedSkillDetailDialog({
  item,
  onCopy,
  onClose,
}: {
  item: ExportedSkillItem | null;
  onCopy: CopyRequest;
  onClose: () => void;
}) {
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  if (!item) return null;
  const view = exportedSkillView(item);
  const action = buildSkillExportAction(item);
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="skill-export-dialog sm:max-w-[660px]"
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
        <DialogHeader>
          <div className="skill-export-dialog__eyebrow"><PackageOpen aria-hidden="true" />我的 Skill</div>
          <DialogTitle ref={titleRef} tabIndex={-1} className="skill-export-dialog__title"><SourceText>{item.title}</SourceText></DialogTitle>
          <DialogDescription>这里显示的是这份 Skill 的低敏说明，不包含来源路径或私密内容。</DialogDescription>
        </DialogHeader>

        <div className="skill-export-dialog__facts">
          <section className="skill-export-dialog__purpose">
            <span>这个 Skill 是做什么的</span>
            <SourceText as="p">{item.summary}</SourceText>
          </section>
          <section>
            <span>现在是什么状态</span>
            <StatusBadge value={view.label} helpText={view.help} />
            <p>{view.help}</p>
          </section>
          <section>
            <span>分享方式与文件</span>
            <strong>{view.deliveryTitle}</strong>
            <p>{view.deliveryCopy}</p>
          </section>
          <section className="skill-export-dialog__next">
            <span>接下来可以做什么</span>
            <p>{view.nextStep}</p>
          </section>
        </div>

        <div className="skill-export-dialog__privacy" role="note">
          <ShieldCheck aria-hidden="true" />
          <span>这里只显示用途和状态；来源路径、原始资产编号和实例身份不会出现在看板里。</span>
        </div>
        <div className="skill-export-dialog__action-note" role="note">
          <ClipboardCopy aria-hidden="true" />
          <span>点击下方按钮只会复制一段请求。把它发给 Agent 后才会继续；网页不会直接改文件、联网或替你发送。</span>
        </div>
        <DialogFooter className="skill-export-dialog__footer">
          <Button variant="outline" onClick={onClose}>关闭</Button>
          <Button
            className="skill-export-dialog__action"
            onClick={() => {
              onClose();
              onCopy(action.text, action.buttonLabel);
            }}
          >
            <ClipboardCopy aria-hidden="true" />
            {action.buttonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SkillWorkshop({ onCopy }: { onCopy: CopyRequest }) {
  const reduced = useReducedMotion();
  const [activeTab, setActiveTab] = useState<WorkshopTab>("methods");
  const [selectedExport, setSelectedExport] = useState<ExportedSkillItem | null>(null);
  const installAction = getGlobalActions().find((action) => action.action_id === "skill.install-shared");
  const assets: WorkshopAsset[] = [
    ...sops.map((item) => ({ kind: "sop" as const, item })),
    ...capabilities.map((item) => ({ kind: "capability" as const, item })),
  ];
  const ranked = assets
    .map((asset) => ({ asset, rank: recommendForSkillWorkshop(asset.kind, asset.item).state === "ready" ? 0 : recommendForSkillWorkshop(asset.kind, asset.item).state === "inspect" ? 1 : 2 }))
    .sort((left, right) => left.rank - right.rank)
    .slice(0, 8)
    .map(({ asset }) => asset);
  const instanceReady = profile.state === "instance";
  const tabs: Array<{ id: WorkshopTab; label: string; count?: number; icon: typeof Workflow; tone: "teal" | "violet" }> = [
    { id: "methods", label: "Agent 推荐整理的 Skill", count: ranked.length, icon: Workflow, tone: "teal" },
    { id: "mine", label: "我的 Skill", count: skills.exports.length, icon: PackageOpen, tone: "teal" },
    { id: "installed", label: "已安装 Skill", count: skills.items.length, icon: Download, tone: "violet" },
    { id: "import", label: "接入 Skill", icon: Upload, tone: "violet" },
  ];

  return (
    <div className="skill-workshop-page">
      <motion.section
        className="workshop-hero"
        initial={reduced ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: [0.16, 0.84, 0.3, 1] }}
      >
        <div>
          <SectionEyebrow icon={Sparkles}>Skill 工坊</SectionEyebrow>
          <h1>把好方法整理成 Skill<br />生成后就能交给别人</h1>
          <p>这里会推荐可能适合整理的方法，也能检查别人分享的 Skill。推荐只是建议，不会自动转换任何内容。开始整理前，Agent 会先问你想要 ZIP、独立文件夹、分享链接，还是先只保存在本机；选好后由它完成生成和检查。</p>
        </div>
        <div className="workshop-hero__promise" role="note">
          <ShieldCheck aria-hidden="true" />
          <div><strong>Agent 自动处理隐私，并生成你选择的分享文件</strong><span>Agent 只处理这个方法复制出的本地草稿：去掉身份、路径和私密内容，再生成 Skill。推荐列表和原来的 SOP／能力都不会被修改；选择链接时，也只有目标和可见范围明确后才会联网发布。</span></div>
        </div>
      </motion.section>

      {!instanceReady ? (
        <section className="workshop-template-note" role="status">
          <BookOpen aria-hidden="true" />
          <div><strong>创建助手后，这里才会出现你的方法和已安装 Skill</strong><span>当前空模板不会预造推荐、导出记录或安装内容。</span></div>
        </section>
      ) : null}

      <div className="workshop-tabs" role="tablist" aria-label="Skill 工坊内容分类">
        {tabs.map(({ id, label, count, icon: Icon, tone }) => (
          <button
            key={id}
            id={`workshop-tab-${id}`}
            type="button"
            role="tab"
            aria-controls={`workshop-panel-${id}`}
            aria-selected={activeTab === id}
            aria-label={label}
            title={label}
            data-tone={tone}
            onClick={() => setActiveTab(id)}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
            {typeof count === "number" ? <strong>{count}</strong> : null}
          </button>
        ))}
      </div>

      <motion.section
        key={activeTab}
        id={`workshop-panel-${activeTab}`}
        className={`workshop-panel workshop-panel--${activeTab}`}
        role="tabpanel"
        aria-labelledby={`workshop-tab-${activeTab}`}
        initial={reduced ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 0.84, 0.3, 1] }}
      >
        {activeTab === "methods" ? (
          <>
            <div className="binding-lane binding-lane--method binding-lane--single">
              <div className="binding-lane__heading">
                <span><Workflow aria-hidden="true" /></span>
                <div><small>Agent 的建议</small><h2>把适合的方法整理成 Skill</h2></div>
              </div>
              <ol className="binding-lane__steps">
                <li><b>01</b><span><strong>选择方法和分享方式</strong>你选一个正式 SOP；Agent 再问一次要 ZIP、独立文件夹、链接还是先保存在本机。</span></li>
                <li><b>02</b><span><strong>Agent 自动处理本地副本</strong>你不需要自己复制或处理隐私。Agent 会把选中的方法复制到隔离草稿，只在草稿中去掉身份、路径和私密内容，并把专用值改成参数。</span></li>
                <li><b>03</b><span><strong>Agent 自动检查并生成载体</strong>它会核对触发、非触发和隐私边界，再生成真实 ZIP／文件夹；链接方式先准备本地 ZIP。原方法保持不变，也不会执行包内脚本。</span></li>
              </ol>
            </div>
            <section className="method-shelf">
              <div className="workshop-section-heading">
                <div><SectionEyebrow icon={Workflow}>Agent 的建议</SectionEyebrow><h2>这些方法适合整理成 Skill</h2></div>
                <p>这是 Agent 根据已有使用证据给出的建议，不是任务。你不整理，也不会影响原来的 SOP 或能力。</p>
              </div>
              {ranked.length ? (
                <div className="method-ticket-stack">
                  {ranked.map((asset) => <MethodTicket key={`${asset.kind}-${asset.item.id}`} asset={asset} onCopy={onCopy} />)}
                </div>
              ) : (
                <div className="workshop-empty">
                  <Workflow aria-hidden="true" />
                  <strong>还没有适合推荐的方法</strong>
                  <span>完成真实任务并形成 SOP 后，这里会按当前证据给出建议；不会为了填满页面制造内容。</span>
                </div>
              )}
            </section>
          </>
        ) : null}

        {activeTab === "mine" ? (
          <aside className="skill-ledger skill-ledger--single" aria-label="我的 Skill">
            <div className="ledger-block">
              <div className="ledger-block__title"><span><PackageOpen aria-hidden="true" /></span><div><small>真源、分享文件和当前状态</small><h2>我的 Skill</h2></div><b>{skills.exports.length}</b></div>
              {skills.exports.length ? (
                <ul>{skills.exports.map((item) => {
                  const view = exportedSkillView(item);
                  return (
                    <li key={item.id}>
                      <button type="button" className="skill-ledger-row__open" onClick={() => setSelectedExport(item)}>
                        <span className="skill-ledger-row__copy"><SourceText as="strong">{item.title}</SourceText><SourceText as="span">{item.summary}</SourceText></span>
                        <span className="skill-ledger-row__hint">查看详情<ChevronRight aria-hidden="true" /></span>
                      </button>
                      <StatusBadge value={view.label} helpText={view.help} />
                    </li>
                  );
                })}</ul>
              ) : <p>第一次整理 Skill 后才会在这里出现。生成时可以直接得到 ZIP、独立文件夹或链接所需的本地载体；空模板不会预造记录。</p>}
            </div>
            <div className="ledger-footnote"><ShieldCheck aria-hidden="true" /><span>工坊只展示低敏状态，不展示来源地址、本机路径、分享链接或原始资产 ID。</span></div>
          </aside>
        ) : null}

        {activeTab === "installed" ? (
          <aside className="skill-ledger skill-ledger--single skill-ledger--installed" aria-label="已安装 Skill">
            <div className="ledger-block ledger-block--installed">
              <div className="ledger-block__title"><span><Download aria-hidden="true" /></span><div><small>我的助手</small><h2>已安装 Skill</h2></div><b>{skills.items.length}</b></div>
              {skills.items.length ? (
                <ul>{skills.items.map((item) => <li key={item.id}><div><SourceText as="strong">{item.title}</SourceText><SourceText as="span">{item.summary}</SourceText></div><StatusBadge value={item.state} helpText={INSTALLED_SKILL_HELP[item.state]} /></li>)}</ul>
              ) : <p>{skills.status || "还没有登记已安装 Skill。"}</p>}
            </div>
            <div className="ledger-footnote"><ShieldCheck aria-hidden="true" /><span>工坊不展示安装入口、来源地址或本机路径。</span></div>
          </aside>
        ) : null}

        {activeTab === "import" ? (
          <div className="binding-lane binding-lane--import binding-lane--single">
            <div className="binding-lane__heading">
              <span><Download aria-hidden="true" /></span>
              <div><small>别人的 Skill</small><h2>检查后接入我的助手</h2></div>
            </div>
            <div className="skill-source-guide" role="note">
              <ClipboardCopy aria-hidden="true" />
              <div>
                <strong>点击下方“复制检查请求”按钮，再把复制的内容发给 Agent</strong>
                <span>点击按钮只会复制请求，不会立即安装。发给 Agent 后，它会继续引导你提供这个 Skill 的位置或链接；如果不知道放在哪，也可以直接让 Agent 帮你判断。</span>
              </div>
            </div>
            <section className="skill-source-picker" aria-label="可以提供给 Agent 的 Skill 来源">
              <div className="skill-source-picker__heading">
                <strong>你可以给 Agent 下面任意一种来源</strong>
                <span>不需要先判断哪种更合适，把你手里现有的内容告诉它就可以。</span>
              </div>
              <div className="skill-source-options">
                <article><FolderOpen aria-hidden="true" /><div><strong>本地文件夹</strong><span>别人直接发来的 Skill 文件夹，或你已经解压好的文件夹。</span></div></article>
                <article><FileArchive aria-hidden="true" /><div><strong>ZIP 文件</strong><span>别人发来的 Skill 压缩包，不需要你先运行里面的内容。</span></div></article>
                <article><Link2 aria-hidden="true" /><div><strong>Skill 链接</strong><span>GitHub 仓库、Release 页面或其他明确的下载链接。</span></div></article>
                <article><CircleHelp aria-hidden="true" /><div><strong>我不确定</strong><span>告诉 Agent 你现在拿到的文件、页面或描述，它会先帮你判断。</span></div></article>
              </div>
            </section>
            <p>Agent 会先在本机只读检查用途、触发、脚本、依赖、权限和冲突，不会自动改写这个 Skill。检查通过后仍会先向你说明影响，得到确认才安装；发现问题会保留并隔离，等你决定，其他能力照常使用。</p>
            <Button
              className="workshop-install-action"
              disabled={!instanceReady || !installAction}
              onClick={() => { if (installAction) onCopy(installAction.request, installAction.label); }}
            >
              <Upload aria-hidden="true" />
              {instanceReady ? "复制检查请求" : "创建助手后使用"}
            </Button>
          </div>
        ) : null}
      </motion.section>
      <ExportedSkillDetailDialog item={selectedExport} onCopy={onCopy} onClose={() => setSelectedExport(null)} />
    </div>
  );
}
