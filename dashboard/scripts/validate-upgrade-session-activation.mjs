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
  const values = {
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
    instanceId: "ac.session-fixture",
    manifestDigest: `sha256:${"a".repeat(64)}`,
    ...overrides,
  };
  return values;
}

const plainReread = evaluateUpgradeSessionActivation(facts());
expect(plainReread.decision === "upgrade-session-observation-required" && plainReread.upgrade_complete === false,
  "an old running session was reported complete after only manually rereading the 1.4.3 files");
expect(plainReread.rollback_required === false && plainReread.can_continue_unaffected_work === true,
  "a valid installed instance was rolled back or globally stopped only because current-session reentry was pending");
expect(plainReread.userReport?.next_step.includes("真正掌握宿主运行事实")
  && !plainReread.userReport?.next_step.includes("开启一个新任务"),
  "a pending reentry handed acceptance work to the user or made a new task the default");

const currentSessionReentry = evaluateUpgradeSessionActivation(facts({
  activationEvidence: "validated-current-session-reentry",
  behaviorAcceptance: "passed",
}));
expect(currentSessionReentry.decision === "upgrade-session-observation-required"
  && currentSessionReentry.upgrade_complete === false,
  "caller-provided current-session facts were allowed to close the upgrade");

const selfAssertedReentry = evaluateUpgradeSessionActivation(facts({
  activationEvidence: "validated-current-session-reentry",
  behaviorAcceptance: "passed",
}));
expect(selfAssertedReentry.decision === "upgrade-session-observation-required"
  && selfAssertedReentry.upgrade_complete === false,
"model-supplied passed values were accepted as completion");

const freshRun = evaluateUpgradeSessionActivation(facts({
  sessionBaselineVersion: "1.4.3",
  activationEvidence: "fresh-session-startup",
  behaviorAcceptance: "passed",
}));
expect(freshRun.decision === "upgrade-session-observation-required" && freshRun.upgrade_complete === false,
  "a caller-authored fresh-session claim closed behavioral acceptance");

const behaviorFailure = evaluateUpgradeSessionActivation(facts({
  activationEvidence: "validated-current-session-reentry",
  behaviorAcceptance: "failed",
}));
expect(behaviorFailure.decision === "upgrade-session-observation-required"
  && behaviorFailure.rollback_required === false && behaviorFailure.can_continue_unaffected_work === true,
"one untrusted behavior claim was allowed to roll back files or stop unrelated Agent capabilities");

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
const upgradeCli = read("dashboard/scripts/ai-carry-upgrade-cli.mjs");
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
expect(machineContract.includes("看板是否待刷新") && machineContract.includes("当前会话是否采用")
  && machineContract.includes("代表行为是否通过"),
"machine upgrade completion does not distinguish snapshot, session, and behavior state");
expect(machineContract.includes("sessionReentryCommand") && machineContract.includes("不能由自己填写后两项")
  && machineContract.includes("sessionActivated=true") && machineContract.includes("behaviorAccepted=true"),
  "machine upgrade contract still lets a local file check impersonate host session or behavior facts");
expect(upgradeCli.includes('decision: "ai-carry-upgrade-target-runtime-validated"')
  && upgradeCli.includes("sessionActivated: false") && upgradeCli.includes("behaviorAccepted: false")
  && !upgradeCli.includes("sessionActivated: true") && !upgradeCli.includes("behaviorAccepted: true"),
  "2.0.7 upgrade CLI self-attests current-session activation or behavior acceptance");
expect(hostResume.includes("升级后的新运行接续") && hostResume.includes("不是每次升级都必须执行"),
  "new-run resume still presents itself as a mandatory upgrade path");
expect(protocol.includes("宿主产品版本属于宿主观察，不参与 AI Carry 版本比较")
  && triggerRegistry.includes('id = "upgrade-session-activation"'),
  "AI Carry version adoption can still be confused with the host product version");
expect(agentsEntry.includes("长期对话的版本接续") && agentsEntry.includes("按 `BOOTSTRAP.md`"),
  "the root entry does not delegate version continuity to the startup owner");
expect(bootstrap.includes("每个新的实质用户目标开始前")
  && bootstrap.includes("同一目标的连续回复不重复"),
  "the startup owner does not perform the bounded version comparison");

console.log("Upgrade session activation passed high-information invalid, rollback, continuity, and generic-JSON no-self-attestation cases plus the 2.0.7 local-CLI boundary.");
