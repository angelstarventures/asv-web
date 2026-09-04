import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireSiteAdmin } from "../lib/auth";
import { withTransaction } from "../lib/dataconnect-admin";

// The only write path for ai_prompt_setting (plan: Phase 2 AI) — backs the admin
// "AI settings" form at app/admin/settings/page.tsx. Only two keys are ever meaningful;
// validated here rather than trusting the client to send a real one.
const VALID_KEYS = ["document_analysis", "portfolio_chat"] as const;
export type AiPromptSettingKey = (typeof VALID_KEYS)[number];

export interface UpdateAiPromptSettingInput {
  key: AiPromptSettingKey;
  prompt: string;
}

export const updateAiPromptSetting = onCall<UpdateAiPromptSettingInput, Promise<{ ok: true }>>(async (request) => {
  const caller = await requireSiteAdmin(request);

  const { key, prompt } = request.data;
  if (!VALID_KEYS.includes(key) || !prompt?.trim()) {
    throw new HttpsError("invalid-argument", `key must be one of ${VALID_KEYS.join(", ")}, and prompt is required.`);
  }

  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO "ai_prompt_setting" (key, prompt, "updated_by_id", "updated_at")
       VALUES ($1, $2, $3, now())
       ON CONFLICT (key) DO UPDATE SET prompt = $2, "updated_by_id" = $3, "updated_at" = now()`,
      [key, prompt.trim(), caller.memberId]
    );
  });

  return { ok: true };
});
