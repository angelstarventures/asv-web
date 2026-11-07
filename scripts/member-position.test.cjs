/* eslint-disable @typescript-eslint/no-require-imports -- Plain Node CommonJS assertion harness. */
// Per-round member positions (derived from allocations plus recorded transfers) and the move of
// recorded member value across transfers after the latest valuation. Pure math only (positionCalc.ts).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');

const filename = path.resolve('functions/src/lib/positionCalc.ts');
const mod = new Module(filename, module); mod.filename = filename; mod.paths = module.paths;
mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { buildRoundBook, negativePositions, applyTransfersToValues, roundKey } = mod.exports;
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

const R24 = { key: roundKey('2024-01-01', '2024 round'), name: '2024 round', date: '2024-01-01', price: 1000 };
const SAFE = { key: roundKey('2025-01-01', 'SAFE'), name: 'SAFE', date: '2025-01-01', price: null };
const alloc = (round, memberId, amount) => ({ roundKey: round.key, memberId, amount });
const position = (book, round, id) => book.rounds.find((r) => r.key === round.key).positions[id];

// --- Allocations alone: shares = dollars / price; a priceless round uses 1 (shares = dollars) ----
let book = buildRoundBook([R24, SAFE], [alloc(R24, 'A', 5000), alloc(R24, 'B', 3000), alloc(SAFE, 'A', 2000)], []);
assert(near(position(book, R24, 'A').shares, 5) && near(position(book, R24, 'A').basis, 5000));
assert(near(position(book, SAFE, 'A').shares, 2000) && near(position(book, SAFE, 'A').basis, 2000));
assert(near(book.companyBasis.A, 7000) && near(book.invested.A, 7000) && near(book.companyBasis.B, 3000));

// --- A transfer moves shares and basis within the ONE round it came from ------------------------
// A sells 2 of its 5 shares (basis 1000/share); C buys them and pays 2300/share (a Sale).
const move = (side, memberId, shares, cbps) => ({ roundKey: R24.key, memberId, side, shares, costBasisPerShare: cbps });
book = buildRoundBook([R24, SAFE], [alloc(R24, 'A', 5000), alloc(SAFE, 'A', 2000)], [move('SELLER', 'A', 2, 1000), move('BUYER', 'C', 2, 2300)]);
assert(near(position(book, R24, 'A').shares, 3) && near(position(book, R24, 'A').basis, 3000));
assert(near(position(book, R24, 'C').shares, 2) && near(position(book, R24, 'C').basis, 4600), 'the buyer carries what they paid');
assert(near(position(book, SAFE, 'A').shares, 2000), 'other rounds are untouched');
assert(near(book.companyBasis.A, 5000) && near(book.companyBasis.C, 4600), 'company basis = allocations - moved out + received');
assert(near(book.invested.A, 7000) && book.invested.C === undefined, 'invested stays original capital');

// Whole position out: the member drops out of the round entirely.
book = buildRoundBook([R24], [alloc(R24, 'A', 5000)], [move('SELLER', 'A', 5, 1000), move('BUYER', 'C', 5, 1000)]);
assert.equal(position(book, R24, 'A'), undefined);
assert(near(book.companyBasis.A, 0));
assert.deepEqual(negativePositions(book), []);

// A buyer can later sell what they received: positions chain through the round.
book = buildRoundBook([R24], [alloc(R24, 'A', 5000)], [
  move('SELLER', 'A', 5, 1000), move('BUYER', 'C', 5, 1000),
  move('SELLER', 'C', 2, 1000), move('BUYER', 'D', 2, 1000),
]);
assert(near(position(book, R24, 'C').shares, 3) && near(position(book, R24, 'D').shares, 2));

// Overselling (e.g. the transfer that gave C their shares was deleted) is reported per (round, member).
book = buildRoundBook([R24], [alloc(R24, 'A', 5000)], [move('SELLER', 'C', 2, 1000), move('BUYER', 'D', 2, 1000)]);
assert.deepEqual(negativePositions(book), [{ roundName: '2024 round', roundDate: '2024-01-01', memberId: 'C' }]);

// Moves with no source round (not possible for new transfers) only affect company basis.
book = buildRoundBook([R24], [alloc(R24, 'A', 5000)], [{ roundKey: null, memberId: 'A', side: 'SELLER', shares: 1, costBasisPerShare: 1000 }]);
assert(near(book.companyBasis.A, 4000) && near(position(book, R24, 'A').shares, 5));

// --- Moving recorded value ---------------------------------------------------------------------
const t = (date, sellers, buyers) => ({ date, sellers, buyers });
let out = applyTransfersToValues(
  { A: 8000, Z: 500 },
  [t('2026-06-01', [{ memberId: 'A', costBasisMoved: 2000, costBasisBefore: 8000 }], [{ memberId: 'B', cost: 4600 }])]
);
assert(near(out.values.A, 6000), 'seller falls by moved basis / basis before (25%)');
assert(near(out.values.B, 4600), 'buyer is valued at what they paid');
assert(near(out.values.Z, 500));
assert.deepEqual(out.warnings, []);

// Whole basis moved -> the seller is left at zero.
out = applyTransfersToValues({ A: 8000 }, [t('2026-06-01', [{ memberId: 'A', costBasisMoved: 5000, costBasisBefore: 5000 }], [{ memberId: 'N', cost: 5000 }])]);
assert(near(out.values.A, 0) && near(out.values.N, 5000));

// Unknown basis: the seller's value is left alone with a warning (the buyer still gets their cost).
out = applyTransfersToValues({ A: 8000 }, [t('2026-06-01', [{ memberId: 'A', costBasisMoved: 2000, costBasisBefore: null }], [{ memberId: 'B', cost: 2000 }])]);
assert(near(out.values.A, 8000) && out.warnings.length === 1 && near(out.values.B, 2000));

// Sequential transfers chain: A -> B, then B -> C.
out = applyTransfersToValues({ A: 4000 }, [
  t('2026-06-01', [{ memberId: 'A', costBasisMoved: 4000, costBasisBefore: 4000 }], [{ memberId: 'B', cost: 4000 }]),
  t('2026-07-01', [{ memberId: 'B', costBasisMoved: 4000, costBasisBefore: 4000 }], [{ memberId: 'C', cost: 4000 }]),
]);
assert(near(out.values.A, 0) && near(out.values.B, 0) && near(out.values.C, 4000));

console.log('member-position tests passed');
