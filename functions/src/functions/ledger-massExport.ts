import { onCall } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { query } from "../lib/dataconnect-admin";
import { ENUM_TO_LEDGER_TYPE, ENUM_TO_SCENARIO, type LedgerEntryTypeEnum, type ScenarioEnum } from "../lib/enumMap";

// Reshapes the full ledger back into scenario-tagged JSON, fixing the legacy single-file
// ambiguity going forward by always including an explicit `scenario` field on every record
// (plan §3) — the round-trip target for ledger-massImportDiff/-Commit.

interface LedgerEntryRow {
  id: string;
  companyName: string;
  scenario: ScenarioEnum;
  type: LedgerEntryTypeEnum;
  eventDate: string;
  sourceDocument: string | null;
}

export const ledgerMassExport = onCall<Record<string, never>, Promise<{ records: Record<string, unknown>[] }>>(
  async (request) => {
    await requireAdmin(request);

    const entries = await query<LedgerEntryRow>(
      `SELECT le.id, c.name AS "companyName", le.scenario, le.type,
              le."event_date" AS "eventDate", le."source_document" AS "sourceDocument"
       FROM "ledger_entry" le
       JOIN "company" c ON c.id = le."company_id"
       ORDER BY le."event_date" ASC`
    );

    const records: Record<string, unknown>[] = [];
    for (const entry of entries) {
      const base: Record<string, unknown> = {
        date: entry.eventDate,
        company: entry.companyName,
        scenario: entry.scenario.toLowerCase(),
        type: ENUM_TO_LEDGER_TYPE[entry.type] ?? entry.type,
      };
      if (entry.sourceDocument) base.doc_link = entry.sourceDocument;

      const detail = await fetchDetailForEntry(entry.id, entry.type);
      records.push({ ...base, ...detail });
    }

    return { records };
  }
);

async function fetchDetailForEntry(
  ledgerEntryId: string,
  type: LedgerEntryTypeEnum
): Promise<Record<string, unknown>> {
  switch (type) {
    case "PARTICIPATING_PRICED_ROUND": {
      const rows = await query<Record<string, unknown>>(
        `SELECT "company_url", "doc_link", "asv_total",
                "round_name", "price_per_share", "post_money_valuation"
         FROM "priced_round_detail" WHERE "ledger_entry_id" = $1`,
        [ledgerEntryId]
      );
      const allocations = await fetchAllocations(ledgerEntryId);
      return { ...(rows[0] ?? {}), allocations };
    }
    case "PARTICIPATING_SAFE_ROUND": {
      const rows = await query<Record<string, unknown>>(
        `SELECT "company_url", "doc_link", "asv_total",
                "post_money_val_cap", discount, notes
         FROM "safe_round_detail" WHERE "ledger_entry_id" = $1`,
        [ledgerEntryId]
      );
      const allocations = await fetchAllocations(ledgerEntryId);
      return { ...(rows[0] ?? {}), allocations };
    }
    case "NON_PARTICIPATING_ROUND": {
      const rows = await query<Record<string, unknown>>(
        `SELECT "round_name", "new_price_per_share",
                "new_post_money_valuation", "doc_link", notes
         FROM "non_participating_round_detail" WHERE "ledger_entry_id" = $1`,
        [ledgerEntryId]
      );
      return rows[0] ?? {};
    }
    case "EXIT_EVENT": {
      const rows = await query<Record<string, unknown>>(
        `SELECT "exit_type", "total_exit_value",
                "asv_total_payout", "doc_link"
         FROM "exit_event_detail" WHERE "ledger_entry_id" = $1`,
        [ledgerEntryId]
      );
      const memberPayouts = await fetchMemberValuations(ledgerEntryId);
      return { ...(rows[0] ?? {}), member_payouts: memberPayouts };
    }
    case "TRANSACTION_VALUATION_CHANGE":
    case "INTERNAL_VALUATION_ASSESSMENT": {
      const rows = await query<Record<string, unknown>>(
        `SELECT "driving_event_date", "asv_total_fair_market_value",
                "implied_enterprise_value", "assessment_rationale"
         FROM "valuation_assessment_detail" WHERE "ledger_entry_id" = $1`,
        [ledgerEntryId]
      );
      const memberValuations = await fetchMemberValuations(ledgerEntryId);
      return { ...(rows[0] ?? {}), member_valuations: memberValuations };
    }
    case "COMPLIANCE_FLAG_CHANGE": {
      const rows = await query<Record<string, unknown>>(
        `SELECT "flagged_date", reason, "audit_type", "compliance_officer_notes"
         FROM "compliance_flag_detail" WHERE "ledger_entry_id" = $1`,
        [ledgerEntryId]
      );
      return { compliance_status: { status: "Non-Halal", ...(rows[0] ?? {}) } };
    }
    case "COMPANY_UPDATE": {
      const rows = await query<Record<string, unknown>>(
        `SELECT health, trajectory, highlights, lowlights, "upcoming_plans"
         FROM "company_update_detail" WHERE "ledger_entry_id" = $1`,
        [ledgerEntryId]
      );
      const row = rows[0] ?? {};
      return {
        health: row.health,
        trajectory: row.trajectory,
        summary: { highlights: row.highlights, lowlights: row.lowlights, upcoming_plans: row.upcoming_plans },
      };
    }
    default:
      return {};
  }
}

async function fetchAllocations(ledgerEntryId: string): Promise<Record<string, number>> {
  const rows = await query<{ memberId: string; amount: number }>(
    `SELECT "member_id" AS "memberId", amount FROM "allocation" WHERE "ledger_entry_id" = $1`,
    [ledgerEntryId]
  );
  return Object.fromEntries(rows.map((r) => [r.memberId, r.amount]));
}

async function fetchMemberValuations(ledgerEntryId: string): Promise<Record<string, number>> {
  const rows = await query<{ memberId: string; value: number }>(
    `SELECT "member_id" AS "memberId", value FROM "member_valuation" WHERE "ledger_entry_id" = $1`,
    [ledgerEntryId]
  );
  return Object.fromEntries(rows.map((r) => [r.memberId, r.value]));
}
