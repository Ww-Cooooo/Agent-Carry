const encryptedPrivateKeyPattern = new RegExp(["-----BEGIN ENCRYPTED ", "PRIVATE KEY-----"].join(""), "giu");

const patterns = Object.freeze([
  ["private-key-block", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/giu],
  ["encrypted-private-key", encryptedPrivateKeyPattern],
  ["github-token", /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{35,})\b/gu],
  ["openai-style-token", /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/gu],
  ["google-api-key", /\bAIza[0-9A-Za-z_-]{35}\b/gu],
  ["aws-access-key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/gu],
  ["aws-secret-access-key", /\baws[_-]?secret[_-]?access[_-]?key\b\s*[:=]\s*["']?[A-Za-z0-9+/=]{24,}/giu],
  ["jwt", /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/gu],
  ["authorization-header", /(?:^|[\r\n,{])\s*["']?(?:proxy-)?authorization["']?\s*[:=]\s*["']?bearer\s+[A-Za-z0-9._~+\/-]{12,}/gimu],
  ["basic-authorization-header", /(?:^|[\r\n,{])\s*["']?(?:proxy-)?authorization["']?\s*[:=]\s*["']?basic\s+[A-Za-z0-9+/]{4,}={0,2}/gimu],
  ["cookie-header", /(?:^|[\r\n,{])\s*["']?(?:cookie|set-cookie)["']?\s*[:=]\s*["']?[^\r\n"']{8,}/gimu],
  ["slack-token", /\bxox(?:a|b|p|r|s)-[A-Za-z0-9-]{20,}\b/gu],
  ["gitlab-token", /\bglpat-[A-Za-z0-9_-]{20,}\b/gu],
  ["huggingface-token", /\bhf_[A-Za-z0-9]{20,}\b/gu],
  ["npm-token", /\bnpm_[A-Za-z0-9]{20,}\b/gu],
  ["stripe-live-token", /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b/gu],
  ["stripe-test-token", /\b(?:sk|rk)_test_[A-Za-z0-9]{16,}\b/gu],
  ["credential-url", /\b(?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|redis|amqps?|https?):\/\/[^\s/:@]*:[^\s/]{4,}@[A-Za-z0-9.-]+(?::\d+)?(?:[/?#\s]|$)/giu],
  ["client-secret", /\bclient[_-]?secret\b\s*[:=]\s*["']?[^\s"'`;]{8,}/giu],
  ["secret-assignment", /\b(?:password|passwd|api[_-]?key|access[_-]?token|auth[_-]?token|session[_-]?(?:id|token)|secret|private[_-]?key|recovery[_-]?code)\b\s*[:=]\s*["']?[A-Za-z0-9+/.=_-]{8,}/giu],
]);

export function locateHighConfidenceSecretCandidates(text) {
  if (typeof text !== "string") return Object.freeze({ blocked: true, count: 1, findings: Object.freeze([{ category: "non-text-input", line: 0 }]) });
  const findings = [];
  for (const [category, pattern] of patterns) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const line = text.slice(0, match.index).split("\n").length;
      findings.push(Object.freeze({ category, line }));
      if (findings.length >= 16) break;
    }
    if (findings.length >= 16) break;
  }
  return Object.freeze({ blocked: findings.length > 0, count: findings.length, findings: Object.freeze(findings) });
}
