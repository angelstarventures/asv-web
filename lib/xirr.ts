// Mirrors functions/src/lib/xirr.ts exactly — duplicated rather than imported, same
// separate-deployables reasoning as every other lib/*.ts file shared conceptually across this
// app and the Cloud Functions codebase (this app can't import from functions/src). Used for the
// "mine" scope's own IRR (the "asv" scope reads RollupCache.irr, computed server-side by that
// file — there's no per-member RollupCache row, so "mine" recomputes live, same split as MOIC).

export interface CashFlow {
  date: Date;
  amount: number; // negative = outflow (capital call), positive = inflow (distribution/terminal value)
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_RATE = -0.999; // (1 + rate) must stay > 0

function yearsBetween(a: Date, b: Date): number {
  return (a.getTime() - b.getTime()) / (365 * DAY_MS);
}

function npv(rate: number, flows: CashFlow[], epoch: Date): number {
  return flows.reduce((sum, f) => sum + f.amount / Math.pow(1 + rate, yearsBetween(f.date, epoch)), 0);
}

function npvDerivative(rate: number, flows: CashFlow[], epoch: Date): number {
  return flows.reduce((sum, f) => {
    const t = yearsBetween(f.date, epoch);
    if (t === 0) return sum;
    return sum - (t * f.amount) / Math.pow(1 + rate, t + 1);
  }, 0);
}

// Standard dated-cash-flow IRR (Excel's XIRR) — Newton-Raphson first, falling back to
// bisection if Newton doesn't converge. Returns null when the result is undefined (fewer than
// 2 flows, or no sign change — e.g. every flow is an outflow with nothing invested back yet).
export function xirr(flows: CashFlow[]): number | null {
  if (flows.length < 2) return null;
  const hasPositive = flows.some((f) => f.amount > 0);
  const hasNegative = flows.some((f) => f.amount < 0);
  if (!hasPositive || !hasNegative) return null;

  const sorted = [...flows].sort((a, b) => a.date.getTime() - b.date.getTime());
  const epoch = sorted[0].date;

  let rate = 0.1;
  for (let i = 0; i < 100; i++) {
    const f = npv(rate, sorted, epoch);
    const df = npvDerivative(rate, sorted, epoch);
    if (Math.abs(df) < 1e-10) break;
    const next = rate - f / df;
    if (!Number.isFinite(next) || next <= MIN_RATE) break;
    if (Math.abs(next - rate) < 1e-7) return next;
    rate = next;
  }

  let lo = MIN_RATE;
  let hi = 10;
  let fLo = npv(lo, sorted, epoch);
  let fHi = npv(hi, sorted, epoch);
  let attempts = 0;
  while (Math.sign(fLo) === Math.sign(fHi) && attempts < 10) {
    hi *= 2;
    fHi = npv(hi, sorted, epoch);
    attempts++;
  }
  if (Math.sign(fLo) === Math.sign(fHi)) return null;

  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid, sorted, epoch);
    if (Math.abs(fMid) < 1e-7) return mid;
    if (Math.sign(fMid) === Math.sign(fLo)) {
      lo = mid;
      fLo = fMid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}
