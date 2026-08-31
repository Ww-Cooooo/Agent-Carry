import { randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const sameBytes = (left, right) => left !== null && right !== null && Buffer.compare(left, right) === 0;

async function readRegularFile(path, label, allowMissing = false) {
  try {
    const info = await lstat(path);
    if (info.isSymbolicLink() || !info.isFile()) throw new Error(`${label} must be a regular file and must not be a symbolic link: ${path}`);
    return await readFile(path);
  } catch (error) {
    if (allowMissing && error?.code === "ENOENT") return null;
    throw error;
  }
}

async function removeOwnFile(path) {
  try { await unlink(path); }
  catch (error) { if (error?.code !== "ENOENT") throw error; }
}

export async function synchronizeSnapshotPair({ sourceBytes, targets, validateBytes, operationId = randomUUID(), hooks = {} }) {
  if (!Buffer.isBuffer(sourceBytes) || sourceBytes.length === 0) throw new Error("Snapshot transaction requires nonempty source bytes.");
  if (!Array.isArray(targets) || targets.length !== 2 || new Set(targets).size !== 2) throw new Error("Snapshot transaction requires two distinct targets.");
  if (typeof validateBytes !== "function") throw new Error("Snapshot transaction requires a non-executing byte validator.");
  validateBytes(sourceBytes, "snapshot source");

  const previous = new Map();
  for (const target of targets) {
    await mkdir(dirname(target), { recursive: true });
    previous.set(target, await readRegularFile(target, "Snapshot target", true));
  }
  if (targets.every((target) => sameBytes(previous.get(target), sourceBytes))) return { updated: false, targets, cleanup_warnings: [] };

  const records = targets.map((target, index) => ({
    target,
    stage: `${target}.ai-carry-stage-${operationId}-${index}`,
    backup: `${target}.ai-carry-backup-${operationId}-${index}`,
    hadOriginal: previous.get(target) !== null,
    originalMoved: false,
    installed: false,
  }));

  try {
    for (const [index, record] of records.entries()) {
      await writeFile(record.stage, sourceBytes, { flag: "wx" });
      const stagedBytes = await readRegularFile(record.stage, "Staged snapshot");
      if (!sameBytes(stagedBytes, sourceBytes)) throw new Error(`Staged snapshot differs from source: ${record.stage}`);
      validateBytes(stagedBytes, `staged snapshot ${record.stage}`);
      await hooks.afterStage?.({ index, record });
    }

    for (const [index, record] of records.entries()) {
      if (record.hadOriginal) {
        await rename(record.target, record.backup);
        record.originalMoved = true;
      }
      await rename(record.stage, record.target);
      record.installed = true;
      await hooks.afterInstall?.({ index, record });
    }

    const installedBytes = [];
    for (const record of records) {
      const bytes = await readRegularFile(record.target, "Installed snapshot");
      validateBytes(bytes, `installed snapshot ${record.target}`);
      if (!sameBytes(bytes, sourceBytes)) throw new Error(`Installed snapshot differs from source: ${record.target}`);
      installedBytes.push(bytes);
    }
    if (!sameBytes(installedBytes[0], installedBytes[1])) throw new Error("The public and dist snapshots are not byte-identical after installation.");

    // The pair is committed after both readbacks. Cleanup failures are warnings;
    // they must not roll back a valid pair after any backup has been destroyed.
    const cleanupWarnings = [];
    for (const [index, record] of records.entries()) {
      try {
        await hooks.beforeBackupCleanup?.({ index, record });
        await removeOwnFile(record.backup);
      } catch (error) {
        cleanupWarnings.push(`${record.backup}: ${error.message}`);
      }
    }
    return { updated: true, targets, cleanup_warnings: cleanupWarnings };
  } catch (error) {
    const rollbackErrors = [];
    for (const record of [...records].reverse()) {
      try {
        if (record.installed) await removeOwnFile(record.target);
        if (record.originalMoved) await rename(record.backup, record.target);
        await removeOwnFile(record.stage);
      } catch (rollbackError) {
        rollbackErrors.push(`${record.target}: ${rollbackError.message}`);
      }
    }
    for (const record of records) {
      try {
        const restored = await readRegularFile(record.target, "Restored snapshot target", true);
        const expected = previous.get(record.target);
        if ((expected === null) !== (restored === null) || (expected !== null && !sameBytes(expected, restored))) rollbackErrors.push(`${record.target}: restored bytes do not match the frozen pre-action state`);
      } catch (rollbackError) {
        rollbackErrors.push(`${record.target}: ${rollbackError.message}`);
      }
    }
    const rollbackMessage = rollbackErrors.length > 0
      ? ` Rollback verification also failed: ${rollbackErrors.join("; ")}`
      : " Both live targets were restored to their exact pre-action state.";
    throw new Error(`Snapshot synchronization failed: ${error.message}.${rollbackMessage}`, { cause: error });
  }
}
