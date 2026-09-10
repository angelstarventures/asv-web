import { HttpsError } from "firebase-functions/v2/https";

// The OpenRouter alternative to vertexAi.ts's plain generateContent/generateChatReply — used
// only when a feature's AiProviderSetting.provider is "openrouter" (functions/src/lib/
// aiProviderSettings.ts). Deliberately no equivalent of generateGroundedContent/
// createContextCache here: Google Search grounding and Vertex context caching are Vertex-
// specific, so grounding always stays on Vertex regardless of which provider drafts the final
// reply, and OpenRouter calls always resend full context (no caching) — an accepted tradeoff
// for a cheaper/free-tier model, called out to the admin choosing this in /admin/settings.
//
// `apiKey` is always passed in by the caller rather than read from a single module-level
// secret — each feature gets its OWN OpenRouter key (openRouterSecrets.ts), a deliberate
// choice so separate keys mean separate OpenRouter billing/rate-limit buckets and a leaked/
// revoked key only ever affects the one feature it was scoped to.

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export type ContentPart = string | { inlineData: { mimeType: string; data: string } };

type OpenAiContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "file"; file: { filename: string; file_data: string } };

// Mirrors OpenAI's multimodal content-part shape, which OpenRouter's chat completions endpoint
// speaks natively — images become image_url data URIs, anything else (PDFs, etc.) becomes a
// file part (OpenRouter's documented shape for file input on models that support it). Only as
// good as the chosen model's own multimodal support; a text-only free model will simply ignore
// or reject non-text parts, which is on the admin who picked that model, not a bug here.
function toOpenAiParts(parts: ContentPart[]): OpenAiContentPart[] {
  return parts.map((part) => {
    if (typeof part === "string") return { type: "text", text: part };
    const { mimeType, data } = part.inlineData;
    if (mimeType.startsWith("image/")) {
      return { type: "image_url", image_url: { url: `data:${mimeType};base64,${data}` } };
    }
    return { type: "file", file: { filename: "document", file_data: `data:${mimeType};base64,${data}` } };
  });
}

// Node's fetch has no default timeout — an OpenRouter response that never properly closes
// (seen in practice: OpenRouter's own side reports the request as processed, but our fetch()
// still hangs) would otherwise wait until the whole Cloud Function container gets killed by
// its outer request timeout, which surfaces to the browser as an opaque, uncaught "Internal
// [0]" instead of a clean error either of the two try/catches around this call could actually
// handle. Each call site passes its own timeoutMs (see generateContent/generateChatReply),
// sized to leave headroom under that caller's own function-level timeout; this default only
// applies if a call site doesn't specify one.
const DEFAULT_OPENROUTER_TIMEOUT_MS = 60_000;

async function callOpenRouter(
  apiKey: string,
  body: Record<string, unknown>,
  timeoutMs: number = DEFAULT_OPENROUTER_TIMEOUT_MS
): Promise<string> {
  const controller = new AbortController();
  // Covers the WHOLE call, not just fetch() resolving — fetch() resolves as soon as response
  // headers arrive, before the body is read. A model that streams its response slowly gets
  // past that point quickly and then hangs on res.json() instead, which clearing the timeout
  // right after fetch() (the original bug here) never catches: confirmed in production with a
  // 550B-parameter free model that ran past a 60s budget without the timeout ever firing,
  // hanging all the way to the outer Cloud Function timeout instead.
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new HttpsError("internal", `OpenRouter request failed (${res.status}): ${errText.slice(0, 300)}`);
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string; reasoning?: string }; finish_reason?: string }[];
    };
    return extractText(json);
  } catch (err) {
    if (controller.signal.aborted) {
      throw new HttpsError("internal", `OpenRouter request timed out after ${timeoutMs / 1000}s.`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function extractText(json: { choices?: { message?: { content?: string; reasoning?: string }; finish_reason?: string }[] }): string {
  const text = json.choices?.[0]?.message?.content;
  if (!text) {
    // Seen in practice on small/weak free models under strict JSON mode (response_format:
    // json_object) — the model produces nothing usable in `content` at all (sometimes dumping
    // everything into `reasoning` instead, sometimes just stopping early). Logged in full so a
    // future failure on a specific model is diagnosable without guessing.
    console.error("callOpenRouter: no content in response", JSON.stringify(json).slice(0, 2000));
    throw new HttpsError("internal", "OpenRouter returned no text content.");
  }
  return text;
}

// Pins OpenRouter's own upstream routing to one named reseller (order + allow_fallbacks:false)
// instead of letting OpenRouter pick/rotate between whichever resellers serve the model —
// site-admin-configurable per feature (AiProviderSetting.openrouterProviderSlug). Undefined/null
// means no pin, OpenRouter's own default routing.
function buildProviderRouting(providerSlug: string | null | undefined): Record<string, unknown> | undefined {
  return providerSlug ? { order: [providerSlug], allow_fallbacks: false } : undefined;
}

export interface GenerateContentInput {
  apiKey: string;
  model: string;
  systemPrompt?: string;
  parts: ContentPart[];
  // Set to "application/json" to ask for a JSON-only response via OpenAI's response_format —
  // like Gemini's own responseMimeType, still not guaranteed schema-valid.
  responseMimeType?: string;
  providerSlug?: string | null;
  // Overrides DEFAULT_OPENROUTER_TIMEOUT_MS — e.g. documents-analyze.ts's multimodal drafting
  // call needs far longer than a plain text completion.
  timeoutMs?: number;
}

export async function generateContent(input: GenerateContentInput): Promise<string> {
  const messages = [
    ...(input.systemPrompt ? [{ role: "system", content: input.systemPrompt }] : []),
    { role: "user", content: toOpenAiParts(input.parts) },
  ];
  const body: Record<string, unknown> = { model: input.model, messages };
  if (input.responseMimeType === "application/json") {
    body.response_format = { type: "json_object" };
  }
  const provider = buildProviderRouting(input.providerSlug);
  if (provider) body.provider = provider;
  return callOpenRouter(input.apiKey, body, input.timeoutMs);
}

export interface ChatTurn {
  role: "user" | "model";
  text: string;
}

// No cachedContentName equivalent — the full systemPrompt is resent every call, since
// OpenRouter has no generic cross-model context-cache API.
export async function generateChatReply(input: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  history: ChatTurn[];
  message: string;
  providerSlug?: string | null;
  timeoutMs?: number;
}): Promise<string> {
  const messages = [
    { role: "system", content: input.systemPrompt },
    ...input.history.map((t) => ({ role: t.role === "model" ? "assistant" : "user", content: t.text })),
    { role: "user", content: input.message },
  ];
  const body: Record<string, unknown> = { model: input.model, messages };
  const provider = buildProviderRouting(input.providerSlug);
  if (provider) body.provider = provider;
  return callOpenRouter(input.apiKey, body, input.timeoutMs);
}
