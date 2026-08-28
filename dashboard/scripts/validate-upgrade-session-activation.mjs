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

const oldRun = evaluateUpgradeSessionActivation(facts());
expect(oldRun.decision === "upgrade-session-activation-required" && oldRun.upgrade_complete === false,
  "an old running session was reported complete after only the 1.4.3 files changed");
expect(oldRun.rollback_required === false && oldRun.can_continue_unaffected_work === true,
  "a valid installed instance was rolled back or globally stopped only because its old session was stale");

const freshRun = evaluateUpgradeSessionActivation(facts({
  sessionBaselineVersion: "1.4.3",
  activationEvidence: "fresh-session-startup",
  behaviorAcceptance: "passed",
}));
expect(freshRun.decision === "upgrade-behavior-accepted" && freshRun.upgrade_complete === true,
  "a fresh target-version session could not close behavioral acceptance");

const rebootstrap = evaluateUpgradeSessionActivation(facts({
  activationEvidence: "verified-host-rebootstrap",
  behaviorAcceptance: "passed",
}));
expect(rebootstrap.upgrade_complete === true,
  "verified host rebootstrap could not close same-session activation");

const behaviorFailure = evaluateUpgradeSessionActivation(facts({
  sessionBaselineVersion: "1.4.3",
  activationEvidence: "fresh-session-startup",
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
for (const fragment of [
  "files-installed",
  "instance-switched",
  "session-activated",
  "behavior-accepted",
  "手工重新打开新版 `AGENTS.md`／`BOOTSTRAP.md`",
  "不回滚已经验证通过的目标实例",
]) expect(protocol.includes(fragment), `activation protocol is missing ${fragment}`);
expect(upgradeGuide.includes("UPGRADE_SESSION_ACTIVATION.md"), "upgrade guide does not route to session activation");
expect(machineContract.includes("session-activation-required") && machineContract.includes("behavior-accepted"),
  "machine upgrade completion does not distinguish session activation and behavior acceptance");
expect(hostResume.includes("升级后的会话激活"), "new-session resume cannot consume an upgrade activation handoff");

console.log("Upgrade session activation passed six high-information cases: old run, fresh run, verified rebootstrap, local behavior failure, invalid installed startup, and missing-fact degradation.");
