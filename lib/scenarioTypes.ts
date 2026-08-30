// Plain constants/types only — no "use client" here. lib/scenarios.ts's useScenario hook is
// client-only, and a Server Component importing a value out of a "use client" module gets a
// client-reference proxy instead of the real value (RSC module boundary), not a plain array —
// so anything a server component needs (parsing ?scenario=/?scope= itself) must live in a
// plain module like this one instead.
export const SCENARIOS = ["optimistic", "balanced", "conservative"] as const;
export type Scenario = (typeof SCENARIOS)[number];

export const SCOPES = ["mine", "asv"] as const;
export type Scope = (typeof SCOPES)[number];
