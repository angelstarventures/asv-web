import { GoogleGenAI } from "@google/genai";

// Semantic similarity via Vertex AI text embeddings — a middle ground between a full generative
// chat completion (keywordMatch's original AI path — flexible but has JSON-formatting fragility
// and latency variance, especially on a random OpenRouter free model) and plain keyword overlap
// (keywordMatch.ts — fast/free/local but only catches shared words or substrings, not real
// synonyms like "ML" vs "Machine Learning"). One embedding call per text is cheap, fast, and
// deterministic-ish (no JSON to parse, no prompt-following required), while cosine similarity
// between embeddings genuinely captures semantic closeness.
//
// Same Vertex project/location as vertexAi.ts (no new secret, no new config) — gemini-embedding-001
// is the current general-purpose Vertex text embedding model, GA as of 2026.
const PROJECT_ID = "angelstar-investments";
const LOCATION = "us-central1";
const EMBEDDING_MODEL = "gemini-embedding-001";

let client: GoogleGenAI | undefined;
function getClient(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({ vertexai: true, project: PROJECT_ID, location: LOCATION });
  }
  return client;
}

// gemini-embedding-001 only accepts a single input text per request (no batching) — every
// candidate is embedded in its own parallel call rather than one combined request.
async function embedText(text: string): Promise<number[]> {
  const response = await getClient().models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
  });
  const values = response.embeddings?.[0]?.values;
  if (!values) {
    throw new Error("Vertex AI returned no embedding.");
  }
  return values;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface EmbeddingMatchCandidate {
  memberId: string;
  expertise: string[];
}

export interface EmbeddingMatchResult {
  memberId: string;
  score: number;
}

// Ranks candidates by cosine similarity between the deal's own phrases and each candidate's
// full expertise list (joined into one string per candidate — a single embedding per person,
// not per expertise phrase). A minimum similarity floor keeps a small/unrelated candidate pool
// from padding in near-zero matches; 0.3 is deliberately permissive (two genuinely unrelated
// expertise sets rarely score below that with this model in practice), not a tight relevance bar.
const MIN_SIMILARITY = 0.3;

export async function rankByEmbeddingSimilarity(
  dealPhrases: string[],
  candidates: EmbeddingMatchCandidate[],
  topN: number
): Promise<EmbeddingMatchResult[]> {
  const dealText = dealPhrases.join(", ");
  const [dealEmbedding, candidateEmbeddings] = await Promise.all([
    embedText(dealText),
    Promise.all(candidates.map((c) => embedText(c.expertise.join(", ")))),
  ]);

  const results: EmbeddingMatchResult[] = candidates.map((c, i) => ({
    memberId: c.memberId,
    score: cosineSimilarity(dealEmbedding, candidateEmbeddings[i]),
  }));

  results.sort((a, b) => b.score - a.score);
  return results.filter((r) => r.score > MIN_SIMILARITY).slice(0, topN);
}
