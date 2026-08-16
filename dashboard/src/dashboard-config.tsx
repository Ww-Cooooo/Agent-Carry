import type { ElementType } from "react";
import {
  BookOpen,
  BrainCircuit,
  Cpu,
  History,
  Home,
  Library,
  ListTodo,
  PackageOpen,
  Settings2,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import type { Planet } from "@/components/three/Core";
import type { DashboardActionKind } from "@/lib/data";

export type Page = "home" | "library" | "growth" | "transfer" | "system";
export type LibraryKind = "memories" | "sops" | "capabilities" | "experiences";
export type GrowthKind = "todos" | "evolution" | "governance";
export type OrbitKey = DashboardActionKind | "model";

export interface RouteState {
  page: Page;
  kind?: LibraryKind | GrowthKind;
}

export interface CategoryMeta {
  key: OrbitKey;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  icon: ElementType;
  page: Page;
}

export const CATEGORIES: CategoryMeta[] = [
  {
    key: "memories",
    label: "记忆",
    shortLabel: "记忆",
    description: "长期保留的事实、偏好和要求",
    color: "#5b82f6",
    icon: BrainCircuit,
    page: "library",
  },
  {
    key: "sops",
    label: "固定流程（SOP）",
    shortLabel: "流程",
    description: "重复任务可以直接使用的做法",
    color: "#2bc7ad",
    icon: Workflow,
    page: "library",
  },
  {
    key: "capabilities",
    label: "能力",
    shortLabel: "能力",
    description: "助手已经整理好的本领",
    color: "#efad45",
    icon: Sparkles,
    page: "library",
  },
  {
    key: "todos",
    label: "待办",
    shortLabel: "待办",
    description: "你明确要求以后继续的事情",
    color: "#f47c70",
    icon: ListTodo,
    page: "growth",
  },
  {
    key: "experiences",
    label: "经验",
    shortLabel: "经验",
    description: "完成任务后留下的做法和教训",
    color: "#947de8",
    icon: History,
    page: "library",
  },
  {
    key: "governance",
    label: "长期改进",
    shortLabel: "改进",
    description: "定期研究记忆、系统配合和安全",
    color: "#e66ca8",
    icon: ShieldCheck,
    page: "growth",
  },
  {
    key: "evolution",
    label: "学习建议",
    shortLabel: "成长",
    description: "工作中发现、还要确认的改进想法",
    color: "#39add8",
    icon: BookOpen,
    page: "growth",
  },
  {
    key: "model",
    label: "当前模型",
    shortLabel: "模型",
    description: "当前模型和适合它的任务",
    color: "#e6be16",
    icon: Cpu,
    page: "system",
  },
];

export const ORBIT_PLANETS: Planet[] = CATEGORIES.map(({ key, label, color }) => ({
  key,
  label,
  color,
}));

export const NAV_ITEMS: Array<{
  page: Page;
  label: string;
  shortLabel: string;
  description: string;
  icon: ElementType;
}> = [
  { page: "home", label: "总览", shortLabel: "总览", description: "待办、资产和最近变化", icon: Home },
  { page: "library", label: "随身资产", shortLabel: "资产", description: "记忆、流程、能力和经验", icon: Library },
  { page: "growth", label: "待办与成长", shortLabel: "待办", description: "待办、学习建议和长期改进", icon: Sparkles },
  { page: "transfer", label: "迁移与安全", shortLabel: "迁移", description: "GitHub 备份和本地隐私迁移", icon: PackageOpen },
  { page: "system", label: "当前状态", shortLabel: "状态", description: "模型等级和读取方式", icon: Settings2 },
];

export const LIBRARY_KINDS: LibraryKind[] = ["memories", "sops", "capabilities", "experiences"];
export const GROWTH_KINDS: GrowthKind[] = ["todos", "evolution", "governance"];

export function categoryFor(key: OrbitKey): CategoryMeta {
  return CATEGORIES.find((category) => category.key === key) ?? CATEGORIES[0];
}

export function routeForOrbit(key: string): RouteState {
  const category = CATEGORIES.find((item) => item.key === key);
  if (!category) return { page: "home" };
  if (category.page === "library") return { page: "library", kind: category.key as LibraryKind };
  if (category.page === "growth") return { page: "growth", kind: category.key as GrowthKind };
  return { page: category.page };
}

export function routeFromHash(hash: string): RouteState {
  const [rawPage, rawKind] = hash.replace(/^#\/?/, "").split("/");
  const page = NAV_ITEMS.some((item) => item.page === rawPage) ? (rawPage as Page) : "home";
  if (page === "library" && LIBRARY_KINDS.includes(rawKind as LibraryKind)) {
    return { page, kind: rawKind as LibraryKind };
  }
  if (page === "growth" && GROWTH_KINDS.includes(rawKind as GrowthKind)) {
    return { page, kind: rawKind as GrowthKind };
  }
  if (page === "library") return { page, kind: "memories" };
  if (page === "growth") return { page, kind: "todos" };
  return { page };
}

export function hashForRoute(route: RouteState): string {
  return `#${route.page}${route.kind ? `/${route.kind}` : ""}`;
}
