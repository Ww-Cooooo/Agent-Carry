import type { AssetItem } from "./data";

export type SkillWorkshopSourceKind = "sop" | "capability";
export type SkillWorkshopRecommendationState = "ready" | "inspect" | "refine";

export interface SkillWorkshopRecommendation {
  state: SkillWorkshopRecommendationState;
  label: string;
  reason: string;
  help: string;
}

function normalized(value: unknown): string {
  return typeof value === "string" ? value.trim().toLocaleLowerCase() : "";
}

function explicitlyUsable(item: AssetItem): boolean {
  return normalized(item.status) === "active"
    && normalized(item.approvalState) === "explicit"
    && item.approvedByUser === true
    && ["explicit-user", "existing-approved-migration"].includes(normalized(item.activationBasis));
}

/**
 * Produces an advisory workshop recommendation only. It never changes an
 * asset, creates a task, or grants permission to export/share anything.
 */
export function recommendForSkillWorkshop(
  kind: SkillWorkshopSourceKind,
  item: AssetItem,
): SkillWorkshopRecommendation {
  const maturity = normalized(item.reliability);
  if (!explicitlyUsable(item) || !["practiced", "reliable", "portable"].includes(maturity)) {
    return {
      state: "refine",
      label: "先继续完善",
      reason: "等方法在真实任务中稳定下来、范围和授权都能核对后，再考虑分享。",
      help: "这项方法还缺真实任务验证、明确范围或完整授权。继续正常使用并核对结果即可；它不是必须立刻处理的待办。",
    };
  }

  if (kind === "capability") {
    return {
      state: "inspect",
      label: "需要判断是否有流程",
      reason: "这项能力已经成熟，但看板不能只凭能力名称确认里面是否有可复用流程。",
      help: "Agent 会只读回看这项能力的正式正文；找到可重复步骤才建议整理成 Skill，没有则保持原样，不影响能力继续使用。",
    };
  }

  return {
      state: "ready",
      label: "适合整理",
      reason: "这项流程已有真实使用证据。你把它的“整理成 Skill”请求交给 Agent 后，Agent 会先复制出本地草稿，只在草稿中自动脱敏和通用化，再生成 Skill；原流程保持不变。",
      help: "这项 SOP 已有真实使用证据，适合生成一份只保存在本机、尚未分享的 Skill；原 SOP 不会被自动修改。",
  };
}
