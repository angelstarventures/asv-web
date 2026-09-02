import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { withTransaction } from "../lib/dataconnect-admin";
import { APP_SETTING_KEYS, type AppSettingKey } from "../lib/appSettings";

// The only write path for app_setting — backs the "Simplified member view" admin settings
// form. Per-key value validation happens here rather than trusting the client to send
// something sane, same posture as updateAiPromptSetting.
const VALID_VALUES: Record<AppSettingKey, readonly string[]> = {
  member_ai_chat_enabled: ["true", "false"],
  member_locked_scenario: ["", "optimistic", "balanced", "conservative"],
};

export interface UpdateAppSettingInput {
  key: AppSettingKey;
  value: string;
}

export const updateAppSetting = onCall<UpdateAppSettingInput, Promise<{ ok: true }>>(async (request) => {
  const caller = await requireAdmin(request);

  const { key, value } = request.data;
  if (!APP_SETTING_KEYS.includes(key) || !VALID_VALUES[key]?.includes(value)) {
    throw new HttpsError(
      "invalid-argument",
      `key must be one of ${APP_SETTING_KEYS.join(", ")}, with a value valid for that key.`
    );
  }

  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO "app_setting" (key, value, "updated_by_id", "updated_at")
       VALUES ($1, $2, $3, now())
       ON CONFLICT (key) DO UPDATE SET value = $2, "updated_by_id" = $3, "updated_at" = now()`,
      [key, value, caller.memberId]
    );
  });

  return { ok: true };
});
