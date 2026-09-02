import { query } from "./dataconnect-admin";

// Simplified-member-view controls (admin-settable). Same key/value shape and fallback pattern
// as aiPrompts.ts's getPromptSetting — the feature works from first deploy, before an admin
// has ever visited /admin/settings to set a real value.
export const APP_SETTING_KEYS = ["member_ai_chat_enabled", "member_locked_scenario"] as const;
export type AppSettingKey = (typeof APP_SETTING_KEYS)[number];

const DEFAULTS: Record<AppSettingKey, string> = {
  member_ai_chat_enabled: "true",
  member_locked_scenario: "", // empty = member can choose; otherwise "optimistic" | "balanced" | "conservative"
};

export async function getAppSetting(key: AppSettingKey): Promise<string> {
  const rows = await query<{ value: string }>(`SELECT value FROM "app_setting" WHERE key = $1`, [key]);
  return rows[0]?.value ?? DEFAULTS[key];
}
