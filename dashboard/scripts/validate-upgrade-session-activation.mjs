import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateUpgradeSessionActivation } from "./upgrade-session-activation.mjs";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function expect(condition, message) {
  if (!condition) throw new Error(`Upgrade session activation validation failed: ${message}`);
}

function read(relative) {
  return readFileSync(resolve(repository, ...relative.split("/")), "utf8").replaceAll("\r\n", "\n");
}

function facts(overrides = {}) {
  return {
    sourceVerified: true,
    filesInstalled: true,
    instanceSwitched: true,
    targetVersion: "1.4.3",
    installedVersion: "1.4.3",
    sessionBaselineVersion: "1.4.2",
    startupValidation: "passed",
    activationEvidence: "manual-file-reread",
    behaviorChangeExpected: true,
    behaviorAcceptance: "not-run",
    ...overrides,
  };
}

const plainReread = evaluateUpgradeSessionActivation(facts());
expect(plainReread.decision === "upgrade-session-activation-required" && plainReread.upgrade_complete === false,
  "an old running session was reported complete after only manually rereading the 1.4.3 files");
expect(plainReread.rollback_required === false && plainReread.can_continue_unaffected_work === true,
  "a valid installed instance was rolled back or globally stopped only because current-session reentry was pending");
expect(plainReread.userReport?.next_step.includes("由 Agent")
  && !plainReread.userReport?.next_step.includes("开启一个新任务"),
  "a pending reentry handed acceptance work to the user or made a new task the default");

const currentSessionReentry = evaluateUpgradeSessionActivation(facts({
  activationEvidence: "validated-current-session-reentry",
  behaviorAcceptance: "passed",
}));
expect(currentSessionReentry.decision === "upgrade-behavior-accepted"
  && currentSessionReentry.upgrade_complete === true,
  "a validated safe-boundary reentry could not close the long-running current conversation");
expect(currentSessionReentry.userReport?.next_step.includes("无需亲自执行额外测试")
  && currentSessionReentry.userReport?.still_usable.includes("当前对话已经采用新版"),
  "successful automatic acceptance did not give the user a clear completion receipt");

const freshRun = evaluateUpgradeSessionActivation(facts({
  sessionBaselineVersion: "1.4.3",
  activationEvidence: "fresh-session-startup",
  behaviorAcceptance: "passed",
}));
expect(freshRun.decision === "upgrade-behavior-accepted" && freshRun.upgrade_complete === true,
  "a fresh target-version session could not close behavioral acceptance");

const behaviorFailure = evaluateUpgradeSessionActivation(facts({
  activationEvidence: "validated-current-session-reentry",
  behaviorAcceptance: "failed",
}));
expect(behaviorFailure.decision === "upgrade-behavior-acceptance-failed"
  && behaviorFailure.rollback_required === false && behaviorFailure.can_continue_unaffected_work === true,
"one failed behavior acceptance was allowed to roll back files or stop unrelated Agent capabilities");

const invalidStartup = evaluateUpgradeSessionActivation(facts({ startupValidation: "failed" }));
expect(invalidStartup.decision === "upgrade-installed-state-invalid" && invalidStartup.rollback_required === true
  && invalidStartup.can_continue_unaffected_work === true,
  "an invalid switched startup state did not isolate the rollback while preserving unaffected work");

const incompleteFacts = evaluateUpgradeSessionActivation({});
expect(incompleteFacts.decision === "upgrade-session-facts-invalid" && incompleteFacts.rollback_required === false,
  "missing session facts crashed or guessed an upgrade state instead of degrading safely");

const protocol = read("core/protocols/UPGRADE_SESSION_ACTIVATION.md");
const upgradeGuide = read("core/guides/upgrade-guide.md");
const machineContract = read("core/upgrade/UPGRADE-CONTRACT.md");
const hostResume = read("core/protocols/HOST_SESSION_RESUME.md");
const triggerRegistry = read("core/maps/trigger-registry.toml");
const agentsEntry = read("AGENTS.md");
const bootstrap = read("BOOTSTRAP.md");
for (const fragment of [
  "files-installed",
  "instance-switched",
  "session-activated",
  "behavior-accepted",
  "validated-current-session-reentry",
  "普通地重新打开新版 `AGENTS.md`／`BOOTSTRAP.md`",
  "不要求用户亲自执行升级验收",
  "不回滚已经验证通过的目标实例",
]) expect(protocol.includes(fragment), `activation protocol is missing ${fragment}`);
expect(upgradeGuide.includes("UPGRADE_SESSION_ACTIVATION.md"), "upgrade guide does not route to session activation");
expect(machineContract.includes("session-activation-required") && machineContract.includes("behavior-accepted"),
  "machine upgrade completion does not distinguish session activation and behavior acceptance");
expect(machineContract.includes("validated-current-session-reentry")
  && machineContract.includes("不得要求用户输入测试提示词"),
  "machine upgrade completion does not permit bounded current-session reentry or automatic acceptance");
expect(hostResume.includes("升级后的新运行接续") && hostResume.includes("不是每次升级都必须执行"),
  "new-run resume still presents itself as a mandatory upgrade path");
expect(protocol.includes("宿主产品版本属于宿主观察")
  && triggerRegistry.includes("never-use-host-product-version"),
  "Agent Carry version adoption can still be confused with the host product version");
for (const source of [agentsEntry, bootstrap]) {
  expect(source.includes("每个新的实质用户目标开始前")
    && source.includes("同一目标的连续回复不重复"),
  "the stable entry describes a mismatch route but never performs the bounded version comparison");
}

console.log("Upgrade session activation passed six high-information cases: plain reread rejection, current-session reentry, optional fresh run, local behavior failure, invalid installed startup, and missing-fact degradation.");
