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
export type LedgerEntryTypeEnum = (typeof LEDGER_TYPE_TO_ENUM)[LegacyLedgerType];

export const ENUM_TO_LEDGER_TYPE = Object.fromEntries(
  Object.entries(LEDGER_TYPE_TO_ENUM).map(([legacy, enumVal]) => [enumVal, legacy])
) as Record<LedgerEntryTypeEnum, LegacyLedgerType>;

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

export function legacyTypeToEnum(type: string): LedgerEntryTypeEnum {
  const mapped = LEDGER_TYPE_TO_ENUM[type as LegacyLedgerType];
  if (!mapped) throw new Error(`Unknown legacy ledger type: "${type}"`);
  return mapped;
}
