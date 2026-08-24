import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const dashboardDirectory = resolve(scriptDirectory, "..");
const repositoryDirectory = resolve(dashboardDirectory, "..");
export const registryPath = resolve(repositoryDirectory, "core", "maps", "dashboard-actions.toml");
export const generatedPath = resolve(dashboardDirectory, "src", "generated", "dashboard-actions.json");
const allowedFields = new Set(["action_id", "label", "root_category", "purpose", "route_id", "target", "writes_files", "template_only", "confirmation_point", "forbidden", "result_fields", "request_template"]);

function fail(message) { throw new Error(`Dashboard action generation failed: ${message}`); }
function parseValue(raw, key) {
  if (/^"(?:[^"\\\u0000-\u001f]|\\["\\/bfnrt]|\\u[0-9a-fA-F]{4})*"$/u.test(raw) || /^\[.*\]$/u.test(raw)) {
    try { return JSON.parse(raw); } catch { fail(`${key} is not a JSON-compatible scalar or array`); }
  }
  if (raw === "true" || raw === "false") return raw === "true";
  if (/^-?(?:0|[1-9][0-9]*)$/u.test(raw)) return Number(raw);
  fail(`${key} is outside the portable TOML subset`);
}
function parseBlock(block, label) {
  const values = {};
  for (const [index, rawLine] of block.replaceAll("\r\n", "\n").split("\n").entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^([a-z0-9_]+)\s*=\s*(.+)$/u.exec(line);
    if (!match || !allowedFields.has(match[1])) fail(`${label} has unsupported syntax or field at line ${index + 1}`);
    if (Object.hasOwn(values, match[1])) fail(`${label} repeats ${match[1]}`);
    values[match[1]] = parseValue(match[2], `${label}.${match[1]}`);
  }
  return values;
}

export function compileDashboardActions(source = readFileSync(registryPath, "utf8")) {
  const normalized = source.replaceAll("\r\n", "\n");
  const starts = [...normalized.matchAll(/^\[\[actions\]\]\s*$/gmu)];
  if (starts.length === 0) fail("formal registry has no actions");
  const actions = starts.map((start, index) => {
    const values = parseBlock(normalized.slice(start.index + start[0].length, starts[index + 1]?.index ?? normalized.length), `action ${index + 1}`);
    for (const field of ["action_id", "label", "root_category", "route_id", "target", "request_template"]) if (typeof values[field] !== "string" || values[field].length === 0) fail(`action ${index + 1} lacks ${field}`);
    if (!Array.isArray(values.forbidden) || values.forbidden.length === 0 || !Array.isArray(values.result_fields) || values.result_fields.length === 0) fail(`${values.action_id} lacks formal forbidden/result arrays`);
    if (!["domain-lifecycle", "local-operations", "assistant-maintenance"].includes(values.root_category)) fail(`${values.action_id} has an unknown root category`);
    for (const anchor of [values.action_id, values.root_category, values.route_id, values.target]) if (!values.request_template.includes(anchor)) fail(`${values.action_id} request is missing anchor ${anchor}`);
    return {
      action_id: values.action_id,
      label: values.label,
      rootCategory: values.root_category,
      routeId: values.route_id,
      target: values.target,
      ...(values.template_only === true ? { templateOnly: true } : {}),
      request: values.request_template,
    };
  });
  if (new Set(actions.map(({ action_id }) => action_id)).size !== actions.length) fail("formal registry repeats an action ID");
  return actions;
}

export function serializeDashboardActions(actions) { return `${JSON.stringify(actions, null, 2)}\n`; }

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const output = serializeDashboardActions(compileDashboardActions());
  if (process.argv.includes("--check")) {
    const current = readFileSync(generatedPath, "utf8");
    if (current !== output) fail("generated frontend action mirror is stale; run npm run actions:generate");
    console.log("Generated dashboard actions exactly match the formal registry.");
  } else {
    mkdirSync(dirname(generatedPath), { recursive: true });
    writeFileSync(generatedPath, output, "utf8");
    console.log(`Generated ${compileDashboardActions().length} dashboard actions from the formal registry.`);
  }
}
