import { query, withTransaction } from "./dataconnect-admin";
import type { PoolClient } from "pg";

// MOIC/unrealized/realized/health-mix/sector-breakdown math lives in exactly one place —
// never in a Data Connect resolver, never duplicated client-side (plan §3). Dashboards read
// RollupCache, a plain queryable table, with a 30s revalidate — they never compute this live.

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
    `SELECT id, type, "eventDate" FROM "LedgerEntry" WHERE "companyId" = $1 AND scenario = $2`,
    [companyId, scenario]
  );

  const investedTotals = await query<{ total: string }>(
    `SELECT COALESCE(SUM(a.amount), 0) AS total
     FROM "Allocation" a
     JOIN "LedgerEntry" le ON le.id = a."ledgerEntryId"
     WHERE le."companyId" = $1 AND le.scenario = $2
       AND le.type IN ('PARTICIPATING_PRICED_ROUND', 'PARTICIPATING_SAFE_ROUND', 'NON_PARTICIPATING_ROUND')`,
    [companyId, scenario]
  );
  const invested = Number(investedTotals[0]?.total ?? 0);

  const realizedTotals = await query<{ total: string }>(
    `SELECT COALESCE(SUM(ex."asvTotalPayout"), 0) AS total
     FROM "ExitEventDetail" ex
     JOIN "LedgerEntry" le ON le.id = ex."ledgerEntryId"
     WHERE le."companyId" = $1 AND le.scenario = $2`,
    [companyId, scenario]
  );
  const realizedValue = Number(realizedTotals[0]?.total ?? 0);

  const latestValuation = await query<{ total: string }>(
    `SELECT va."asvTotalFairMarketValue" AS total
     FROM "ValuationAssessmentDetail" va
     JOIN "LedgerEntry" le ON le.id = va."ledgerEntryId"
     WHERE le."companyId" = $1 AND le.scenario = $2
     ORDER BY le."eventDate" DESC
     LIMIT 1`,
    [companyId, scenario]
  );
  const hasExited = entries.some((e) => e.type === "EXIT_EVENT");
  const unrealizedValue = hasExited ? 0 : Number(latestValuation[0]?.total ?? invested);

  const moic = invested > 0 ? (realizedValue + unrealizedValue) / invested : 0;

  return { companyId, scenario, moic, unrealizedValue, realizedValue };
}

// RollupCache's real key is the non-null `companyKey` (Company.id as text, or the literal
// "PORTFOLIO") because @table key fields can't be nullable, but `company` itself must stay
// nullable to represent the single portfolio-level row per scenario (plan §2/schema.gql).
async function upsertRollupCache(client: PoolClient, rollup: CompanyRollup): Promise<void> {
  const companyKey = rollup.companyId ?? "PORTFOLIO";
  await client.query(
    `INSERT INTO "RollupCache" ("companyKey", "companyId", scenario, moic, "unrealizedValue", "realizedValue", "computedAt")
     VALUES ($1, $2, $3, $4, $5, $6, now())
     ON CONFLICT ("companyKey", scenario)
     DO UPDATE SET moic = $4, "unrealizedValue" = $5, "realizedValue" = $6, "computedAt" = now()`,
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

// The single portfolio-level row per scenario — sums every company's numbers rather than
// re-deriving from raw ledger rows, so it always agrees with what the per-company tiles show.
export async function computePortfolioRollup(scenario: string): Promise<CompanyRollup> {
  const totals = await query<{ moic: string; unrealizedValue: string; realizedValue: string; invested: string }>(
    `SELECT
       COALESCE(SUM(rc."unrealizedValue"), 0) AS "unrealizedValue",
       COALESCE(SUM(rc."realizedValue"), 0) AS "realizedValue",
       COALESCE(SUM(
         CASE WHEN rc.moic > 0 THEN (rc."unrealizedValue" + rc."realizedValue") / rc.moic ELSE 0 END
       ), 0) AS invested
     FROM "RollupCache" rc
     WHERE rc.scenario = $1 AND rc."companyId" IS NOT NULL`,
    [scenario]
  );
  const row = totals[0];
  const unrealizedValue = Number(row?.unrealizedValue ?? 0);
  const realizedValue = Number(row?.realizedValue ?? 0);
  const invested = Number(row?.invested ?? 0);
  const moic = invested > 0 ? (realizedValue + unrealizedValue) / invested : 0;

  return { companyId: null, scenario, moic, unrealizedValue, realizedValue };
}

// Cloud Scheduler safety net (~15 min): recomputes everything from scratch and checks the
// "3 scenario rows for one investment-round entry must be identical" invariant, logging a
// warning on divergence rather than enforcing it as a DB trigger (plan §2).
export async function recomputeAllRollupsAndCheckInvariants(): Promise<{ warnings: string[] }> {
  const warnings: string[] = [];
  const companies = await query<{ id: string }>(`SELECT id FROM "Company"`);

  await withTransaction(async (client) => {
    for (const { id: companyId } of companies) {
      for (const scenario of SCENARIOS) {
        const rollup = await computeCompanyRollup(companyId, scenario);
        await upsertRollupCache(client, rollup);
      }
    }
    for (const scenario of SCENARIOS) {
      const portfolioRollup = await computePortfolioRollup(scenario);
      await upsertRollupCache(client, portfolioRollup);
    }
  });

  const divergent = await query<{ eventDate: string; companyId: string; distinctAmounts: string }>(
    `SELECT le."eventDate", le."companyId", COUNT(DISTINCT a.amount) AS "distinctAmounts"
     FROM "LedgerEntry" le
     JOIN "Allocation" a ON a."ledgerEntryId" = le.id
     WHERE le.type IN ('PARTICIPATING_PRICED_ROUND', 'PARTICIPATING_SAFE_ROUND', 'NON_PARTICIPATING_ROUND')
     GROUP BY le."eventDate", le."companyId", a."memberId"
     HAVING COUNT(DISTINCT a.amount) > 1`
  );
  for (const row of divergent) {
    warnings.push(
      `Investment-round amounts diverge across scenarios for company ${row.companyId} on ${row.eventDate}`
    );
  }

  return { warnings };
}
