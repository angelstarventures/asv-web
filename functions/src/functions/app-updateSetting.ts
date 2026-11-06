import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { withTransaction } from "../lib/dataconnect-admin";
import { APP_SETTING_KEYS, type AppSettingKey } from "../lib/appSettings";

// The only write path for app_setting — backs the Settings page. Regular admins may set these
// (dues fee amounts + reminder template are fund-wide operational settings, not a root-only
// power), unlike the site-admin-only per-member AI/scenario settings this table used to also
// hold. Per-key value validation happens here rather than trusting the client to send something
// sane, same posture as updateAiPromptSetting.
const NUMERIC_DUES_AMOUNT = { test: (v: string) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0) };
const PERCENT = { test: (v: string) => v.trim() !== "" && !Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 100 };
const VALID_VALUES: Record<AppSettingKey, { test: (v: string) => boolean }> = {
  member_annual_dues_amount: NUMERIC_DUES_AMOUNT,
  associate_annual_dues_amount: NUMERIC_DUES_AMOUNT,
  dues_reminder_template: { test: (v: string) => v.trim().length > 0 },
  transfer_dd_lead_carry_percent: PERCENT,
  transfer_management_carry_percent: PERCENT,
  // Existence in the member table is checked separately below; format here only.
  transfer_management_carry_member_id: { test: (v: string) => /^\d{5}$/.test(v) },
};

export interface UpdateAppSettingInput {
  key: AppSettingKey;
  value: string;
}

export const updateAppSetting = onCall<UpdateAppSettingInput, Promise<{ ok: true }>>(async (request) => {
  const caller = await requireAdmin(request);

  const { key, value } = request.data;
  if (!APP_SETTING_KEYS.includes(key) || !VALID_VALUES[key]?.test(value)) {
    throw new HttpsError(
      "invalid-argument",
      `key must be one of ${APP_SETTING_KEYS.join(", ")}, with a value valid for that key.`
    );
  }

  await withTransaction(async (client) => {
    if (key === "transfer_management_carry_member_id") {
      const member = await client.query(`SELECT 1 FROM "member" WHERE id = $1`, [value]);
      if (member.rowCount === 0) throw new HttpsError("invalid-argument", `No member with ID ${value}.`);
    }
    await client.query(
      `INSERT INTO "app_setting" (key, value, "updated_by_id", "updated_at")
       VALUES ($1, $2, $3, now())
       ON CONFLICT (key) DO UPDATE SET value = $2, "updated_by_id" = $3, "updated_at" = now()`,
      [key, value, caller.memberId]
    );
  });

  return { ok: true };
});
