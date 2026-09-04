import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireSiteAdmin } from "../lib/auth";
import { withTransaction } from "../lib/dataconnect-admin";
import { APP_SETTING_KEYS, type AppSettingKey } from "../lib/appSettings";

// The only write path for app_setting — backs the Settings page, which is itself
// site_admin-only (proxy.ts + app/admin/settings/page.tsx), so this is too. Per-key value
// validation happens here rather than trusting the client to send something sane, same posture
// as updateAiPromptSetting.
const SCENARIO_LOCK_VALUES = ["", "optimistic", "balanced", "conservative"] as const;
const VALID_VALUES: Record<AppSettingKey, readonly string[]> = {
  member_ai_chat_enabled: ["true", "false"],
  site_admin_locked_scenario: SCENARIO_LOCK_VALUES,
  admin_locked_scenario: SCENARIO_LOCK_VALUES,
  member_locked_scenario: SCENARIO_LOCK_VALUES,
};

export interface UpdateAppSettingInput {
  key: AppSettingKey;
  value: string;
}

export const updateAppSetting = onCall<UpdateAppSettingInput, Promise<{ ok: true }>>(async (request) => {
  const caller = await requireSiteAdmin(request);

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
