import { existsSync, renameSync, unlinkSync, writeFileSync, readFileSync, realpathSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildStartupCapsule, inspectStartupCapsule } from "./startup-capsule-contract.mjs";

export function syncStartupCapsule(repository, { write = false, testFaultAfterInstall = false } = {}) {
  const root = realpathSync(repository); const target = resolve(root, "instance/startup-capsule.toml");
  const expected = buildStartupCapsule(root);
  const current = existsSync(target) ? readFileSync(target, "utf8") : "";
  if (current === expected.source && inspectStartupCapsule(root).decision === "startup-capsule-valid") {
    return Object.freeze({ decision: "startup-capsule-current", updated: false, sourceManifestDigest: expected.sourceManifestDigest, executable: false });
  }
  if (!write) return Object.freeze({ decision: "startup-capsule-update-required", updated: false, sourceManifestDigest: expected.sourceManifestDigest, executable: false });
  const suffix = randomBytes(8).toString("hex"); const stage = `${target}.stage-${suffix}`; const backup = `${target}.backup-${suffix}`;
  let oldMoved = false;
  let newInstalled = false;
  try {
    writeFileSync(stage, expected.source, { encoding: "utf8", flag: "wx" });
    if (readFileSync(stage, "utf8") !== expected.source) throw new Error("staged capsule did not round-trip");
    if (existsSync(target)) { renameSync(target, backup); oldMoved = true; }
    renameSync(stage, target); newInstalled = true;
    if (testFaultAfterInstall) throw new Error("injected post-install readback failure");
    if (inspectStartupCapsule(root).decision !== "startup-capsule-valid") throw new Error("installed capsule failed readback");
    if (oldMoved && existsSync(backup)) unlinkSync(backup);
    return Object.freeze({ decision: "startup-capsule-updated", updated: true, sourceManifestDigest: expected.sourceManifestDigest, executable: false });
  } catch (error) {
    if (existsSync(stage)) unlinkSync(stage);
    if (newInstalled && existsSync(target)) unlinkSync(target);
    if (oldMoved) {
      if (existsSync(backup)) renameSync(backup, target);
    }
    throw error;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const root = resolve(process.argv[2] ?? defaultRoot);
  const write = process.argv.includes("--write") && process.argv.includes("--acknowledge-manifest-change");
  process.stdout.write(`${JSON.stringify(syncStartupCapsule(root, { write }))}\n`);
}
