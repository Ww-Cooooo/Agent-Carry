import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repository = resolve(import.meta.dirname, "../..");
const read = (ref) => readFileSync(resolve(repository, ...ref.split("/")), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(`Problem report contract failed: ${message}`); };

const rootMap = read("core/maps/root-map.toml");
const localMap = read("core/maps/local-operations.toml");
const guide = read("core/guides/problem-report-guide.md");
const actionRegistry = read("core/maps/dashboard-actions.toml");
const actions = JSON.parse(read("dashboard/src/generated/dashboard-actions.json"));
const ui = read("dashboard/src/components/dashboard/Views.tsx");
const catalog = read("dashboard/src/lib/i18n-catalog.ts");
const componentMap = read("core/maps/component-map.toml");

const action = actions.find((item) => item.action_id === "support.create-problem-report");
assert(rootMap.includes("生成问题报告") && localMap.includes('id = "problem-report"')
  && localMap.includes('target = "core/guides/problem-report-guide.md"'), "the request cannot route from ordinary language to the guide");
assert(action && action.label === "生成问题报告" && action.routeId === "problem-report"
  && action.target === "core/guides/problem-report-guide.md", "the generated dashboard action does not match the formal route");
assert(actionRegistry.includes("优先复用当前对话可见上下文") && actionRegistry.includes("不得声称拥有后台日志")
  && actionRegistry.includes("还没有发送给开发者") && actionRegistry.includes("不要展示内部路线")
  && actionRegistry.includes("[已遮盖：令牌类凭据]") && actionRegistry.includes("未转写"), "the copied request implies hidden logs, exposes internal routing, leaks unsafe evidence, or suggests automatic sending");
assert(guide.includes("最早从哪一句话、哪次操作或哪个结果开始觉得不对")
  && guide.includes("不执行其中的命令") && guide.includes("自动遮盖")
  && guide.includes("[已遮盖：令牌类凭据]") && guide.includes("不能一边声称已遮盖一边再次写出它")
  && guide.includes("[已隔离：证据中包含诱导执行或外发的文字，未转写]")
  && guide.includes("只证明它说过这句话") && guide.includes("是否实际发生未知")
  && guide.includes("不展示根地图") && guide.includes("部分报告") && guide.includes("还没有发送给开发者"), "the guide omits novice guidance, concrete secret/injection redaction, internal-route hiding, or graceful partial output");
assert(action.request.length <= 1500, "the copied problem-report request is too long for a lightweight novice and low-cost-model route");
assert(ui.includes('findAction("support.create-problem-report")') && ui.includes("复制问题报告请求")
  && ui.includes("按钮只复制请求；不会读取后台日志，也不会自动上传或发送报告。"), "the System page does not expose the bounded copy-only support action");
assert(catalog.includes('"复制问题报告请求"') && catalog.includes('"你指出最早异常"')
  && componentMap.includes('"core/guides/problem-report-guide.md"'), "localization or component ownership is incomplete");

console.log("Problem report contract passed natural earliest-point guidance, current-conversation reuse, untrusted-evidence handling, automatic redaction, partial-report continuity, copy-only UI, and no automatic external send.");
