/* eslint-disable @typescript-eslint/no-require-imports -- Plain Node CommonJS assertion harness. */
// House of Biryan 2026 internal transfer, plus edge cases. Loads the .ts directly (import-free).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const path = require('node:path');
const filename = path.resolve('functions/src/lib/transferCalc.ts');
const mod = new Module(filename, module); mod.filename = filename; mod.paths = module.paths;
mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { computeTransfer, computeFeeLines, allocateCents, round2 } = mod.exports;

const basis = 5000 / 4.5; // exact 1111.111..., never the rounded 1111.11
const base = {
  roundPricePerShare: 2300,
  transferPricePerShare: 2100,
  sellers: [
    { memberId: '00010', shares: 9, costBasisPerShare: basis, heldShares: 9 },
    { memberId: '00011', shares: 6.75, costBasisPerShare: basis, heldShares: 20 },
  ],
  buyers: [{ memberId: '00020', amount: 20000 }, { memberId: '00021', amount: 16225 }],
  ddLeadMemberId: '00002',
  managementMemberId: '00001',
};

// 1. Biryan, legal derived as the plug.
let r = computeTransfer(base);
assert.deepEqual(r.errors, []);
assert.equal(r.totalShares, 15.75);
assert.equal(r.grossGain, 18725);
assert.equal(r.spread, 3150);
const sum = (k) => round2(r.feeLines.filter((l) => l.kind === k).reduce((n, l) => n + l.amount, 0));
assert.equal(sum('DD_LEAD_CARRY'), 561.75);
assert.equal(sum('MANAGEMENT_CARRY'), 936.25);
assert.equal(sum('LEGAL_COSTS'), 1652);
assert.equal(r.legalDerived, true);
assert(Math.abs(r.legalPercentOfGain - 8.82) < 0.01);
assert.equal(r.totalFees, 3150);
assert.equal(round2(r.sellers.reduce((n, s) => n + s.realizedGain, 0)), 15575);
assert.equal(round2(r.sellers.reduce((n, s) => n + s.amount, 0)), 33075);
assert.equal(round2(r.buyers.reduce((n, b) => n + b.shares, 0)), 15.75);
assert(r.feeLines.filter((l) => l.kind === 'DD_LEAD_CARRY').every((l) => l.recipientMemberId === '00002'));
assert(r.feeLines.filter((l) => l.kind === 'MANAGEMENT_CARRY').every((l) => l.recipientMemberId === '00001'));
assert.deepEqual(r.warnings, []);

// 2. Explicit legal costs that reconcile: no warning; one that does not: warning, still ok.
r = computeTransfer({ ...base, legalCosts: 1652 });
assert(r.ok && r.warnings.length === 0 && !r.legalDerived);
r = computeTransfer({ ...base, legalCosts: 1000 });
assert(r.ok && r.warnings.some((w) => /spread funds/.test(w)));

// 3. Hard errors.
assert(computeTransfer({ ...base, ddLeadMemberId: null }).errors.some((e) => /no DD lead/.test(e)));
assert(computeTransfer({ ...base, managementMemberId: null }).errors.some((e) => /management-carry/.test(e)));
assert(computeTransfer({ ...base, buyers: [{ memberId: '00020', amount: 20000 }] }).errors.some((e) => /must equal buyer shares/.test(e)));
assert(computeTransfer({ ...base, sellers: [{ ...base.sellers[0], shares: 10 }, base.sellers[1]] }).errors.some((e) => /holds only 9/.test(e)));
assert(computeTransfer({ ...base, transferPricePerShare: 2400 }).errors.some((e) => /cannot exceed/.test(e)));
assert(computeTransfer({ ...base, buyers: [{ memberId: '00010', amount: 36225 }] }).errors.some((e) => /both buyer and seller/.test(e)));
assert(computeTransfer({ ...base, buyers: [{ memberId: '00020', amount: 36225, shares: 10 }] }).errors.some((e) => /is 15.75 shares/.test(e)));
// Spread of 157.5 cannot cover 1498 of carry, so a derived legal plug would be negative.
r = computeTransfer({ ...base, transferPricePerShare: 2290 });
assert(!r.ok && r.errors.some((e) => /does not cover/.test(e)));

// 4. A seller at a loss pays no carry and is not netted against the other seller.
r = computeTransfer({
  ...base,
  sellers: [
    { memberId: '00010', shares: 5, costBasisPerShare: 3000 }, // loss at 2300
    { memberId: '00011', shares: 10.75, costBasisPerShare: 1000 },
  ],
  buyers: [{ memberId: '00020', amount: 36225 }],
  legalCosts: 100,
});
assert.equal(r.sellers[0].gain, 0);
assert.equal(r.sellers[0].feesCharged, 0);
assert(r.warnings.some((w) => /selling at a loss/.test(w)));
assert.equal(r.sellers[1].gain, 13975);

// 5. Cent allocation always sums exactly.
assert.deepEqual(allocateCents(100, [1, 1, 1]).reduce((a, b) => a + b, 0), 100);
assert.equal(round2(allocateCents(0.05, [1, 1, 1]).reduce((a, b) => a + b, 0)), 0.05);
assert.deepEqual(allocateCents(10, [0, 0]), [5, 5]); // zero weights fall back to equal split

// 6. Full-exit reuse: same lines from per-member gains, custom rates.
const lines = computeFeeLines({ sellers: [{ memberId: 'A', gain: 1000 }], ddLeadMemberId: 'D', managementMemberId: 'M', ddLeadPercent: 4, managementPercent: 6, legalCosts: 25 });
assert.deepEqual(lines.map((l) => [l.kind, l.amount]), [['DD_LEAD_CARRY', 40], ['MANAGEMENT_CARRY', 60], ['LEGAL_COSTS', 25]]);

console.log('transfer-calc tests passed');
