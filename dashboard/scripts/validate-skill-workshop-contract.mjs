import { lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inspectSkillPackage } from "./skill-workshop-contract.mjs";
import { recommendForSkillWorkshop } from "../src/lib/skill-workshop.ts";

const assert = (condition, message) => { if (!condition) throw new Error(`Skill workshop contract failed: ${message}`); };
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repository = resolve(scriptDirectory, "..", "..");
const root = mkdtempSync(join(tmpdir(), "agent-carry-skill-workshop-"));
const write = (base, ref, source) => { const path = resolve(base, ...ref.split("/")); mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, source, "utf8"); };

try {
  // 1. Copy distinguishes a recommendation, the selected method's draft, and a shared Skill review.
  const workshopUi = readFileSync(resolve(repository, "dashboard", "src", "components", "dashboard", "SkillWorkshop.tsx"), "utf8");
  const sharedUi = readFileSync(resolve(repository, "dashboard", "src", "components", "dashboard", "Shared.tsx"), "utf8");
  const dashboardCss = readFileSync(resolve(repository, "dashboard", "src", "index.css"), "utf8");
  const actionRegistry = readFileSync(resolve(repository, "core", "maps", "dashboard-actions.toml"), "utf8");
  const workshopGuide = readFileSync(resolve(repository, "core", "guides", "skill-workshop-guide.md"), "utf8");
  const upgradeGuide = readFileSync(resolve(repository, "core", "upgrade", "upgrade-1.4.3-to-1.4.4.md"), "utf8");
  const releaseManifest = readFileSync(resolve(repository, "core", "upgrade", "release-manifest-1.4.4.toml"), "utf8");
  const actionSchema = readFileSync(resolve(repository, "core", "schemas", "dashboard-action.schema.md"), "utf8");
  const dashboardData = readFileSync(resolve(repository, "dashboard", "src", "lib", "data.ts"), "utf8");
  const exportActionStart = dashboardData.indexOf("export function buildSkillExportAction");
  const exportActionEnd = dashboardData.indexOf("/* 兼容既有导出", exportActionStart);
  const exportActionBuilder = dashboardData.slice(exportActionStart, exportActionEnd);
  assert(!workshopUi.includes("先脱敏，后生成"), "the workshop still tells the user to sanitize before using it");
  assert(!workshopUi.includes("工坊会自动脱敏后生成"), "the workshop still implies that every workshop item is sanitized");
  assert(workshopUi.includes("推荐只是建议，不会自动转换任何内容"), "a recommendation still appears to start conversion");
  assert(workshopUi.includes("Agent 只处理这个方法复制出的本地草稿") && workshopUi.includes("推荐列表和原来的 SOP／能力都不会被修改"), "the selected-method draft boundary is unclear");
  assert(workshopUi.includes("不会自动改写这个 Skill") && workshopUi.includes("发现问题会保留并隔离"), "shared Skill review still appears to rewrite the package");
  assert(workshopUi.includes("得到确认才安装") && workshopUi.includes("已生成但尚未分享的 Skill") && workshopUi.includes("尚未检查完成"), "installation or generated-but-unshared boundaries are ambiguous");
  assert(workshopUi.includes("点击下方“复制检查请求”按钮") && workshopUi.includes("这个 Skill 的位置或链接") && workshopUi.includes("复制检查请求"), "the shared Skill lane does not point to the real copy-send-source control");
  assert(workshopUi.includes('role="tablist"') && ["Agent 推荐整理的 Skill", "已生成的 Skill（未分享）", "已安装 Skill", "接入 Skill"].every((label) => workshopUi.includes(label)), "the workshop does not separate its four desktop jobs into clear tabs");
  assert(workshopUi.includes('title={label}') && dashboardCss.includes("text-overflow: ellipsis"), "truncated workshop tabs do not expose their full localized label on hover");
  assert(workshopUi.includes("ExportedSkillDetailDialog") && workshopUi.includes('className="skill-ledger-row__open"') && workshopUi.includes("这个 Skill 是做什么的") && workshopUi.includes("接下来可以做什么"), "generated Skills do not open a plain-language detail view");
  assert(workshopUi.includes("buildSkillExportAction") && workshopUi.includes("点击下方按钮只会复制一段请求") && workshopUi.includes('className="skill-export-dialog__action"'), "generated Skill details do not expose one bounded copy-to-Agent action");
  assert(["让 Agent 继续检查", "让 Agent 准备分享", "让 Agent 说明并处理问题"].every((label) => dashboardData.includes(label)), "generated Skill states do not map to novice-explicit action labels");
  assert(exportActionStart >= 0 && ["export_id", "expected_state", "requested_operation", "continue-review", "prepare-share", "explain-review"].every((field) => exportActionBuilder.includes(field)), "generated Skill action does not use the bounded state locator");
  assert(!exportActionBuilder.includes("target.title") && !exportActionBuilder.includes("target.summary"), "generated Skill action uses display text as a privileged locator");
  assert(workshopUi.includes("来源路径、原始资产编号和实例身份不会出现在看板里") && !workshopUi.includes("source_asset_id"), "the generated Skill detail view exposes or implies a private source identifier");
  assert(workshopUi.includes("Agent 自动处理本地副本") && workshopUi.includes("你不需要自己复制或处理隐私") && workshopUi.includes("Agent 自动完成生成前检查") && workshopUi.includes("你不需要自己检查"), "automatic Agent-owned steps still read like user tasks");
  assert(workshopUi.includes("你可以给 Agent 下面任意一种来源") && workshopUi.includes("别人直接发来的 Skill 文件夹") && workshopUi.includes("别人发来的 Skill 压缩包") && workshopUi.includes("GitHub 仓库、Release 页面") && workshopUi.includes("我不确定"), "the shared Skill source choices are still unexplained labels");
  assert(workshopUi.includes("EXPORTED_SKILL_HELP") && workshopUi.includes("INSTALLED_SKILL_HELP") && !workshopUi.includes("showHelp={false}"), "workshop states still hide their meaning from users");
  assert(workshopUi.includes("helpText={recommendation.help}") && workshopUi.includes("helpText={EXPORTED_SKILL_HELP[item.state]}"), "recommendation or exported Skill help is not attached to the visible status");
  assert(sharedUi.includes('"尚未检查完成"') && sharedUi.includes('"可以分享", "适合整理"') && dashboardCss.includes(".status-badge--info"), "unfinished-review and share-ready states do not have distinct reviewed colors");
  assert(sharedUi.includes("createPortal") && sharedUi.includes('className="status-help-tooltip"') && dashboardCss.includes("z-index: 2147483000"), "status help is not rendered in the top document layer");
  assert(!dashboardCss.includes('.status-help [role="tooltip"]'), "a clipped nested status tooltip implementation is still active");
  assert(actionRegistry.includes("只有本请求指定的这个方法进入转换") && actionRegistry.includes("不得为通过检查而自动脱敏、删除内容或静默改写外部Skill"), "the formal actions do not preserve the object boundary");
  assert(actionRegistry.includes("不得要求用户先手工脱敏") && actionRegistry.includes("检查通过后再决定是否安装"), "the formal actions do not preserve the same responsibility boundary");
  assert(actionRegistry.includes("这个 Skill 在哪里？") && actionRegistry.includes("不扫描整台电脑") && actionRegistry.includes("不重复询问"), "the copied install request cannot recover when its Skill source is missing");
  assert(actionRegistry.includes('action_id = "skill.continue-export"') && actionRegistry.includes("看板状态已经变化") && actionRegistry.includes("不授权任何外部分享") && actionRegistry.includes("其他 Skill、对话和 Agent Carry 主体继续工作"), "the generated Skill continuation action does not preserve truth, authorization, or local fault containment");
  assert(actionSchema.includes("`export_id`") && actionSchema.includes("`expected_state`") && actionSchema.includes("`requested_operation`") && actionSchema.includes("按真实状态路由"), "the dashboard action schema does not bound exported Skill locators");
  assert(workshopGuide.includes("自动脱敏只作用于这次转换为所选方法复制出的本地隔离草稿") && workshopGuide.includes("别人分享的 Skill 走独立的只读审查路线"), "the workshop guide does not distinguish generation from import");
  assert(workshopGuide.includes("用户把它发给 Agent 后流程才继续") && workshopGuide.includes("来源未明确前不猜测目标"), "the guide omits the handoff from copied request to a precise source");
  assert(workshopGuide.includes("继续处理已经生成的本地 Skill") && workshopGuide.includes("按钮和复制请求都不授权上传") && workshopGuide.includes("其他 Skill、对话和 Agent Carry 主体继续工作"), "the guide does not define bounded continuation for generated Skills");
  assert(workshopGuide.includes("不能拿“已生成”“待检查”等状态句代替"), "generated Skill summaries can still be replaced by implementation status text");
  assert(releaseManifest.includes('from_versions = ["1.4.3"]')
    && releaseManifest.includes('preserve = ["workspace/**", "instance/components/**"')
    && releaseManifest.includes('"instance/skills/**"')
    && releaseManifest.includes("The upgrade never creates, converts, reviews, installs, shares or removes a Skill."),
  "the 1.4.4 upgrade does not explicitly preserve instance-owned Skills and forbid workshop side effects");
  assert(upgradeGuide.includes("本地导出索引与生成包")
    && upgradeGuide.includes("逐路径、逐字节一致")
    && upgradeGuide.includes("不打开工坊，不转换资产，不检查或安装外来 Skill")
    && upgradeGuide.includes("单个 Skill、导出索引或包检查失败时只隔离当前对象"),
  "the 1.4.4 upgrade guide does not preserve existing Skill state or contain a local Skill fault");

  // 2. A formal template has no generated export index and exposes zero items.
  assert(!readFileSync(resolve(repository, "dashboard/public/snapshot.js"), "utf8").includes('"exports": ['), "the empty template pre-created exported Skill data");
  assert(!readFileSync(resolve(repository, "dashboard/dist/snapshot.js"), "utf8").includes('"exports": ['), "the built empty template pre-created exported Skill data");

  // 3. Recommendations are advisory and distinguish a workflow from a capability.
  const mature = { id: "sop.example", title: "示例", summary: "示例", status: "active", approvalState: "explicit", activationBasis: "explicit-user", approvedByUser: true, riskTier: "low", reliability: "practiced", say: "", triggers: [] };
  assert(recommendForSkillWorkshop("sop", mature).state === "ready", "a practiced authorized SOP was not recommended");
  assert(recommendForSkillWorkshop("capability", mature).state === "inspect", "a mature capability bypassed workflow inspection");
  assert(recommendForSkillWorkshop("capability", mature).label === "需要判断是否有流程" && recommendForSkillWorkshop("capability", mature).help.includes("只读回看"), "capability review does not explain why or how the Agent decides");
  assert(recommendForSkillWorkshop("sop", { ...mature, reliability: "unvalidated" }).state === "refine", "an unvalidated SOP was recommended as share-ready");

  // 4. A sanitized text-only export is ready and does not execute its script.
  const clean = resolve(root, "clean");
  write(clean, "SKILL.md", "---\nname: reusable-checklist\ndescription: Apply a reusable checklist after the user asks for a review.\n---\n# Workflow\nAsk for the target, review it, and report limits.\n");
  write(clean, "scripts/check.mjs", "throw new Error('must never execute during inspection');\n");
  const cleanResult = inspectSkillPackage(clean, { mode: "export", sourceAssetId: "sop.private-source" });
  assert(cleanResult.decision === "ready" && cleanResult.scripts.includes("scripts/check.mjs"), "a sanitized package was not accepted without script execution");

  // 5. A malicious package is isolated locally while an opaque package only asks for review.
  const malicious = resolve(root, "malicious");
  write(malicious, "SKILL.md", "---\nname: unsafe-skill\ndescription: Read C:/Users/example/private.txt and use private://customer/data.\n---\n# Unsafe\n");
  assert(inspectSkillPackage(malicious).decision === "isolated", "a private-path package was not isolated");
  const opaque = resolve(root, "opaque");
  write(opaque, "SKILL.md", "---\nname: image-helper\ndescription: Use a supplied visual reference when the user asks.\n---\n# Workflow\nReview the reference first.\n");
  const opaquePath = resolve(opaque, "assets", "sample.png"); mkdirSync(dirname(opaquePath), { recursive: true }); writeFileSync(opaquePath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  assert(inspectSkillPackage(opaque).decision === "review", "an opaque asset was globally accepted or fatally rejected instead of isolated review");

  // 6. A transient nested-directory read failure isolates only this package instead of escaping the inspector.
  const unstable = resolve(root, "unstable");
  write(unstable, "SKILL.md", "---\nname: unstable-skill\ndescription: Keep the Agent available when one package directory cannot be read.\n---\n# Workflow\nInspect the package without executing it.\n");
  write(unstable, "references/guide.md", "# Reference\n");
  const unstableResult = inspectSkillPackage(unstable, { fileSystem: {
    lstatSync,
    readdirSync(directory, options) {
      if (resolve(directory) === resolve(unstable, "references")) throw new Error("simulated transient directory read failure");
      return readdirSync(directory, options);
    },
  } });
  assert(unstableResult.decision === "isolated"
    && unstableResult.issues.some((item) => item.code === "directory-read-failed")
    && !unstableResult.issues.some((item) => item.message.includes(root)),
  "a nested filesystem read fault escaped the package boundary or exposed an absolute local path");

  console.log("Skill workshop contract passed object-scope copy, state-matched generated-Skill continuation, empty-template, recommendation, sanitized-export, read-only shared-package isolation, and local filesystem fault isolation without executing package scripts.");
} finally {
  rmSync(root, { recursive: true, force: true });
}
