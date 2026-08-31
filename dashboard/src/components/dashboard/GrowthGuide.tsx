import { useMemo, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Clock3, ListChecks, Route, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import type { GrowthKind } from "@/dashboard-config";
import { localizeText } from "@/lib/i18n";

type GuideTone = "blue" | "mint" | "amber" | "rose" | "slate";

type GuideNodeData = {
  eyebrow: string;
  title: string;
  detail: string;
  tone: GuideTone;
  icon: ReactNode;
};

type GuideNode = Node<GuideNodeData, "guide">;

type GuideDefinition = {
  eyebrow: string;
  title: string;
  summary: string;
  statusLabel: string;
  screenReaderSteps: string[];
  nodes: GuideNode[];
  edges: Edge[];
};

function node(
  id: string,
  x: number,
  y: number,
  data: Omit<GuideNodeData, "icon"> & { icon: ReactNode },
): GuideNode {
  return {
    id,
    type: "guide",
    position: { x, y },
    data,
    draggable: false,
    selectable: false,
    focusable: false,
  };
}

function edge(id: string, source: string, target: string, label?: string): Edge {
  return {
    id,
    source,
    target,
    label: label ? localizeText(label) : undefined,
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
    style: { strokeWidth: 1.4 },
  };
}

const GUIDE_DEFINITIONS: Record<GrowthKind, GuideDefinition> = {
  todos: {
    eyebrow: "待办怎么保存？",
    title: "你明确要求，它才会成为待办",
    summary: "AI Carry 不会把每次聊天都变成待办，除非你明确要求。",
    statusLabel: "待办事项",
    screenReaderSteps: [
      "你明确说“把这件事加入待办”。",
      "Agent 只保存以后继续这件事需要的信息。",
      "完成后记录仍会保留；你可以把它从看板隐藏，也可以明确要求删除。",
    ],
    nodes: [
      node("todo-request", 0, 72, {
        eyebrow: "由你决定",
        title: "明确说“加入待办”",
        detail: "普通聊天不会自动变成待办",
        tone: "blue",
        icon: <ListChecks aria-hidden="true" />,
      }),
      node("todo-card", 340, 72, {
        eyebrow: "只保存必要内容",
        title: "记录要做什么和做到什么程度",
        detail: "下次打开后可以接着做",
        tone: "amber",
        icon: <Route aria-hidden="true" />,
      }),
      node("todo-finish", 680, 72, {
        eyebrow: "完成后",
        title: "保留记录，按需隐藏",
        detail: "从看板隐藏不等于删除",
        tone: "mint",
        icon: <ListChecks aria-hidden="true" />,
      }),
    ],
    edges: [edge("todo-1", "todo-request", "todo-card"), edge("todo-2", "todo-card", "todo-finish")],
  },
  evolution: {
    eyebrow: "学习建议怎么处理？",
    title: "先确认有用，再决定要不要长期保存",
    summary: "Agent 在任务中发现以后可能还会用到的做法，会先检查它是否可靠、是否重复出现、有没有风险。稳定的步骤可以整理成固定流程（SOP）。",
    statusLabel: "学习建议",
    screenReaderSteps: [
      "真实任务中出现了以后可能还会用到的做法。",
      "Agent 只查看这条建议和少量相关记录，判断是否值得保存。",
      "稳定、重复而且验证有效的步骤可以整理成固定流程（SOP），其他内容可以保存成记忆、能力或经验。",
      "证据不够就继续观察；以后用不上就不保存。",
    ],
    nodes: [
      node("learn-signal", 0, 116, {
        eyebrow: "来自真实任务",
        title: "发现一条可能有用的做法",
        detail: "例如你的纠正、成功步骤或失败处理方法",
        tone: "blue",
        icon: <Sparkles aria-hidden="true" />,
      }),
      node("learn-gate", 300, 116, {
        eyebrow: "先检查",
        title: "确认是否有用、可靠和安全",
        detail: "只查看这条建议和相关记录",
        tone: "amber",
        icon: <ShieldCheck aria-hidden="true" />,
      }),
      node("learn-sop", 650, 0, {
        eyebrow: "步骤稳定并且验证有效",
        title: "整理成固定流程（SOP）",
        detail: "写清步骤、适用条件和完成标准",
        tone: "mint",
        icon: <Workflow aria-hidden="true" />,
      }),
      node("learn-asset", 650, 116, {
        eyebrow: "不适合写成固定步骤",
        title: "保存为记忆、能力或经验",
        detail: "放到最合适的分类中",
        tone: "blue",
        icon: <Sparkles aria-hidden="true" />,
      }),
      node("learn-quiet", 650, 232, {
        eyebrow: "现在还不适合保存",
        title: "继续观察，或者不保存",
        detail: "证据不够就等等，用不上就结束",
        tone: "slate",
        icon: <Route aria-hidden="true" />,
      }),
    ],
    edges: [
      edge("learn-1", "learn-signal", "learn-gate"),
      edge("learn-2", "learn-gate", "learn-sop", "步骤已验证"),
      edge("learn-3", "learn-gate", "learn-asset", "其他内容"),
      edge("learn-4", "learn-gate", "learn-quiet", "先不保存"),
    ],
  },
  governance: {
    eyebrow: "长期改进怎么进行？",
    title: "日期到了只提醒，是否开始由你决定",
    summary: "平时只记录下一次提醒日期，不读取三项计划的详细内容。日期到了提醒一次；你选择其中一项后，才会打开说明并交给 Level 3 调研。",
    statusLabel: "长期改进",
    screenReaderSteps: [
      "平时只查看下一次提醒日期，不读取三项长期改进的详细内容。",
      "日期到了只提醒一次，不会自动联网或在后台执行。",
      "你选择其中一项后，才会读取这一项的说明。",
      "Level 3 完成调研并提出建议；重要修改仍要经过你的批准。",
    ],
    nodes: [
      node("gov-clock", 0, 72, {
        eyebrow: "平时打开助手",
        title: "只看下一次提醒日期",
        detail: "日期没到就不读取计划详情",
        tone: "blue",
        icon: <Clock3 aria-hidden="true" />,
      }),
      node("gov-reminder", 280, 72, {
        eyebrow: "日期到了",
        title: "只提醒一次",
        detail: "不会联网，也不会后台执行",
        tone: "rose",
        icon: <Clock3 aria-hidden="true" />,
      }),
      node("gov-select", 560, 72, {
        eyebrow: "由你选择",
        title: "只打开选中的改进项目",
        detail: "其他项目暂时不读取",
        tone: "amber",
        icon: <Route aria-hidden="true" />,
      }),
      node("gov-review", 840, 72, {
        eyebrow: "交给 Level 3",
        title: "调研并提出改进建议",
        detail: "重要修改仍要经过你的批准",
        tone: "mint",
        icon: <ShieldCheck aria-hidden="true" />,
      }),
    ],
    edges: [
      edge("gov-1", "gov-clock", "gov-reminder"),
      edge("gov-2", "gov-reminder", "gov-select"),
      edge("gov-3", "gov-select", "gov-review"),
    ],
  },
};

function GuideNodeCard({ data }: NodeProps<GuideNode>) {
  return (
    <div className={`growth-guide-node growth-guide-node--${data.tone}`}>
      <Handle type="target" position={Position.Left} className="growth-guide-node__handle" />
      <span className="growth-guide-node__icon">{data.icon}</span>
      <span className="growth-guide-node__copy">
        <small>{data.eyebrow}</small>
        <strong>{data.title}</strong>
        <span>{data.detail}</span>
      </span>
      <Handle type="source" position={Position.Right} className="growth-guide-node__handle" />
    </div>
  );
}

const NODE_TYPES = { guide: GuideNodeCard };

export default function GrowthGuide({ kind, count }: { kind: GrowthKind; count: number }) {
  const reduced = useReducedMotion();
  const definition = GUIDE_DEFINITIONS[kind];
  const edges = useMemo(
    () => definition.edges.map((item, index) => ({ ...item, animated: !reduced && index === 0 })),
    [definition, reduced],
  );

  return (
    <motion.section
      key={kind}
      className={`growth-guide growth-guide--${kind}`}
      aria-labelledby={`growth-guide-${kind}-title`}
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 0.84, 0.3, 1] }}
    >
      <div className="growth-guide__head">
        <div>
          <p className="growth-guide__eyebrow">{definition.eyebrow}</p>
          <h2 id={`growth-guide-${kind}-title`}>{definition.title}</h2>
          <p>{definition.summary}</p>
        </div>
        <div className="growth-guide__status" aria-label={`${definition.statusLabel} ${count} 项`}>
          <strong>{count}</strong>
          <span>{definition.statusLabel}</span>
        </div>
      </div>

      <div className="growth-guide__flow" aria-hidden="true">
        <ReactFlow
          nodes={definition.nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          fitView
          fitViewOptions={{ padding: 0.12, minZoom: 0.58, maxZoom: 1 }}
          nodesDraggable={false}
          nodesConnectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          elementsSelectable={false}
          panOnDrag={false}
          panOnScroll={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          preventScrolling={false}
          disableKeyboardA11y
          proOptions={{ hideAttribution: true }}
        />
      </div>

      <ol className="growth-guide__text-flow">
        {definition.screenReaderSteps.map((step, index) => (
          <li key={step}><span>{String(index + 1).padStart(2, "0")}</span><p>{step}</p></li>
        ))}
      </ol>
    </motion.section>
  );
}
