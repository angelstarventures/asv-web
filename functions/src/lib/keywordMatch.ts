// Non-AI fallback for deal-reviewer matching (functions/src/functions/deals-findReviewers.ts,
// AiProviderSetting.provider = "keyword_match") — deterministic, no external call, no cost, no
// latency variance. Deliberately not exact string matching (that was already ruled out once —
// "ML" vs "Machine Learning" never share a substring) but a step short of true semantic
// matching: phrase-level substring containment (catches "Medical Devices" inside "Medical
// Devices & MedTech") plus shared-significant-word overlap (catches "FDA Regulatory Affairs"
// vs "FDA Regulatory Pathways" sharing "fda"/"regulatory"). Good enough to rank real overlaps
// above no-overlap, not a claim of true semantic equivalence.

const STOPWORDS = new Set([
  "and", "the", "of", "for", "in", "on", "a", "an", "to", "with", "or", "at", "by", "as",
]);

function normalize(text: string): string {
  return text.toLowerCase().trim();
}

function tokenize(text: string): Set<string> {
  return new Set(
    normalize(text)
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2 && !STOPWORDS.has(t))
  );
}

// How strongly one member expertise phrase relates to the deal's own sector/keyword phrases —
// substring containment scores higher (a real phrase-level match) than a single shared word.
function scorePhraseAgainstDeal(memberPhrase: string, dealPhrases: string[]): number {
  const memberNorm = normalize(memberPhrase);
  const memberTokens = tokenize(memberPhrase);
  let score = 0;
  for (const dealPhrase of dealPhrases) {
    const dealNorm = normalize(dealPhrase);
    if (dealNorm.length > 3 && memberNorm.includes(dealNorm)) score += 3;
    else if (memberNorm.length > 3 && dealNorm.includes(memberNorm)) score += 3;
    for (const t of tokenize(dealPhrase)) {
      if (memberTokens.has(t)) score += 1;
    }
  }
  return score;
}

export interface KeywordMatchCandidate {
  memberId: string;
  expertise: string[];
}

export interface KeywordMatchResult {
  memberId: string;
  score: number;
  matchedExpertise: string[];
}

// Ranks candidates by total overlap score, highest first; a candidate with zero overlap is
// dropped entirely (never padded in, same "return fewer rather than padding" posture as the AI
// prompt this replaces) and each result carries the specific expertise phrases that scored, so
// the caller can build a real, inspectable "reason" instead of a generic label.
export function rankByKeywordOverlap(
  dealPhrases: string[],
  candidates: KeywordMatchCandidate[],
  topN: number
): KeywordMatchResult[] {
  const results: KeywordMatchResult[] = [];
  for (const candidate of candidates) {
    let score = 0;
    const matchedExpertise: string[] = [];
    for (const phrase of candidate.expertise) {
      const phraseScore = scorePhraseAgainstDeal(phrase, dealPhrases);
      if (phraseScore > 0) {
        score += phraseScore;
        matchedExpertise.push(phrase);
      }
    }
    if (score > 0) results.push({ memberId: candidate.memberId, score, matchedExpertise });
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topN);
}
