import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  CircleHelp,
  Code2,
  Compass,
  MessageCircleMore,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type GuidanceMode = "step-by-step" | "balanced" | "direct";
type DirectionChoice = "general" | "domain" | "help-decide";

type Choice<T extends string> = {
  id: T;
  label: string;
  shortLabel: string;
  description: string;
  note: string;
  icon: typeof UserRound;
};

export const GUIDANCE_OPTIONS: Choice<GuidanceMode>[] = [
  {
    id: "step-by-step",
    label: "第一次接触 Agent",
    shortLabel: "一步步引导",
    description: "不懂编程也没关系。Agent 会用普通话解释，从你的真实工作开始。",
    note: "适合希望少一点术语、一次只回答一个问题的人。",
    icon: UserRound,
  },
  {
    id: "balanced",
    label: "已经用过一些",
    shortLabel: "适度引导",
    description: "你说出大致需求，Agent 只补问会影响结果的关键信息。",
    note: "保留必要解释，但不会把已经知道的内容再问一遍。",
    icon: MessageCircleMore,
  },
  {
    id: "direct",
    label: "经常使用 Agent",
    shortLabel: "直接协作",
    description: "可以直接讨论标准、资料、工具、SOP、自动化边界和验收方式。",
    note: "减少基础讲解，更快进入方案、执行和核对。",
    icon: Code2,
  },
];

const DIRECTION_OPTIONS: Choice<DirectionChoice>[] = [
  {
    id: "general",
    label: "通用个人助手",
    shortLabel: "通用方向",
    description: "先陪你处理工作、学习和生活中的不同任务，再逐渐熟悉你的习惯。",
    note: "适合暂时不想把助手限制在一个专业领域的人。",
    icon: Compass,
  },
  {
    id: "domain",
    label: "专业领域助手",
    shortLabel: "专业方向",
    description: "围绕一个职业或专业领域，逐步建立术语、标准、能力和固定流程。",
    note: "适合希望它长期成为某一专业方向得力帮手的人。",
    icon: BriefcaseBusiness,
  },
  {
    id: "help-decide",
    label: "先帮我判断",
    shortLabel: "先了解再决定",
    description: "先说说你的工作和困难，让 Agent 比较哪种方向更适合。",
    note: "这不是第三种方向；你确认前不会锁定任何选择。",
    icon: CircleHelp,
  },
];

function guidanceOption(id: GuidanceMode | null) {
  return GUIDANCE_OPTIONS.find((option) => option.id === id);
}

function directionOption(id: DirectionChoice | null) {
  return DIRECTION_OPTIONS.find((option) => option.id === id);
}

function appendInstantiationChoices(baseRequest: string, guidance: GuidanceMode, direction: DirectionChoice): string {
  const guidanceMeta = guidanceOption(guidance)!;
  const directionMeta = directionOption(direction)!;
  const directionRule = direction === "help-decide"
    ? "请先了解我的职业、困难和目标，比较通用与专业方向；这不是第三种正式方向。在我随后明确选择 general 或 domain 之前，不得写入或锁定方向。"
    : `我已经选择 ${direction}；仍须按正式指南完成访谈和写入前预览，得到我对完整预览的确认后才能锁定。`;

  return `${baseRequest}

## 本次看板选择（用户刚刚在创建向导中明确选择）

- 交流方式：${guidance}（${guidanceMeta.shortLabel}）
- 助手方向意向：${direction}（${directionMeta.shortLabel}）

请把上面两个选择视为我的本次明确输入，不要让我重新点击或重复回答。交流方式只控制解释深度、提问方式和协作节奏，不是我的能力评分，也不对应模型 Level 1／2／3。${directionRule}`;
}

function appendGuidanceChoice(baseRequest: string, guidance: GuidanceMode): string {
  const selected = guidanceOption(guidance)!;
  return `${baseRequest}

## 本次看板选择（用户刚刚明确选择）

- 目标交流方式：${guidance}（${selected.shortLabel}）

这就是我对本次 profile.guidance_mode 修改的明确授权。请不要再次让我选择；只调整交流方式并重建看板快照，已锁定的助手方向和既有资产必须保持不变。`;
}

function ChoiceGrid<T extends string>({
  choices,
  value,
  onChange,
  labelledBy,
}: {
  choices: Choice<T>[];
  value: T | null;
  onChange: (value: T) => void;
  labelledBy: string;
}) {
  return (
    <div className="onboarding-choice-grid" role="group" aria-labelledby={labelledBy}>
      {choices.map((choice) => {
        const selected = value === choice.id;
        const Icon = choice.icon;
        return (
          <button
            key={choice.id}
            type="button"
            className={`onboarding-choice${selected ? " is-selected" : ""}`}
            aria-pressed={selected}
            onClick={() => onChange(choice.id)}
          >
            <span className="onboarding-choice__icon"><Icon aria-hidden="true" /></span>
            <span className="onboarding-choice__copy">
              <strong>{choice.label}</strong>
              <span>{choice.description}</span>
              <small>{choice.note}</small>
            </span>
            <span className="onboarding-choice__check" aria-hidden="true">{selected ? <Check /> : null}</span>
          </button>
        );
      })}
    </div>
  );
}

function StepDots({ step }: { step: number }) {
  return (
    <ol className="onboarding-progress" aria-label={`创建助手，第 ${step} 步，共 3 步`}>
      {[1, 2, 3].map((item) => (
        <li key={item} className={item === step ? "is-current" : item < step ? "is-complete" : undefined} aria-current={item === step ? "step" : undefined}>
          <span>{item < step ? <Check aria-hidden="true" /> : item}</span>
          <small>{item === 1 ? "选择交流方式" : item === 2 ? "选择助手方向" : "只需核对"}</small>
        </li>
      ))}
    </ol>
  );
}

export function OnboardingDialog({
  open,
  onOpenChange,
  baseRequest,
  onCopy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baseRequest: string;
  onCopy: (text: string, label: string) => void;
}) {
  const [step, setStep] = useState(1);
  const [guidance, setGuidance] = useState<GuidanceMode | null>(null);
  const [direction, setDirection] = useState<DirectionChoice | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!open) {
      setStep(1);
      setGuidance(null);
      setDirection(null);
    }
  }, [open]);

  const selectedGuidance = guidanceOption(guidance);
  const selectedDirection = directionOption(direction);
  const canContinue = step === 1 ? Boolean(guidance) : step === 2 ? Boolean(direction) : Boolean(guidance && direction);

  const copyRequest = () => {
    if (!guidance || !direction) return;
    const request = appendInstantiationChoices(baseRequest, guidance, direction);
    onOpenChange(false);
    onCopy(request, "创建我的助手");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="onboarding-dialog" aria-describedby="onboarding-description">
        <DialogHeader className="onboarding-dialog__header">
          <span className="onboarding-dialog__mark"><Sparkles aria-hidden="true" />第一次设置</span>
          <DialogTitle>用你舒服的方式，创建自己的助手</DialogTitle>
          <DialogDescription id="onboarding-description">
            这里先确定交流方式和助手方向。网页不会直接修改文件；核对后，你会得到一段完整指令交给当前 Agent。
          </DialogDescription>
        </DialogHeader>

        <StepDots step={step} />

        <div className="onboarding-dialog__body">
          <AnimatePresence mode="wait" initial={false}>
            <motion.section
              key={step}
              className="onboarding-step"
              initial={reduced ? false : { opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduced ? undefined : { opacity: 0, x: -12 }}
              transition={{ duration: 0.2, ease: [0.16, 0.84, 0.3, 1] }}
            >
              {step === 1 ? (
                <>
                  <div className="onboarding-step__heading">
                    <span>第 1 步</span>
                    <h2 id="guidance-choice-title">你希望 Agent 怎样和你交流？</h2>
                    <p>这不是能力测试，以后随时可以调整。请选择现在最舒服的一种。</p>
                  </div>
                  <ChoiceGrid choices={GUIDANCE_OPTIONS} value={guidance} onChange={setGuidance} labelledBy="guidance-choice-title" />
                </>
              ) : null}

              {step === 2 ? (
                <>
                  <div className="onboarding-step__heading">
                    <span>第 2 步</span>
                    <h2 id="direction-choice-title">你想先把它培养成什么助手？</h2>
                    <p>正式创建后方向会锁定。拿不准时先让 Agent 帮你比较，不会替你决定。</p>
                  </div>
                  <ChoiceGrid choices={DIRECTION_OPTIONS} value={direction} onChange={setDirection} labelledBy="direction-choice-title" />
                </>
              ) : null}

              {step === 3 && selectedGuidance && selectedDirection ? (
                <section className="wizard-review-sheet wizard-review-sheet--onboarding" aria-label="创建助手信息核对单">
                  <header className="wizard-review-sheet__hero">
                    <span className="wizard-review-sheet__mark"><CheckCircle2 aria-hidden="true" /></span>
                    <div>
                      <small>第 3 步 · 核对单</small>
                      <strong>这一步没有需要选择的内容</strong>
                      <p>只需检查下面两项是否正确。内容正确就点击窗口底部的“核对无误”；需要调整就返回修改。</p>
                    </div>
                    <span className="wizard-review-sheet__badge">无需选择 · 只需核对</span>
                  </header>
                  <div className="wizard-review-sheet__title">
                    <div><small>你刚刚选择的信息</small><strong>创建助手前的最后核对</strong></div>
                    <span>共 2 项</span>
                  </div>
                  <dl className="onboarding-review-list">
                    <div>
                      <dt>
                        <span><selectedGuidance.icon aria-hidden="true" /></span>
                        <div><small>交流方式</small><strong>{selectedGuidance.shortLabel}</strong></div>
                        <em><Check aria-hidden="true" />已选择</em>
                      </dt>
                      <dd>{selectedGuidance.description}</dd>
                    </div>
                    <div>
                      <dt>
                        <span><selectedDirection.icon aria-hidden="true" /></span>
                        <div><small>助手方向</small><strong>{selectedDirection.shortLabel}</strong></div>
                        <em><Check aria-hidden="true" />已选择</em>
                      </dt>
                      <dd>{selectedDirection.description}</dd>
                    </div>
                  </dl>
                  <footer className="wizard-review-sheet__footnote">
                    <Check aria-hidden="true" />
                    <p><strong>网页不会直接创建或锁定助手。</strong>它只生成一段完整指令；当前 Agent 完成访谈并展示预览后，仍要等你明确确认。</p>
                  </footer>
                </section>
              ) : null}
            </motion.section>
          </AnimatePresence>
        </div>

        <div className="onboarding-dialog__footer">
          <Button variant="ghost" className="onboarding-back" disabled={step === 1} onClick={() => setStep((value) => Math.max(1, value - 1))}>
            <ArrowLeft aria-hidden="true" />{step === 3 ? "返回修改" : "上一步"}
          </Button>
          {step < 3 ? (
            <Button className="onboarding-next" disabled={!canContinue} onClick={() => setStep((value) => Math.min(3, value + 1))}>
              继续<ArrowRight aria-hidden="true" />
            </Button>
          ) : (
            <div className="wizard-final-action">
              <Button className="onboarding-next onboarding-next--final" disabled={!canContinue} onClick={copyRequest}>
                <CheckCircle2 aria-hidden="true" />核对无误，生成创建指令
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function GuidanceModeDialog({
  open,
  onOpenChange,
  currentMode,
  baseRequest,
  onCopy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentMode: string;
  baseRequest: string;
  onCopy: (text: string, label: string) => void;
}) {
  const initial = GUIDANCE_OPTIONS.some((option) => option.id === currentMode) ? currentMode as GuidanceMode : null;
  const [guidance, setGuidance] = useState<GuidanceMode | null>(initial);
  const selected = useMemo(() => guidanceOption(guidance), [guidance]);

  useEffect(() => {
    if (open) setGuidance(initial);
  }, [open, initial]);

  const copyRequest = () => {
    if (!guidance) return;
    onOpenChange(false);
    onCopy(appendGuidanceChoice(baseRequest, guidance), "调整交流方式");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="onboarding-dialog guidance-dialog" aria-describedby="guidance-dialog-description">
        <DialogHeader className="onboarding-dialog__header">
          <span className="onboarding-dialog__mark"><MessageCircleMore aria-hidden="true" />交流方式</span>
          <DialogTitle>你希望 Agent 接下来怎样和你配合？</DialogTitle>
          <DialogDescription id="guidance-dialog-description">
            只改变解释深度和提问节奏，不会改变助手方向，也不会重做你的记忆、能力或固定流程。
          </DialogDescription>
        </DialogHeader>
        <div className="onboarding-dialog__body guidance-dialog__body">
          <ChoiceGrid choices={GUIDANCE_OPTIONS} value={guidance} onChange={setGuidance} labelledBy="guidance-dialog-description" />
          {selected ? <p className="guidance-current-note">当前准备选择：<strong>{selected.shortLabel}</strong></p> : null}
        </div>
        <div className="onboarding-dialog__footer">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>暂不调整</Button>
          <Button className="onboarding-next" disabled={!guidance || guidance === currentMode} onClick={copyRequest}>
            生成调整指令<ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
