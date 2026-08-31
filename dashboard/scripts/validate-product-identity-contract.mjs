import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  LEGACY_PRODUCT_IDENTITY,
  PRODUCT_IDENTITY,
  acceptedComponentInterfaces,
  acceptedComponentRecordTypes,
  acceptedComponentRegistryRecordTypes,
  acceptedProfessionalExtensionRecordTypes,
} from "./product-identity.mjs";
import { parseCurrentSnapshotEnvelope, parseSnapshotEnvelope, serializeSnapshotEnvelope } from "./snapshot-envelope.mjs";
import { buildStartupCapsule, inspectStartupCapsule } from "./startup-capsule-contract.mjs";
import { confirmUpgrade, prepareUpgrade } from "./ai-carry-upgrade-cli.mjs";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (relative) => readFileSync(resolve(repository, ...relative.split("/")), "utf8").replaceAll("\r\n", "\n");
const expect = (condition, message) => { if (!condition) throw new Error(`Product identity validation failed: ${message}`); };
const expectThrows = (operation, message) => {
  try {
    operation();
  } catch {
    return;
  }
  throw new Error(`Product identity validation failed: ${message}`);
};
const includesAll = (source, fragments, label) => {
  for (const fragment of fragments) expect(source.includes(fragment), `${label} is missing: ${fragment}`);
};

expect(PRODUCT_IDENTITY.productId === "ai-carry" && PRODUCT_IDENTITY.productName === "AI Carry", "current product identity drifted");
expect(PRODUCT_IDENTITY.coreId === "ai-carry-core" && PRODUCT_IDENTITY.startupCapsuleId === "ai-carry-startup", "current core identity drifted");
expect(LEGACY_PRODUCT_IDENTITY.productIds.includes("agent-carry") && LEGACY_PRODUCT_IDENTITY.productNames.includes("Agent Carry"), "legacy product alias is unavailable");
expect(acceptedComponentRegistryRecordTypes.has("agent-carry-instance-component-registry")
  && acceptedComponentRecordTypes.has("agent-carry-instance-component")
  && acceptedComponentInterfaces.has("agent-carry.instance-component@1"), "legacy component aliases are unavailable");
expect(acceptedComponentRegistryRecordTypes.has("ai-carry-instance-component-registry")
  && acceptedComponentRecordTypes.has("ai-carry-instance-component")
  && acceptedComponentInterfaces.has("ai-carry.instance-component@1"), "current component identities are unavailable");
expect(acceptedProfessionalExtensionRecordTypes.has("ai-carry-professional-extension")
  && acceptedProfessionalExtensionRecordTypes.has("agent-carry-professional-extension"), "professional extension rename aliases are unavailable");

includesAll(read("assistant.toml"), [
  'product_id = "ai-carry"', 'product_name = "AI Carry"', 'product_version = "2.0.1"', 'core_version = "2.0.1"',
  'legacy_product_ids = ["agent-carry"]', 'legacy_component_interfaces = ["agent-carry.instance-component@1"]',
  'legacy_professional_extension_record_types = ["agent-carry-professional-extension"]',
  'legacy_private_package_types = ["agent-carry-private-migration"]',
  'legacy_host_sources = ["agent-carry"]', 'legacy_host_access_scopes = ["agent-carry-root"]',
  'repository = "https://github.com/Ww-Cooooo/Agent-Carry"',
  'repository_slug_state = "legacy-slug-until-separately-authorized-rename"',
  'write_policy = "new-product-owned-output-uses-ai-carry-identities"',
], "assistant identity authority");
includesAll(read("core/manifest.toml"), ['core_id = "ai-carry-core"', 'version = "2.0.1"'], "core identity authority");
includesAll(read("instance/manifest.toml"), ['instance_id = "template"', 'created_from = "ai-carry@2.0.1"', 'product = "2.0.1"'], "template identity authority");
includesAll(read("dashboard/package.json"), ['"name": "ai-carry-dashboard"', '"version": "2.0.1"', '"upgrade": "node scripts/ai-carry-upgrade-cli.mjs"'], "Dashboard identity authority");
includesAll(read("core/upgrade/official-source.toml"), [
  'source_id = "ai-carry-official-public"', 'product_id = "ai-carry"', 'label = "AI Carry 官方公开发布源"',
  'repository = "https://github.com/Ww-Cooooo/Agent-Carry"',
  'repository_slug_state = "legacy-agent-carry-slug-is-still-the-current-official-location"',
], "official source identity");
const legacyDisplayTrigger = `${LEGACY_PRODUCT_IDENTITY.productNames[0]} 旧名`;
includesAll(read("BOOTSTRAP.md"), [
  `\`${LEGACY_PRODUCT_IDENTITY.productNames[0]}\` 是当前 \`${PRODUCT_IDENTITY.productName}\` 的已登记旧名`,
  "单独看到旧名不代表产品损坏，也不得让 Agent 停止",
  "才从根地图按需进入产品身份路线",
], "ordinary startup rename continuity");
includesAll(read("core/maps/root-map.toml"), [legacyDisplayTrigger, "AI Carry 名称冲突", "旧品牌残留"], "root rename route triggers");
includesAll(read("core/maps/assistant-maintenance.toml"), [
  'id = "product-identity"', legacyDisplayTrigger, 'target = "core/protocols/PRODUCT_IDENTITY.md"', 'state = "on-demand"', 'confirmation = "none"',
], "product identity on-demand route");

const sample = Object.freeze({ schemaVersion: "1.1", overview: Object.freeze({ product: PRODUCT_IDENTITY.productName }), counts: Object.freeze({ memory: 0 }) });
const currentEnvelope = serializeSnapshotEnvelope(sample);
expect(currentEnvelope.startsWith("// AI Carry snapshot envelope v1\nwindow.AI_CARRY_IS_REAL = true;"), "new snapshot does not use the AI Carry envelope");
expect(currentEnvelope.includes("window.AGENT_CARRY_SNAPSHOT = window.AI_CARRY_SNAPSHOT;"), "new snapshot omits the bounded old-page alias");
expect(JSON.stringify(parseSnapshotEnvelope(currentEnvelope)) === JSON.stringify(sample), "new snapshot envelope does not round-trip");
expect(JSON.stringify(parseCurrentSnapshotEnvelope(currentEnvelope, "current product sample", { expectedProduct: PRODUCT_IDENTITY.productName })) === JSON.stringify(sample), "new product-owned snapshot is not accepted by the current-output gate");
const legacyEnvelope = `// Agent Carry snapshot envelope v1\nwindow.AGENT_CARRY_IS_REAL = true;\nwindow.AGENT_CARRY_SNAPSHOT = ${JSON.stringify(sample, null, 2)};\n`;
expect(JSON.stringify(parseSnapshotEnvelope(legacyEnvelope)) === JSON.stringify(sample), "legacy 1.4.x snapshot envelope is no longer readable");
expectThrows(
  () => parseCurrentSnapshotEnvelope(legacyEnvelope, "legacy envelope used as new output", { expectedProduct: PRODUCT_IDENTITY.productName }),
  "current-output gate accepted a legacy Agent Carry envelope",
);
const oldProductEnvelope = serializeSnapshotEnvelope({ ...sample, overview: { product: "Agent Carry" } });
expectThrows(
  () => parseCurrentSnapshotEnvelope(oldProductEnvelope, "old product used as new output", { expectedProduct: PRODUCT_IDENTITY.productName }),
  "current-output gate accepted Agent Carry as the new product identity",
);

const capsule = buildStartupCapsule(repository);
expect(capsule.values.capsule_id === "ai-carry-startup" && capsule.values.product_version === "2.0.1", "new startup capsule identity is not generated from current truth");
expect(inspectStartupCapsule(repository).decision === "startup-capsule-valid", "checked-in template startup capsule is not synchronized");
expect(typeof prepareUpgrade === "function" && typeof confirmUpgrade === "function", "deterministic upgrade entrypoint is unavailable");

console.log("AI Carry product identity validation passed with bounded Agent Carry compatibility aliases.");
