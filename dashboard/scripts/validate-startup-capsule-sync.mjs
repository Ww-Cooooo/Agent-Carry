import { existsSync, mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { buildStartupCapsule, inspectStartupCapsule } from "./startup-capsule-contract.mjs";
import { syncStartupCapsule } from "./sync-startup-capsule.mjs";

const assert = (condition, message) => { if (!condition) throw new Error(`Startup capsule sync test failed: ${message}`); };
const root = mkdtempSync(join(tmpdir(), "agent-carry-capsule-sync-"));
const write = (ref, source) => { const path = resolve(root, ...ref.split("/")); mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, source, "utf8"); };
const manifest = (mode) => `schema_version = 1\ninstance_id = "ac.sync"\nstate = "instance"\ncreated_from = "agent-carry@1.3.0"\ncreated_at = ""\n\n[direction]\ntype = "general"\nlocked = true\ndomain_id = ""\nlabel = ""\nscope_statement = ""\nout_of_scope_policy = "create-new-instance"\n\n[profile]\nstatus = "active"\nguidance_mode = "${mode}"\ndisplay_name = "测试助手"\nmission = "测试胶囊同步"\nlanguage = "zh-CN"\nuser_preferences_ref = "instance/profile/approved-profile.md"\ndomain_map_ref = "instance/maps/domain-map.toml"\nsignal_control_ref = "instance/signals/control.toml"\nsignal_map_ref = "instance/maps/signal-map.toml"\ntime_trigger_map_ref = "instance/maps/time-trigger-map.toml"\nhost_registry_ref = "instance/hosts/registry.toml"\n\n[learning]\npolicy = "risk-tiered"\nlow_risk_promotion = "explicit-confirmation-after-notice"\nmedium_high = "explicit-confirmation"\ndirect_user_instruction = "direct-authorization"\n\n[validation]\nevidence_index_ref = "instance/validations/index.toml"\n\n[versions]\nevolution_candidate_index_schema = "1.0"\nasset_confirmation_gate_schema = "1.0"\nresult_validation_evidence_schema = "1.0"\n`;
try {
  write("core/manifest.toml", `schema_version = 1\nversion = "1.3.0"\n\n[entry]\nroot_map = "core/maps/root-map.toml"\n`);
  write("instance/manifest.toml", manifest("balanced")); write("instance/startup-capsule.toml", buildStartupCapsule(root).source);
  assert(syncStartupCapsule(root).decision === "startup-capsule-current", "unchanged capsule was not idempotent");
  write("instance/manifest.toml", manifest("direct"));
  assert(inspectStartupCapsule(root).decision === "startup-repair-required" && syncStartupCapsule(root).decision === "startup-capsule-update-required", "manifest drift did not require a capsule update");
  assert(syncStartupCapsule(root, { write: true }).decision === "startup-capsule-updated" && inspectStartupCapsule(root).guidance_mode === "direct", "authorized sync did not install and verify the new capsule");
  assert(syncStartupCapsule(root, { write: true }).updated === false, "second capsule sync changed bytes");
  unlinkSync(resolve(root, "instance/startup-capsule.toml"));
  let missingInstallFailed = false;
  try { syncStartupCapsule(root, { write: true, testFaultAfterInstall: true }); }
  catch { missingInstallFailed = true; }
  assert(missingInstallFailed && !existsSync(resolve(root, "instance/startup-capsule.toml")), "a failed first capsule installation left a partial official target");
  assert(syncStartupCapsule(root, { write: true }).decision === "startup-capsule-updated", "a clean retry could not recover after the injected first-install failure");
  console.log("Startup capsule sync passed drift, atomic readback, missing-target rollback, clean retry, and idempotence checks.");
} finally { rmSync(root, { recursive: true, force: true }); }
