import { query } from "./dataconnect-admin";
import {
  ENUM_TO_LEDGER_TYPE,
  ENUM_TO_HEALTH,
  ENUM_TO_TRAJECTORY,
  ENUM_TO_EXIT_TYPE,
  ENUM_TO_AUDIT_TYPE,
  type LedgerEntryTypeEnum,
  type ScenarioEnum,
} from "./enumMap";

// Shared by ledger-massExport.ts (admin export/manage-table source) and ai-portfolioQuery.ts
// (AI chat context) — reshapes DB rows back into asv_master_portfolio_schema.json's exact
// per-type shape. Every enum column here is stored as the uppercase DB value (GREEN,
// ACQUISITION, MANUAL_OVERRIDE, ...) and must be reverse-mapped back to the schema's title-case
// strings (Green, Acquisition, Manual_Override, ...), or every re-imported record with an enum
// field fails AJV validation (confirmed empirically re-importing a fresh export).

export interface LedgerEntryRow {
  id: string;
  companyName: string;
  sector: string | null;
  logoUrl: string | null;
  scenario: ScenarioEnum;
  type: LedgerEntryTypeEnum;
  eventDate: string;
  sourceDocument: string | null;
}

export function buildBaseRecord(entry: LedgerEntryRow): Record<string, unknown> {
  // `id` is extra metadata, not part of the legacy schema — harmless on re-import (the schema
  // has no additionalProperties:false, and applyLedgerRecord ignores unknown keys), and it's
  // what the "manage the entire ledger" admin table uses to edit/delete a specific row.
  const base: Record<string, unknown> = {
    id: entry.id,
    date: entry.eventDate,
    company: entry.companyName,
    scenario: entry.scenario.toLowerCase(),
    type: ENUM_TO_LEDGER_TYPE[entry.type] ?? entry.type,
  };
  if (entry.sourceDocument) base.doc_link = entry.sourceDocument;
  return base;
}

// `notes` (and any other optional string column) is NULL, not absent, when unset — the schema
// allows omitting it but not a null value ("notes must be string"), so it must be dropped from
// the record entirely rather than passed through as-is.
function omitNullish<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null && v !== undefined)) as Partial<T>;
}

// `memberScopeId`, when provided, restricts the allocations/member_valuations/member_payouts
// dict to just that one member's own entry (or `{}` if they have none) — never another
// member's amounts. Used by fetchOwnLedgerRecords for the AI chat's "mine" scope; omitted
// (fetches every member's row) for the admin-only mass export/manage-table/full-detail chat.
export async function fetchDetailForEntry(
  ledgerEntryId: string,
  type: LedgerEntryTypeEnum,
  sector: string | null,
  memberScopeId?: string,
  logoUrl?: string | null
): Promise<Record<string, unknown>> {
  switch (type) {
    case "PARTICIPATING_PRICED_ROUND": {
      const rows = await query<Record<string, unknown>>(
        `SELECT "company_url", "doc_link", "asv_total",
                "round_name", "price_per_share", "post_money_valuation"
         FROM "priced_round_detail" WHERE "ledger_entry_id" = $1`,
        [ledgerEntryId]
      );
      const allocations = await fetchAllocations(ledgerEntryId, memberScopeId);
      // sector/logo_url are required/optional-but-schema-known for this type but live on
      // Company, not this detail table — omitted here entirely before, which failed
      // re-import validation for sector.
      return { sector, ...(logoUrl ? { logo_url: logoUrl } : {}), ...(rows[0] ?? {}), allocations };
    }
    case "PARTICIPATING_SAFE_ROUND": {
      const rows = await query<Record<string, unknown>>(
        `SELECT "company_url", "doc_link", "asv_total", "post_money_val_cap", discount, notes,
                "warrant_shares", "warrant_share_class", "warrant_exercise_price",
                "warrant_expiration_years", "warrant_vesting_terms"
         FROM "safe_round_detail" WHERE "ledger_entry_id" = $1`,
        [ledgerEntryId]
      );
      const row = (rows[0] ?? {}) as Record<string, unknown>;
      const {
        warrant_shares: shares,
        warrant_share_class: shareClass,
        warrant_exercise_price: exercisePrice,
        warrant_expiration_years: expirationYears,
        warrant_vesting_terms: vestingTerms,
        ...rest
      } = row;
      const allocations = await fetchAllocations(ledgerEntryId, memberScopeId);
      const hasWarrants = [shares, shareClass, exercisePrice, expirationYears, vestingTerms].some(
        (v) => v !== null && v !== undefined
      );
      return {
        sector,
        ...(logoUrl ? { logo_url: logoUrl } : {}),
        ...omitNullish(rest),
        allocations,
        ...(hasWarrants && {
          warrants: {
            shares,
            share_class: shareClass,
            exercise_price: exercisePrice,
            expiration_years: expirationYears,
            vesting_terms: vestingTerms,
          },
        }),
      };
    }
    case "NON_PARTICIPATING_ROUND": {
      const rows = await query<Record<string, unknown>>(
        `SELECT "round_name", "new_price_per_share",
                "new_post_money_valuation", "doc_link", notes
         FROM "non_participating_round_detail" WHERE "ledger_entry_id" = $1`,
        [ledgerEntryId]
      );
      return omitNullish(rows[0] ?? {});
    }
    case "EXIT_EVENT": {
      const rows = await query<{ exit_type: string } & Record<string, unknown>>(
        `SELECT "exit_type", "total_exit_value",
                "asv_total_payout", "doc_link"
         FROM "exit_event_detail" WHERE "ledger_entry_id" = $1`,
        [ledgerEntryId]
      );
      const memberPayouts = await fetchMemberValuations(ledgerEntryId, memberScopeId);
      const row = rows[0];
      if (!row) return { member_payouts: memberPayouts };
      return {
        ...row,
        exit_type: ENUM_TO_EXIT_TYPE[row.exit_type as keyof typeof ENUM_TO_EXIT_TYPE] ?? row.exit_type,
        member_payouts: memberPayouts,
      };
    }
    case "TRANSACTION_VALUATION_CHANGE":
    case "INTERNAL_VALUATION_ASSESSMENT": {
      const rows = await query<Record<string, unknown>>(
        `SELECT "driving_event_date"::text AS "driving_event_date", "asv_total_fair_market_value",
                "implied_enterprise_value", "assessment_rationale"
         FROM "valuation_assessment_detail" WHERE "ledger_entry_id" = $1`,
        [ledgerEntryId]
      );
      const memberValuations = await fetchMemberValuations(ledgerEntryId, memberScopeId);
      return { ...omitNullish(rows[0] ?? {}), member_valuations: memberValuations };
    }
    case "COMPLIANCE_FLAG_CHANGE": {
      // audit_type and compliance_officer_notes are TOP-LEVEL fields per the schema —
      // compliance_status only wraps {status, flagged_date, reason}. Nesting all four under
      // compliance_status (the previous shape here) meant a re-imported record was missing
      // top-level audit_type entirely, which applyLedgerRecord/AJV both require.
      const rows = await query<{ audit_type: string } & Record<string, unknown>>(
        `SELECT "flagged_date"::text AS "flagged_date", reason, "audit_type", "compliance_officer_notes"
         FROM "compliance_flag_detail" WHERE "ledger_entry_id" = $1`,
        [ledgerEntryId]
      );
      const row = rows[0];
      if (!row) return {};
      return {
        compliance_status: { status: "Non-Halal", flagged_date: row.flagged_date, reason: row.reason },
        audit_type: ENUM_TO_AUDIT_TYPE[row.audit_type as keyof typeof ENUM_TO_AUDIT_TYPE] ?? row.audit_type,
        compliance_officer_notes: row.compliance_officer_notes,
      };
    }
    case "COMPANY_UPDATE": {
      const rows = await query<{ health: string; trajectory: string } & Record<string, unknown>>(
        `SELECT health, trajectory, highlights, lowlights, "upcoming_plans"
         FROM "company_update_detail" WHERE "ledger_entry_id" = $1`,
        [ledgerEntryId]
      );
      const row = rows[0] ?? { health: undefined, trajectory: undefined };
      return {
        health: ENUM_TO_HEALTH[row.health as keyof typeof ENUM_TO_HEALTH] ?? row.health,
        trajectory: ENUM_TO_TRAJECTORY[row.trajectory as keyof typeof ENUM_TO_TRAJECTORY] ?? row.trajectory,
        summary: { highlights: row.highlights, lowlights: row.lowlights, upcoming_plans: row.upcoming_plans },
      };
    }
    default:
      return {};
  }
}

export async function fetchAllocations(ledgerEntryId: string, memberId?: string): Promise<Record<string, number>> {
  const rows = await query<{ memberId: string; amount: number }>(
    memberId
      ? `SELECT "member_id" AS "memberId", amount FROM "allocation" WHERE "ledger_entry_id" = $1 AND "member_id" = $2`
      : `SELECT "member_id" AS "memberId", amount FROM "allocation" WHERE "ledger_entry_id" = $1`,
    memberId ? [ledgerEntryId, memberId] : [ledgerEntryId]
  );
  return Object.fromEntries(rows.map((r) => [r.memberId, r.amount]));
}

export async function fetchMemberValuations(
  ledgerEntryId: string,
  memberId?: string
): Promise<Record<string, number>> {
  const rows = await query<{ memberId: string; value: number }>(
    memberId
      ? `SELECT "member_id" AS "memberId", value FROM "member_valuation" WHERE "ledger_entry_id" = $1 AND "member_id" = $2`
      : `SELECT "member_id" AS "memberId", value FROM "member_valuation" WHERE "ledger_entry_id" = $1`,
    memberId ? [ledgerEntryId, memberId] : [ledgerEntryId]
  );
  return Object.fromEntries(rows.map((r) => [r.memberId, r.value]));
}

// Every ledger entry, full per-type detail, every member's amounts — the admin
// export/manage-table source, and (deliberately, per the user's explicit direction) the AI
// chat's admin-scope data source too. `scenario`, when given, restricts to just that one
// scenario's rows (the admin export page's per-scenario download buttons); omitted, every
// scenario's rows come back combined (the default "combined ledger" export).
export async function fetchAllLedgerRecords(scenario?: ScenarioEnum): Promise<Record<string, unknown>[]> {
  const entries = await query<LedgerEntryRow>(
    // ::text on the date column — `pg` returns Postgres `date` as a JS Date, and Cloud
    // Functions v2's onCall response marshalling does not preserve it as an ISO string
    // (confirmed empirically: raw HTTP callers see `{}` where the date should be).
    `SELECT le.id, c.name AS "companyName", c.sector, c."logo_url" AS "logoUrl", le.scenario, le.type,
            le."event_date"::text AS "eventDate", le."source_document" AS "sourceDocument"
     FROM "ledger_entry" le
     JOIN "company" c ON c.id = le."company_id"
     ${scenario ? `WHERE le.scenario = $1` : ""}
     ORDER BY le."event_date" ASC`,
    scenario ? [scenario] : []
  );

  // Per-entry detail fetches are independent — run them concurrently (the pg pool just queues
  // beyond its own connection limit) rather than one at a time, which is the difference between
  // this comfortably finishing and this alone eating most of a request's timeout budget for a
  // ~700-entry ledger.
  return Promise.all(
    entries.map(async (entry) => ({
      ...buildBaseRecord(entry),
      ...(await fetchDetailForEntry(entry.id, entry.type, entry.sector, undefined, entry.logoUrl)),
    }))
  );
}

// A member's own full-detail ledger records — held companies only ("invested in" means "has an
// allocation," never a company merely valuated/updated, matching my-full-ledger's definition —
// see app/api/ledger/my-full-ledger/route.ts on the Next.js side), across every scenario, with
// every per-member dict scoped down to just this member's own amount. Used by the AI chat's
// "mine" scope for both regular members and admins asking about their own holdings.
export async function fetchOwnLedgerRecords(memberId: string): Promise<Record<string, unknown>[]> {
  const heldCompanyRows = await query<{ companyId: string }>(
    `SELECT DISTINCT le."company_id" AS "companyId"
     FROM "allocation" a JOIN "ledger_entry" le ON le.id = a."ledger_entry_id"
     WHERE a."member_id" = $1`,
    [memberId]
  );
  const companyIds = heldCompanyRows.map((r) => r.companyId);
  if (companyIds.length === 0) return [];

  const entries = await query<LedgerEntryRow>(
    `SELECT le.id, c.name AS "companyName", c.sector, c."logo_url" AS "logoUrl", le.scenario, le.type,
            le."event_date"::text AS "eventDate", le."source_document" AS "sourceDocument"
     FROM "ledger_entry" le
     JOIN "company" c ON c.id = le."company_id"
     WHERE le."company_id" = ANY($1)
     ORDER BY le."event_date" ASC`,
    [companyIds]
  );

  return Promise.all(
    entries.map(async (entry) => ({
      ...buildBaseRecord(entry),
      ...(await fetchDetailForEntry(entry.id, entry.type, entry.sector, memberId, entry.logoUrl)),
    }))
  );
}
