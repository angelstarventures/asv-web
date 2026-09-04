import type { PoolClient } from "pg";
import type { LedgerEntryTypeEnum, ScenarioEnum } from "./enumMap";

// Shared by every live ledger write path (ledger-create*.ts) AND
// functions/scripts/migrate-legacy-data.ts, so migrated rows are structurally identical to
// admin-UI-entered ones (plan §5). Table/column names here are Data Connect's generated
// Postgres identifiers, NOT the GraphQL field names from schema.gql — Data Connect converts
// PascalCase types to snake_case singular tables (LedgerEntry -> ledger_entry) and camelCase
// fields to snake_case columns (companyId -> company_id, ledgerEntry -> ledger_entry_id),
// confirmed against the actual `firebase dataconnect:sql:migrate` generated DDL.

export interface LedgerEntryInput {
  companyId: string;
  scenario: ScenarioEnum;
  type: LedgerEntryTypeEnum;
  eventDate: string; // YYYY-MM-DD
  sourceDocument?: string;
  createdBy: string; // Member.id
  needsReview?: boolean;
}

export async function insertLedgerEntry(client: PoolClient, input: LedgerEntryInput): Promise<string> {
  // created_at has no real Postgres-level default — schema.gql's @default(expr:
  // "request.time") is a Data Connect API-layer default only (unlike @default(expr:
  // "uuidV4()"), which does compile to a real column default); raw `pg` inserts must set it
  // explicitly. Confirmed by inspecting information_schema.columns against the live DB.
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO "ledger_entry"
       ("company_id", scenario, type, "event_date", "source_document", "created_by_id", "needs_review", "created_at")
     VALUES ($1, $2, $3, $4, $5, $6, $7, now())
     RETURNING id`,
    [
      input.companyId,
      input.scenario,
      input.type,
      input.eventDate,
      input.sourceDocument ?? null,
      input.createdBy,
      input.needsReview ?? false,
    ]
  );
  return rows[0].id;
}

export async function insertAllocations(
  client: PoolClient,
  ledgerEntryId: string,
  allocations: Record<string, number>
): Promise<void> {
  for (const [memberId, amount] of Object.entries(allocations)) {
    await client.query(
      `INSERT INTO "allocation" ("ledger_entry_id", "member_id", amount) VALUES ($1, $2, $3)`,
      [ledgerEntryId, memberId, amount]
    );
  }
}

export async function insertMemberValuations(
  client: PoolClient,
  ledgerEntryId: string,
  valuations: Record<string, number>
): Promise<void> {
  for (const [memberId, value] of Object.entries(valuations)) {
    await client.query(
      `INSERT INTO "member_valuation" ("ledger_entry_id", "member_id", value) VALUES ($1, $2, $3)`,
      [ledgerEntryId, memberId, value]
    );
  }
}

export interface PricedRoundDetailInput {
  companyUrl?: string;
  docLink?: string;
  asvTotal: number;
  roundName: string;
  pricePerShare: number;
  postMoneyValuation: number;
}

export async function insertPricedRoundDetail(
  client: PoolClient,
  ledgerEntryId: string,
  d: PricedRoundDetailInput
): Promise<void> {
  await client.query(
    `INSERT INTO "priced_round_detail"
       ("ledger_entry_id", "company_url", "doc_link", "asv_total", "round_name", "price_per_share", "post_money_valuation")
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [ledgerEntryId, d.companyUrl ?? null, d.docLink ?? null, d.asvTotal, d.roundName, d.pricePerShare, d.postMoneyValuation]
  );
}

export interface SafeRoundDetailInput {
  companyUrl?: string;
  docLink?: string;
  asvTotal: number;
  postMoneyValCap: number;
  discount: number;
  warrantShares?: number;
  warrantShareClass?: string;
  warrantExercisePrice?: number;
  warrantExpirationYears?: number;
  warrantVestingTerms?: string;
  notes?: string;
}

export async function insertSafeRoundDetail(
  client: PoolClient,
  ledgerEntryId: string,
  d: SafeRoundDetailInput
): Promise<void> {
  await client.query(
    `INSERT INTO "safe_round_detail"
       ("ledger_entry_id", "company_url", "doc_link", "asv_total", "post_money_val_cap", discount,
        "warrant_shares", "warrant_share_class", "warrant_exercise_price", "warrant_expiration_years", "warrant_vesting_terms", notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      ledgerEntryId,
      d.companyUrl ?? null,
      d.docLink ?? null,
      d.asvTotal,
      d.postMoneyValCap,
      d.discount,
      d.warrantShares ?? null,
      d.warrantShareClass ?? null,
      d.warrantExercisePrice ?? null,
      d.warrantExpirationYears ?? null,
      d.warrantVestingTerms ?? null,
      d.notes ?? null,
    ]
  );
}

export interface NonParticipatingRoundDetailInput {
  roundName: string;
  newPricePerShare: number;
  newPostMoneyValuation: number;
  docLink?: string;
  notes?: string;
}

export async function insertNonParticipatingRoundDetail(
  client: PoolClient,
  ledgerEntryId: string,
  d: NonParticipatingRoundDetailInput
): Promise<void> {
  await client.query(
    `INSERT INTO "non_participating_round_detail"
       ("ledger_entry_id", "round_name", "new_price_per_share", "new_post_money_valuation", "doc_link", notes)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [ledgerEntryId, d.roundName, d.newPricePerShare, d.newPostMoneyValuation, d.docLink ?? null, d.notes ?? null]
  );
}

export interface ExitEventDetailInput {
  exitType: string;
  totalExitValue: number;
  asvTotalPayout: number;
  docLink?: string;
}

export async function insertExitEventDetail(
  client: PoolClient,
  ledgerEntryId: string,
  d: ExitEventDetailInput
): Promise<void> {
  await client.query(
    `INSERT INTO "exit_event_detail" ("ledger_entry_id", "exit_type", "total_exit_value", "asv_total_payout", "doc_link")
     VALUES ($1, $2, $3, $4, $5)`,
    [ledgerEntryId, d.exitType, d.totalExitValue, d.asvTotalPayout, d.docLink ?? null]
  );
}

export interface ValuationAssessmentDetailInput {
  drivingEventDate: string;
  asvTotalFairMarketValue: number;
  impliedEnterpriseValue?: number;
  assessmentRationale?: string;
  // Only ever set for INTERNAL_VALUATION_ASSESSMENT rows — always null for
  // TRANSACTION_VALUATION_CHANGE, which this table is also shared by.
  viewpointScenario?: ScenarioEnum;
  viewpointMarketResearchGrounding?: string;
  viewpointValuationImpactSummary?: string;
}

export async function insertValuationAssessmentDetail(
  client: PoolClient,
  ledgerEntryId: string,
  d: ValuationAssessmentDetailInput
): Promise<void> {
  await client.query(
    `INSERT INTO "valuation_assessment_detail"
       ("ledger_entry_id", "driving_event_date", "asv_total_fair_market_value", "implied_enterprise_value", "assessment_rationale",
        "viewpoint_scenario", "viewpoint_market_research_grounding", "viewpoint_valuation_impact_summary")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      ledgerEntryId,
      d.drivingEventDate,
      d.asvTotalFairMarketValue,
      d.impliedEnterpriseValue ?? null,
      d.assessmentRationale ?? null,
      d.viewpointScenario ?? null,
      d.viewpointMarketResearchGrounding ?? null,
      d.viewpointValuationImpactSummary ?? null,
    ]
  );
}

export interface ComplianceFlagDetailInput {
  flaggedDate: string;
  reason: string;
  auditType: string;
  complianceOfficerNotes: string;
}

export async function insertComplianceFlagDetail(
  client: PoolClient,
  ledgerEntryId: string,
  d: ComplianceFlagDetailInput
): Promise<void> {
  await client.query(
    `INSERT INTO "compliance_flag_detail" ("ledger_entry_id", status, "flagged_date", reason, "audit_type", "compliance_officer_notes")
     VALUES ($1, 'NON_HALAL', $2, $3, $4, $5)`,
    [ledgerEntryId, d.flaggedDate, d.reason, d.auditType, d.complianceOfficerNotes]
  );
}

export interface CompanyUpdateDetailInput {
  health: string;
  trajectory: string;
  highlights: string[];
  lowlights: string[];
  upcomingPlans: string[];
  viewpointScenario: ScenarioEnum;
  viewpointMarketResearchGrounding: string;
  viewpointValuationImpactSummary: string;
  viewpointWebSources?: string[];
}

export async function insertCompanyUpdateDetail(
  client: PoolClient,
  ledgerEntryId: string,
  d: CompanyUpdateDetailInput
): Promise<void> {
  await client.query(
    `INSERT INTO "company_update_detail"
       ("ledger_entry_id", health, trajectory, highlights, lowlights, "upcoming_plans",
        "viewpoint_scenario", "viewpoint_market_research_grounding", "viewpoint_valuation_impact_summary", "viewpoint_web_sources")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      ledgerEntryId,
      d.health,
      d.trajectory,
      d.highlights,
      d.lowlights,
      d.upcomingPlans,
      d.viewpointScenario,
      d.viewpointMarketResearchGrounding,
      d.viewpointValuationImpactSummary,
      d.viewpointWebSources ?? null,
    ]
  );
}

// Also updates Company.name -> id resolution cache callers rely on; company must already exist.
export async function findOrCreateCompanyId(
  client: PoolClient,
  name: string,
  sector?: string,
  logoUrl?: string,
  website?: string
): Promise<string> {
  const existing = await client.query<{ id: string }>(`SELECT id FROM "company" WHERE name = $1`, [name]);
  if (existing.rows.length > 0) return existing.rows[0].id;

  // sector/logoUrl/website are set once, from whichever record first creates the company row
  // (the "first investment record" per the ledger-record schema) — never backfilled on a later
  // record for the same already-existing company, same as sector's existing behavior.
  const inserted = await client.query<{ id: string }>(
    `INSERT INTO "company" (name, sector, logo_url, website, status) VALUES ($1, $2, $3, $4, 'ACTIVE') RETURNING id`,
    [name, sector ?? null, logoUrl ?? null, website ?? null]
  );
  return inserted.rows[0].id;
}

// SHUTDOWN/DISSOLUTION means the company folded — hide it from the (public) portfolio grid
// via status, same signal the real exit_event_detail row already carries. ACQUISITION/IPO/
// MERGER are successful exits, distinct from a folded company, so they get EXITED instead.
export async function updateCompanyStatusForExit(client: PoolClient, companyId: string, exitType: string): Promise<void> {
  const status = exitType === "SHUTDOWN" || exitType === "DISSOLUTION" ? "WRITTEN_OFF" : "EXITED";
  await client.query(`UPDATE "company" SET status = $1 WHERE id = $2`, [status, companyId]);
}
