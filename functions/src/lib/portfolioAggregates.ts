import { query } from "./dataconnect-admin";
import { ENUM_TO_HEALTH, ENUM_TO_TRAJECTORY } from "./enumMap";

// Portfolio-wide aggregate data, no per-member breakdown — the AI chat's "asv" scope for a
// regular (non-admin) member. rollup_cache has no health/trajectory columns; those come from
// the latest CompanyUpdateDetail per (company, scenario), mirroring the dashboard's
// reduceLatestHealth pattern (app/member/dashboard/page.tsx).

interface RollupRow {
  companyId: string;
  companyName: string;
  sector: string | null;
  scenario: string;
  moic: number;
  unrealizedValue: number;
  realizedValue: number;
}

interface HealthRow {
  companyId: string;
  scenario: string;
  health: string;
  trajectory: string;
}

interface PortfolioRollupRow {
  scenario: string;
  moic: number;
  unrealizedValue: number;
  realizedValue: number;
}

export interface AggregateRollups {
  // The pre-computed portfolio-wide row (rollup_cache's company_id IS NULL row) — giving this
  // directly rather than making the model sum/derive it from ~130 per-company rows was the fix
  // for a real observed inaccuracy (the model computed portfolio MOIC itself from raw records
  // and got it meaningfully wrong; LLMs are not reliable at large-scale arithmetic over data
  // embedded in their own context).
  portfolio: Record<string, unknown>[];
  companies: Record<string, unknown>[];
}

export async function fetchAggregateRollups(): Promise<AggregateRollups> {
  const [portfolioRows, rollups, healthRows] = await Promise.all([
    query<PortfolioRollupRow>(
      `SELECT scenario, moic, "unrealized_value" AS "unrealizedValue", "realized_value" AS "realizedValue"
       FROM "rollup_cache"
       WHERE "company_id" IS NULL
       ORDER BY scenario`
    ),
    query<RollupRow>(
      `SELECT rc."company_id" AS "companyId", c.name AS "companyName", c.sector, rc.scenario,
              rc.moic, rc."unrealized_value" AS "unrealizedValue", rc."realized_value" AS "realizedValue"
       FROM "rollup_cache" rc
       JOIN "company" c ON c.id = rc."company_id"
       WHERE rc."company_id" IS NOT NULL
       ORDER BY c.name, rc.scenario`
    ),
    query<HealthRow>(
      `SELECT DISTINCT ON (le."company_id", le.scenario) le."company_id" AS "companyId", le.scenario,
              cud.health, cud.trajectory
       FROM "company_update_detail" cud
       JOIN "ledger_entry" le ON le.id = cud."ledger_entry_id"
       ORDER BY le."company_id", le.scenario, le."event_date" DESC`
    ),
  ]);

  const healthByKey = new Map(healthRows.map((r) => [`${r.companyId}::${r.scenario}`, r]));

  const portfolio = portfolioRows.map((r) => ({
    scenario: r.scenario.toLowerCase(),
    moic: r.moic,
    unrealized_value: r.unrealizedValue,
    realized_value: r.realizedValue,
  }));

  const companies = rollups.map((r) => {
    const health = healthByKey.get(`${r.companyId}::${r.scenario}`);
    return {
      company: r.companyName,
      sector: r.sector,
      scenario: r.scenario.toLowerCase(),
      moic: r.moic,
      unrealized_value: r.unrealizedValue,
      realized_value: r.realizedValue,
      health: health ? (ENUM_TO_HEALTH[health.health as keyof typeof ENUM_TO_HEALTH] ?? health.health) : undefined,
      trajectory: health
        ? ENUM_TO_TRAJECTORY[health.trajectory as keyof typeof ENUM_TO_TRAJECTORY] ?? health.trajectory
        : undefined,
    };
  });

  return { portfolio, companies };
}
