import { query } from "./dataconnect-admin";
import { recomputeAllRollupsAndCheckInvariants } from "./rollups";
import { fetchPriceHistory, deriveOwnership, hasSafeRoundHistory, EXTREME_RATIO, textMentionsSplit, type PricePoint } from "./valuationGuardrails";

// Four independent, read-only (except the rollup-cache refresh, already a safe idempotent
// operation run on a schedule anyway) checks over the WHOLE existing ledger, not just new
// writes — the retroactive counterpart to valuationGuardrails.ts, which only ever sees records
// as they're submitted. Nothing here auto-corrects a bad value; a real fix still goes through
// ledgerUpdateRecord by hand, same as the Prosperous Brands correction.

export interface AuditFinding {
  category: "rollup" | "cross_scenario" | "member_valuation_sum" | "price_continuity" | "fmv_plausibility";
  severity: "error" | "warning";
  message: string;
  // Present when the finding traces to one specific ledger entry — lets the UI either offer a
  // one-click mechanical fix (member_valuation_sum, via ledgerRebalanceMemberValuations) or a
  // "fix in Manage Ledger" deep link (price_continuity/fmv_plausibility, which need a human
  // judgment call — see the Prosperous Brands correction). cross_scenario/rollup findings never
  // trace to a single entry (they're about divergence across several, or already self-healed).
  ledgerEntryId?: string;
  canAutoFix?: boolean;
}

// Below this, a mismatch is treated as ordinary per-member penny-rounding drift (splitting a
// dollar total across many members via round-to-cent inevitably leaves the sum a few cents off
// the original — see the Prosperous Brands fix, which itself has a $0.05 residual), not a real
// data problem worth flagging.
const MEMBER_VALUATION_SUM_TOLERANCE = 50;

interface RollupSnapshotRow {
  companyKey: string;
  scenario: string;
  moic: number;
  unrealizedValue: number;
  realizedValue: number;
}

async function snapshotRollupCache(): Promise<Map<string, RollupSnapshotRow>> {
  const rows = await query<RollupSnapshotRow>(
    `SELECT "company_key" AS "companyKey", scenario, moic, "unrealized_value" AS "unrealizedValue",
            "realized_value" AS "realizedValue"
     FROM "rollup_cache"`
  );
  return new Map(rows.map((r) => [`${r.companyKey}::${r.scenario}`, r]));
}

// Checks (1) rollup accuracy and (2) cross-scenario allocation consistency, by snapshotting the
// cache, recomputing everything from scratch (recomputeAllRollupsAndCheckInvariants already does
// exactly this + the invariant check), and diffing what changed.
async function auditRollupsAndCrossScenario(): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];
  const before = await snapshotRollupCache();
  const { warnings } = await recomputeAllRollupsAndCheckInvariants();
  const after = await snapshotRollupCache();

  for (const [key, afterRow] of after) {
    const beforeRow = before.get(key);
    if (
      !beforeRow ||
      Math.abs(beforeRow.moic - afterRow.moic) > 0.001 ||
      Math.abs(beforeRow.unrealizedValue - afterRow.unrealizedValue) > 0.01 ||
      Math.abs(beforeRow.realizedValue - afterRow.realizedValue) > 0.01
    ) {
      findings.push({
        category: "rollup",
        severity: "warning",
        message: beforeRow
          ? `Rollup cache for ${afterRow.companyKey}/${afterRow.scenario} was stale — moic ${beforeRow.moic.toFixed(3)} -> ${afterRow.moic.toFixed(3)}, unrealized $${beforeRow.unrealizedValue.toLocaleString()} -> $${afterRow.unrealizedValue.toLocaleString()}. Refreshed.`
          : `Rollup cache for ${afterRow.companyKey}/${afterRow.scenario} was missing — computed and cached.`,
      });
    }
  }

  for (const warning of warnings) {
    findings.push({ category: "cross_scenario", severity: "error", message: warning });
  }

  return findings;
}

interface ValuationSumRow {
  ledgerEntryId: string;
  companyName: string;
  eventDate: string;
  scenario: string;
  type: string;
  authoritativeTotal: number;
  memberValuationSum: number;
}

async function auditMemberValuationSums(): Promise<AuditFinding[]> {
  const rows = await query<ValuationSumRow>(
    `SELECT le.id AS "ledgerEntryId", c.name AS "companyName", le."event_date"::text AS "eventDate",
            le.scenario, le.type::text AS "type",
            vad."asv_total_fair_market_value" AS "authoritativeTotal",
            COALESCE(mv."total", 0) AS "memberValuationSum"
     FROM "ledger_entry" le
     JOIN "company" c ON c.id = le."company_id"
     JOIN "valuation_assessment_detail" vad ON vad."ledger_entry_id" = le.id
     LEFT JOIN (
       SELECT "ledger_entry_id", SUM(value) AS total FROM "member_valuation" GROUP BY "ledger_entry_id"
     ) mv ON mv."ledger_entry_id" = le.id
     WHERE le.type IN ('TRANSACTION_VALUATION_CHANGE', 'INTERNAL_VALUATION_ASSESSMENT')

     UNION ALL

     SELECT le.id, c.name, le."event_date"::text, le.scenario, le.type::text,
            eed."asv_total_payout", COALESCE(mv."total", 0)
     FROM "ledger_entry" le
     JOIN "company" c ON c.id = le."company_id"
     JOIN "exit_event_detail" eed ON eed."ledger_entry_id" = le.id
     LEFT JOIN (
       SELECT "ledger_entry_id", SUM(value) AS total FROM "member_valuation" GROUP BY "ledger_entry_id"
     ) mv ON mv."ledger_entry_id" = le.id
     WHERE le.type = 'EXIT_EVENT'`
  );

  const findings: AuditFinding[] = [];
  for (const row of rows) {
    const deviation = Math.abs(row.authoritativeTotal - row.memberValuationSum);
    if (deviation >= MEMBER_VALUATION_SUM_TOLERANCE) {
      findings.push({
        category: "member_valuation_sum",
        severity: "error",
        message: `"${row.companyName}" (${row.type}, ${row.eventDate}, ${row.scenario}): member_valuation rows sum to $${row.memberValuationSum.toLocaleString()}, which doesn't match the recorded total of $${row.authoritativeTotal.toLocaleString()} (off by $${deviation.toLocaleString()}).`,
        ledgerEntryId: row.ledgerEntryId,
        canAutoFix: true,
      });
    }
  }
  return findings;
}

interface ValuationPoint {
  ledgerEntryId: string;
  eventDate: string;
  fmv: number;
  impliedPostMoney: number | null;
}

async function fetchValuationHistory(companyName: string): Promise<ValuationPoint[]> {
  const rows = await query<ValuationPoint>(
    `SELECT le.id AS "ledgerEntryId", le."event_date"::text AS "eventDate",
            vad."asv_total_fair_market_value" AS "fmv",
            vad."implied_enterprise_value" AS "impliedPostMoney"
     FROM "valuation_assessment_detail" vad
     JOIN "ledger_entry" le ON le.id = vad."ledger_entry_id"
     JOIN "company" c ON c.id = le."company_id"
     WHERE c.name = $1 AND le.scenario = 'BALANCED'
     ORDER BY le."event_date" ASC`,
    [companyName]
  );
  return rows;
}

// Retroactive form of valuationGuardrails.ts's two checks, walked across a company's WHOLE
// history instead of just a newly-submitted record: (1) consecutive price-per-share jumps with
// no split/recapitalization noted, and (2) a fair-market-value mark that doesn't plausibly match
// the ownership percentage implied by the priced-round history as of that point in time.
async function auditCompanyPriceContinuityAndFmv(companyName: string): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];
  const priceHistory = await fetchPriceHistory(companyName);

  for (let i = 1; i < priceHistory.length; i++) {
    const prior = priceHistory[i - 1];
    const current = priceHistory[i];
    if (!(prior.pricePerShare > 0) || !(current.pricePerShare > 0)) continue;
    const ratio = current.pricePerShare / prior.pricePerShare;
    const extreme = ratio > EXTREME_RATIO || ratio < 1 / EXTREME_RATIO;
    if (extreme && !textMentionsSplit(current.notes ?? "")) {
      findings.push({
        category: "price_continuity",
        severity: "error",
        message: `"${companyName}": price-per-share jumped from $${prior.pricePerShare.toLocaleString()}/share (${prior.roundName ?? "prior round"}, ${prior.eventDate}) to $${current.pricePerShare.toLocaleString()}/share (${current.roundName ?? "this round"}, ${current.eventDate}) — a ${
          ratio >= 1 ? `${ratio.toFixed(1)}x increase` : `${(1 / ratio).toFixed(1)}x drop`
        } with no stock split/recapitalization noted.`,
        ledgerEntryId: current.ledgerEntryId,
      });
    }
  }

  const valuationHistory = await fetchValuationHistory(companyName);
  const skipFmvCheck = valuationHistory.length > 0 && (await hasSafeRoundHistory(companyName));
  for (const point of valuationHistory) {
    if (skipFmvCheck) continue;
    if (point.impliedPostMoney == null || !(point.impliedPostMoney > 0)) continue;
    const historyAsOf = priceHistory.filter((p: PricePoint) => p.eventDate <= point.eventDate);
    const ownership = deriveOwnership(historyAsOf);
    if (!ownership || !(ownership.totalShares > 0)) continue;
    const ownershipPct = ownership.asvShares / ownership.totalShares;
    const expectedFmv = ownershipPct * point.impliedPostMoney;
    if (!(expectedFmv > 0)) continue;
    const deviation = Math.abs(point.fmv - expectedFmv) / expectedFmv;
    if (deviation > 0.3) {
      findings.push({
        category: "fmv_plausibility",
        severity: "warning",
        message: `"${companyName}" (${point.eventDate}): recorded fair-market-value $${point.fmv.toLocaleString()} differs substantially from a rough ownership-based estimate $${Math.round(
          expectedFmv
        ).toLocaleString()} (~${(ownershipPct * 100).toFixed(2)}% stake at that point in the company's priced-round history against a $${point.impliedPostMoney.toLocaleString()} valuation).`,
        ledgerEntryId: point.ledgerEntryId,
      });
    }
  }

  return findings;
}

export async function runLedgerAudit(): Promise<AuditFinding[]> {
  const companies = await query<{ name: string }>(`SELECT name FROM "company" ORDER BY name`);

  const [rollupFindings, memberValuationFindings, ...perCompanyFindings] = await Promise.all([
    auditRollupsAndCrossScenario(),
    auditMemberValuationSums(),
    ...companies.map((c) => auditCompanyPriceContinuityAndFmv(c.name)),
  ]);

  return [...rollupFindings, ...memberValuationFindings, ...perCompanyFindings.flat()];
}
