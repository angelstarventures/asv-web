import { query } from "./dataconnect-admin";

// Fund-wide settings (admin-settable), backing /admin/settings. Same key/value flat-table
// shape and fallback pattern as aiPrompts.ts's getPromptSetting — a feature works from first
// deploy, before an admin has ever visited the Settings page to set a real value.
//
// The AI-chat-enabled / scenario-lock controls that USED to live here (one pair per role tier)
// moved to per-member columns on Member (aiChatEnabled/lockedScenario), editable only in
// site-admin root mode from the members table — see components/MembersTable.tsx and
// users-onCreateProvision.ts's updateMemberAiSettings. What's left here is genuinely fund-wide,
// not per-viewer.
export const APP_SETTING_KEYS = [
  "member_annual_dues_amount",
  "associate_annual_dues_amount",
  "dues_reminder_template",
] as const;
export type AppSettingKey = (typeof APP_SETTING_KEYS)[number];

const DEFAULTS: Record<AppSettingKey, string> = {
  member_annual_dues_amount: "",
  associate_annual_dues_amount: "",
  dues_reminder_template:
    "Hi {name}, this is a reminder that your ${amount} annual ASV membership dues for {year} are due. Thank you!",
};

export async function getAppSetting(key: AppSettingKey): Promise<string> {
  const rows = await query<{ value: string }>(`SELECT value FROM "app_setting" WHERE key = $1`, [key]);
  return rows[0]?.value ?? DEFAULTS[key];
}
