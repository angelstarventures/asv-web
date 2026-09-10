import { query } from "./dataconnect-admin";

// Per-feature AI provider routing — backs the site-admin "AI provider" switches at
// /admin/settings (ai-updateProviderSetting.ts is the only write path). A feature with no row
// yet falls back to Vertex, same "works before an admin ever visits Settings" posture as
// aiPrompts.ts's getPromptSetting.
export const AI_FEATURE_KEYS = [
  "deal_keyword_generation",
  "deal_reviewer_matching",
  "document_analysis",
  "portfolio_chat",
] as const;
export type AiFeatureKey = (typeof AI_FEATURE_KEYS)[number];

// "keyword_match" and "embedding_match" are non-AI-generation fallbacks, only meaningful (and
// only accepted by ai-updateProviderSetting.ts) for "deal_reviewer_matching" — the other 3
// features have no equivalent to fall back to.
//  - keyword_match: deterministic keyword/expertise overlap scoring (keywordMatch.ts), no
//    external call at all.
//  - embedding_match: cosine similarity between Vertex AI text embeddings (embeddingMatch.ts)
//    — a real API call, but a single cheap embedding rather than a full generative completion.
export type AiProvider = "vertex" | "openrouter" | "keyword_match" | "embedding_match";

// Only meaningful for document_analysis (market-research grounding) and portfolio_chat
// (NEEDS_RESEARCH) — the other 2 feature keys never do a live web search, so this field is
// simply unused (left at its default) on their rows.
//  - vertex: Vertex AI's own Google Search grounding tool (generateGroundedContent) — the
//    original, more expensive behavior.
//  - serper: raw search results from Serper.dev, synthesized via that feature's own
//    AiProviderSetting.provider (openRouter or Vertex, whichever is already configured for the
//    feature's drafting/chat call) instead of Vertex's bundled grounding tool — cheaper, and
//    lets a feature avoid Vertex entirely when its provider is also "openrouter".
export type SearchBackend = "vertex" | "serper";

export interface AiProviderSetting {
  provider: AiProvider;
  openrouterModel: string | null;
  // Pins OpenRouter's own upstream routing to one named reseller (openRouter.ts's provider.order
  // + allow_fallbacks:false) instead of letting OpenRouter pick/rotate between whichever
  // resellers serve openrouterModel. Only meaningful when provider is "openrouter"; null means
  // no pin.
  openrouterProviderSlug: string | null;
  searchBackend: SearchBackend;
}

const DEFAULT_SETTING: AiProviderSetting = {
  provider: "vertex",
  openrouterModel: null,
  openrouterProviderSlug: null,
  searchBackend: "vertex",
};

const KNOWN_PROVIDERS: readonly AiProvider[] = ["vertex", "openrouter", "keyword_match", "embedding_match"];
const KNOWN_SEARCH_BACKENDS: readonly SearchBackend[] = ["vertex", "serper"];

export async function getAiProviderSetting(key: AiFeatureKey): Promise<AiProviderSetting> {
  const rows = await query<{
    provider: string;
    openrouterModel: string | null;
    openrouterProviderSlug: string | null;
    searchBackend: string;
  }>(
    `SELECT provider, "openrouter_model" AS "openrouterModel", "openrouter_provider_slug" AS "openrouterProviderSlug",
            "search_backend" AS "searchBackend"
     FROM "ai_provider_setting" WHERE key = $1`,
    [key]
  );
  const row = rows[0];
  if (!row) return DEFAULT_SETTING;
  const provider = (KNOWN_PROVIDERS as readonly string[]).includes(row.provider)
    ? (row.provider as AiProvider)
    : "vertex";
  const searchBackend = (KNOWN_SEARCH_BACKENDS as readonly string[]).includes(row.searchBackend)
    ? (row.searchBackend as SearchBackend)
    : "vertex";
  return {
    provider,
    openrouterModel: row.openrouterModel,
    openrouterProviderSlug: row.openrouterProviderSlug,
    searchBackend,
  };
}
