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
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO "ledger_entry"
       ("company_id", scenario, type, "event_date", "source_document", "created_by_id", "needs_review")
     VALUES ($1, $2, $3, $4, $5, $6, $7)
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
  docLink: string;
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
    [ledgerEntryId, d.roundName, d.newPricePerShare, d.newPostMoneyValuation, d.docLink, d.notes ?? null]
  );
}

export interface ExitEventDetailInput {
  exitType: string;
  totalExitValue: number;
  asvTotalPayout: number;
  docLink: string;
}

export async function insertExitEventDetail(
  client: PoolClient,
  ledgerEntryId: string,
  d: ExitEventDetailInput
): Promise<void> {
  await client.query(
    `INSERT INTO "exit_event_detail" ("ledger_entry_id", "exit_type", "total_exit_value", "asv_total_payout", "doc_link")
     VALUES ($1, $2, $3, $4, $5)`,
    [ledgerEntryId, d.exitType, d.totalExitValue, d.asvTotalPayout, d.docLink]
  );
}

export interface ValuationAssessmentDetailInput {
  drivingEventDate: string;
  asvTotalFairMarketValue: number;
  impliedEnterpriseValue?: number;
  assessmentRationale?: string;
}

export async function insertValuationAssessmentDetail(
  client: PoolClient,
  ledgerEntryId: string,
  d: ValuationAssessmentDetailInput
): Promise<void> {
  await client.query(
    `INSERT INTO "valuation_assessment_detail"
       ("ledger_entry_id", "driving_event_date", "asv_total_fair_market_value", "implied_enterprise_value", "assessment_rationale")
     VALUES ($1, $2, $3, $4, $5)`,
    [ledgerEntryId, d.drivingEventDate, d.asvTotalFairMarketValue, d.impliedEnterpriseValue ?? null, d.assessmentRationale ?? null]
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
}

export async function insertCompanyUpdateDetail(
  client: PoolClient,
  ledgerEntryId: string,
  d: CompanyUpdateDetailInput
): Promise<void> {
  await client.query(
    `INSERT INTO "company_update_detail" ("ledger_entry_id", health, trajectory, highlights, lowlights, "upcoming_plans")
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [ledgerEntryId, d.health, d.trajectory, d.highlights, d.lowlights, d.upcomingPlans]
  );
}

// Also updates Company.name -> id resolution cache callers rely on; company must already exist.
export async function findOrCreateCompanyId(
  client: PoolClient,
  name: string,
  sector?: string
): Promise<string> {
  const existing = await client.query<{ id: string }>(`SELECT id FROM "company" WHERE name = $1`, [name]);
  if (existing.rows.length > 0) return existing.rows[0].id;

  const inserted = await client.query<{ id: string }>(
    `INSERT INTO "company" (name, sector, status) VALUES ($1, $2, 'ACTIVE') RETURNING id`,
    [name, sector ?? null]
  );
  return inserted.rows[0].id;
}
