import { useState, type ElementType } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardCopy,
  FileCheck2,
  History,
  Lightbulb,
  MessageCircleMore,
  RefreshCw,
  Route,
  ScanSearch,
  Settings2,
  Sparkles,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SectionEyebrow, StatusBadge } from "@/components/dashboard/Shared";

export function MemoryAccessGuide() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="memory-access-guide" aria-labelledby="memory-access-guide-title">
      <div className="memory-access-guide__head">
        <div>
          <SectionEyebrow icon={Brain}>记忆怎样参与任务</SectionEyebrow>
          <h2 id="memory-access-guide-title">直接说想做什么，不必记住记忆或流程的准确名称</h2>
          <p>Agent Carry 会先用极小目录理解你的日常说法，只比较少量标题、摘要和适用范围；找到以后才读取真正相关的正文。</p>
        </div>
        <span className="memory-access-guide__default">默认自动进行</span>
      </div>

      <div className="memory-access-guide__routes">
        <div className="memory-auto-route">
          <span className="memory-route-label">平时这样用</span>
          <div className="memory-auto-route__steps" aria-label="记忆自动按需读取过程">
            <article><span>01</span><strong>用日常语言说任务</strong><small>“按上次那样弄”也可以</small></article>
            <motion.span
              aria-hidden="true"
              initial={reduceMotion ? false : { opacity: 0.35, x: -4 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, x: 0 }}
              viewport={{ once: true }}
            ><ArrowRight /></motion.span>
            <article><span>02</span><strong>极小目录找候选</strong><small>只比较低敏摘要，不读全部正文</small></article>
            <motion.span
              aria-hidden="true"
              initial={reduceMotion ? false : { opacity: 0.35, x: -4 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.08 }}
            ><ArrowRight /></motion.span>
            <article><span>03</span><strong>提醒或确认后再读取</strong><small>只加载命中的一项和必要依赖</small></article>
          </div>
        </div>

        <aside className="memory-manual-route">
          <span className="memory-route-label memory-route-label--manual">也可以手动</span>
          <div><ClipboardCopy aria-hidden="true" /><strong>想明确使用某一条时</strong></div>
          <p>打开那条记忆，点击“手动指定这条记忆”，再把复制好的指令发给当前 Agent。</p>
        </aside>
      </div>

      <p className="memory-access-guide__note"><CheckCircle2 aria-hidden="true" />只有一个明显候选时，Agent 会先提醒你再沿用；有多个不同候选时才请你选。卡片上的手动按钮始终只是备用入口。</p>
    </section>
  );
}

export function HabitLearningGuide({ count }: { count: number }) {
  const reduceMotion = useReducedMotion();
  const steps = [
    { icon: ScanSearch, label: "在真实任务中发现", note: "重复习惯、有效做法或一次重要纠正" },
    { icon: MessageCircleMore, label: "Agent 用你听得懂的话问你", note: "只问要不要留下，以及适用于哪些情况" },
    { icon: Settings2, label: "确认后按需使用", note: "以后能自动找到，也能随时纠正或停止沿用" },
  ];

  return (
    <section className="habit-learning-guide" aria-labelledby="habit-learning-guide-title">
      <div className="habit-learning-guide__intro">
        <div>
          <SectionEyebrow icon={Sparkles}>我的习惯</SectionEyebrow>
          <h2 id="habit-learning-guide-title">你只管正常做事，值得留下的习惯会先问过你</h2>
          <p>不需要说“写入记忆”或“形成 SOP”。Agent Carry 负责发现和分类，你只需确认内容是否正确、以后哪些情况要沿用。</p>
        </div>
        <span className={count ? "habit-learning-guide__count is-active" : "habit-learning-guide__count"}>
          <strong>{count}</strong>
          <small>{count ? "条习惯记录" : "还没有习惯记录"}</small>
        </span>
      </div>
      <div className="habit-learning-guide__flow" aria-label="习惯从发现到使用的过程">
        {steps.map((step, index) => (
          <motion.article
            key={step.label}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.55 }}
            transition={{ duration: 0.34, delay: index * 0.08 }}
          >
            <span><step.icon aria-hidden="true" /></span>
            <div><strong>{step.label}</strong><small>{step.note}</small></div>
            <b>{String(index + 1).padStart(2, "0")}</b>
          </motion.article>
        ))}
      </div>
      <p className="habit-learning-guide__note"><CheckCircle2 aria-hidden="true" />保存后会出现在下面的“我的习惯”分组；换 Agent 或换电脑时，它会和其他 Agent Carry 记忆一起带走。</p>
    </section>
  );
}

const MATURITY_STEPS = [
  {
    count: "起点",
    stage: "首次使用前",
    status: "待验证",
    title: "先在合适的真实任务里试一次",
    detail: "这项流程或能力已经整理好并获得相应授权，但还没有被结果证明。打开对应卡片，复制使用指令；任务结束后还要核对结果。",
  },
  {
    count: "01",
    stage: "第 1 次独立成功",
    status: "可使用",
    title: "证明它至少成功做过一次",
    detail: "必须是一项真实任务已经完成，并且结果核对通过。同一任务里反复修改和重试，仍然只算一次。",
  },
  {
    count: "02",
    stage: "第 2 次独立成功",
    status: "可使用",
    title: "继续积累，不会只看次数升级",
    detail: "第二次最好来自另一项任务。它仍然可以使用，但不会因为数字到了 2 就自动宣称已经可靠。",
  },
  {
    count: "03+",
    stage: "通常第 3 次及以后",
    status: "可使用",
    title: "条件同时满足，才记为可靠",
    detail: "通常至少需要 3 次独立成功、覆盖 2 种明显不同的任务情境、适用范围稳定，并且没有未解决的重要失败。高风险任务会要求更多证据。",
  },
  {
    count: "跨 Agent",
    stage: "换宿主后继续验证",
    status: "可使用",
    title: "换环境后仍能正确使用",
    detail: "先达到可靠，再在至少 2 个真实 Agent／宿主中成功适配，或经历一次实质环境变化后仍验证通过，才算完成跨宿主验证。",
  },
];

const REVIEW_TRIGGERS = [
  "出现明显失败",
  "Agent、模型、权限或版本发生变化",
  "新证据和旧结论冲突",
];

const ORIGIN_STEPS = [
  {
    number: "01",
    title: "真实任务里出现值得保留的做法",
    detail: "可能来自你明确教给 Agent 的做法、重复成功的步骤、一次重要纠正，或者失败后已经验证有效的修正。普通闲聊和一次性细节不会自动留下。",
  },
  {
    number: "02",
    title: "先形成候选，不直接变成长期规则",
    detail: "Agent 先记录它从哪里来、解决什么问题、适用到哪里、风险多大，以及是否已经有相似内容；证据不够或关系不清楚时继续观察。",
  },
  {
    number: "03",
    title: "判断它应该成为能力、流程还是经验",
    detail: "回答“助手会完成哪类工作”更像能力；能写清触发条件、步骤、分支和完成标准的重复做法才适合固定流程（SOP）；只记录某次任务发生了什么，则更像经验。",
  },
  {
    number: "04",
    title: "获得授权后，以真实成熟度保存",
    detail: "只有你明确确认具体内容和适用范围后，它才进入正式资产。风险分级只决定哪些候选更早请你复核，不能代替这次确认；没有真实成功证据时仍然是“待验证”。",
  },
];

const VALIDATION_SUMMARY_STEPS = [
  { label: "真实任务发现", note: "纠正、成功做法或失败修正" },
  { label: "整理并判断类型", note: "能力、固定流程或经验" },
  { label: "保存为待验证", note: "获得授权不等于已经可靠" },
  { label: "在真实任务中成熟", note: "1 次可使用，通常 3 次后才可靠" },
];

export function AssetValidationGuide() {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <>
      <section className="asset-guide-summary asset-guide-summary--validation" aria-labelledby="asset-validation-guide-title">
        <button type="button" className="asset-guide-summary__button" onClick={() => setOpen(true)} aria-haspopup="dialog">
          <div className="asset-guide-summary__head">
            <div>
              <SectionEyebrow icon={FileCheck2}>流程与能力怎么形成</SectionEyebrow>
              <h2 id="asset-validation-guide-title">从一次真实任务，到一项可靠的做法</h2>
              <p>先看简要路线；想知道候选怎样产生、每次验证怎么算、失败后怎样复核，再打开完整说明。</p>
            </div>
            <span className="asset-guide-summary__open">查看完整过程 <ChevronRight aria-hidden="true" /></span>
          </div>
          <div className="asset-guide-mini-flow" aria-label="流程或能力从形成到可靠的简要路线">
            {VALIDATION_SUMMARY_STEPS.map((step, index) => (
              <div className="asset-guide-mini-flow__unit" key={step.label}>
                <article>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{step.label}</strong>
                  <small>{step.note}</small>
                </article>
                {index < VALIDATION_SUMMARY_STEPS.length - 1 ? (
                  <motion.span
                    className="asset-guide-mini-flow__arrow"
                    aria-hidden="true"
                    initial={reduceMotion ? false : { opacity: 0.45, x: -3 }}
                    whileInView={reduceMotion ? undefined : { opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: index * 0.08 }}
                  ><ArrowRight /></motion.span>
                ) : null}
              </div>
            ))}
          </div>
        </button>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="asset-guide-dialog">
          <DialogHeader>
            <DialogTitle>一项流程或能力，怎样从真实任务中形成并走到可靠</DialogTitle>
            <DialogDescription>下面是完整过程。它跟着真实工作自然发生，不会为了更新状态另外开一套测试。</DialogDescription>
          </DialogHeader>

          <div className="asset-guide-dialog__body">
            <section className="asset-origin-guide" aria-labelledby="asset-origin-guide-title">
              <div className="asset-origin-guide__head">
                <SectionEyebrow icon={Lightbulb}>首次使用之前</SectionEyebrow>
                <h3 id="asset-origin-guide-title">这个 SOP 或能力最开始是怎么来的？</h3>
                <p>它不是 Agent 凭空写出来的，也不是一段对话自动升级而来。起点必须是用户要求或真实任务里出现了值得以后复用的做法。</p>
              </div>
              <div className="asset-origin-flow">
                {ORIGIN_STEPS.map((step) => (
                  <article key={step.number}>
                    <span>{step.number}</span>
                    <h4>{step.title}</h4>
                    <p>{step.detail}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="asset-validation-guide" aria-label="流程或能力的验证和复核详情">
              <div className="asset-validation-guide__head">
                <div>
                  <SectionEyebrow icon={FileCheck2}>保存之后怎样成熟</SectionEyebrow>
                  <h3>从“待验证”到“可靠”，每一步都要有真实结果</h3>
                  <p>普通看板只显示“待验证、可使用、需要复核”三种简单状态；更细的进度和证据保存在资产记录里。</p>
                </div>
                <div className="validation-count-rule">
                  <CheckCircle2 aria-hidden="true" />
                  <p><strong>什么叫一次独立成功？</strong><span>另一项真实任务已经完成，并且结果核对通过。任务内重试不重复累计。</span></p>
                </div>
              </div>

              <div className="validation-timeline" aria-label="流程或能力的验证进度">
                <motion.span
                  className="validation-timeline__rail"
                  aria-hidden="true"
                  initial={reduceMotion ? false : { scaleX: 0 }}
                  whileInView={reduceMotion ? undefined : { scaleX: 1 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                />
                {MATURITY_STEPS.map((step, index) => (
                  <motion.article
                    key={step.stage}
                    className="validation-stage"
                    initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                    whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.35, delay: index * 0.07 }}
                  >
                    <div className="validation-stage__top">
                      <span className="validation-stage__count">{step.count}</span>
                      <StatusBadge value={step.status} showHelp={false} />
                    </div>
                    <p className="validation-stage__stage">{step.stage}</p>
                    <h4>{step.title}</h4>
                    <p className="validation-stage__detail">{step.detail}</p>
                  </motion.article>
                ))}
              </div>

              <div className="review-route" aria-label="需要复核时的处理路线">
                <div className="review-route__trigger">
                  <span className="review-route__icon"><CircleAlert aria-hidden="true" /></span>
                  <div>
                    <strong>任何阶段都可能进入“需要复核”</strong>
                    <p>{REVIEW_TRIGGERS.join("、")}时，不再沿用旧结论。</p>
                  </div>
                </div>
                <ArrowRight className="review-route__arrow" aria-hidden="true" />
                <div className="review-route__state"><StatusBadge value="需要复核" showHelp={false} /><span>先暂停直接复用</span></div>
                <ArrowRight className="review-route__arrow" aria-hidden="true" />
                <ol className="review-route__steps">
                  <li><span>1</span><p><strong>先检查</strong>旧证据、当前环境和失败原因</p></li>
                  <li><span>2</span><p><strong>再使用</strong>在下一项合适的真实任务中重新验证</p></li>
                  <li><span>3</span><p><strong>按结果处理</strong>通过则回到证据对应的状态；未通过则保留复核并修改范围或做法</p></li>
                </ol>
              </div>

              <p className="asset-validation-guide__footnote">
                <RefreshCw aria-hidden="true" />
                Agent 会在相关任务结束并核对结果后更新证据，你不需要手动记第几次，也不会被要求单独跑一轮企业式回归。
              </p>
            </section>
          </div>

          <DialogFooter className="asset-guide-dialog__footer">
            <Button variant="outline" onClick={() => setOpen(false)}>看懂了，关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const ASSET_COMPARISON: Array<{
  id: string;
  label: string;
  role: string;
  example: string;
  icon: ElementType;
}> = [
  {
    id: "memory",
    label: "记忆",
    role: "保存以后还会用到的事实、偏好和长期要求",
    example: "例如：你喜欢先看结论，再看细节。",
    icon: Brain,
  },
  {
    id: "capability",
    label: "能力",
    role: "说明助手会完成哪类工作，以及适用范围",
    example: "例如：会比较多份材料并找出冲突。",
    icon: Sparkles,
  },
  {
    id: "sop",
    label: "固定流程",
    role: "保存以后遇到同类任务时可以重复采用的步骤",
    example: "例如：发布前依次检查隐私、许可证和离线资源。",
    icon: Workflow,
  },
  {
    id: "experience",
    label: "任务经验",
    role: "记录一次真实任务发生了什么、哪里出错、怎样修正",
    example: "例如：上次漏看附件，后来用清单补查，并记录这招何时适用。",
    icon: History,
  },
];

const EXPERIENCE_SUMMARY_STEPS = [
  { label: "真实任务结束", note: "出现值得记住的成功或失败" },
  { label: "保存复盘记录", note: "情况、修正、证据和边界" },
  { label: "以后遇到相似任务", note: "打开对应经验卡片" },
  { label: "复制参考指令", note: "Agent 对比当前条件后再采用" },
];

export function ExperienceExplainer() {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <>
      <section className="asset-guide-summary asset-guide-summary--experience" aria-labelledby="experience-explainer-title">
        <button type="button" className="asset-guide-summary__button" onClick={() => setOpen(true)} aria-haspopup="dialog">
          <div className="asset-guide-summary__head">
            <div>
              <SectionEyebrow icon={Route}>经验是什么</SectionEyebrow>
              <h2 id="experience-explainer-title">把一次任务里的成功、失败和修正留给以后参考</h2>
              <p>经验不是长期事实，也不是必须照做的标准步骤。先看它怎样被保存、什么时候值得复制使用。</p>
            </div>
            <span className="asset-guide-summary__open">查看经验说明 <ChevronRight aria-hidden="true" /></span>
          </div>
          <div className="asset-guide-mini-flow asset-guide-mini-flow--experience" aria-label="经验从形成到使用的简要路线">
            {EXPERIENCE_SUMMARY_STEPS.map((step, index) => (
              <div className="asset-guide-mini-flow__unit" key={step.label}>
                <article>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{step.label}</strong>
                  <small>{step.note}</small>
                </article>
                {index < EXPERIENCE_SUMMARY_STEPS.length - 1 ? (
                  <motion.span
                    className="asset-guide-mini-flow__arrow"
                    aria-hidden="true"
                    initial={reduceMotion ? false : { opacity: 0.45, x: -3 }}
                    whileInView={reduceMotion ? undefined : { opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: index * 0.08 }}
                  ><ArrowRight /></motion.span>
                ) : null}
              </div>
            ))}
          </div>
        </button>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="asset-guide-dialog asset-guide-dialog--experience">
          <DialogHeader>
            <DialogTitle>经验是什么，什么时候应该复制使用</DialogTitle>
            <DialogDescription>经验是一份真实任务的复盘记录。它帮助当前 Agent 少走一次旧弯路，但不会替代当前任务的判断和验证。</DialogDescription>
          </DialogHeader>

          <div className="asset-guide-dialog__body">
            <section className="experience-explainer" aria-label="经验与其他资产的区别">
              <div className="experience-explainer__head">
                <SectionEyebrow icon={Route}>先分清四类内容</SectionEyebrow>
                <h3>经验回答的是“那次发生了什么，以及下次要注意什么”</h3>
                <p>它会记下当时的情况、做法、失败与修正、结果证据和适用边界。以后遇到相似任务时可以参考，但不会不看当前条件就原样照搬。</p>
              </div>
              <div className="experience-comparison">
                {ASSET_COMPARISON.map((item) => (
                  <article key={item.id} className={item.id === "experience" ? "is-current" : ""}>
                    <div className="experience-comparison__title"><span><item.icon aria-hidden="true" /></span><strong>{item.label}</strong></div>
                    <p>{item.role}</p>
                    <small>{item.example}</small>
                  </article>
                ))}
              </div>
            </section>

            <section className="experience-use-guide" aria-labelledby="experience-use-guide-title">
              <div className="experience-use-guide__head">
                <SectionEyebrow icon={History}>什么时候复制使用</SectionEyebrow>
                <h3 id="experience-use-guide-title">先有一项相似的当前任务，再选择对应经验</h3>
                <p>不是每次打开看板都要读经验。只有当前任务与某条经验的场景、失败风险或修正方法真正相关时，才打开那张经验卡片。</p>
              </div>
              <div className="experience-use-layout">
                <div className="experience-use-when">
                  <h4>这些情况值得参考</h4>
                  <ul>
                    <li><CheckCircle2 aria-hidden="true" /><span>你正在做一件和过去某次任务相似的事。</span></li>
                    <li><CheckCircle2 aria-hidden="true" /><span>你想避免再次遇到以前已经发生过的失败。</span></li>
                    <li><CheckCircle2 aria-hidden="true" /><span>过去的修正已经验证有效，但当前条件可能有变化。</span></li>
                    <li><CheckCircle2 aria-hidden="true" /><span>换了 Agent、模型、工具或环境，需要先检查旧方法是否仍适用。</span></li>
                  </ul>
                </div>
                <ol className="experience-use-steps">
                  <li><span>01</span><div><strong>打开经验卡片</strong><p>先看标题、摘要和适用范围，确认它和当前任务确实相关。</p></div></li>
                  <li><span>02</span><div><strong>点击“复制经验参考指令”</strong><p>不用自己复制经验正文；按钮会带上稳定编号、按需读取路线和使用边界。</p></div></li>
                  <li><span>03</span><div><strong>把完整指令发给当前 Agent</strong><p>Agent 只读取这条经验和当前任务必需的材料，不会加载全部历史经验。</p></div></li>
                  <li><span>04</span><div><strong>让 Agent 先比较条件，再决定采用什么</strong><p>适用的部分可以参考；旧路径、旧工具或不适合当前环境的部分会明确跳过。</p></div></li>
                  <li><span>05</span><div><strong>任务完成后核对结果</strong><p>Agent 会说明用了哪些经验、哪些没有用，以及本次是否产生值得保存的新修正。</p></div></li>
                </ol>
              </div>
              <p className="experience-use-example"><History aria-hidden="true" /><span><strong>举例：</strong>你再次进行跨 Agent 迁移时，可以复制过去那条迁移经验。Agent 会参考当时的隐私检查和核对方法，但不会照搬旧电脑路径或旧 Agent 的按钮。</span></p>
            </section>
          </div>

          <DialogFooter className="asset-guide-dialog__footer">
            <Button variant="outline" onClick={() => setOpen(false)}>看懂了，关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
