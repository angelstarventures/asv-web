import { query } from "./dataconnect-admin";

// Simplified-member-view controls (admin-settable). Same key/value shape and fallback pattern
// as aiPrompts.ts's getPromptSetting — the feature works from first deploy, before an admin
// has ever visited /admin/settings to set a real value.
// One locked-scenario key per role tier — each independently either "" (that tier picks freely
// among all 3) or locked to one scenario. Kept as 3 flat keys (not a single JSON value) to match
// this table's existing flat key/value shape rather than introducing a new one.
export const APP_SETTING_KEYS = [
  "member_ai_chat_enabled",
  "site_admin_locked_scenario",
  "admin_locked_scenario",
  "member_locked_scenario",
] as const;
export type AppSettingKey = (typeof APP_SETTING_KEYS)[number];

const DEFAULTS: Record<AppSettingKey, string> = {
  member_ai_chat_enabled: "true",
  site_admin_locked_scenario: "",
  admin_locked_scenario: "",
  member_locked_scenario: "", // empty = that tier can choose; otherwise "optimistic" | "balanced" | "conservative"
};

// The single lookup used everywhere a viewer's OWN scenario lock needs resolving (the member
// dashboard, and the AI document-review visibility split) — one place mapping role -> key so the
// two stay in sync.
export function lockedScenarioSettingKeyForRole(role: "site_admin" | "admin" | "member"): AppSettingKey {
  return role === "site_admin"
    ? "site_admin_locked_scenario"
    : role === "admin"
      ? "admin_locked_scenario"
      : "member_locked_scenario";
}

export async function getAppSetting(key: AppSettingKey): Promise<string> {
  const rows = await query<{ value: string }>(`SELECT value FROM "app_setting" WHERE key = $1`, [key]);
  return rows[0]?.value ?? DEFAULTS[key];
}
