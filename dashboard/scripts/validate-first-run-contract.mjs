import { createHash } from "node:crypto";
import { cpSync, existsSync, lstatSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  executeFirstInstantiation,
  firstInstantiationWriteSet,
  inspectFirstInstantiationRequest,
  normalizeFirstInstantiationRequest,
} from "./first-instantiation-transaction.mjs";
import { parseSectionedToml, validateInstanceManifestStructure } from "./asset-route-contract.mjs";
import { inspectStartupCapsule } from "./startup-capsule-contract.mjs";
import { parseCurrentSnapshotEnvelope } from "./snapshot-envelope.mjs";
import { validateSnapshotSemantics } from "./snapshot-semantics.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repository = resolve(scriptDirectory, "../..");
const createdAt = "2026-01-02T03:04:05.000Z";

function assert(condition, message) {
  if (!condition) throw new Error("First-run journey failed: " + message);
}

function request() {
  return {
    schema_version: 1,
    guidance_mode: "balanced",
    language: "zh-CN",
    learning_policy: "risk-tiered",
    display_name: "隔离剪辑助手",
    mission: "帮助我规划和完成视频剪辑任务。",
    direction: { type: "domain", domain_id: "video-editing", label: "视频剪辑", scope_statement: "规划素材、剪辑步骤与交付检查。" },
    first_task: { title: "规划第一条视频", summary: "形成一份可执行剪辑计划。", trigger: "开始规划第一条视频", aliases: [], scope: [], conditions: [], excludes: [], start_after_instantiation: false },
    profile: { in_scope: ["视频剪辑规划"], out_of_scope: ["不替用户发布"], automation: [], privacy: ["不读取无关私密文件"], learning: ["任务后主动提出可复用方法"], environment: [], unknowns: [] },
    host: { label: "隔离宿主", product_name: "", product_version: "", model_name: "unverified-alias", model_selection_label: "", request_model_name: "", model_routing_mode: "unknown", model_observation_basis: [], environment: "isolated", observation_basis: "current-session", integration_mode: "direct-workspace", match_hint: "isolated", limitations: [] },
  };
}

function copyTemplate(target) {
  cpSync(repository, target, {
    recursive: true,
    errorOnExist: true,
    filter(path) {
      const ref = relative(repository, path).split(sep).join("/");
      const top = ref.split("/")[0];
      return ![".git", ".planning", "maintainer-private", "node_modules"].includes(top)
        && ref !== "dashboard/node_modules" && !ref.startsWith("dashboard/node_modules/");
    },
  });
}

function read(root, ref) { return readFileSync(resolve(root, ...ref.split("/")), "utf8"); }

function treeFingerprint(root) {
  const rows = [];
  const queue = [root];
  while (queue.length) {
    const current = queue.shift();
    for (const entry of readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, "en"))) {
      const path = resolve(current, entry.name);
      const info = lstatSync(path);
      const ref = relative(root, path).split(sep).join("/");
      assert(!info.isSymbolicLink(), "fixture contains a link");
      if (info.isDirectory()) queue.push(path);
      else if (info.isFile()) rows.push(ref + "\0" + createHash("sha256").update(readFileSync(path)).digest("hex"));
    }
  }
  return createHash("sha256").update(rows.sort().join("\n")).digest("hex");
}

function instanceId(root, ref) {
  const match = /^instance_id = "([^"]+)"$/mu.exec(read(root, ref));
  return match?.[1] ?? "";
}

function verifyUsableInstance(root, expectedId) {
  const manifest = validateInstanceManifestStructure(parseSectionedToml(read(root, "instance/manifest.toml"), "journey manifest"));
  assert(manifest.root.state === "instance" && manifest.root.instance_id === expectedId && manifest.direction.locked === true, "core identity is invalid");
  assert(read(root, "instance/profile/approved-profile.md").includes("instance_id: " + expectedId), "approved profile is missing");
  assert(read(root, "instance/maps/domain-map.toml").includes('asset_kind = "task-family"'), "first task route is missing");
  assert(inspectStartupCapsule(root).decision === "startup-capsule-valid", "startup capsule did not refresh");
  assert(instanceId(root, "instance/validations/index.toml") === "template", "empty validation index was eagerly rebound");
  assert(instanceId(root, "instance/evolution/index.toml") === "template", "empty evolution index was eagerly rebound");
  assert(instanceId(root, "instance/components/registry.toml") === "template", "empty component registry was eagerly rebound");
  assert(instanceId(root, "instance/hosts/registry.toml") === "template", "empty host registry was eagerly rebound");
  assert(!existsSync(resolve(root, "instance/hosts/profiles")) || readdirSync(resolve(root, "instance/hosts/profiles")).length === 0, "first creation invented a host profile");
  for (const name of ["consistency-governance-card.md", "memory-governance-card.md", "network-security-governance-card.md"]) {
    const card = read(root, "instance/governance/" + name);
    assert(card.includes('schedule_state = "uninitialized"') && card.includes("approved_by_user = false"), "first creation scheduled governance work");
  }
  const publicBytes = readFileSync(resolve(root, "dashboard/public/snapshot.js"));
  const distBytes = readFileSync(resolve(root, "dashboard/dist/snapshot.js"));
  assert(publicBytes.equals(distBytes), "snapshot copies differ");
  const snapshot = parseCurrentSnapshotEnvelope(publicBytes.toString("utf8"), "first-run journey snapshot");
  validateSnapshotSemantics(snapshot, "first-run journey snapshot");
  assert(snapshot.meta.state === "instance" && snapshot.assets.memory === 0 && snapshot.assets.sops === 0
    && snapshot.assets.capabilities === 0 && snapshot.assets.experiences === 0 && snapshot.assets.evolution === 0
    && snapshot.assets.todo === 0 && snapshot.assets.governance === 0 && snapshot.assets.skills === 0,
  "new instance snapshot contains invented assets");
}

const integrationRoot = mkdtempSync(resolve(tmpdir(), "ai-carry-first-run-"));
let completed = false;
try {
  const normalized = normalizeFirstInstantiationRequest(request());
  assert(normalized.host.modelName === "" && normalized.warnings.some((item) => item.includes("unverified")), "unverified model alias was promoted");
  assert(JSON.stringify(firstInstantiationWriteSet) === JSON.stringify(["instance/manifest.toml", "instance/profile/approved-profile.md", "instance/maps/domain-map.toml"]), "core write set expanded");

  const live = resolve(integrationRoot, "success");
  copyTemplate(live);
  const preview = inspectFirstInstantiationRequest(live, request());
  assert(preview.status === "ready" && preview.write_target_count === 3 && preview.user_preview.includes("不预造记忆"), "preview does not describe the lightweight boundary");
  const first = executeFirstInstantiation(live, request(), { testIdentity: { instanceId: "ac-first-run-journey", createdAt } });
  assert(first.updated === true && ["passed", "limited"].includes(first.status), "first creation did not commit its core");
  assert(!first.auxiliary_pending.includes("dashboard-snapshot"), "operational snapshot could not tolerate untouched empty registries");
  verifyUsableInstance(live, "ac-first-run-journey");
  const afterFirst = treeFingerprint(live);
  const second = executeFirstInstantiation(live, request());
  assert(second.updated === false && treeFingerprint(live) === afterFirst, "second identical creation changed bytes");

  const rollback = resolve(integrationRoot, "rollback");
  copyTemplate(rollback);
  const beforeRollback = treeFingerprint(rollback);
  let rollbackError;
  try { executeFirstInstantiation(rollback, request(), { testIdentity: { instanceId: "ac-first-run-rollback", createdAt }, testFaultAfterInstall: 2 }); }
  catch (error) { rollbackError = error; }
  assert(rollbackError?.templatePreserved === true && treeFingerprint(rollback) === beforeRollback, "core fault did not restore the template");

  const capsuleFault = resolve(integrationRoot, "capsule-fault");
  copyTemplate(capsuleFault);
  const capsuleResult = executeFirstInstantiation(capsuleFault, request(), { testIdentity: { instanceId: "ac-first-run-capsule", createdAt }, testFaultAfterCapsule: true });
  assert(capsuleResult.updated === true && capsuleResult.status === "limited" && capsuleResult.auxiliary_pending.includes("startup-capsule")
    && read(capsuleFault, "instance/manifest.toml").includes('state = "instance"'), "capsule fault rolled back the usable assistant");

  const snapshotFault = resolve(integrationRoot, "snapshot-fault");
  copyTemplate(snapshotFault);
  const snapshotResult = executeFirstInstantiation(snapshotFault, request(), { testIdentity: { instanceId: "ac-first-run-snapshot", createdAt }, testFaultBeforeSnapshot: true });
  assert(snapshotResult.updated === true && snapshotResult.status === "limited" && snapshotResult.auxiliary_pending.includes("dashboard-snapshot")
    && inspectStartupCapsule(snapshotFault).decision === "startup-capsule-valid", "snapshot fault escaped its local boundary");

  completed = true;
  process.stdout.write(JSON.stringify({ decision: "first-run-journey-passed", core_write_count: 3, lazy_optional_state: true,
    idempotent: true, core_rollback: true, capsule_failure_local: true, snapshot_failure_local: true }) + "\n");
} finally {
  if (completed) rmSync(integrationRoot, { recursive: true, force: true });
  else process.stderr.write("First-run failure scene preserved at " + integrationRoot + "\n");
}
