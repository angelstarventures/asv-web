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

export type AppSettingKey = "member_ai_chat_enabled" | "member_locked_scenario";

export interface UpdateAppSettingInput {
  key: AppSettingKey;
  value: string;
}
export async function updateAppSetting(input: UpdateAppSettingInput): Promise<{ ok: true }> {
  const call = httpsCallable<UpdateAppSettingInput, { ok: true }>(functions, "updateAppSetting");
  const res = await call(input);
  return res.data;
}
