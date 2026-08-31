import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const scannerPath = "dashboard/scripts/validate-brand-residuals.mjs";
const legacyDisplayName = ["Agent", "Carry"].join(" ");
const legacyDashedName = ["Agent", "Carry"].join("-");
const oldIdentity = new RegExp(`${legacyDisplayName}|${legacyDashedName}|agent-carry|AGENT_CARRY|AgentCarry|agentCarry|agent_carry`, "gu");
const oldPathIdentity = new RegExp(`${legacyDisplayName}|${legacyDashedName}|agent-carry|AGENT_CARRY|AgentCarry|agent_carry`, "u");
const malformedCurrentDisplayName = /\bAICarry\b/u;
const textExtensions = new Set(["", ".md", ".toml", ".mjs", ".js", ".ts", ".tsx", ".json", ".html", ".txt", ".py", ".yml", ".yaml"]);
// Instance assets are user-owned after creation and may legitimately mention a
// historical product, project, or client name. Product identity inside an
// instance is enforced by the manifest/startup/snapshot contracts; a free-text
// brand scan must never turn one user memory or SOP into a repository-wide
// outage.
const skippedRoots = new Set([".git", ".planning", ".assistant-local", ".assistant-private", "maintainer-private", "node_modules", "workspace", "instance"]);

const compatibilityAliasPaths = new Set([
  "README.md", "README.en.md", "assistant.toml", "_data/example-snapshot.js",
  "core/guides/upgrade-guide.md", "core/protocols/PRODUCT_IDENTITY.md",
  "core/schemas/extension-manifest.schema.md", "core/schemas/host-integration.schema.md",
  "core/schemas/instance-component.schema.md", "core/schemas/migration-kit.schema.md",
  "core/schemas/private-asset-catalog.schema.md", "core/schemas/startup-capsule.schema.md",
  "core/tools/private_data_migration.py", "core/tools/tests/test_private_data_migration.py",
  "core/upgrade/official-source.toml", "core/upgrade/release-manifest-2.0.0.toml",
  "core/upgrade/upgrade-1.4.8-to-2.0.0.md", "dashboard.html", "dashboard.en.html",
  "dashboard/scripts/ai-carry-upgrade-cli.mjs", "dashboard/scripts/product-identity.mjs",
  "dashboard/scripts/snapshot-envelope.mjs", "dashboard/scripts/validate-change-quality-contract.mjs",
  "dashboard/scripts/validate-instance-component-contract.mjs", "dashboard/scripts/validate-product-identity-contract.mjs",
  "dashboard/scripts/validate-snapshot-source-builder.mjs", "dashboard/scripts/validate-startup-capsule-contract.mjs",
  "dashboard/scripts/validate-release-authority.mjs", "dashboard/public/snapshot.js",
  "dashboard/src/Dashboard.tsx", "dashboard/src/lib/data.ts", "dashboard/src/lib/i18n.tsx",
  "dashboard/dist/index.html", "dashboard/dist/snapshot.js",
]);

const repositoryFragments = [
  "Ww-Cooooo/Agent-Carry",
  "ww-cooooo.github.io/Agent-Carry",
  "Agent-Carry-main",
];

const legacyOutputFragments = [
  "Agent-Carry-Migration-",
  "Agent-Carry-Private-Export-",
];

const machineAliasFragments = [
  "agent-carry-core",
  "agent-carry-startup",
  "agent-carry-instance-component-registry",
  "agent-carry-instance-component",
  "agent-carry.instance-component@1",
  "agent-carry-professional-extension",
  "agent-carry-private-migration",
  "agent-carry-private-asset-catalog",
  "agent-carry-private-path-bindings",
  "agent-carry-root",
  "agent-carry-official-public",
  "agent-carry:dashboard-locale:",
  "AGENT_CARRY_SNAPSHOT",
  "AGENT_CARRY_IS_REAL",
  "AGENT_CARRY_DEMO",
  "AGENT_CARRY_*",
  "AGENT_CARRY aliases",
  "agent_carry_written",
  "test_legacy_agent_carry_package_identity_remains_readable",
  "legacy-agent-carry-private.zip",
  "pvt-legacy-agent-carry",
  "agent-carry-to-ai-carry-product-identity-2.0.0",
  "product-identity-agent-carry-to-ai-carry-2.0",
  "every-agent-carry-residual-is-classified-per-match-as-history-compatibility-alias-or-current-legacy-repository-url",
  "host-product-version-is-never-used-as-agent-carry-product-version",
  "legacy-agent-carry-slug-is-still-the-current-official-location",
  "legacy-component-record-types-and-agent-carry-interface-remain-compatible-while-new-components-use-ai-carry-interface",
  "long-conversation-compares-agent-carry-version-instance-id-and-manifest-digest-before-each-new-substantive-goal",
];

const historicalFragmentsByPath = new Map([
  ["assistant.toml", ['"Agent Carry"']],
  ["BOOTSTRAP.md", ["`Agent Carry` 是当前 `AI Carry` 的已登记旧名"]],
  ["README.md", [
    "Agent Carry 已更名为 **AI Carry**",
    "Agent Carry 1.4.8",
    "产品从 Agent Carry 更名为 AI Carry",
    "`Agent-Carry` 地址",
    "`Agent-Carry` 仓库名",
  ]],
  ["README.en.md", [
    "Agent Carry has been renamed **AI Carry**",
    "Agent Carry 1.4.8",
    "renamed from Agent Carry to AI Carry",
    "`Agent-Carry` address",
  ]],
  ["INSTALL.md", ["Agent Carry 1.4.8"]],
  ["INSTALL.en.md", ["Agent Carry 1.4.8", "repository slug remains `Agent-Carry`"]],
  ["core/guides/upgrade-guide.md", [
    "旧实例说 Agent Carry 也能识别",
    "不影响 Agent Carry 主体",
    "极小 Agent Carry 启动基线比较",
    "公开 Agent Carry 1.4.8",
    "`Agent-Carry` slug",
  ]],
  ["core/maps/assistant-maintenance.toml", ["Agent Carry 旧名"]],
  ["core/maps/root-map.toml", ["Agent Carry 旧名"]],
  ["core/protocols/PRODUCT_IDENTITY.md", ["`Agent Carry`", "旧 Agent Carry 实例"]],
  ["core/schemas/extension-manifest.schema.md", ["Agent Carry 1.4.x"]],
  ["core/schemas/host-integration.schema.md", ["Agent Carry 1.4.x"]],
  ["core/schemas/instance-component.schema.md", ["Agent Carry 1.4.x"]],
  ["core/schemas/migration-kit.schema.md", ["Agent Carry 1.x", "`body-package/Agent Carry`"]],
  ["core/schemas/private-asset-catalog.schema.md", ["Agent Carry 1.4.x"]],
  ["core/schemas/startup-capsule.schema.md", ["Agent Carry 1.4.x"]],
  ["core/upgrade/release-manifest-2.0.0.toml", [
    "renamed from Agent Carry to AI Carry",
    "recognized Agent Carry or AI Carry identity",
    "replacing Agent Carry text",
    "legacy agent-carry record types",
    "legacy Agent Carry envelopes remain readable only as bounded input compatibility",
    "old Agent-Carry names remain read-only aliases",
    "uses the Agent-Carry slug",
  ]],
  ["core/upgrade/upgrade-1.4.8-to-2.0.0.md", [
    "Agent Carry 1.4.8／1.4.9",
    "AI Carry 是 Agent Carry 的新名称",
    "历史里的 Agent Carry",
    "AI Carry／Agent Carry",
  ]],
  ["dashboard/scripts/ai-carry-upgrade-cli.mjs", ["Agent Carry 1.4.8／本地 1.4.9"]],
  ["dashboard/scripts/product-identity.mjs", ['"Agent Carry"']],
  ["dashboard/scripts/snapshot-envelope.mjs", [
    "Agent Carry snapshot envelope v1",
    "Agent Carry demo snapshot envelope v1",
  ]],
  ["dashboard/scripts/validate-change-quality-contract.mjs", ["Agent Carry 已更名为 **AI Carry**"]],
  ["dashboard/scripts/validate-instance-component-contract.mjs", ["valid Agent Carry component"]],
  ["dashboard/scripts/validate-product-identity-contract.mjs", [
    '"Agent Carry"',
    "Agent Carry snapshot envelope v1",
    "bounded Agent Carry compatibility aliases",
    "current-output gate accepted a legacy Agent Carry envelope",
    "current-output gate accepted Agent Carry as the new product identity",
  ]],
  ["dashboard/scripts/validate-snapshot-source-builder.mjs", ["Agent Carry snapshot envelope v1", "legacy Agent Carry envelope"]],
  ["dashboard/scripts/validate-release-authority.mjs", ["Agent Carry 1.4.8／1.4.9 升级到 AI Carry 2.0.0"]],
  ["docs/architecture.md", ["由 Agent Carry 改名"]],
  ["docs/architecture.en.md", ["renames Agent Carry to AI Carry", "`Agent-Carry` address"]],
]);

function normalized(path) { return relative(repository, path).split(sep).join("/"); }
function historical(path) {
  return /^core\/upgrade\/release-manifest-1\.[0-9.]+\.toml$/u.test(path)
    || /^core\/upgrade\/upgrade-1\.[0-9.]+-to-1\.[0-9.]+\.md$/u.test(path);
}
function rangeCoveredByFragment(line, index, length, fragment) {
  let cursor = 0;
  while (cursor <= line.length) {
    const start = line.indexOf(fragment, cursor);
    if (start < 0) return false;
    if (index >= start && index + length <= start + fragment.length) return true;
    cursor = start + 1;
  }
  return false;
}
function coveredByAny(line, index, length, fragments) {
  return fragments.some((fragment) => rangeCoveredByFragment(line, index, length, fragment));
}
function exactQuotedAlias(line, index, length, value) {
  return coveredByAny(line, index, length, [`"${value}"`, `'${value}'`, `\`${value}\``]);
}
function legacyOutputIsReadOnly(line, index) {
  const before = line.slice(Math.max(0, index - 48), index);
  const after = line.slice(index, index + 160);
  return /旧版|已存在|旧/u.test(before) && /兼容|读取|read-only|不再作为新输出|不得继续生成/u.test(after);
}
function classifyResidual(ref, line, match) {
  const index = match.index;
  const length = match[0].length;

  const outputFragment = legacyOutputFragments.find((fragment) => rangeCoveredByFragment(line, index, length, fragment));
  if (outputFragment) return legacyOutputIsReadOnly(line, index) ? "legacy-output-read-only" : "invalid-new-output";
  if (coveredByAny(line, index, length, repositoryFragments)) return "current-legacy-repository-location";
  if (coveredByAny(line, index, length, historicalFragmentsByPath.get(ref) ?? [])) return "documented-history";
  if (compatibilityAliasPaths.has(ref)) {
    if (coveredByAny(line, index, length, machineAliasFragments)) return "bounded-compatibility-alias";
    if (match[0] === "agent-carry" && exactQuotedAlias(line, index, length, "agent-carry")) return "bounded-compatibility-alias";
  }
  return "";
}

function expectSynthetic(ref, line, value, expected, occurrence = 0) {
  let index = -1;
  let cursor = 0;
  for (let item = 0; item <= occurrence; item += 1) {
    index = line.indexOf(value, cursor);
    if (index < 0) throw new Error(`Brand residual validator fixture is invalid: ${value}`);
    cursor = index + value.length;
  }
  const category = classifyResidual(ref, line, { 0: value, index });
  if (category !== expected) {
    throw new Error(`Brand residual validator fixture mismatch: expected ${expected || "unclassified"}, got ${category || "unclassified"}`);
  }
}

expectSynthetic("README.md", "https://github.com/Ww-Cooooo/Agent-Carry and Agent Carry is still the current brand", "Agent-Carry", "current-legacy-repository-location");
expectSynthetic("README.md", "https://github.com/Ww-Cooooo/Agent-Carry and Agent Carry is still the current brand", legacyDisplayName, "");
expectSynthetic("dashboard/scripts/product-identity.mjs", 'const id = "agent-carry";', "agent-carry", "bounded-compatibility-alias");
expectSynthetic("dashboard/scripts/product-identity.mjs", 'const id = "agent-carry-future";', "agent-carry", "");
expectSynthetic("dashboard/dist/index.html", "window.AGENT_CARRY_SNAPSHOT = window.AI_CARRY_SNAPSHOT", "AGENT_CARRY", "bounded-compatibility-alias");
expectSynthetic("dashboard/dist/index.html", "Agent Carry is the current visible heading", legacyDisplayName, "");
expectSynthetic("core/schemas/migration-kit.schema.md", "new Agent-Carry-Migration-fixture", "Agent-Carry", "invalid-new-output");
expectSynthetic("core/schemas/migration-kit.schema.md", "旧版 Agent-Carry-Migration-* 只继续兼容读取", "Agent-Carry", "legacy-output-read-only");

const residuals = [];
function visit(directory) {
  for (const name of readdirSync(directory).sort()) {
    if (skippedRoots.has(name)) continue;
    const absolute = resolve(directory, name);
    const ref = normalized(absolute);
    const info = lstatSync(absolute);
    if (info.isSymbolicLink() || info.isReparsePoint?.()) throw new Error(`Brand residual validation failed: linked path in product tree: ${ref}`);
    if (oldPathIdentity.test(ref)) throw new Error(`Brand residual validation failed: current product path uses the old identity: ${ref}`);
    if (info.isDirectory()) {
      visit(absolute);
      continue;
    }
    const sizeLimit = ref.startsWith("dashboard/dist/") ? 16 * 1024 * 1024 : 2 * 1024 * 1024;
    if (ref === scannerPath || !info.isFile() || info.size > sizeLimit || !textExtensions.has(extname(name).toLowerCase())) continue;
    let source;
    try { source = new TextDecoder("utf-8", { fatal: true }).decode(readFileSync(absolute)); } catch { continue; }
    if (malformedCurrentDisplayName.test(source)) throw new Error(`Brand residual validation failed: current display name is missing its space: ${ref}`);
    if (historical(ref)) continue;
    for (const [lineIndex, line] of source.split("\n").entries()) {
      for (const match of line.matchAll(oldIdentity)) {
        residuals.push(Object.freeze({
          path: ref,
          line: lineIndex + 1,
          match: match[0],
          category: classifyResidual(ref, line, match),
        }));
      }
    }
  }
}
visit(repository);

const invalidNewOutputs = residuals.filter((item) => item.category === "invalid-new-output");
if (invalidNewOutputs.length) {
  throw new Error(`Brand residual validation failed: new output still uses the old brand:\n${invalidNewOutputs.map((item) => `${item.path}:${item.line}:${item.match}`).join("\n")}`);
}
const unclassified = residuals.filter((item) => !item.category);
if (unclassified.length) {
  throw new Error(`Brand residual validation failed: unclassified legacy identity matches:\n${unclassified.map((item) => `${item.path}:${item.line}:${item.match}`).join("\n")}`);
}

const residualPaths = [...new Set(residuals.map((item) => item.path))];
const categoryCounts = Object.fromEntries([...new Set(residuals.map((item) => item.category))].sort()
  .map((category) => [category, residuals.filter((item) => item.category === category).length]));
console.log(`AI Carry brand residual classification passed: ${residuals.length} matches across ${residualPaths.length} current paths, including built dashboard artifacts, with zero unclassified matches; ${JSON.stringify(categoryCounts)}.`);
