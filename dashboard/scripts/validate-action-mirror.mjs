import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const dashboardDirectory = resolve(scriptDirectory, "..");
const repositoryDirectory = resolve(dashboardDirectory, "..");
const registryPath = resolve(repositoryDirectory, "core/maps/dashboard-actions.toml");
const mirrorPath = resolve(dashboardDirectory, "src/lib/data.ts");

const registrySource = readFileSync(registryPath, "utf8");
const mirrorSource = readFileSync(mirrorPath, "utf8");

function fail(message) {
  throw new Error(`Dashboard action mirror check failed: ${message}`);
}

function tomlValue(block, key, required = true) {
  const match = block.match(new RegExp(`^${key}\\s*=\\s*(.+)$`, "m"));
  if (!match) {
    if (required) fail(`formal action is missing ${key}`);
    return undefined;
  }
  const raw = match[1].trim();
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (!raw.startsWith('"') || !raw.endsWith('"')) fail(`${key} must use a single-line TOML string`);
  try {
    return JSON.parse(raw);
  } catch {
    fail(`${key} is not a supported single-line TOML string`);
  }
}

function formalActions() {
  const starts = [...registrySource.matchAll(/^\[\[actions\]\]\s*$/gm)];
  if (!starts.length) fail("formal registry has no actions");
  const actions = starts.map((start, index) => {
    const bodyStart = start.index + start[0].length;
    const bodyEnd = starts[index + 1]?.index ?? registrySource.length;
    const block = registrySource.slice(bodyStart, bodyEnd);
    const action = {
      actionId: tomlValue(block, "action_id"),
      label: tomlValue(block, "label"),
      routeId: tomlValue(block, "route_id"),
      target: tomlValue(block, "target"),
      templateOnly: tomlValue(block, "template_only", false) === true,
      request: tomlValue(block, "request_template"),
    };
    for (const anchor of [action.actionId, action.routeId, action.target]) {
      if (!action.request.includes(anchor)) fail(`${action.actionId} request is missing anchor ${anchor}`);
    }
    return action;
  });
  if (new Set(actions.map((action) => action.actionId)).size !== actions.length) fail("formal registry contains duplicate action_id values");
  return actions;
}

function mirroredActions() {
  const start = mirrorSource.indexOf("const GLOBAL_ACTIONS: GlobalActionDef[] = [");
  const end = mirrorSource.indexOf("\n];", start);
  if (start < 0 || end < 0) fail("cannot locate GLOBAL_ACTIONS in dashboard/src/lib/data.ts");
  const block = mirrorSource.slice(start, end);
  const pattern = /\{\s*action_id:\s*"([^"]+)",\s*label:\s*"([^"]+)",\s*rootCategory:\s*"[^"]+",\s*routeId:\s*"([^"]+)",\s*target:\s*"([^"]+)",\s*(?:templateOnly:\s*(true|false),\s*)?request:\s*buildGlobalRequest\(/g;
  const actions = [...block.matchAll(pattern)].map((match) => ({
    actionId: match[1],
    label: match[2],
    routeId: match[3],
    target: match[4],
    templateOnly: match[5] === "true",
  }));
  if (!actions.length) fail("cannot parse any actions from the frontend mirror");
  if (new Set(actions.map((action) => action.actionId)).size !== actions.length) fail("frontend mirror contains duplicate action_id values");
  return actions;
}

const formal = formalActions();
const mirror = mirroredActions();
const formalById = new Map(formal.map((action) => [action.actionId, action]));
const mirrorById = new Map(mirror.map((action) => [action.actionId, action]));

for (const actionId of new Set([...formalById.keys(), ...mirrorById.keys()])) {
  const registered = formalById.get(actionId);
  const compiled = mirrorById.get(actionId);
  if (!registered) fail(`${actionId} exists only in the frontend mirror`);
  if (!compiled) fail(`${actionId} exists only in the formal registry`);
  for (const field of ["label", "routeId", "target", "templateOnly"]) {
    if (registered[field] !== compiled[field]) fail(`${actionId} has different ${field} values`);
  }
}

const getter = mirrorSource.match(/export function getGlobalActions\(\): GlobalActionDef\[\] \{([\s\S]*?)\n\}/);
if (!getter || !getter[1].includes("return GLOBAL_ACTIONS.slice();") || getter[1].includes("S.actions")) {
  fail("getGlobalActions must ignore snapshot actions and return only the compiled mirror");
}

console.log(`Dashboard action mirror check passed (${formal.length} actions).`);
