// Plain constants/types only — no "use client" here. lib/scenarios.ts's useScenario hook is
// client-only, and a Server Component importing a value out of a "use client" module gets a
// client-reference proxy instead of the real value (RSC module boundary), not a plain array —
// so anything a server component needs (parsing ?scenario=/?scope= itself) must live in a
// plain module like this one instead.
export const SCENARIOS = ["optimistic", "balanced", "conservative"] as const;
export type Scenario = (typeof SCENARIOS)[number];

export const SCOPES = ["mine", "asv"] as const;
export type Scope = (typeof SCOPES)[number];

// Mirrors functions/src/lib/appSettings.ts's lockedScenarioSettingKeyForRole — kept in sync by
// hand since the two are separate deployables (plan §4's usual Next.js/Cloud-Functions boundary
// duplication), not by import.
export function lockedScenarioSettingKeyForRole(
  role: "site_admin" | "admin" | "member"
): "site_admin_locked_scenario" | "admin_locked_scenario" | "member_locked_scenario" {
  return role === "site_admin"
    ? "site_admin_locked_scenario"
    : role === "admin"
      ? "admin_locked_scenario"
      : "member_locked_scenario";
}
