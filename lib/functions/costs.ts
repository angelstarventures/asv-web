import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/client";
import type { AiFeatureKey } from "./adminSettings";

// Mirrors functions/src/functions/costs-getSummary.ts's shape exactly — same duplicated-
// boundary-contract reasoning as the other lib/functions/*.ts wrappers.

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
    estimatedCostUsd: number;
  };
}

export async function getCostsSummary(): Promise<CostsSummaryOutput> {
  const call = httpsCallable<void, CostsSummaryOutput>(functions, "costsGetSummary");
  const res = await call();
  return res.data;
}
