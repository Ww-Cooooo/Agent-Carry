const forbiddenQueryControl = /[\u0000\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u;
const automaticReuseStopSignal = /(?:不要(?:再|继续|沿用|照旧|使用|按|照)?|别(?:再|继续|沿用|照旧|使用|按|照)?|不用(?:再|这个|之前|按|照)?|不(?:想|愿意|愿|打算|准备)(?:再|继续|沿用|照旧|使用|按|照)?|不按(?!时)|(?:暂时|先)不(?:再|继续|沿用|照旧|使用|按|照)?|拒绝(?:再|继续|沿用|照旧|使用|按|照)?|请勿|(?:请)?避免|无需|不必|不需要|停止|停用|取消|不再|这次不按|这次别按|不要这样|不是这样|换一种|换个方式|重新来|纠正|更正|改掉|do\s+not|don't|dont|not\s+this\s+time|no\s+longer|avoid|stop|disable|cancel|do\s+something\s+else|use\s+a\s+different|correct\s+this)/iu;
const globalReuseCorrectionSignal = /(?:不要这样|不是这样|换一种|换个方式|重新来|纠正|更正|改掉|stop|disable|cancel|do\s+something\s+else|use\s+a\s+different|correct\s+this)/iu;
const negatedStopException = /(?:不要忘记|别忘(?:记|了)?|不要漏(?:掉)?|仍然不要忘记|不想忘记|不愿忘记|(?:请)?避免忘记|don't\s+forget|do\s+not\s+forget|avoid\s+forgetting)/giu;
const clauseBoundary = /(?:[，,。.!！？?；;]+|\s*(?:但是|但|不过|然而|可是)\s*|\s+(?:but|however|whereas)\s+)/iu;
const minimumAutomaticPhraseLength = 4;

function normalizeWhitespace(value) {
  return value.replace(/[\t\r\n ]+/gu, " ").trim().normalize("NFC");
}

export function normalizeRetrievalRequest(queryText, intentHints = []) {
  if (typeof queryText !== "string" || [...queryText].length > 1000 || forbiddenQueryControl.test(queryText)) {
    return Object.freeze({ ok: false, reason: "query-invalid", query: "", hints: Object.freeze([]) });
  }
  const query = normalizeWhitespace(queryText);
  if (!query || [...query].length > 500) return Object.freeze({ ok: false, reason: query ? "query-too-long" : "query-empty", query: "", hints: Object.freeze([]) });
  if (!Array.isArray(intentHints) || intentHints.length > 3) return Object.freeze({ ok: false, reason: "intent-hints-invalid", query: "", hints: Object.freeze([]) });
  const hints = [];
  for (const hint of intentHints) {
    if (typeof hint !== "string" || [...hint].length > 200 || forbiddenQueryControl.test(hint)) return Object.freeze({ ok: false, reason: "intent-hint-invalid", query: "", hints: Object.freeze([]) });
    const normalized = normalizeWhitespace(hint);
    if (!normalized || [...normalized].length > 120) return Object.freeze({ ok: false, reason: "intent-hint-invalid", query: "", hints: Object.freeze([]) });
    hints.push(normalized);
  }
  return Object.freeze({ ok: true, reason: "", query, hints: Object.freeze([...new Set(hints)]) });
}

export function normalizeMatchText(value) {
  return String(value).toLowerCase().normalize("NFC").replace(/[\s，。！？、,.!?：:；;（）()\[\]{}'"`/\\_-]/gu, "");
}

function bigrams(value) {
  const text = [...normalizeMatchText(value)];
  return new Set(text.slice(0, -1).map((character, index) => character + text[index + 1]));
}

export function lexicalSimilarity(left, right) {
  const normalizedLeft = normalizeMatchText(left);
  const normalizedRight = normalizeMatchText(right);
  if (!normalizedLeft || !normalizedRight) return 0;
  if (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)) return 1;
  const a = bigrams(normalizedLeft); const b = bigrams(normalizedRight);
  if (a.size === 0 || b.size === 0) return normalizedLeft === normalizedRight ? 1 : 0;
  const overlap = [...a].filter((item) => b.has(item)).length;
  return overlap / Math.max(1, Math.min(a.size, b.size));
}

function reuseStopRequestedForEntry(userSignal, entryPhrases) {
  // A negative word elsewhere in the request must not disable an unrelated
  // habit. Keep narrow, unambiguous correction phrases global; otherwise the
  // stop word and the habit's own trigger/scope must occur in the same clause.
  const inspected = userSignal.replace(negatedStopException, " ");
  if (globalReuseCorrectionSignal.test(inspected)) return true;
  const informative = entryPhrases.filter((phrase) => normalizeMatchText(phrase).length >= minimumAutomaticPhraseLength);
  if (informative.length === 0) return false;
  return inspected.split(clauseBoundary).some((clause) => automaticReuseStopSignal.test(clause)
    && informative.some((phrase) => lexicalSimilarity(clause, phrase) >= 0.45));
}

export function rankRetrievalEntries(entries, request, { limit = 3, lifecyclePriority = () => 0 } = {}) {
  // The public callers keep the default model-visible cap of three. A trusted
  // route adapter may request more metadata-only ranked rows so invalid top
  // entries cannot hide the next valid match before the final cap is applied.
  if (!request?.ok || !Array.isArray(entries) || !Number.isInteger(limit) || limit < 1 || limit > 128) return Object.freeze([]);
  const userSignal = request.query;
  const hintSignals = request.hints;
  const userNormalized = normalizeMatchText(userSignal);
  const ranked = [];
  for (const entry of entries) {
    const excludes = Array.isArray(entry.excludes) ? entry.excludes : [];
    // Only the user's own wording may trigger an exclusion. Model/host hints
    // can widen a shortlist but cannot hide a user-grounded match.
    const excluded = excludes.some((phrase) => {
      const normalized = normalizeMatchText(phrase);
      return normalized.length >= 2 && userNormalized.includes(normalized);
    });
    if (excluded) continue;
    const triggerPhrases = [...(entry.triggers ?? []), ...(entry.aliases ?? [])].filter(Boolean);
    const topicPhrases = [entry.topic_key].filter(Boolean);
    const subjectPhrases = [entry.subject_key].filter(Boolean);
    const declaredScopePhrases = (entry.scope ?? []).filter(Boolean);
    const conditionPhrases = (entry.conditions ?? []).filter(Boolean);
    const scopePhrases = [...topicPhrases, ...subjectPhrases, ...declaredScopePhrases, ...conditionPhrases];
    const phrases = [entry.title, entry.summary, ...triggerPhrases, ...scopePhrases].filter(Boolean);
    const reuseStopOrCorrectionRequested = reuseStopRequestedForEntry(userSignal,
      [entry.title, ...triggerPhrases, ...topicPhrases, ...subjectPhrases, ...declaredScopePhrases]);
    const userScore = Math.max(0, ...phrases.map((phrase) => lexicalSimilarity(userSignal, phrase)));
    const hintScore = Math.max(0, ...hintSignals.flatMap((signal) => phrases.map((phrase) => lexicalSimilarity(signal, phrase))));
    const score = Math.max(userScore, hintScore);
    if (score < 0.24) continue;
    // Model/host-generated hints may widen a shortlist, but they can never turn
    // a fuzzy habit into automatic reuse. That stronger decision is grounded
    // only in the user's bounded original wording.
    const automaticTriggerPhrases = triggerPhrases.filter((phrase) => normalizeMatchText(phrase).length >= minimumAutomaticPhraseLength);
    const informative = (phrases) => phrases.filter((phrase) => normalizeMatchText(phrase).length >= minimumAutomaticPhraseLength);
    const automaticTopicPhrases = informative(topicPhrases);
    const automaticSubjectPhrases = informative(subjectPhrases);
    const automaticDeclaredScopePhrases = informative(declaredScopePhrases);
    const automaticConditionPhrases = informative(conditionPhrases);
    const triggerScore = Math.max(0, ...automaticTriggerPhrases.map((phrase) => lexicalSimilarity(request.query, phrase)));
    const topicScore = Math.max(0, ...automaticTopicPhrases.map((phrase) => lexicalSimilarity(request.query, phrase)));
    const subjectScore = Math.max(0, ...automaticSubjectPhrases.map((phrase) => lexicalSimilarity(request.query, phrase)));
    const declaredScopeScore = Math.max(0, ...automaticDeclaredScopePhrases.map((phrase) => lexicalSimilarity(request.query, phrase)));
    const conditionScores = automaticConditionPhrases.map((phrase) => lexicalSimilarity(request.query, phrase));
    const requiredDimensionScores = [
      ...(topicPhrases.length ? [topicScore] : []),
      ...(subjectPhrases.length ? [subjectScore] : []),
      ...(declaredScopePhrases.length ? [declaredScopeScore] : []),
    ];
    const scopeScore = requiredDimensionScores.length ? Math.min(...requiredDimensionScores) : 0;
    const querySignalLength = normalizeMatchText(request.query).length;
    const hasInformativeTrigger = automaticTriggerPhrases.length > 0;
    const groundingDeclared = topicPhrases.length + subjectPhrases.length + declaredScopePhrases.length > 0;
    const allDeclaredGroundingInformative = topicPhrases.length === automaticTopicPhrases.length
      && subjectPhrases.length === automaticSubjectPhrases.length
      && declaredScopePhrases.length === automaticDeclaredScopePhrases.length;
    const allConditionsInformative = conditionPhrases.length === automaticConditionPhrases.length;
    const conditionsSatisfied = conditionScores.every((score) => score >= 0.45);
    const automaticScopeEvidence = !reuseStopOrCorrectionRequested && hasInformativeTrigger && groundingDeclared
      && allDeclaredGroundingInformative && allConditionsInformative && conditionsSatisfied
      && triggerScore >= 0.72 && scopeScore >= 0.45 && querySignalLength >= minimumAutomaticPhraseLength;
    ranked.push({ entry, score, userScore, hintScore, direct: userScore >= 0.24, lifecycle: lifecyclePriority(entry), evidence: Object.freeze({
      triggerScore, scopeScore, automaticScopeEvidence, reuseStopOrCorrectionRequested,
      topicScore, subjectScore, declaredScopeScore, conditionsSatisfied,
      automaticBlockedReason: reuseStopOrCorrectionRequested ? "user-negation-stop-or-correction"
        : !hasInformativeTrigger || !groundingDeclared || !allDeclaredGroundingInformative || !allConditionsInformative ? "trigger-or-scope-too-generic"
          : !conditionsSatisfied ? "required-condition-not-established"
          : automaticScopeEvidence ? "" : "positive-evidence-insufficient",
      directUserMatch: userScore >= 0.24, hintOnlyMatch: userScore < 0.24 && hintScore >= 0.24,
    }) });
  }
  ranked.sort((left, right) => {
    if (left.direct !== right.direct) return left.direct ? -1 : 1;
    const semanticDelta = (right.direct ? right.userScore - left.userScore : right.hintScore - left.hintScore);
    if (Math.abs(semanticDelta) > 0.08) return semanticDelta;
    return right.lifecycle - left.lifecycle || semanticDelta || right.hintScore - left.hintScore || left.entry.id.localeCompare(right.entry.id);
  });
  return Object.freeze(ranked.slice(0, limit).map(({ entry, score, lifecycle, evidence }) => Object.freeze({ entry, score, lifecycle, evidence })));
}
