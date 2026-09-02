import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/client";

// Mirrors functions/src/functions/ai-portfolioQuery.ts exactly — same duplicated-boundary-
// contract reasoning as the other lib/functions/*.ts wrappers.

export interface ChatTurn {
  role: "user" | "model";
  text: string;
}

export interface AiPortfolioQueryInput {
  message: string;
  scope: "mine" | "asv";
  cachedContentName?: string;
  history?: ChatTurn[];
}
export interface AiPortfolioQueryOutput {
  reply: string;
  cachedContentName: string;
}
export async function aiPortfolioQuery(input: AiPortfolioQueryInput): Promise<AiPortfolioQueryOutput> {
  // The SDK's default httpsCallable timeout (70s) is shorter than the function's own
  // 540s budget (ai-portfolioQuery.ts) — building the admin "asv" scope's full-ledger context
  // cache alone was observed taking the full 300s and still not finishing, so both sides give
  // real headroom rather than the client giving up before the server ever replies.
  const call = httpsCallable<AiPortfolioQueryInput, AiPortfolioQueryOutput>(functions, "aiPortfolioQuery", {
    timeout: 570000,
  });
  const res = await call(input);
  return res.data;
}
