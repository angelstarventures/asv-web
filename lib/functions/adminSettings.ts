import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/client";

// Mirrors functions/src/functions/ai-updatePromptSetting.ts's shape exactly — duplicated
// rather than imported so the web app never reaches into the Cloud Functions project's
// internals; this boundary IS the contract (plan §4).

export type AiPromptSettingKey = "document_analysis" | "portfolio_chat";

export interface UpdateAiPromptSettingInput {
  key: AiPromptSettingKey;
  prompt: string;
}
export async function updateAiPromptSetting(input: UpdateAiPromptSettingInput): Promise<{ ok: true }> {
  const call = httpsCallable<UpdateAiPromptSettingInput, { ok: true }>(functions, "updateAiPromptSetting");
  const res = await call(input);
  return res.data;
}

export const AI_FEATURE_KEYS = [
  "deal_keyword_generation",
  "deal_reviewer_matching",
  "document_analysis",
  "portfolio_chat",
] as const;
export type AiFeatureKey = (typeof AI_FEATURE_KEYS)[number];
// "keyword_match" (deterministic overlap scoring) and "embedding_match" (Vertex text-embedding
// cosine similarity) are only accepted by the server for key = "deal_reviewer_matching" — the
// other 3 features have no equivalent.
export type AiProvider = "vertex" | "openrouter" | "keyword_match" | "embedding_match";
// Only meaningful for document_analysis/portfolio_chat — see AiProviderSetting's own schema
// comment. "serper" is the cheaper alternative to Vertex's bundled Google Search grounding tool.
export type SearchBackend = "vertex" | "serper";

export interface UpdateAiProviderSettingInput {
  key: AiFeatureKey;
  provider: AiProvider;
  openrouterModel?: string | null;
  openrouterProviderSlug?: string | null;
  searchBackend?: SearchBackend;
}
export async function updateAiProviderSetting(input: UpdateAiProviderSettingInput): Promise<{ ok: true }> {
  const call = httpsCallable<UpdateAiProviderSettingInput, { ok: true }>(functions, "updateAiProviderSetting");
  const res = await call(input);
  return res.data;
}

export type AppSettingKey = "member_annual_dues_amount" | "associate_annual_dues_amount" | "dues_reminder_template";

export interface UpdateAppSettingInput {
  key: AppSettingKey;
  value: string;
}
export async function updateAppSetting(input: UpdateAppSettingInput): Promise<{ ok: true }> {
  const call = httpsCallable<UpdateAppSettingInput, { ok: true }>(functions, "updateAppSetting");
  const res = await call(input);
  return res.data;
}
