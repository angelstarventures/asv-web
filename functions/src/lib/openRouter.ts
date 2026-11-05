import { HttpsError } from "firebase-functions/v2/https";
import { setTimeout as delay } from "node:timers/promises";

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

interface OpenRouterError {
  code?: number | string;
  metadata?: { error_type?: string };
}

interface OpenRouterResponse {
  id?: string;
  model?: string;
  provider?: string;
  error?: OpenRouterError;
  choices?: {
    message?: { content?: string | { type: string; text?: string }[] | null; refusal?: string | null };
    finish_reason?: string;
    error?: OpenRouterError;
  }[];
}

class OpenRouterFailure extends HttpsError {
  constructor(message: string, readonly retryable: boolean, code: ConstructorParameters<typeof HttpsError>[0] = "unavailable") {
    super(code, message);
  }
}

function providerFailure(error: OpenRouterError, httpStatus?: number): OpenRouterFailure {
  const status = Number(error.code) || httpStatus;
  const type = error.metadata?.error_type;
  if (status === 402 || type === "payment_required") {
    return new OpenRouterFailure("The OpenRouter account for this feature has insufficient credits. Add credits at openrouter.ai/settings/credits, or switch this feature's provider in Settings.", false, "failed-precondition");
  }
  if (status === 401 || type === "authentication") {
    return new OpenRouterFailure("The OpenRouter API key for this feature was rejected. Check the key in Secret Manager.", false, "failed-precondition");
  }
  if (status === 403 || type === "permission_denied" || type === "content_policy_violation") {
    return new OpenRouterFailure("OpenRouter blocked this request. Check the model's access, account limits and content policy in OpenRouter.", false, "failed-precondition");
  }
  if (["context_length_exceeded", "max_tokens_exceeded", "token_limit_exceeded", "string_too_long"].includes(type ?? "")) {
    return new OpenRouterFailure("The selected AI model reached its input or output limit. Try fewer documents or choose a model with larger limits in Settings.", false, "failed-precondition");
  }
  const retryable = ["provider_unavailable", "provider_overloaded", "server", "timeout", "rate_limit_exceeded"].includes(type ?? "")
    || status === 408 || status === 429 || (status !== undefined && status >= 500);
  return new OpenRouterFailure(
    retryable
      ? "The AI provider temporarily failed or disconnected. Please try the analysis again."
      : "OpenRouter rejected this request. Check the selected model's document support and provider settings.",
    retryable,
    status === 429 ? "resource-exhausted" : retryable ? "unavailable" : "failed-precondition",
  );
}

function retryDelay(value: string | null): number {
  if (!value) return 750;
  const seconds = Number(value);
  const milliseconds = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - Date.now();
  return Number.isFinite(milliseconds) ? Math.max(750, milliseconds) : 750;
}

async function callOpenRouter(
  apiKey: string,
  body: Record<string, unknown>,
  timeoutMs: number = DEFAULT_OPENROUTER_TIMEOUT_MS
): Promise<string> {
  const controller = new AbortController();
  // One deadline covers both attempts, their backoff and body reads. Never restart the
  // caller's budget on a retry: document analysis must stay below its function timeout.
  const deadline = Date.now() + timeoutMs;
  // Covers the WHOLE call, not just fetch() resolving — fetch() resolves as soon as response
  // headers arrive, before the body is read. A model that streams its response slowly gets
  // past that point quickly and then hangs on res.json() instead, which clearing the timeout
  // right after fetch() (the original bug here) never catches: confirmed in production with a
  // 550B-parameter free model that ran past a 60s budget without the timeout ever firing,
  // hanging all the way to the outer Cloud Function timeout instead.
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      let waitMs = 750;
      try {
        const res = await fetch(OPENROUTER_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(body), signal: controller.signal,
        });
        waitMs = retryDelay(res.headers.get("Retry-After"));
        const json = await res.json().catch(() => {
          throw res.ok
            ? new OpenRouterFailure("The AI provider returned an unreadable response. Please try again.", true)
            : providerFailure({}, res.status);
        }) as OpenRouterResponse;
        // Providers can fail after sending HTTP 200, including after partial text.
        // Record only routing/error metadata; documents and model reasoning stay private.
        if (!res.ok || json.error || json.choices?.[0]?.error || json.choices?.[0]?.finish_reason === "error") {
          const error = json.error ?? json.choices?.[0]?.error ?? {};
          console.warn("callOpenRouter: provider failure", {
            id: json.id, model: json.model, provider: json.provider,
            status: res.status, code: error.code, errorType: error.metadata?.error_type, attempt: attempt + 1,
          });
          throw providerFailure(error, res.ok ? 502 : res.status);
        }
        return extractText(json);
      } catch (err) {
        if (controller.signal.aborted) throw err;
        const failure = err instanceof OpenRouterFailure ? err
          : err instanceof TypeError ? new OpenRouterFailure("The connection to the AI provider failed. Please try again.", true)
          : undefined;
        if (!failure) throw err;
        if (!failure.retryable || attempt === 1 || Date.now() + waitMs + 1000 >= deadline) throw failure;
        console.warn("callOpenRouter: retrying temporary failure", { attempt: attempt + 1, waitMs });
        await delay(waitMs, undefined, { signal: controller.signal });
      }
    }
    throw new OpenRouterFailure("The AI provider is unavailable. Please try again.", true);
  } catch (err) {
    if (controller.signal.aborted) {
      throw new HttpsError("deadline-exceeded", `OpenRouter request timed out after ${timeoutMs / 1000}s. Please try again.`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function extractText(json: OpenRouterResponse): string {
  const choice = json.choices?.[0];
  if (choice?.finish_reason === "length") {
    throw new OpenRouterFailure("The selected AI model reached its output limit before finishing. Try fewer documents or choose a model with a larger output limit in Settings.", false, "failed-precondition");
  }
  if (choice?.finish_reason === "content_filter" || choice?.message?.refusal) {
    throw new OpenRouterFailure("The selected AI model declined to process this request. Try a different model in Settings.", false, "failed-precondition");
  }
  const content = choice?.message?.content;
  const text = typeof content === "string" ? content
    : Array.isArray(content) ? content.filter(part => part.type === "text").map(part => part.text ?? "").join("") : "";
  if (!text.trim()) throw new OpenRouterFailure("The AI provider returned an empty response. Please try again or choose a different model in Settings.", true);
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
