/* eslint-disable @typescript-eslint/no-require-imports -- Plain Node CommonJS assertion harness. */
// Record-level behavior for Internal_Transfer: the JSON schema (AJV) and the record -> calculator
// mapping from share-lot holdings. DB writes (transferWrites.ts) are not exercised here.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');
const Ajv2020 = require(path.resolve('functions/node_modules/ajv/dist/2020')).default;
const addFormats = require(path.resolve('functions/node_modules/ajv-formats')).default;

const filename = path.resolve('functions/src/lib/transferCalc.ts');
const mod = new Module(filename, module); mod.filename = filename; mod.paths = module.paths;
mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { computeTransferFromRecord, round2 } = mod.exports;

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(JSON.parse(fs.readFileSync('functions/schema/asv_master_portfolio_schema.json', 'utf8')));

const record = {
  type: 'Internal_Transfer', company: 'House of Biryan', date: '2026-03-01',
  reference_round_name: '2026 round', round_price_per_share: 2300, transfer_price_per_share: 2100,
  sellers: { '00010': 9, '00011': 6.75 }, buyers: { '00020': 20000, '00021': 16225 }, legal_costs: 1652,
};

// Schema
assert(validate(record), JSON.stringify(validate.errors));
assert(validate({ ...record, legal_costs: undefined }));
for (const bad of [
  { ...record, buyers: undefined },
  { ...record, sellers: {} },
  { ...record, sellers: { '00010': -1 } },
  { ...record, round_price_per_share: 0 },
  { ...record, legal_costs: -5 },
  { ...record, transfer_price_per_share: undefined },
]) assert(!validate(JSON.parse(JSON.stringify(bad))), 'expected invalid: ' + JSON.stringify(bad));
assert(validate({ ...record, type: 'Exit_Event' }) === false); // other types' required fields still apply

// Mapping from lots: both sellers bought at 5000 / 4.5 shares.
const basis = 5000 / 4.5;
const ctx = {
  holdings: { '00010': { shares: 9, costBasis: 9 * basis }, '00011': { shares: 20, costBasis: 20 * basis } },
  ddLeadMemberId: '00002', managementMemberId: '00001', ddLeadPercent: 3, managementPercent: 5,
};
let r = computeTransferFromRecord(record, ctx);
assert.deepEqual(r.errors, []);
assert.equal(r.grossGain, 18725);
assert.equal(r.totalFees, 3150);
assert.equal(round2(r.sellers.reduce((n, s) => n + s.realizedGain, 0)), 15575);

// Derived legal plug when legal_costs is omitted equals the explicit figure.
const { legal_costs: _l, ...noLegal } = record; void _l;
r = computeTransferFromRecord(noLegal, ctx);
assert.equal(r.legalCosts, 1652);
assert(r.legalDerived);

// Selling more than held, or holding nothing, is an error.
r = computeTransferFromRecord(record, { ...ctx, holdings: { '00010': { shares: 5, costBasis: 5 * basis } } });
assert(r.errors.some((e) => /holds only 5/.test(e)));
assert(r.errors.some((e) => /holds only 0/.test(e)));

// Average basis is stable across partial sales: after selling half, the remaining lots (half the
// shares, half the basis) give the same per-share basis, so a second sale computes the same gain.
const half = { '00010': { shares: 4.5, costBasis: 4.5 * basis } };
const second = computeTransferFromRecord(
  { ...record, sellers: { '00010': 4.5 }, buyers: { '00020': 4.5 * 2300 }, legal_costs: 0 },
  { ...ctx, holdings: half }
);
assert.equal(second.sellers[0].gain, round2(4.5 * (2300 - basis)));

// No DD lead / no management recipient configured are blocking errors.
assert(computeTransferFromRecord(record, { ...ctx, ddLeadMemberId: null }).errors.some((e) => /no DD lead/.test(e)));
assert(computeTransferFromRecord(record, { ...ctx, managementMemberId: null }).errors.some((e) => /management-carry/.test(e)));

// --- Declared holdings (no round-time lot backfill) ---------------------------------------------
// A first-time seller has no recorded lots: holdings_before declares the whole holding, and the
// cost basis defaults to the member's invested dollars in the company.
const emptyCtx = { holdings: {}, invested: { '00010': 5000, '00011': 5000 }, ddLeadMemberId: '00002', managementMemberId: '00001', ddLeadPercent: 3, managementPercent: 5 };
const declared = { ...record, holdings_before: { '00010': { shares: 9 }, '00011': { shares: 20, cost_basis: 5000 } } };
r = computeTransferFromRecord(declared, emptyCtx);
assert.deepEqual(r.errors, [], r.errors.join('; '));
assert.equal(r.openingAdjustments.length, 2);
assert.equal(r.openingAdjustments.find((o) => o.memberId === '00010').shares, 9);
assert.equal(r.openingAdjustments.find((o) => o.memberId === '00010').costBasis, 5000); // defaulted from invested
assert.equal(r.sellers.find((x) => x.memberId === '00010').sharesHeldBefore, 9);
assert.equal(r.sellers.find((x) => x.memberId === '00010').costBasisPerShare, 5000 / 9);
// No declaration and no lots is still an oversell error; a declaration with no basis source is an error.
assert(computeTransferFromRecord(record, emptyCtx).errors.some((e) => /holds only 0/.test(e)));
assert(computeTransferFromRecord({ ...record, holdings_before: { '00010': { shares: 9 } } }, { ...emptyCtx, invested: {} }).errors.some((e) => /no cost basis/.test(e)));
// A declaration that matches the recorded lots writes no adjustment; one that differs replaces them with a warning.
const sameLots = { ...ctx, invested: {} };
r = computeTransferFromRecord({ ...record, holdings_before: { '00010': { shares: 9, cost_basis: 9 * basis }, '00011': { shares: 20, cost_basis: 20 * basis } } }, sameLots);
assert.equal(r.openingAdjustments.length, 0);
r = computeTransferFromRecord({ ...record, holdings_before: { '00010': { shares: 10, cost_basis: 10 * basis } } }, sameLots);
assert.equal(r.openingAdjustments[0].shares, 1);
assert(r.warnings.some((w) => /replaces the 9 shares/.test(w)));

// --- Replacement: plain owner change, no price/carry/costs, buyer inherits basis ---------------
const { sellers: _s, buyers: _b, round_price_per_share: _r, transfer_price_per_share: _t, legal_costs: _lc, ...rest } = record; void [_s, _b, _r, _t, _lc];
const repl = { ...rest, transfer_kind: 'Replacement' };
assert(validate({ ...repl, sellers: { '00010': 4 }, buyers: { '00030': 4 } }), JSON.stringify(validate.errors)); // prices not required
assert(!validate({ ...record, round_price_per_share: undefined })); // a sale still needs them
const holds = { holdings: { '00010': { shares: 9, costBasis: 5000 } }, ddLeadMemberId: null, managementMemberId: null, ddLeadPercent: 3, managementPercent: 5 };
r = computeTransferFromRecord({ ...repl, sellers: { '00010': 9 }, buyers: { '00030': 9 } }, holds); // whole position, no DD lead/mgmt needed
assert.deepEqual(r.errors, [], r.errors.join('; '));
assert.equal(r.kind, 'REPLACEMENT');
assert.equal(r.feeLines.length, 0); assert.equal(r.totalFees, 0); assert.equal(r.buyers[0].amount, 0);
assert(Math.abs(r.buyers[0].costBasisPerShare - 5000 / 9) < 1e-9);
// Partial replacement moves proportional basis; two sellers blend into one inherited basis.
r = computeTransferFromRecord({ ...repl, sellers: { '00010': 3 }, buyers: { '00030': 1, '00031': 2 } }, holds);
assert.deepEqual(r.errors, []);
assert(Math.abs(r.buyers[0].costBasisPerShare - 5000 / 9) < 1e-9 && r.buyers[0].shares === 1);
assert(computeTransferFromRecord({ ...repl, sellers: { '00010': 3 }, buyers: { '00030': 2 } }, holds).errors.some((e) => /must equal/.test(e)));
assert(computeTransferFromRecord({ ...repl, sellers: { '00010': 12 }, buyers: { '00030': 12 } }, holds).errors.some((e) => /holds only 9/.test(e)));
assert(computeTransferFromRecord({ ...repl, sellers: { '00010': 3 }, buyers: { '00010': 3 } }, holds).errors.some((e) => /both buyer and seller/.test(e)));
// A replacement can declare holdings too (first-ever transfer of a position).
r = computeTransferFromRecord({ ...repl, sellers: { '00010': 9 }, buyers: { '00030': 9 }, holdings_before: { '00010': { shares: 9 } } }, { ...emptyCtx, ddLeadMemberId: null, managementMemberId: null });
assert.deepEqual(r.errors, []);
assert.equal(r.openingAdjustments[0].shares, 9);

// Specific-round sale: the seller holds 2 shares bought at 1111.11 plus 3 bought at 2300 (5 shares, 9122.22 basis)
// and sells the 2 cheap shares. sold_cost_basis makes gain/carry use THEIR cost, not the 1824.44 average.
const mixed = { holdings: { '00010': { shares: 5, costBasis: 2222.22 + 6900 } }, ddLeadMemberId: '00002', managementMemberId: '00001', ddLeadPercent: 3, managementPercent: 5 };
const specificSale = { ...record, sellers: { '00010': 2 }, buyers: { '00020': 4600 }, legal_costs: 0 };
const avg = computeTransferFromRecord(specificSale, mixed);
assert.deepEqual(avg.errors, []);
assert(Math.abs(avg.sellers[0].gain - (4600 - 2 * ((2222.22 + 6900) / 5))) < 0.01, 'blended basis when sold_cost_basis is omitted');
const spec = computeTransferFromRecord({ ...specificSale, sold_cost_basis: { '00010': 2222.22 } }, mixed);
assert.deepEqual(spec.errors, []);
assert(Math.abs(spec.sellers[0].gain - (4600 - 2222.22)) < 0.01, 'gain uses the stated basis');
assert(Math.abs(spec.sellers[0].costBasisPerShare * 2 - 2222.22) < 1e-9);
assert(Math.abs(mixed.holdings['00010'].costBasis - spec.sellers[0].costBasisPerShare * 2 - 6900) < 0.01, 'the rest of the basis stays with the kept shares');
assert(validate({ ...specificSale, sold_cost_basis: { '00010': 2222.22 } }), JSON.stringify(validate.errors));
assert(!validate({ ...specificSale, sold_cost_basis: { '00010': -1 } }));
// A replacement hands the buyer exactly the stated basis.
r = computeTransferFromRecord({ transfer_kind: 'Replacement', sellers: { '00010': 2 }, buyers: { '00030': 2 }, sold_cost_basis: { '00010': 2222.22 } }, mixed);
assert.deepEqual(r.errors, []);
assert(Math.abs(r.buyers[0].costBasisPerShare - 1111.11) < 1e-9);
// Guards.
const errs = (rec) => computeTransferFromRecord({ ...specificSale, ...rec }, mixed).errors.join(' | ');
assert(/exceeds the whole recorded basis/.test(errs({ sold_cost_basis: { '00010': 99999 } })));
assert(/whole holding/.test(errs({ sellers: { '00010': 5 }, buyers: { '00020': 11500 }, sold_cost_basis: { '00010': 2222.22 } })));
assert(/not a seller/.test(errs({ sold_cost_basis: { '00099': 100 } })));
assert.equal(errs({ sellers: { '00010': 5 }, buyers: { '00020': 11500 }, sold_cost_basis: { '00010': 2222.22 + 6900 } }), '', 'selling everything with the whole basis is fine');

console.log('internal-transfer-record tests passed');
