import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireSiteAdmin } from "../lib/auth";
import { requireFeatureEnabled } from "../lib/organizationFeatureCheck";
import { withTransaction } from "../lib/dataconnect-admin";
import { AI_FEATURE_KEYS, type AiFeatureKey, type AiProvider, type SearchBackend } from "../lib/aiProviderSettings";

// The only write path for ai_provider_setting — backs the "AI provider" switches at
// /admin/settings, one per feature key. Site-admin only, same posture as
// updateAiPromptSetting.ts: this controls which model/vendor real production AI calls hit, not
// a fund-operational setting a regular admin should be able to flip.
export interface UpdateAiProviderSettingInput {
  key: AiFeatureKey;
  provider: AiProvider;
  openrouterModel?: string | null;
  // OpenRouter provider slug to pin routing to (e.g. "deepinfra") — see AiProviderSetting's own
  // schema comment. Only meaningful when provider is "openrouter"; ignored otherwise.
  openrouterProviderSlug?: string | null;
  // Only meaningful for document_analysis/portfolio_chat — see AiProviderSetting's own schema
  // comment. Omitted/undefined defaults to "vertex" (unchanged behavior).
  searchBackend?: SearchBackend;
}

const SEARCH_BACKEND_KEYS: readonly AiFeatureKey[] = ["document_analysis", "portfolio_chat"];

export const updateAiProviderSetting = onCall<UpdateAiProviderSettingInput, Promise<{ ok: true }>>(async (request) => {
  const caller = await requireSiteAdmin(request);
  await requireFeatureEnabled(caller, "AI_MODEL_SELECTION");

  const { key, provider } = request.data;
  if (!AI_FEATURE_KEYS.includes(key)) {
    throw new HttpsError("invalid-argument", `key must be one of ${AI_FEATURE_KEYS.join(", ")}.`);
  }
  if (provider !== "vertex" && provider !== "openrouter" && provider !== "keyword_match" && provider !== "embedding_match") {
    throw new HttpsError(
      "invalid-argument",
      `provider must be "vertex", "openrouter", "keyword_match", or "embedding_match".`
    );
  }
  // keyword_match/embedding_match (no generative AI call) only have an implementation for
  // deal_reviewer_matching — the other 3 features have no equivalent to fall back to.
  if ((provider === "keyword_match" || provider === "embedding_match") && key !== "deal_reviewer_matching") {
    throw new HttpsError("invalid-argument", `"${provider}" is only available for deal_reviewer_matching.`);
  }
  const openrouterModel = request.data.openrouterModel?.trim() || null;
  if (provider === "openrouter" && !openrouterModel) {
    throw new HttpsError("invalid-argument", "openrouterModel is required when provider is \"openrouter\".");
  }
  // Not validated against OpenRouter's live provider list — that list changes over time and a
  // stale slug here just means OpenRouter's own provider.order lookup finds nothing and 400s at
  // call time, same failure mode as a typo'd openrouterModel already has.
  const openrouterProviderSlug = provider === "openrouter" ? request.data.openrouterProviderSlug?.trim() || null : null;

  const searchBackend = request.data.searchBackend ?? "vertex";
  if (searchBackend !== "vertex" && searchBackend !== "serper") {
    throw new HttpsError("invalid-argument", `searchBackend must be "vertex" or "serper".`);
  }
  if (searchBackend === "serper" && !SEARCH_BACKEND_KEYS.includes(key)) {
    throw new HttpsError("invalid-argument", `searchBackend is only meaningful for ${SEARCH_BACKEND_KEYS.join(", ")}.`);
  }

  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO "ai_provider_setting" (key, provider, "openrouter_model", "openrouter_provider_slug", "search_backend", "updated_by_id", "updated_at")
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (key) DO UPDATE SET provider = $2, "openrouter_model" = $3, "openrouter_provider_slug" = $4, "search_backend" = $5, "updated_by_id" = $6, "updated_at" = now()`,
      [key, provider, openrouterModel, openrouterProviderSlug, searchBackend, caller.memberId]
    );
  });

  return { ok: true };
});
