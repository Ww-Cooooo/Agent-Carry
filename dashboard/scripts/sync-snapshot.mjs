// Explicit maintenance action: rebuild a formal snapshot from current AI Carry
// truth, validate it, then install one byte-identical candidate into the
// public and dist offline locations as a recoverable pair. It never accepts an
// arbitrary caller-supplied snapshot as proof of source truth.

import { lstat, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSnapshotCandidate } from "./snapshot-source-builder.mjs";
import { parseCurrentSnapshotEnvelope } from "./snapshot-envelope.mjs";
import { validateSnapshotSemantics } from "./snapshot-semantics.mjs";
import { synchronizeSnapshotPair } from "./snapshot-sync-transaction.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const targets = [resolve(root, "dashboard", "public", "snapshot.js"), resolve(root, "dashboard", "dist", "snapshot.js")];
const currentInfo = await lstat(targets[0]);
if (currentInfo.isSymbolicLink() || !currentInfo.isFile()) throw new Error("Current public snapshot must be a physical regular file.");
const existingSource = (await readFile(targets[0])).toString("utf8");
const candidate = buildSnapshotCandidate(root, { existingSource });
const sourceBytes = Buffer.from(candidate.source, "utf8");
const validateBytes = (bytes, label) => validateSnapshotSemantics(parseCurrentSnapshotEnvelope(bytes.toString("utf8"), label), label);
const result = await synchronizeSnapshotPair({ sourceBytes, targets, validateBytes });
console.log(JSON.stringify({ ...result, generated_from_current_truth: true, source_digest: candidate.sourceDigest, identity_ref: candidate.identityRef }));
