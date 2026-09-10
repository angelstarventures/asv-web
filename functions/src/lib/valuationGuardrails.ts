import { query } from "./dataconnect-admin";

// Mechanical sanity checks on drafted/edited ledger records, independent of whatever produced
// them (AI draft, hand-typed JSON, admin edit) — the House of Biryan incident (a $0.099/share
// price drafted from a company's ~500M *authorized* shares instead of its ~16,650 *outstanding*
// shares, which then produced a fair-market-value markdown on a round that was actually a
// markup) sailed through with nothing to catch it. Two independent checks:
//   1. A new round's price-per-share vs. the company's own last recorded price-per-share
//      (hard error — a >15x jump either way with no stock split/recapitalization mentioned in
//      the record's own text is almost never legitimate).
//   2. A drafted fair-market-value vs. a rough ownership-percentage-based estimate derived from
//      the company's priced-round history (soft warning — real judgment calls, e.g. a risk
//      discount, legitimately produce a different number, so this only asks the admin to
//      double-check rather than blocking).

export interface GuardrailFinding {
  recordIndex: number;
  severity: "error" | "warning";
  message: string;
}

export interface PricePoint {
  ledgerEntryId: string;
  eventDate: string;
  pricePerShare: number;
  postMoneyValuation: number;
  asvNewMoney: number;
  roundName: string | null;
  notes: string | null;
}

// Exported for ledgerAudit.ts's retroactive, whole-ledger walk (same data, same math — just run
// over a company's complete history instead of "new record vs. what's already committed").
export async function fetchPriceHistory(companyName: string): Promise<PricePoint[]> {
  const priced = await query<PricePoint>(
    `SELECT le.id AS "ledgerEntryId", le."event_date"::text AS "eventDate",
            prd."price_per_share" AS "pricePerShare",
            prd."post_money_valuation" AS "postMoneyValuation", prd."asv_total" AS "asvNewMoney",
            prd."round_name" AS "roundName", NULL AS "notes"
     FROM "priced_round_detail" prd
     JOIN "ledger_entry" le ON le.id = prd."ledger_entry_id"
     JOIN "company" c ON c.id = le."company_id"
     WHERE c.name = $1 AND le.scenario = 'BALANCED'`,
    [companyName]
  );
  const nonParticipating = await query<PricePoint>(
    `SELECT le.id AS "ledgerEntryId", le."event_date"::text AS "eventDate",
            nprd."new_price_per_share" AS "pricePerShare",
            nprd."new_post_money_valuation" AS "postMoneyValuation", 0 AS "asvNewMoney",
            nprd."round_name" AS "roundName", nprd.notes AS "notes"
     FROM "non_participating_round_detail" nprd
     JOIN "ledger_entry" le ON le.id = nprd."ledger_entry_id"
     JOIN "company" c ON c.id = le."company_id"
     WHERE c.name = $1 AND le.scenario = 'BALANCED'`,
    [companyName]
  );
  return [...priced, ...nonParticipating].sort((a, b) => (a.eventDate < b.eventDate ? -1 : 1));
}

// True if this company has ever raised a SAFE (functions/src/functions/documents-analyze.ts's
// Participating_SAFERound) — deriveOwnership only counts money from PRICED rounds
// (fetchPriceHistory never selects safe_round_detail at all, deliberately: an unconverted SAFE
// has no price-per-share to reason from), so once a company has taken SAFE money, its true
// ownership/FMV includes value this model has no way to see — the SAFE still contributes real
// economic ownership once ANY later priced round happens, it's just invisible here. Confirmed
// against real data: Nocira's actual recorded FMV was correct; the "rough estimate" was wrong
// because it silently ignored two real SAFE rounds that predated the priced round. Skip the
// FMV-plausibility comparison entirely rather than flag a number this heuristic can't actually
// evaluate — same "skip rather than false-positive" posture as deriveOwnership's own null
// returns below.
export async function hasSafeRoundHistory(companyName: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `SELECT srd.id FROM "safe_round_detail" srd
     JOIN "ledger_entry" le ON le.id = srd."ledger_entry_id"
     JOIN "company" c ON c.id = le."company_id"
     WHERE c.name = $1 AND le.scenario = 'BALANCED'
     LIMIT 1`,
    [companyName]
  );
  return rows.length > 0;
}

// Cumulative ASV shares and total shares outstanding, walking the company's priced-round
// history in order. Returns null (rather than a guess) whenever the history isn't clean enough
// to reason from — e.g. a SAFE that hasn't converted yet has no price-per-share at all, and a
// share count that appears to shrink between rounds signals something this simple model doesn't
// understand (a buyback, a real split already reflected inconsistently, etc.) — better to skip
// the check than risk a false positive on real money.
export function deriveOwnership(history: PricePoint[]): { asvShares: number; totalShares: number } | null {
  if (history.length === 0) return null;
  let asvShares = 0;
  let totalShares = 0;
  for (const point of history) {
    if (!(point.pricePerShare > 0) || !(point.postMoneyValuation > 0)) return null;
    const newTotalShares = point.postMoneyValuation / point.pricePerShare;
    if (totalShares > 0 && newTotalShares < totalShares * 0.999) return null;
    totalShares = newTotalShares;
    if (point.asvNewMoney > 0) asvShares += point.asvNewMoney / point.pricePerShare;
  }
  return { asvShares, totalShares };
}

const PRICE_FIELD_BY_TYPE: Record<string, string> = {
  Participating_PricedRound: "price_per_share",
  NonParticipating_Round: "new_price_per_share",
};

export const EXTREME_RATIO = 15;

export function textMentionsSplit(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes("split") || lower.includes("recapitaliz");
}

function mentionsSplit(record: Record<string, unknown>): boolean {
  return textMentionsSplit(`${record.notes ?? ""} ${record.assessment_rationale ?? ""}`);
}

export async function checkValuationGuardrails(records: Record<string, unknown>[]): Promise<GuardrailFinding[]> {
  const findings: GuardrailFinding[] = [];
  const historyCache = new Map<string, Promise<PricePoint[]>>();
  function historyFor(company: string): Promise<PricePoint[]> {
    if (!historyCache.has(company)) historyCache.set(company, fetchPriceHistory(company));
    return historyCache.get(company)!;
  }

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const type = String(record.type ?? "");
    const company = String(record.company ?? "");
    if (!company) continue;

    const priceField = PRICE_FIELD_BY_TYPE[type];
    if (priceField && typeof record[priceField] === "number") {
      const newPrice = record[priceField] as number;
      const history = await historyFor(company);
      const prior = history[history.length - 1];
      if (prior && prior.pricePerShare > 0 && newPrice > 0) {
        const ratio = newPrice / prior.pricePerShare;
        if ((ratio > EXTREME_RATIO || ratio < 1 / EXTREME_RATIO) && !mentionsSplit(record)) {
          findings.push({
            recordIndex: i,
            severity: "error",
            message: `"${company}": the new price-per-share ($${newPrice.toLocaleString()}) is ${
              ratio >= 1 ? `${ratio.toFixed(1)}x higher` : `${(1 / ratio).toFixed(1)}x lower`
            } than the last recorded price ($${prior.pricePerShare.toLocaleString()}/share). If a real stock split or recapitalization happened, say so explicitly in the record's notes; otherwise this price looks wrong (a common cause: using the company's total *authorized* shares instead of its actual *outstanding* shares to back into a price-per-share).`,
          });
        }
      }
    }

    if (type === "Transaction_ValuationChange" || type === "Internal_ValuationAssessment") {
      const fmv = record.asv_total_fair_market_value;
      const impliedPostMoney = record.implied_enterprise_value;
      if (typeof fmv === "number" && typeof impliedPostMoney === "number" && impliedPostMoney > 0) {
        const history = await historyFor(company);
        const ownership = deriveOwnership(history);
        if (ownership && ownership.totalShares > 0 && !(await hasSafeRoundHistory(company))) {
          const ownershipPct = ownership.asvShares / ownership.totalShares;
          const expectedFmv = ownershipPct * impliedPostMoney;
          if (expectedFmv > 0) {
            const deviation = Math.abs(fmv - expectedFmv) / expectedFmv;
            if (deviation > 0.3) {
              findings.push({
                recordIndex: i,
                severity: "warning",
                message: `"${company}": the drafted fair-market-value ($${fmv.toLocaleString()}) differs substantially from a rough ownership-based estimate ($${Math.round(
                  expectedFmv
                ).toLocaleString()}, using ASV's ~${(ownershipPct * 100).toFixed(2)}% stake from its priced-round history against this event's $${impliedPostMoney.toLocaleString()} valuation). Worth double-checking before committing.`,
              });
            }
          }
        }
      }
    }
  }

  return findings;
}
