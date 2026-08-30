import type { PoolClient } from "pg";
import { legacyTypeToEnum, type ScenarioEnum } from "./enumMap";
import {
  insertLedgerEntry,
  insertAllocations,
  insertMemberValuations,
  insertPricedRoundDetail,
  insertSafeRoundDetail,
  insertNonParticipatingRoundDetail,
  insertExitEventDetail,
  insertValuationAssessmentDetail,
  insertComplianceFlagDetail,
  insertCompanyUpdateDetail,
  findOrCreateCompanyId,
} from "./ledgerWriteBuilders";
import { contentHashOf } from "./importDiff";

// The one place a legacy-shaped record (asv_master_portfolio_schema.json shape) becomes DB
// rows. Shared by ledger-massImportCommit AND functions/scripts/migrate-legacy-data.ts, so
// migrated rows are structurally identical to admin-UI-entered ones (plan §5). One record ==
// one scenario's row — the caller decides which scenario this record belongs to and whether
// it should be marked needsReview (the production-migration "identical across scenarios"
// caveat, plan §5).

export interface ApplyRecordOptions {
  scenario: ScenarioEnum;
  createdBy: string; // Member.id, "00000" for migrated rows per plan §5
  needsReview?: boolean;
  companyAliasMap?: Record<string, string>; // normalizes near-duplicate company names
}

export async function applyLedgerRecord(
  client: PoolClient,
  record: Record<string, unknown>,
  opts: ApplyRecordOptions
): Promise<string> {
  const companyName = normalizeCompanyName(String(record.company), opts.companyAliasMap);
  const companyId = await findOrCreateCompanyId(client, companyName, record.sector as string | undefined);

  const type = legacyTypeToEnum(String(record.type));
  const ledgerEntryId = await insertLedgerEntry(client, {
    companyId,
    scenario: opts.scenario,
    type,
    eventDate: String(record.date),
    sourceDocument: (record.doc_link as string) ?? undefined,
    createdBy: opts.createdBy,
    needsReview: opts.needsReview ?? false,
  });

  await insertDetailForType(client, ledgerEntryId, type, record);
  await client.query(
    `INSERT INTO "imported_record_hash" ("ledger_entry_id", "content_hash") VALUES ($1, $2)`,
    [ledgerEntryId, contentHashOf(record)]
  );

  return ledgerEntryId;
}

async function insertDetailForType(
  client: PoolClient,
  ledgerEntryId: string,
  type: ReturnType<typeof legacyTypeToEnum>,
  record: Record<string, unknown>
): Promise<void> {
  switch (type) {
    case "PARTICIPATING_PRICED_ROUND":
      await insertPricedRoundDetail(client, ledgerEntryId, {
        companyUrl: record.company_url as string,
        docLink: record.doc_link as string,
        asvTotal: Number(record.asv_total),
        roundName: String(record.round_name),
        pricePerShare: Number(record.price_per_share),
        postMoneyValuation: Number(record.post_money_valuation),
      });
      await insertAllocations(client, ledgerEntryId, (record.allocations as Record<string, number>) ?? {});
      break;
    case "PARTICIPATING_SAFE_ROUND": {
      const warrants = (record.warrants as Record<string, unknown>) ?? {};
      await insertSafeRoundDetail(client, ledgerEntryId, {
        companyUrl: record.company_url as string,
        docLink: record.doc_link as string,
        asvTotal: Number(record.asv_total),
        postMoneyValCap: Number(record.post_money_val_cap),
        discount: Number(record.discount),
        warrantShares: warrants.shares as number | undefined,
        warrantShareClass: warrants.share_class as string | undefined,
        warrantExercisePrice: warrants.exercise_price as number | undefined,
        warrantExpirationYears: warrants.expiration_years as number | undefined,
        warrantVestingTerms: warrants.vesting_terms as string | undefined,
        notes: record.notes as string | undefined,
      });
      await insertAllocations(client, ledgerEntryId, (record.allocations as Record<string, number>) ?? {});
      break;
    }
    case "NON_PARTICIPATING_ROUND":
      await insertNonParticipatingRoundDetail(client, ledgerEntryId, {
        roundName: String(record.round_name),
        newPricePerShare: Number(record.new_price_per_share),
        newPostMoneyValuation: Number(record.new_post_money_valuation),
        docLink: String(record.doc_link),
        notes: record.notes as string | undefined,
      });
      break;
    case "EXIT_EVENT":
      await insertExitEventDetail(client, ledgerEntryId, {
        exitType: String(record.exit_type).toUpperCase(),
        totalExitValue: Number(record.total_exit_value),
        asvTotalPayout: Number(record.asv_total_payout),
        docLink: String(record.doc_link),
      });
      await insertMemberValuations(client, ledgerEntryId, (record.member_payouts as Record<string, number>) ?? {});
      break;
    case "TRANSACTION_VALUATION_CHANGE":
    case "INTERNAL_VALUATION_ASSESSMENT":
      await insertValuationAssessmentDetail(client, ledgerEntryId, {
        drivingEventDate: String(record.driving_event_date),
        asvTotalFairMarketValue: Number(record.asv_total_fair_market_value),
        impliedEnterpriseValue: record.implied_enterprise_value as number | undefined,
        assessmentRationale: record.assessment_rationale as string | undefined,
      });
      await insertMemberValuations(client, ledgerEntryId, (record.member_valuations as Record<string, number>) ?? {});
      break;
    case "COMPLIANCE_FLAG_CHANGE": {
      const compliance = (record.compliance_status as Record<string, unknown>) ?? {};
      await insertComplianceFlagDetail(client, ledgerEntryId, {
        flaggedDate: String(compliance.flagged_date),
        reason: String(compliance.reason),
        auditType: String(record.audit_type).toUpperCase(),
        complianceOfficerNotes: String(record.compliance_officer_notes),
      });
      break;
    }
    case "COMPANY_UPDATE": {
      const summary = (record.summary as Record<string, unknown>) ?? {};
      await insertCompanyUpdateDetail(client, ledgerEntryId, {
        health: String(record.health).toUpperCase(),
        trajectory: String(record.trajectory).toUpperCase(),
        highlights: (summary.highlights as string[]) ?? [],
        lowlights: (summary.lowlights as string[]) ?? [],
        upcomingPlans: (summary.upcoming_plans as string[]) ?? [],
      });
      break;
    }
  }
}

// Watch for near-duplicates — e.g. "Xcelacore Inc" vs "Xcelacore Inc." (plan §5) — resolved
// via an explicit alias map rather than fuzzy matching, since silent merges on real dollar
// figures are exactly the kind of mistake that must never happen automatically.
function normalizeCompanyName(name: string, aliasMap?: Record<string, string>): string {
  return aliasMap?.[name] ?? name;
}
