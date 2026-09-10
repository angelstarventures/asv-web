import { defineSecret } from "firebase-functions/params";
import type { AiFeatureKey } from "./aiProviderSettings";

// A separate OpenRouter API key per feature (the admin's own choice — separate keys mean
// separate OpenRouter billing/rate-limit buckets per feature, and one leaked/revoked key only
// ever affects the one feature it was scoped to). Each Cloud Function that might call
// OpenRouter for a given feature must declare that feature's own secret in its own `onCall`
// options — never a single shared key.
export const openRouterKeyDealKeywordGeneration = defineSecret("OPENROUTER_API_KEY_DEAL_KEYWORD_GENERATION");
export const openRouterKeyDealReviewerMatching = defineSecret("OPENROUTER_API_KEY_DEAL_REVIEWER_MATCHING");
export const openRouterKeyDocumentAnalysis = defineSecret("OPENROUTER_API_KEY_DOCUMENT_ANALYSIS");
export const openRouterKeyPortfolioChat = defineSecret("OPENROUTER_API_KEY_PORTFOLIO_CHAT");

export const OPENROUTER_SECRET_BY_FEATURE: Record<AiFeatureKey, { value(): string }> = {
  deal_keyword_generation: openRouterKeyDealKeywordGeneration,
  deal_reviewer_matching: openRouterKeyDealReviewerMatching,
  document_analysis: openRouterKeyDocumentAnalysis,
  portfolio_chat: openRouterKeyPortfolioChat,
};
