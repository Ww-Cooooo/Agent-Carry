const reportFields = Object.freeze([
  "impact", "data_state", "recoverability", "still_usable", "next_step", "user_summary",
]);

function boundedText(value, max = 480) {
  return typeof value === "string" && value.length > 0 && value.length <= max
    && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value);
}

function validExistingReport(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    && reportFields.every((field) => boundedText(value[field]));
}

function operationLabel(operation) {
  const value = String(operation ?? "");
  if (value.includes("promotion")) return "学习资产晋升";
  if (value.includes("capture")) return "本次学习保存";
  if (value.includes("signal")) return "跨会话学习信号处理";
  return "本次操作";
}

function needsReport(decision) {
  return /(denied|hard-stop|paused|recovery-required|rollback-required|interrupted|invalid|unavailable)/u.test(decision);
}

// This is a presentation adapter, not an internal validation schema. Precise
// machine decisions stay intact; the Agent gets a small natural-language view
// whenever an error, pause, recovery state, or automatic repair occurred.
export function operationalUserReport(result, { operation = "operation" } = {}) {
  if (validExistingReport(result?.userReport)) return Object.freeze({ ...result.userReport });
  const decision = String(result?.decision ?? "operation-denied");
  if (!needsReport(decision)) return null;
  const label = operationLabel(operation);
  const recovery = decision.includes("recovery-required") || decision.includes("rollback-required")
    || decision.includes("interrupted");
  const hard = decision.includes("hard-stop");
  const paused = decision.includes("paused");
  const report = {
    impact: hard
      ? `${label}没有继续，因为实例核心身份或正式真源尚不能安全确认。`
      : paused
        ? `${label}暂时暂停；故障被限制在相关能力内，没有扩散到整个助手。`
        : recovery
          ? `${label}没有被当作完成；当前事务需要按已有恢复状态继续或回退。`
          : `${label}未执行，当前请求没有通过必要的边界检查。`,
    data_state: recovery
      ? "现有文件和本地恢复证据会保留；系统不会把部分写入误报为成功。"
      : "本次没有把失败动作当作成功，也不会为了通过而删除、覆盖或猜改用户数据。",
    recoverability: recovery
      ? "可以根据已保存的事务前像和检查点定向继续或完整回退；无法证明时保持现场。"
      : hard
        ? "先修复正式真源或实例身份后，可以重新发起原动作。"
        : "修正当前请求或受影响的局部文件后，可以重新尝试原动作。",
    still_usable: hard
      ? "磁盘数据仍保留；在核心状态核清前，不应继续宣称持久变更安全完成。"
      : "未受影响的普通对话、只读查看和其他独立能力仍可继续。",
    next_step: recovery
      ? "请让 Agent 先检查当前事务状态，并推荐“继续”或“回退”；不要手动删除恢复材料。"
      : hard
        ? "请让 Agent 只检查实例 manifest、核心真源和启动状态，再给出最小修复建议。"
        : "请用自然语言重述你刚才想完成的动作，让 Agent 指出需要补充或定向修复的那一项。",
  };
  report.user_summary = `${report.impact}${report.data_state}${report.still_usable}${report.next_step}`;
  return Object.freeze(report);
}

export function withOperationalUserReport(result, options = {}) {
  if (!result || typeof result !== "object" || Array.isArray(result)) return result;
  const report = operationalUserReport(result, options);
  return report ? Object.freeze({ ...result, userReport: report }) : result;
}
