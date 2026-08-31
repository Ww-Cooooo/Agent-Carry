const ACTIVATION_EVIDENCE = new Set([
  "fresh-session-startup",
  "verified-host-rebootstrap",
  "validated-current-session-reentry",
  "manual-file-reread",
  "unknown",
]);
const STARTUP_STATES = new Set(["passed", "failed", "not-run"]);
const BEHAVIOR_STATES = new Set(["passed", "failed", "not-run", "not-required"]);

function text(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 128;
}

function report(impact, dataState, stillUsable, nextStep) {
  return Object.freeze({
    impact,
    data_state: dataState,
    recoverability: "保留的升级事务与会话证据可用于继续、复核或在文件真源无效时完整回退。",
    still_usable: stillUsable,
    next_step: nextStep,
    user_summary: `${impact}${dataState}${stillUsable}${nextStep}`,
  });
}

function result(decision, values) {
  return Object.freeze({ decision, ...values });
}

function invalidFacts(reason) {
  return result("upgrade-session-facts-invalid", {
    reason,
    files_state: "unknown",
    session_state: "unknown",
    behavior_state: "unknown",
    upgrade_complete: false,
    rollback_required: false,
    can_continue_unaffected_work: true,
    userReport: report(
      "这次会话激活判断缺少必要事实，没有被当作升级完成。",
      "判定器只读取事实并返回结果，没有修改实例文件。",
      "现有实例和其他独立能力不受这次判定影响。",
      "先补齐当前启动版本、目标版本和实际激活依据，再重新判断；不要用猜测补字段。",
    ),
  });
}

export function evaluateUpgradeSessionActivation(facts = {}) {
  if (!facts || typeof facts !== "object" || Array.isArray(facts)) return invalidFacts("facts-not-an-object");
  for (const key of ["sourceVerified", "filesInstalled", "instanceSwitched", "behaviorChangeExpected"]) {
    if (typeof facts[key] !== "boolean") return invalidFacts(`missing-or-invalid-${key}`);
  }
  for (const key of ["targetVersion", "installedVersion", "sessionBaselineVersion"]) {
    if (!text(facts[key])) return invalidFacts(`missing-or-invalid-${key}`);
  }
  if (!STARTUP_STATES.has(facts.startupValidation)) return invalidFacts("invalid-startupValidation");
  if (!ACTIVATION_EVIDENCE.has(facts.activationEvidence)) return invalidFacts("invalid-activationEvidence");
  if (!BEHAVIOR_STATES.has(facts.behaviorAcceptance)) return invalidFacts("invalid-behaviorAcceptance");
  if (!facts.sourceVerified) {
    return result("upgrade-source-not-verified", {
      files_state: facts.instanceSwitched ? "unsafe-switch" : "not-installed",
      session_state: "not-evaluated",
      behavior_state: "not-evaluated",
      upgrade_complete: false,
      rollback_required: facts.instanceSwitched,
      can_continue_unaffected_work: true,
      userReport: report(
        "目标升级来源尚未验证，升级不能继续宣称成功。",
        "原实例与候选证据应保留；若已经切换，必须按既有事务恢复旧实例。",
        "普通对话和不依赖本次升级的只读工作仍可继续。",
        facts.instanceSwitched ? "先恢复已验证的旧实例，再重新核对目标来源。" : "先核对固定目标来源，不要安装或猜测替换。",
      ),
    });
  }

  if (!facts.filesInstalled || !facts.instanceSwitched) {
    return result("upgrade-files-not-switched", {
      files_state: facts.filesInstalled ? "candidate-ready" : "not-installed",
      session_state: "not-evaluated",
      behavior_state: "not-evaluated",
      upgrade_complete: false,
      rollback_required: false,
      can_continue_unaffected_work: true,
      userReport: report(
        "升级文件或稳定入口尚未完成切换，因此没有进入会话激活。",
        "当前正式实例保持原状态；隔离候选可以继续核对。",
        "原实例和其他能力仍可正常使用。",
        "先完成并验证文件事务，再判断会话激活；不要跳过阶段。",
      ),
    });
  }

  if (facts.startupValidation !== "passed" || facts.installedVersion !== facts.targetVersion) {
    return result("upgrade-installed-state-invalid", {
      files_state: "invalid",
      session_state: "not-activated",
      behavior_state: "not-evaluated",
      upgrade_complete: false,
      rollback_required: true,
      can_continue_unaffected_work: true,
      userReport: report(
        "切换后的目标版本或启动真源没有通过验证，不能继续使用这套新文件。",
        "用户资产和升级证据应保留，并按完整事务恢复旧实例。",
        "恢复完成前不要依赖当前新入口；只读诊断仍可进行。",
        "按既有回滚点恢复旧实例，再修复候选中的目标版本或启动闭包。",
      ),
    });
  }

  return result("upgrade-session-observation-required", {
    files_state: "installed-and-switched",
    session_state: "observation-required",
    behavior_state: "observation-required",
    upgrade_complete: false,
    rollback_required: false,
    can_continue_unaffected_work: true,
    userReport: report(
      `AI Carry ${facts.targetVersion} 的文件和启动闭包已经验证，但通用 JSON 判定器不会把调用者自填的会话或行为字段提升为完成。`,
      "实例身份、用户资产和已验证的新文件保持不变；会话观察待闭合不要求回滚。",
      "普通对话、只读检查和不依赖待观察新版语义的能力仍可继续。",
      "由真正掌握宿主运行事实的适配器完成观察；没有该能力时保持待观察，并在下一次自然打开时读取新版入口，不要求用户创建专门测试任务。",
    ),
  });
}
