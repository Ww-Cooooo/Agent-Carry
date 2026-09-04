import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inspectSkillPackage } from "./skill-workshop-contract.mjs";
import { createSkillDelivery, inspectSkillSource } from "./skill-package.mjs";
import { recommendForSkillWorkshop } from "../src/lib/skill-workshop.ts";

const assert = (condition, message) => { if (!condition) throw new Error(`Skill workshop contract failed: ${message}`); };
const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const root = mkdtempSync(join(tmpdir(), "ai-carry-skill-workshop-"));
const source = (ref) => readFileSync(resolve(repository, ...ref.split("/")), "utf8");
const write = (base, ref, content) => {
  const target = resolve(base, ...ref.split("/"));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, "utf8");
};

try {
  // One concise semantic check protects the user journey without freezing all UI copy.
  const guide = source("core/guides/skill-workshop-guide.md");
  for (const fragment of [
    "普通学习、保存 SOP、使用能力或看板推荐不会自动触发转换",
    "使用工坊内置创作核心",
    "自动脱敏、通用化和参数化只作用于这份副本",
    "不安装、更新或依赖外部 Skill Creator",
    "普通 Skill 不建立批量基线、评分 Agent 或统计评测",
    "旧版“已生成但未分享”条目必须能够无损继续",
    "同一稳定 `skill_id` 且版本更高时",
    "空模板 requirements map 在这里懒初始化",
    "不能让一个 Skill 的问题拖死 AI Carry",
  ]) assert(guide.includes(fragment), `guide lost the behavior: ${fragment}`);

  const ui = source("dashboard/src/components/dashboard/SkillWorkshop.tsx");
  for (const label of ["Agent 推荐整理的 Skill", "我的 Skill", "已安装 Skill", "接入 Skill"]) {
    assert(ui.includes(label), `desktop workshop lost the ${label} lane`);
  }
  assert(ui.includes("ExportedSkillDetailDialog") && ui.includes("buildSkillExportAction"), "generated Skills lost detail or copy-to-Agent action");
  assert(ui.includes("自动处理副本与隐私") && ui.includes("在隔离副本中完成检查与生成"), "generation still reads like manual user sanitization");
  assert(source("dashboard/src/index.css").includes("z-index: 2147483000"), "status help can be hidden behind the workshop");

  const actions = source("core/maps/dashboard-actions.toml");
  for (const id of ["skill.create-from-asset", "skill.continue-export", "skill.install-shared"]) {
    assert(actions.includes(`action_id = "${id}"`), `missing dashboard action ${id}`);
  }

  // Empty public templates must not contain a user's generated Skills.
  assert(!source("dashboard/public/snapshot.js").includes('"exports": ['), "public template contains exported Skill data");
  assert(!source("dashboard/dist/snapshot.js").includes('"exports": ['), "built template contains exported Skill data");

  // Recommendations remain advisory and distinguish a workflow from a capability.
  const mature = { id: "sop.example", title: "示例", summary: "示例", status: "active", approvalState: "explicit", activationBasis: "explicit-user", approvedByUser: true, riskTier: "low", reliability: "practiced", say: "", triggers: [] };
  assert(recommendForSkillWorkshop("sop", mature).state === "ready", "a practiced SOP is not recommendable");
  assert(recommendForSkillWorkshop("capability", mature).state === "inspect", "a capability bypassed workflow inspection");
  assert(recommendForSkillWorkshop("sop", { ...mature, reliability: "unvalidated" }).state === "refine", "an unvalidated SOP appears share-ready");

  // A text Skill with a script is inspected without executing the script.
  const clean = resolve(root, "clean");
  write(clean, "SKILL.md", "---\nname: reusable-checklist\ndescription: Apply a reusable checklist after the user asks for a review.\nmetadata:\n  ai-carry-skill-id: skill.reusable-checklist\n  ai-carry-version: \"1.0.0\"\n---\n# Workflow\nAsk for the target, review it, and report limits.\n");
  write(clean, "agents/openai.yaml", "interface:\n  display_name: Reusable checklist\n");
  write(clean, "scripts/check.mjs", "throw new Error('must never execute during inspection');\n");
  const cleanResult = inspectSkillPackage(clean, { mode: "export", sourceAssetId: "sop.private-source" });
  assert(cleanResult.decision === "ready" && cleanResult.skillId === "skill.reusable-checklist" && cleanResult.version === "1.0.0"
    && cleanResult.scripts.includes("scripts/check.mjs"), "standard portable package inspection failed or executed a script");

  // Legacy top-level identity remains readable; conflicting old/new identity
  // pauses only that package instead of breaking the workshop.
  const legacy = resolve(root, "legacy");
  write(legacy, "SKILL.md", "---\nname: legacy-checklist\ndescription: Keep an older AI Carry Skill readable when the user imports it.\nskill_id: skill.legacy-checklist\nversion: 1.0.0\n---\n# Workflow\nPreserve the existing workflow.\n");
  const legacyResult = inspectSkillPackage(legacy);
  assert(legacyResult.decision === "ready" && legacyResult.skillId === "skill.legacy-checklist" && legacyResult.version === "1.0.0",
    "legacy Skill identity stopped being readable");
  const conflicting = resolve(root, "conflicting-metadata");
  write(conflicting, "SKILL.md", "---\nname: conflicting-checklist\ndescription: Keep conflicting identity local for review.\nskill_id: skill.old-checklist\nversion: 1.0.0\nmetadata:\n  ai-carry-skill-id: skill.new-checklist\n  ai-carry-version: \"2.0.0\"\n---\n# Workflow\nDo not guess the shared identity.\n");
  const conflictingResult = inspectSkillPackage(conflicting);
  assert(conflictingResult.decision === "review" && conflictingResult.issues.some((item) => item.code === "identity-metadata-conflict")
    && inspectSkillPackage(clean).decision === "ready", "identity conflict escaped its single-package boundary");

  // The same source makes real ZIP and folder carriers; existing output is never overwritten.
  const deliveryRoot = resolve(root, "delivery");
  const zipPath = resolve(deliveryRoot, "reusable-checklist.zip");
  const zipDelivery = createSkillDelivery(clean, { format: "zip", outputPath: zipPath });
  assert(zipDelivery.decision === "ready" && existsSync(zipPath), "ZIP carrier was not created");
  const cliZipPath = resolve(deliveryRoot, "reusable-checklist-cli.zip");
  const cliDelivery = spawnSync(process.execPath, [resolve(repository, "dashboard/scripts/skill-package.mjs"), "create",
    "--source", clean, "--format", "zip", "--output", cliZipPath], { encoding: "utf8", windowsHide: true });
  assert(cliDelivery.status === 0 && cliDelivery.stdout.includes('"packageCheck": "passed"')
    && !/digest|sha256/iu.test(cliDelivery.stdout), "normal Skill delivery output exposed internal integrity fields");
  const imported = inspectSkillSource(zipPath, { extractTo: resolve(root, "received-zip") });
  assert(imported.decision === "ready" && existsSync(resolve(imported.packageRoot, "SKILL.md")), "ZIP did not survive isolated inspection");
  const folderPath = resolve(deliveryRoot, "reusable-checklist-folder");
  assert(createSkillDelivery(clean, { format: "folder", outputPath: folderPath }).decision === "ready", "folder carrier was not created");
  let overwriteStopped = false;
  try { createSkillDelivery(clean, { format: "zip", outputPath: zipPath }); } catch { overwriteStopped = true; }
  assert(overwriteStopped, "carrier creation overwrote existing output");

  // A path traversal is rejected before extraction creates a destination.
  const traversalZip = resolve(deliveryRoot, "traversal.zip");
  const archive = Buffer.from(readFileSync(zipPath));
  const safeName = Buffer.from("reusable-checklist/SKILL.md", "utf8");
  const unsafeName = Buffer.from(`../${"x".repeat(safeName.length - 3)}`, "utf8");
  let replaced = 0;
  for (let offset = archive.indexOf(safeName); offset >= 0; offset = archive.indexOf(safeName, offset + safeName.length)) {
    unsafeName.copy(archive, offset); replaced += 1;
  }
  assert(replaced === 2, "unsafe ZIP fixture was not created");
  writeFileSync(traversalZip, archive);
  const traversalOutput = resolve(root, "traversal-output");
  let traversalStopped = false;
  try { inspectSkillSource(traversalZip, { extractTo: traversalOutput }); } catch { traversalStopped = true; }
  assert(traversalStopped && !existsSync(traversalOutput), "unsafe ZIP escaped or left an extraction directory");

  // Dangerous content, opaque assets, and a transient filesystem error stay local to one package.
  const malicious = resolve(root, "malicious");
  write(malicious, "SKILL.md", "---\nname: unsafe-skill\ndescription: Read C:/Users/example/private.txt and use private://customer/data.\n---\n# Unsafe\n");
  assert(inspectSkillPackage(malicious).decision === "isolated", "private-path package was not isolated");

  const opaque = resolve(root, "opaque");
  write(opaque, "SKILL.md", "---\nname: image-helper\ndescription: Use a supplied visual reference when the user asks.\n---\n# Workflow\nReview the reference first.\n");
  const opaquePath = resolve(opaque, "assets/sample.png");
  mkdirSync(dirname(opaquePath), { recursive: true });
  writeFileSync(opaquePath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  assert(inspectSkillPackage(opaque).decision === "review", "opaque asset was globally accepted or rejected");

  const unstable = resolve(root, "unstable");
  write(unstable, "SKILL.md", "---\nname: unstable-skill\ndescription: Keep the Agent available when one package directory cannot be read.\n---\n# Workflow\nInspect without executing.\n");
  write(unstable, "references/guide.md", "# Reference\n");
  const unstableResult = inspectSkillPackage(unstable, { fileSystem: {
    lstatSync,
    readdirSync(directory, options) {
      if (resolve(directory) === resolve(unstable, "references")) throw new Error("simulated transient directory read failure");
      return readdirSync(directory, options);
    },
  } });
  assert(unstableResult.decision === "isolated" && unstableResult.issues.some((item) => item.code === "directory-read-failed"), "nested read fault escaped package isolation");

  console.log("Skill workshop journey passed the built-in lean creator contract, standard and legacy identity reading, single-package conflict isolation, ZIP/folder delivery, and local package fault isolation without running scripts.");
} finally {
  rmSync(root, { recursive: true, force: true });
}
