import { GoogleGenAI } from "@google/genai";

// Vertex AI, not the Gemini Developer API's free tier — Cloud Functions' own service account
// authenticates via ADC automatically (no new secret to manage), and Vertex AI's enterprise
// data terms mean Google doesn't train on submitted content, unlike the Developer API's free
// tier — a real requirement here, since real SPAs/cap tables get uploaded through the
// document-analysis flow (plan: Phase 2 AI). @google/genai is the current unified SDK;
// @google-cloud/vertexai (the older Vertex-only SDK) is deprecated as of June 2025.
//
// Not every Gemini model is served in every Vertex region — us-central1 is used here
// regardless of which region the Cloud Functions themselves run in (us-east1, per
// functions/src/index.ts's setGlobalOptions). That's a normal cross-region API call, not a
// config error.
const PROJECT_ID = "angelstar-investments";
const LOCATION = "us-central1";
const MODEL = "gemini-2.5-flash";

let client: GoogleGenAI | undefined;
function getClient(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({ vertexai: true, project: PROJECT_ID, location: LOCATION });
  }
  return client;
}

export type ContentPart = string | { inlineData: { mimeType: string; data: string } };

export interface GenerateContentInput {
  systemPrompt: string;
  parts: ContentPart[];
  // Set to "application/json" to ask Gemini for a JSON-only response (still not guaranteed
  // schema-valid — callers must still validate, same as any other untrusted input).
  responseMimeType?: string;
}

export async function generateContent(input: GenerateContentInput): Promise<string> {
  const response = await getClient().models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: input.parts.map((part) => (typeof part === "string" ? { text: part } : part)),
      },
    ],
    config: {
      systemInstruction: input.systemPrompt,
      ...(input.responseMimeType ? { responseMimeType: input.responseMimeType } : {}),
    },
  });

  if (response.text === undefined) {
    throw new Error("Gemini returned no text content (possibly blocked by a safety filter).");
  }
  return response.text;
}

// Portfolio chat (ai-portfolioQuery.ts): the schema + full ledger(s) + member list are seeded
// once per chat session as a Vertex AI context cache, instead of being re-sent (and re-billed
// as input tokens) on every message — the cache is created once, its resource name handed back
// to the browser, and reused for follow-up messages in the same session via
// generateChatReply's `cachedContentName`. A 1-hour TTL comfortably covers a chat session;
// ai-portfolioQuery.ts falls back to rebuilding the cache once if a reused name has expired.
export async function createContextCache(input: { systemPrompt: string; contextText: string }): Promise<string> {
  const cache = await getClient().caches.create({
    model: MODEL,
    config: {
      contents: [{ role: "user", parts: [{ text: input.contextText }] }],
      systemInstruction: input.systemPrompt,
      ttl: "3600s",
    },
  });
  if (!cache.name) {
    throw new Error("Vertex AI did not return a cache name.");
  }
  return cache.name;
}

export interface ChatTurn {
  role: "user" | "model";
  text: string;
}

export async function generateChatReply(input: {
  cachedContentName: string;
  history: ChatTurn[];
  message: string;
}): Promise<string> {
  const response = await getClient().models.generateContent({
    model: MODEL,
    contents: [
      ...input.history.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
      { role: "user", parts: [{ text: input.message }] },
    ],
    config: { cachedContent: input.cachedContentName },
  });

  if (response.text === undefined) {
    throw new Error("Gemini returned no text content (possibly blocked by a safety filter).");
  }
  return response.text;
}
