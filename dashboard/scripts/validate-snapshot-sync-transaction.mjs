import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { parseCurrentSnapshotEnvelope, serializeSnapshotEnvelope } from "./snapshot-envelope.mjs";
import { validateSnapshotSemantics } from "./snapshot-semantics.mjs";
import { synchronizeSnapshotPair } from "./snapshot-sync-transaction.mjs";

const assert = (condition, message) => { if (!condition) throw new Error(`Snapshot transaction self-test failed: ${message}`); };
const validateBytes = (bytes, label) => validateSnapshotSemantics(parseCurrentSnapshotEnvelope(bytes.toString("utf8"), label), label);
const template = {
  meta: { schema_version: "1.1", generated_at: "", product_version: "test", state: "template", freshness_seconds: 60, source_digest: "template-empty", identity_ref: "template" },
  overview: { product: "AI Carry", state: "template", domain: "uninstantiated", startup_chars: 0, startup_budget: 20000 },
  profile: { display_name: "AI Carry", mission: "事务测试空模板", domain_id: "uninstantiated", guidance_mode: "unselected", learning_policy: "unselected", language: "zh-CN" },
  assets: { memory: 0, sops: 0, capabilities: 0, experiences: 0, evolution: 0, todo: 0, governance: 0, skills: 0 },
  memories: [], sops: [], capabilities: [], experiences: [], evolution: [], governance: [], todo: [], deferred: [],
  skills: { count: 0, status: "未扫描", path: "" }, changes: [], advanced: { file_count: 0, entry_files: [] },
};
const sourceBytes = Buffer.from(serializeSnapshotEnvelope(template), "utf8");

async function writeTarget(target, bytes) {
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, bytes);
}

async function withCase(name, operation) {
  const root = await mkdtemp(join(tmpdir(), `ai-carry-snapshot-${name}-`));
  try { await operation(root); }
  finally { await rm(root, { recursive: true, force: true }); }
}

await withCase("success", async (root) => {
  const targets = [join(root, "public", "snapshot.js"), join(root, "dist", "snapshot.js")];
  await writeTarget(targets[0], Buffer.from("old-public"));
  await writeTarget(targets[1], Buffer.from("old-dist"));
  const result = await synchronizeSnapshotPair({ sourceBytes, targets, validateBytes, operationId: "success" });
  assert(result.updated && (await readFile(targets[0])).equals(sourceBytes) && (await readFile(targets[1])).equals(sourceBytes), "normal commit did not install an identical pair");
  const second = await synchronizeSnapshotPair({ sourceBytes, targets, validateBytes, operationId: "idempotent" });
  assert(!second.updated, "second identical synchronization was not idempotent");
});

await withCase("rollback", async (root) => {
  const targets = [join(root, "public", "snapshot.js"), join(root, "dist", "snapshot.js")];
  const old = [Buffer.from("old-public"), Buffer.from("old-dist")];
  await writeTarget(targets[0], old[0]);
  await writeTarget(targets[1], old[1]);
  let failed = false;
  try {
    await synchronizeSnapshotPair({ sourceBytes, targets, validateBytes, operationId: "rollback", hooks: { afterInstall: ({ index }) => { if (index === 0) throw new Error("injected failure after first install"); } } });
  } catch (error) { failed = /Both live targets were restored/.test(error.message); }
  assert(failed && (await readFile(targets[0])).equals(old[0]) && (await readFile(targets[1])).equals(old[1]), "first-install failure did not restore both original byte sets");
  for (const directory of [dirname(targets[0]), dirname(targets[1])]) {
    assert((await readdir(directory)).every((name) => !name.includes("ai-carry-stage") && !name.includes("ai-carry-backup")), "rollback left transaction files beside a target");
  }
});

await withCase("cleanup-warning", async (root) => {
  const targets = [join(root, "public", "snapshot.js"), join(root, "dist", "snapshot.js")];
  await writeTarget(targets[0], Buffer.from("old-public"));
  await writeTarget(targets[1], Buffer.from("old-dist"));
  const result = await synchronizeSnapshotPair({ sourceBytes, targets, validateBytes, operationId: "cleanup", hooks: { beforeBackupCleanup: ({ index }) => { if (index === 1) throw new Error("injected cleanup failure"); } } });
  assert(result.updated && result.cleanup_warnings.length === 1, "backup cleanup failure was not returned as one warning");
  assert((await readFile(targets[0])).equals(sourceBytes) && (await readFile(targets[1])).equals(sourceBytes), "cleanup warning rolled back an already committed pair");
});

console.log("Snapshot pair transaction passed commit, idempotence, first-install rollback, and post-commit cleanup-failure tests.");
