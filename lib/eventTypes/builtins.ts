import type { EventTypeDef } from "./schema";

// One EventTypeDef per LedgerEntryType (schema §mock-data/asv_master_portfolio_schema.json),
// so DynamicEntryForm can render built-in and admin-defined custom types through the same
// renderer (plan §4). CUSTOM is intentionally absent — those come from EventTypeDefinition rows.
// Enum `options` are the actual Data Connect/Postgres enum values (schema.gql), not the
// legacy JSON-schema's title-case strings (enumMap.ts's LEGACY_* keys) — these options are
// submitted directly to the Cloud Functions below, which expect the DB casing verbatim.
export const BUILTIN_EVENT_TYPES: EventTypeDef[] = [
  {
    key: "PARTICIPATING_PRICED_ROUND",
    label: "Priced Round",
    isBuiltin: true,
    fields: [
      { key: "companyUrl", label: "Company URL", type: "string", required: true, variesByScenario: false },
      { key: "sector", label: "Sector", type: "string", required: true, variesByScenario: false },
      { key: "docLink", label: "Document Link", type: "string", required: true, variesByScenario: false },
      { key: "asvTotal", label: "ASV Total", type: "number", required: true, variesByScenario: false },
      { key: "roundName", label: "Round Name", type: "string", required: true, variesByScenario: false },
      { key: "pricePerShare", label: "Price Per Share", type: "number", required: true, variesByScenario: false },
      { key: "postMoneyValuation", label: "Post-Money Valuation", type: "number", required: true, variesByScenario: false },
    ],
  },
  {
    key: "PARTICIPATING_SAFE_ROUND",
    label: "SAFE Round",
    isBuiltin: true,
    fields: [
      { key: "companyUrl", label: "Company URL", type: "string", required: true, variesByScenario: false },
      { key: "sector", label: "Sector", type: "string", required: true, variesByScenario: false },
      { key: "docLink", label: "Document Link", type: "string", required: true, variesByScenario: false },
      { key: "asvTotal", label: "ASV Total", type: "number", required: true, variesByScenario: false },
      { key: "postMoneyValCap", label: "Post-Money Valuation Cap", type: "number", required: true, variesByScenario: false },
      { key: "discount", label: "Discount %", type: "number", required: true, variesByScenario: false },
      { key: "notes", label: "Notes", type: "text", required: false, variesByScenario: false },
    ],
  },
  {
    key: "NON_PARTICIPATING_ROUND",
    label: "Non-Participating Round (Markup/Markdown)",
    isBuiltin: true,
    fields: [
      { key: "roundName", label: "Round Name", type: "string", required: true, variesByScenario: false },
      { key: "newPricePerShare", label: "New Price Per Share", type: "number", required: true, variesByScenario: false },
      { key: "newPostMoneyValuation", label: "New Post-Money Valuation", type: "number", required: true, variesByScenario: false },
      { key: "docLink", label: "Document Link", type: "string", required: true, variesByScenario: false },
      { key: "notes", label: "Notes", type: "text", required: false, variesByScenario: false },
    ],
  },
  {
    key: "EXIT_EVENT",
    label: "Exit Event",
    isBuiltin: true,
    fields: [
      { key: "exitType", label: "Exit Type", type: "enum", required: true, variesByScenario: false, options: ["ACQUISITION", "IPO", "MERGER", "SHUTDOWN", "DISSOLUTION"] },
      { key: "totalExitValue", label: "Total Exit Value", type: "number", required: true, variesByScenario: false },
      { key: "asvTotalPayout", label: "ASV Total Payout", type: "number", required: true, variesByScenario: false },
      { key: "docLink", label: "Document Link", type: "string", required: true, variesByScenario: false },
    ],
  },
  {
    key: "TRANSACTION_VALUATION_CHANGE",
    label: "Valuation Change (Transaction)",
    isBuiltin: true,
    fields: [
      { key: "drivingEventDate", label: "Driving Event Date", type: "date", required: true, variesByScenario: false },
      { key: "asvTotalFairMarketValue", label: "ASV Total Fair Market Value", type: "number", required: true, variesByScenario: true },
      { key: "impliedEnterpriseValue", label: "Implied Enterprise Value", type: "number", required: false, variesByScenario: true },
      { key: "assessmentRationale", label: "Rationale", type: "text", required: false, variesByScenario: true },
    ],
  },
  {
    key: "INTERNAL_VALUATION_ASSESSMENT",
    label: "Valuation Assessment (Internal)",
    isBuiltin: true,
    fields: [
      { key: "drivingEventDate", label: "Driving Event Date", type: "date", required: true, variesByScenario: false },
      { key: "asvTotalFairMarketValue", label: "ASV Total Fair Market Value", type: "number", required: true, variesByScenario: true },
      { key: "impliedEnterpriseValue", label: "Implied Enterprise Value", type: "number", required: false, variesByScenario: true },
      { key: "assessmentRationale", label: "Rationale", type: "text", required: false, variesByScenario: true },
    ],
  },
  {
    key: "COMPLIANCE_FLAG_CHANGE",
    label: "Compliance Flag",
    isBuiltin: true,
    fields: [
      { key: "flaggedDate", label: "Flagged Date", type: "date", required: true, variesByScenario: false },
      { key: "reason", label: "Reason", type: "text", required: true, variesByScenario: false },
      { key: "auditType", label: "Audit Type", type: "enum", required: true, variesByScenario: false, options: ["MANUAL_OVERRIDE", "SCHEDULED_SHARIAH_REVIEW", "STRATEGIC_PIVOT_AUDIT"] },
      { key: "complianceOfficerNotes", label: "Compliance Officer Notes", type: "text", required: true, variesByScenario: false },
    ],
  },
  {
    key: "COMPANY_UPDATE",
    label: "Company Update",
    isBuiltin: true,
    fields: [
      { key: "health", label: "Health", type: "enum", required: true, variesByScenario: false, options: ["GREEN", "YELLOW", "RED"] },
      { key: "trajectory", label: "Trajectory", type: "enum", required: true, variesByScenario: false, options: ["IMPROVING", "STABLE", "DECLINING"] },
      { key: "highlights", label: "Highlights", type: "string[]", required: true, variesByScenario: false },
      { key: "lowlights", label: "Lowlights", type: "string[]", required: true, variesByScenario: false },
      { key: "upcomingPlans", label: "Upcoming Plans", type: "string[]", required: true, variesByScenario: false },
    ],
  },
];

export function getBuiltinEventType(key: string): EventTypeDef | undefined {
  return BUILTIN_EVENT_TYPES.find((t) => t.key === key);
}
