/* eslint-disable @typescript-eslint/no-require-imports -- Plain Node CommonJS assertion harness. */
// How internal transfers change one member's portfolio view (lib/transferAdjust.ts, pure math).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');

const filename = path.resolve('lib/transferAdjust.ts');
const mod = new Module(filename, module); mod.filename = filename; mod.paths = module.paths;
mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { memberTransferEffects } = mod.exports;
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

const leg = (o) => ({ entryId: 'T1', date: '2026-06-01', companyId: 'C', amount: 0, costBasisBefore: null, ...o });

// Sale: A (company basis 8000) sells shares costing 2000 for 4200; B buys them at the round price for 4600.
const sale = [
  leg({ memberId: 'A', side: 'SELLER', shares: 2, costBasisPerShare: 1000, amount: 4200, costBasisBefore: 8000 }),
  leg({ memberId: 'B', side: 'BUYER', shares: 2, costBasisPerShare: 2300, amount: 4600 }),
];
const snap = [{ companyId: 'C', date: '2026-01-01', values: { A: 8000, Z: 500 } }];
let a = memberTransferEffects('A', sale, snap).get('C');
let b = memberTransferEffects('B', sale, snap).get('C');
assert(near(a.proceeds, 4200) && near(a.basisOut, 2000) && near(a.basisIn, 0));
assert(near(a.valueAfter, 6000), 'seller value falls by the share of cost basis that moved (2000 / 8000 = 25%)');
assert(near(b.basisIn, 4600) && near(b.valueAfter, 4600), 'buyer value equals what they paid, until the next valuation');
assert.deepEqual(b.cashFlows, [{ date: '2026-06-01', amount: -4600 }]);
assert.deepEqual(a.cashFlows, [{ date: '2026-06-01', amount: 4200 }]);
assert.equal(memberTransferEffects('Z', sale, snap).size, 0, 'an uninvolved member is untouched');

// Replacement (amount 0 = transfer at cost): proceeds and cost both equal the basis moved; the buyer value is that cost.
const repl = [
  leg({ memberId: 'A', side: 'SELLER', shares: 4, costBasisPerShare: 1250, costBasisBefore: 5000 }),
  leg({ memberId: 'N', side: 'BUYER', shares: 4, costBasisPerShare: 1250 }),
];
a = memberTransferEffects('A', repl, snap).get('C');
const n = memberTransferEffects('N', repl, snap).get('C');
assert(near(a.proceeds, 5000) && near(n.basisIn, 5000));
assert(near(a.valueAfter, 0) && near(n.valueAfter, 5000), 'a full replacement zeroes the seller; the buyer is valued at the inherited cost');

// A transfer dated on/before the latest valuation is already reflected: no value move.
const old = memberTransferEffects('A', sale, [{ companyId: 'C', date: '2026-06-01', values: { A: 4000, B: 4000 } }]).get('C');
assert(near(old.valueAfter, 4000));

// No valuation recorded yet: valueAfter null (caller falls back to remaining basis).
assert.equal(memberTransferEffects('A', sale, []).get('C').valueAfter, null);

// Seller with no recorded cost basis keeps their value and warns.
const unknown = [
  leg({ memberId: 'A', side: 'SELLER', shares: 2, costBasisPerShare: 1000, amount: 4200, costBasisBefore: null }),
  leg({ memberId: 'B', side: 'BUYER', shares: 2, costBasisPerShare: 2300, amount: 4600 }),
];
a = memberTransferEffects('A', unknown, snap).get('C');
assert(near(a.valueAfter, 8000) && a.warnings.length === 1);

// Two transfers in order: A -> B then B -> C; each step reduces the seller and values the buyer at cost.
const chain = [
  leg({ entryId: 'T1', date: '2026-06-01', memberId: 'A', side: 'SELLER', shares: 4, costBasisPerShare: 1000, costBasisBefore: 4000 }),
  leg({ entryId: 'T1', date: '2026-06-01', memberId: 'B', side: 'BUYER', shares: 4, costBasisPerShare: 1000 }),
  leg({ entryId: 'T2', date: '2026-07-01', memberId: 'B', side: 'SELLER', shares: 4, costBasisPerShare: 1000, costBasisBefore: 4000 }),
  leg({ entryId: 'T2', date: '2026-07-01', memberId: 'C', side: 'BUYER', shares: 4, costBasisPerShare: 1000 }),
];
const c = memberTransferEffects('C', chain, snap).get('C');
const bb = memberTransferEffects('B', chain, snap).get('C');
assert(near(c.valueAfter, 4000) && near(bb.valueAfter, 0));

console.log('transfer-adjust tests passed');
