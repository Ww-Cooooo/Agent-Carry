import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { locateHighConfidenceSecretCandidates } from "./secret-content-boundary.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const vectors = JSON.parse(readFileSync(resolve(root, "core/schemas/secret-boundary-test-vectors.json"), "utf8"));
const assert = (condition, message) => { if (!condition) throw new Error(`Secret boundary vector failed: ${message}`); };

assert(vectors.schema_version === 1 && Array.isArray(vectors.blocked) && Array.isArray(vectors.allowed), "vector document shape");
for (const vector of vectors.blocked) {
  const result = locateHighConfidenceSecretCandidates(vector.parts.join(""));
  assert(result.blocked && result.findings.some((finding) => finding.category === vector.category), `missed ${vector.category}`);
}
for (const value of vectors.allowed) assert(!locateHighConfidenceSecretCandidates(value).blocked, `false positive: ${value}`);

console.log(`Secret boundary passed ${vectors.blocked.length} blocked and ${vectors.allowed.length} allowed shared vectors.`);
