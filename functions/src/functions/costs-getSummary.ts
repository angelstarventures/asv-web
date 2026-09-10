import { onCall } from "firebase-functions/v2/https";
import { requireSiteAdmin } from "../lib/auth";
import { query } from "../lib/dataconnect-admin";
import { AI_FEATURE_KEYS, type AiFeatureKey } from "../lib/aiProviderSettings";
import {
  openRouterKeyDealKeywordGeneration,
  openRouterKeyDealReviewerMatching,
  openRouterKeyDocumentAnalysis,
  openRouterKeyPortfolioChat,
  OPENROUTER_SECRET_BY_FEATURE,
} from "../lib/openRouterSecrets";

// Backs the site-admin Costs page (/admin/costs) — three external cost sources this app
// actually spends money on, gathered here into one callable rather than three separate ones
// (all site-admin-only, all cheap/fast, no reason to round-trip 3 times). Firebase/GCP cost
// itself isn't included: there's no simple API for itemized spend without setting up BigQuery
// billing export (a deliberate choice not to require that setup) — the page links out to the
// Cloud Billing console for that instead.
export interface OpenRouterFeatureUsage {
  feature: AiFeatureKey;
  usage: number;
  limit: number | null;
  limitRemaining: number | null;
  error?: string;
}

export interface CostsSummaryOutput {
  openRouter: {
    byFeature: OpenRouterFeatureUsage[];
    totalUsage: number;
  };
  serper: {
    queryCount: number;
    // List-price estimate (Serper's cheapest bulk rate, $1/1000 queries) — Serper has no
    // balance/usage API to read a true figure from, unlike OpenRouter's /api/v1/key.
    estimatedCostUsd: number;
  };
}

const SERPER_ESTIMATED_COST_PER_QUERY = 0.001;

async function fetchOpenRouterKeyUsage(feature: AiFeatureKey, apiKey: string): Promise<OpenRouterFeatureUsage> {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/key", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      return { feature, usage: 0, limit: null, limitRemaining: null, error: `HTTP ${res.status}` };
    }
    const json = (await res.json()) as {
      data?: { usage?: number; limit?: number | null; limit_remaining?: number | null };
    };
    return {
      feature,
      usage: json.data?.usage ?? 0,
      limit: json.data?.limit ?? null,
      limitRemaining: json.data?.limit_remaining ?? null,
    };
  } catch (err) {
    return { feature, usage: 0, limit: null, limitRemaining: null, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export const costsGetSummary = onCall<void, Promise<CostsSummaryOutput>>(
  {
    secrets: [
      openRouterKeyDealKeywordGeneration,
      openRouterKeyDealReviewerMatching,
      openRouterKeyDocumentAnalysis,
      openRouterKeyPortfolioChat,
    ],
  },
  async (request) => {
    await requireSiteAdmin(request);

    const byFeature = await Promise.all(
      AI_FEATURE_KEYS.map((feature) => fetchOpenRouterKeyUsage(feature, OPENROUTER_SECRET_BY_FEATURE[feature].value()))
    );
    const totalUsage = byFeature.reduce((sum, f) => sum + f.usage, 0);

    const rows = await query<{ queryCount: number }>(
      `SELECT "query_count" AS "queryCount" FROM "serper_usage_counter" WHERE key = 'total'`
    );
    const queryCount = rows[0]?.queryCount ?? 0;

    return {
      openRouter: { byFeature, totalUsage },
      serper: { queryCount, estimatedCostUsd: queryCount * SERPER_ESTIMATED_COST_PER_QUERY },
    };
  }
);
