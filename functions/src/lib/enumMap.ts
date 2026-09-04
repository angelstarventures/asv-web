// Legacy JSON-schema string values <-> DB enum values. One canonical map, used by the
// migration script, mass-import, and mass-export so encode/decode never drift apart.

export const LEDGER_TYPE_TO_ENUM = {
  Participating_PricedRound: "PARTICIPATING_PRICED_ROUND",
  Participating_SAFERound: "PARTICIPATING_SAFE_ROUND",
  NonParticipating_Round: "NON_PARTICIPATING_ROUND",
  Exit_Event: "EXIT_EVENT",
  Transaction_ValuationChange: "TRANSACTION_VALUATION_CHANGE",
  Internal_ValuationAssessment: "INTERNAL_VALUATION_ASSESSMENT",
  Compliance_FlagChange: "COMPLIANCE_FLAG_CHANGE",
  CompanyUpdate: "COMPANY_UPDATE",
} as const;

export type LegacyLedgerType = keyof typeof LEDGER_TYPE_TO_ENUM;
// "CUSTOM" has no legacy string counterpart — it's only ever written by
// ledger-customEventWrite for admin-defined EventTypeDefinitions (plan §2/§3).
export type LedgerEntryTypeEnum = (typeof LEDGER_TYPE_TO_ENUM)[LegacyLedgerType] | "CUSTOM";

// Partial: "CUSTOM" has no legacy string counterpart (see LedgerEntryTypeEnum above).
export const ENUM_TO_LEDGER_TYPE = Object.fromEntries(
  Object.entries(LEDGER_TYPE_TO_ENUM).map(([legacy, enumVal]) => [enumVal, legacy])
) as Partial<Record<LedgerEntryTypeEnum, LegacyLedgerType>>;

export const SCENARIO_TO_ENUM = {
  optimistic: "OPTIMISTIC",
  balanced: "BALANCED",
  conservative: "CONSERVATIVE",
} as const;

export type LegacyScenario = keyof typeof SCENARIO_TO_ENUM;
export type ScenarioEnum = (typeof SCENARIO_TO_ENUM)[LegacyScenario];

export const ENUM_TO_SCENARIO = Object.fromEntries(
  Object.entries(SCENARIO_TO_ENUM).map(([legacy, enumVal]) => [enumVal, legacy])
) as Record<ScenarioEnum, LegacyScenario>;

// A separate map from SCENARIO_TO_ENUM even though the value sets coincide (both are
// OPTIMISTIC/BALANCED/CONSERVATIVE) — that map's legacy keys are lowercase (the top-level
// ledger_entry.scenario convention), while viewpoint_analysis.scenario uses the capitalized
// convention shared by health/trajectory/etc. below. Reusing SCENARIO_TO_ENUM's keys here would
// silently reject every real value this field ever receives.
export const VIEWPOINT_SCENARIO_TO_ENUM = { Optimistic: "OPTIMISTIC", Balanced: "BALANCED", Conservative: "CONSERVATIVE" } as const;

export const HEALTH_TO_ENUM = { Green: "GREEN", Yellow: "YELLOW", Red: "RED" } as const;
export const TRAJECTORY_TO_ENUM = { Improving: "IMPROVING", Stable: "STABLE", Declining: "DECLINING" } as const;
export const EXIT_TYPE_TO_ENUM = {
  Acquisition: "ACQUISITION",
  IPO: "IPO",
  Merger: "MERGER",
  Shutdown: "SHUTDOWN",
  Dissolution: "DISSOLUTION",
} as const;
export const AUDIT_TYPE_TO_ENUM = {
  Manual_Override: "MANUAL_OVERRIDE",
  Scheduled_Shariah_Review: "SCHEDULED_SHARIAH_REVIEW",
  Strategic_Pivot_Audit: "STRATEGIC_PIVOT_AUDIT",
} as const;

// Reverse maps — used by ledger-massExport.ts to reshape DB enum values (GREEN, ACQUISITION,
// MANUAL_OVERRIDE, ...) back into the legacy JSON schema's title-case strings (Green,
// Acquisition, Manual_Override, ...), the same way ENUM_TO_LEDGER_TYPE/ENUM_TO_SCENARIO
// already do for type/scenario — every enum round-tripped through mass-export must come back
// in the shape asv_master_portfolio_schema.json (and AJV) actually expects, or every
// re-imported record with an enum field fails validation.
function reverse<T extends Record<string, string>>(map: T): Record<T[keyof T], keyof T> {
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k])) as Record<T[keyof T], keyof T>;
}
export const ENUM_TO_VIEWPOINT_SCENARIO = reverse(VIEWPOINT_SCENARIO_TO_ENUM);
export const ENUM_TO_HEALTH = reverse(HEALTH_TO_ENUM);
export const ENUM_TO_TRAJECTORY = reverse(TRAJECTORY_TO_ENUM);
export const ENUM_TO_EXIT_TYPE = reverse(EXIT_TYPE_TO_ENUM);
export const ENUM_TO_AUDIT_TYPE = reverse(AUDIT_TYPE_TO_ENUM);

export function legacyTypeToEnum(type: string): LedgerEntryTypeEnum {
  const mapped = LEDGER_TYPE_TO_ENUM[type as LegacyLedgerType];
  if (!mapped) throw new Error(`Unknown legacy ledger type: "${type}"`);
  return mapped;
}
