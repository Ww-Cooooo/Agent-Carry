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

type WorkshopTab = "methods" | "drafts" | "installed" | "import";

const EXPORTED_SKILL_HELP: Record<string, string> = {
  draft: "这份 Skill 只保存在本机，还没有完成当前检查，也没有上传、发送或公开。可以让 Agent 继续检查；原方法不会因此改变。",
  ready: "这份本地 Skill 已通过当前检查，可以进入分享预览。它不会自动发送或公开；你仍需指定接收方并授权。",
  review: "检查发现二进制或不透明资源、额外权限、兼容项等需要理解的内容。让 Agent 打开这条草稿的检查结果，它会说明具体命中项和处理选择；复核前不会分享。",
};

const EXPORTED_SKILL_LABEL: Record<string, string> = {
  draft: "尚未检查完成",
  ready: "可以分享",
  review: "需要复核",
};

const EXPORTED_SKILL_NEXT_STEP: Record<ExportedSkillItem["state"], string> = {
  draft: "可以让 Agent 继续完成这份草稿的触发、隐私和使用边界检查。检查完成后会更新状态，但不会自动分享。",
  ready: "如果你想分享，可以让 Agent 先生成分享预览，并告诉它准备分享给谁或放到哪里。真正发送或发布前，Agent 仍会向你确认。",
  review: "可以让 Agent 打开这份 Skill 的检查结果，说明具体问题和可选处理方式。复核完成前，它会继续留在本机。",
};

const INSTALLED_SKILL_HELP: Record<string, string> = {
  available: "这个 Skill 已登记并可在相关任务命中时按需读取；仍只会加载完成当前任务所需的内容。",
  review: "这个 Skill 的入口、依赖、权限或兼容状态需要复核。让 Agent 只检查这一个 Skill；复核前不会启用它，其他能力不受影响。",
  unavailable: "这个 Skill 当前不能使用。Agent 会保留它的记录和恢复入口，其他 Skill 与 Agent Carry 主体仍可继续工作。",
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
            {recommendation.state === "ready" ? "整理成 Skill" : "让 Agent 判断"}
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
  const statusLabel = EXPORTED_SKILL_LABEL[item.state] ?? item.state;
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
          <div className="skill-export-dialog__eyebrow"><PackageOpen aria-hidden="true" />已生成但尚未分享</div>
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
            <StatusBadge value={statusLabel} helpText={EXPORTED_SKILL_HELP[item.state]} />
            <p>{EXPORTED_SKILL_HELP[item.state]}</p>
          </section>
          <section>
            <span>分享情况</span>
            <strong>仍只保存在本机</strong>
            <p>这份 Skill 没有上传、发送或公开。</p>
          </section>
          <section className="skill-export-dialog__next">
            <span>接下来可以做什么</span>
            <p>{EXPORTED_SKILL_NEXT_STEP[item.state]}</p>
          </section>
        </div>

        <div className="skill-export-dialog__privacy" role="note">
          <ShieldCheck aria-hidden="true" />
          <span>这里只显示用途和状态；来源路径、原始资产编号和实例身份不会出现在看板里。</span>
        </div>
        <div className="skill-export-dialog__action-note" role="note">
          <ClipboardCopy aria-hidden="true" />
          <span>点击下方按钮只会复制一段请求。把它发给 Agent 后才会继续；网页不会直接检查、修改或分享这份 Skill。</span>
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
    { id: "drafts", label: "已生成的 Skill（未分享）", count: skills.exports.length, icon: PackageOpen, tone: "teal" },
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
          <h1>把好方法整理成 Skill<br />是否分享，由你决定</h1>
          <p>这里会推荐可能适合整理的方法，也能检查别人分享的 Skill。推荐只是建议，不会自动转换任何内容。只有你把某个方法的“整理成 Skill”请求交给 Agent 后，转换才会开始；安装也会在检查和确认后进行。</p>
        </div>
        <div className="workshop-hero__promise" role="note">
          <ShieldCheck aria-hidden="true" />
          <div><strong>整理你选中的方法时，Agent 会自动处理隐私</strong><span>Agent 只处理这个方法复制出的本地草稿：去掉身份、路径和私密内容，再整理成 Skill。推荐列表和原来的 SOP／能力都不会被修改，草稿也不会自动上传或公开。</span></div>
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
                <li><b>01</b><span><strong>选择一个方法</strong>你可以选择一个正式 SOP；成熟能力会先由 Agent 判断是否包含可复用流程。</span></li>
                <li><b>02</b><span><strong>Agent 自动处理本地副本</strong>你不需要自己复制或处理隐私。Agent 会把选中的方法复制到隔离草稿，只在草稿中去掉身份、路径和私密内容，并把专用值改成参数。</span></li>
                <li><b>03</b><span><strong>Agent 自动完成生成前检查</strong>你不需要自己检查。Agent 会核对草稿的触发、非触发和隐私边界；原方法保持不变，也不会执行包内脚本。</span></li>
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

        {activeTab === "drafts" ? (
          <aside className="skill-ledger skill-ledger--single" aria-label="已生成但尚未分享的 Skill">
            <div className="ledger-block">
              <div className="ledger-block__title"><span><PackageOpen aria-hidden="true" /></span><div><small>只保存在本机</small><h2>已生成但尚未分享的 Skill</h2></div><b>{skills.exports.length}</b></div>
              {skills.exports.length ? (
                <ul>{skills.exports.map((item) => (
                  <li key={item.id}>
                    <button type="button" className="skill-ledger-row__open" onClick={() => setSelectedExport(item)}>
                      <span className="skill-ledger-row__copy"><SourceText as="strong">{item.title}</SourceText><SourceText as="span">{item.summary}</SourceText></span>
                      <span className="skill-ledger-row__hint">查看详情<ChevronRight aria-hidden="true" /></span>
                    </button>
                    <StatusBadge value={EXPORTED_SKILL_LABEL[item.state] ?? item.state} helpText={EXPORTED_SKILL_HELP[item.state]} />
                  </li>
                ))}</ul>
              ) : <p>第一次生成 Skill 后才会在这里出现。这里的内容都只保存在本机，不等于已经分享。</p>}
            </div>
            <div className="ledger-footnote"><ShieldCheck aria-hidden="true" /><span>工坊不展示来源地址、本机路径或原始资产 ID。</span></div>
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
