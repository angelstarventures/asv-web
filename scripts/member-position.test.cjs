/* eslint-disable @typescript-eslint/no-require-imports -- Plain Node CommonJS assertion harness. */
// Member positions assembled from sparse share lots, and the proportional move of recorded member
// value across transfers that happen after the latest valuation. Pure math only (positionCalc.ts).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');

const filename = path.resolve('functions/src/lib/positionCalc.ts');
const mod = new Module(filename, module); mod.filename = filename; mod.paths = module.paths;
mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { computePosition, applyTransfersToValues } = mod.exports;
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

// --- computePosition ---------------------------------------------------------------------------
// Invested, nothing recorded: basis = invested, shares unknown (never guessed).
let p = computePosition('A', 5000, []);
assert.equal(p.basis, 5000); assert.equal(p.shares, null); assert(!p.hasLots);

// Declared opening lot IS the whole holding; allocations are not added on top.
p = computePosition('A', 5000, [{ kind: 'OPENING', shares: 5, costBasis: 5000 }]);
assert.equal(p.basis, 5000); assert.equal(p.shares, 5); assert(p.hasOpening);

// After selling 2 of 5: proportional basis leaves, shares known.
p = computePosition('A', 5000, [
  { kind: 'OPENING', shares: 5, costBasis: 5000 },
  { kind: 'TRANSFER_OUT', shares: -2, costBasis: -2000 },
]);
assert.equal(p.basis, 3000); assert.equal(p.shares, 3);

// Sold everything: zero basis, zero shares (not null, not negative noise).
p = computePosition('A', 5000, [
  { kind: 'OPENING', shares: 5, costBasis: 5000 },
  { kind: 'TRANSFER_OUT', shares: -5, costBasis: -5000 },
]);
assert.equal(p.basis, 0); assert.equal(p.shares, 0);

// Pure transferee (no allocations): lots are the whole holding, shares known.
p = computePosition('B', 0, [{ kind: 'TRANSFER_IN', shares: 5, costBasis: 10000 }]);
assert.equal(p.basis, 10000); assert.equal(p.shares, 5);

// Existing investor who also received shares, with no opening declaration: basis adds the
// transferred-in basis to what they invested, but shares are NOT known (their own holding is not).
p = computePosition('C', 3000, [{ kind: 'TRANSFER_IN', shares: 2, costBasis: 4000 }]);
assert.equal(p.basis, 7000); assert.equal(p.shares, null);

// Seller who partially sold without an opening lot would have negative lots only; basis = invested + (-x).
p = computePosition('D', 5000, [{ kind: 'TRANSFER_OUT', shares: -2, costBasis: -2000 }]);
assert.equal(p.basis, 3000); assert.equal(p.shares, null);

// --- applyTransfersToValues --------------------------------------------------------------------
// Full replacement: the whole value moves to the new owner.
let r = applyTransfersToValues({ A: 12000, X: 500 }, [
  { date: '2026-04-01', sellers: [{ memberId: 'A', shares: 5, sharesHeldBefore: 5 }], buyers: [{ memberId: 'N', shares: 5 }] },
]);
assert(near(r.values.A, 0) && near(r.values.N, 12000) && near(r.values.X, 500));
assert.deepEqual(r.warnings, []);

// Partial: 2 of 5 shares moves 40% of the seller's value, split across buyers by shares received.
r = applyTransfersToValues({ A: 10000 }, [
  { date: '2026-04-01', sellers: [{ memberId: 'A', shares: 2, sharesHeldBefore: 5 }], buyers: [{ memberId: 'N', shares: 1 }, { memberId: 'M', shares: 1 }] },
]);
assert(near(r.values.A, 6000) && near(r.values.N, 2000) && near(r.values.M, 2000));

// Total value is conserved across any set of transfers.
const total = (v) => Object.values(v).reduce((n, x) => n + x, 0);
r = applyTransfersToValues({ A: 8000, B: 4000 }, [
  { date: '2026-04-01', sellers: [{ memberId: 'A', shares: 3, sharesHeldBefore: 6 }, { memberId: 'B', shares: 1, sharesHeldBefore: 4 }], buyers: [{ memberId: 'C', shares: 4 }] },
  { date: '2026-05-01', sellers: [{ memberId: 'C', shares: 2, sharesHeldBefore: 4 }], buyers: [{ memberId: 'D', shares: 2 }] },
]);
assert(near(total(r.values), 12000));
assert(near(r.values.A, 4000) && near(r.values.B, 3000) && near(r.values.C, 2500) && near(r.values.D, 2500));

// A seller with no recorded holding cannot be apportioned: nothing moves, and it is reported.
r = applyTransfersToValues({ A: 1000 }, [
  { date: '2026-04-01', sellers: [{ memberId: 'A', shares: 1, sharesHeldBefore: null }], buyers: [{ memberId: 'N', shares: 1 }] },
]);
assert(near(r.values.A, 1000) && r.values.N === undefined);
assert(r.warnings.length === 1);

// Moving more than the declared holding clamps at the whole value; input is never mutated.
const input = { A: 1000 };
r = applyTransfersToValues(input, [
  { date: '2026-04-01', sellers: [{ memberId: 'A', shares: 9, sharesHeldBefore: 5 }], buyers: [{ memberId: 'N', shares: 9 }] },
]);
assert(near(r.values.A, 0) && near(r.values.N, 1000)); assert.equal(input.A, 1000);

console.log('member-position tests passed');
