import { query, withTransaction } from "./dataconnect-admin";
import type { PoolClient } from "pg";

// MOIC/unrealized/realized/health-mix/sector-breakdown math lives in exactly one place —
// never in a Data Connect resolver, never duplicated client-side (plan §3). Dashboards read
// RollupCache, a plain queryable table, with a 30s revalidate — they never compute this live.
//
// Table/column names below are Data Connect's generated Postgres identifiers (snake_case),
// not the GraphQL field names from schema.gql — see the note in ledgerWriteBuilders.ts.

interface LedgerEntryRow {
  id: string;
  type: string;
  eventDate: string;
}

export interface CompanyRollup {
  companyId: string | null; // null represents the single portfolio-level row for this scenario
  scenario: string;
  moic: number;
  unrealizedValue: number;
  realizedValue: number;
}

// Investment-round entries are always identical across scenarios (FR-11); valuation/health
// entries may diverge — this function computes one scenario's numbers from that scenario's rows.
export async function computeCompanyRollup(companyId: string, scenario: string): Promise<CompanyRollup> {
  const entries = await query<LedgerEntryRow>(
    `SELECT id, type, "event_date" AS "eventDate" FROM "ledger_entry" WHERE "company_id" = $1 AND scenario = $2`,
    [companyId, scenario]
  );

  const investedTotals = await query<{ total: string }>(
    `SELECT COALESCE(SUM(a.amount), 0) AS total
     FROM "allocation" a
     JOIN "ledger_entry" le ON le.id = a."ledger_entry_id"
     WHERE le."company_id" = $1 AND le.scenario = $2
       AND le.type IN ('PARTICIPATING_PRICED_ROUND', 'PARTICIPATING_SAFE_ROUND', 'NON_PARTICIPATING_ROUND')`,
    [companyId, scenario]
  );
  const invested = Number(investedTotals[0]?.total ?? 0);

  const realizedTotals = await query<{ total: string }>(
    `SELECT COALESCE(SUM(ex."asv_total_payout"), 0) AS total
     FROM "exit_event_detail" ex
     JOIN "ledger_entry" le ON le.id = ex."ledger_entry_id"
     WHERE le."company_id" = $1 AND le.scenario = $2`,
    [companyId, scenario]
  );
  const realizedValue = Number(realizedTotals[0]?.total ?? 0);

  const latestValuation = await query<{ total: string }>(
    `SELECT va."asv_total_fair_market_value" AS total
     FROM "valuation_assessment_detail" va
     JOIN "ledger_entry" le ON le.id = va."ledger_entry_id"
     WHERE le."company_id" = $1 AND le.scenario = $2
     ORDER BY le."event_date" DESC
     LIMIT 1`,
    [companyId, scenario]
  );
  const hasExited = entries.some((e) => e.type === "EXIT_EVENT");
  const unrealizedValue = hasExited ? 0 : Number(latestValuation[0]?.total ?? invested);

  const moic = invested > 0 ? (realizedValue + unrealizedValue) / invested : 0;

  return { companyId, scenario, moic, unrealizedValue, realizedValue };
}

// RollupCache's real key is the non-null `company_key` (Company.id as text, or the literal
// "PORTFOLIO") because @table key fields can't be nullable, but `company_id` itself must stay
// nullable to represent the single portfolio-level row per scenario (plan §2/schema.gql).
async function upsertRollupCache(client: PoolClient, rollup: CompanyRollup): Promise<void> {
  const companyKey = rollup.companyId ?? "PORTFOLIO";
  await client.query(
    `INSERT INTO "rollup_cache" ("company_key", "company_id", scenario, moic, "unrealized_value", "realized_value", "computed_at")
     VALUES ($1, $2, $3, $4, $5, $6, now())
     ON CONFLICT ("company_key", scenario)
     DO UPDATE SET moic = $4, "unrealized_value" = $5, "realized_value" = $6, "computed_at" = now()`,
    [companyKey, rollup.companyId, rollup.scenario, rollup.moic, rollup.unrealizedValue, rollup.realizedValue]
  );
}

const SCENARIOS = ["OPTIMISTIC", "BALANCED", "CONSERVATIVE"];

// Called synchronously by every ledger-write Cloud Function after its transaction commits.
export async function recomputeRollups(companyId: string): Promise<void> {
  await withTransaction(async (client) => {
    for (const scenario of SCENARIOS) {
      const rollup = await computeCompanyRollup(companyId, scenario);
      await upsertRollupCache(client, rollup);
    }
  });
}

// The single portfolio-level row per scenario — sums every company's unrealized/realized
// values rather than re-deriving from raw ledger rows, so those two agree with what the
// per-company tiles show. `invested`, though, is summed directly from allocation rows (same
// query shape as computeCompanyRollup's own, just without the company filter) rather than
// reverse-derived as (unrealized+realized)/moic — that reversal is undefined at moic=0, and a
// total write-off (moic legitimately 0, e.g. SafKan's real $130K round that exited for $0) is
// not an edge case to special-case away to $0 invested; it's real capital that must still
// count in the denominator, or the portfolio MOIC comes out inflated (verified: was reading
// 1.01x while the dashboard's own totals implied a loss — invested $4.8M > unrealized $4.6M).
export async function computePortfolioRollup(scenario: string): Promise<CompanyRollup> {
  const totals = await query<{ unrealizedValue: string; realizedValue: string }>(
    `SELECT
       COALESCE(SUM(rc."unrealized_value"), 0) AS "unrealizedValue",
       COALESCE(SUM(rc."realized_value"), 0) AS "realizedValue"
     FROM "rollup_cache" rc
     WHERE rc.scenario = $1 AND rc."company_id" IS NOT NULL`,
    [scenario]
  );
  const row = totals[0];
  const unrealizedValue = Number(row?.unrealizedValue ?? 0);
  const realizedValue = Number(row?.realizedValue ?? 0);

  const investedTotals = await query<{ total: string }>(
    `SELECT COALESCE(SUM(a.amount), 0) AS total
     FROM "allocation" a
     JOIN "ledger_entry" le ON le.id = a."ledger_entry_id"
     WHERE le.scenario = $1
       AND le.type IN ('PARTICIPATING_PRICED_ROUND', 'PARTICIPATING_SAFE_ROUND', 'NON_PARTICIPATING_ROUND')`,
    [scenario]
  );
  const invested = Number(investedTotals[0]?.total ?? 0);
  const moic = invested > 0 ? (realizedValue + unrealizedValue) / invested : 0;

  return { companyId: null, scenario, moic, unrealizedValue, realizedValue };
}

// Cloud Scheduler safety net (~15 min): recomputes everything from scratch and checks the
// "3 scenario rows for one investment-round entry must be identical" invariant, logging a
// warning on divergence rather than enforcing it as a DB trigger (plan §2).
export async function recomputeAllRollupsAndCheckInvariants(): Promise<{ warnings: string[] }> {
  const warnings: string[] = [];
  const companies = await query<{ id: string }>(`SELECT id FROM "company"`);

  await withTransaction(async (client) => {
    for (const { id: companyId } of companies) {
      for (const scenario of SCENARIOS) {
        const rollup = await computeCompanyRollup(companyId, scenario);
        await upsertRollupCache(client, rollup);
      }
    }
  });

  // Deliberately a second, separate transaction: computePortfolioRollup reads through the
  // standalone `query()` connection (a different connection from `client` above), which per
  // Postgres isolation can't see rows written by a still-open transaction on another
  // connection — computing it inside the same transaction as the per-company upserts summed
  // over nothing every time, landing the portfolio row on 0/0/0 (confirmed empirically after
  // the production migration). Committing the per-company rows first makes them visible here.
  await withTransaction(async (client) => {
    for (const scenario of SCENARIOS) {
      const portfolioRollup = await computePortfolioRollup(scenario);
      await upsertRollupCache(client, portfolioRollup);
    }
  });

  const divergent = await query<{ eventDate: string; companyId: string; distinctAmounts: string }>(
    `SELECT le."event_date" AS "eventDate", le."company_id" AS "companyId", COUNT(DISTINCT a.amount) AS "distinctAmounts"
     FROM "ledger_entry" le
     JOIN "allocation" a ON a."ledger_entry_id" = le.id
     WHERE le.type IN ('PARTICIPATING_PRICED_ROUND', 'PARTICIPATING_SAFE_ROUND', 'NON_PARTICIPATING_ROUND')
     GROUP BY le."event_date", le."company_id", a."member_id"
     HAVING COUNT(DISTINCT a.amount) > 1`
  );
  for (const row of divergent) {
    warnings.push(
      `Investment-round amounts diverge across scenarios for company ${row.companyId} on ${row.eventDate}`
    );
  }

  return { warnings };
}
