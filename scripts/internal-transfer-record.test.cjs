/* eslint-disable @typescript-eslint/no-require-imports -- Plain Node CommonJS assertion harness. */
// Record-level behavior for Internal_Transfer: the JSON schema (AJV) and the record -> calculator
// mapping from per-round positions. DB writes (transferWrites.ts) are not exercised here.
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

// House of Biryan style: the 2024 round priced at 1111.11/share; sellers hold $5,000 + $5,000 of it.
const P0 = 1111.11;
const round = { source_round_name: '2024 round', source_round_date: '2024-06-01' };
const record = {
  type: 'Internal_Transfer', company: 'House of Biryan', date: '2026-03-01', ...round,
  round_price_per_share: 2300, transfer_price_per_share: 2100,
  sellers: { '00010': P0 * 4.5, '00011': P0 * 2 }, buyers: { '00020': 4.5 * 2300 + 2 * 2300 }, legal_costs: 1652,
};
const ctx = {
  sourcePrice: P0,
  positions: { '00010': { shares: 4.5, basis: P0 * 4.5 }, '00011': { shares: 4.5, basis: P0 * 4.5 } },
  companyBasis: { '00010': P0 * 4.5, '00011': 9000 },
  ddLeadMemberId: '00002', managementMemberId: '00001', ddLeadPercent: 3, managementPercent: 5,
};

// --- Schema ------------------------------------------------------------------------------------
assert(validate(record), JSON.stringify(validate.errors));
assert(validate({ ...record, legal_costs: undefined }));
for (const bad of [
  { ...record, buyers: undefined },
  { ...record, sellers: {} },
  { ...record, sellers: { '00010': -1 } },
  { ...record, round_price_per_share: 0 },
  { ...record, legal_costs: -5 },
  { ...record, transfer_price_per_share: undefined },
  { ...record, source_round_name: undefined }, // every transfer names its single source round
  { ...record, source_round_date: undefined },
  { ...record, source_round_date: 'March 2024' },
]) assert(!validate(JSON.parse(JSON.stringify(bad))), 'expected invalid: ' + JSON.stringify(bad));
assert(validate({ ...record, type: 'Exit_Event' }) === false); // other types' required fields still apply
// The old holdings fields are gone from the schema: additional properties are tolerated by the
// schema but nothing reads them, and the member-id check no longer treats them as member dicts.
assert(!JSON.stringify(JSON.parse(fs.readFileSync('functions/schema/asv_master_portfolio_schema.json', 'utf8'))).includes('holdings_before'));

// --- Sale: positions drive basis; amounts are original cost -------------------------------------
let r = computeTransferFromRecord(record, ctx);
assert.deepEqual(r.errors, [], r.errors.join('; '));
assert(Math.abs(r.sellers[0].shares - 4.5) < 1e-9 && Math.abs(r.sellers[1].shares - 2) < 1e-9, 'shares = original cost / the round price');
assert(Math.abs(r.sellers[0].costBasisPerShare - P0) < 1e-9);
assert.equal(r.sellers[0].sharesHeldBefore, 4.5);
assert.equal(r.sellers[0].costBasisBefore, P0 * 4.5);
assert(Math.abs(r.totalShares - 6.5) < 1e-9);
// gain = shares x (2300 - 1111.11)
assert(Math.abs(r.grossGain - round2(6.5 * (2300 - P0))) < 0.02);
assert.equal(r.kind, 'SALE');

// Whole position: no rounding dust is left behind.
r = computeTransferFromRecord({ ...record, sellers: { '00010': 5000 }, buyers: { '00020': 4.5 * 2300 } }, ctx);
assert.deepEqual(r.errors, [], r.errors.join('; '));
assert.equal(r.sellers[0].shares, 4.5);

// Derived legal plug when legal_costs is omitted.
const { legal_costs: _l, ...noLegal } = record; void _l;
r = computeTransferFromRecord(noLegal, ctx);
assert(r.legalDerived && r.legalCosts > 0);

// Basis follows the position, not the round: a buyer who paid 2300/share and sells later carries 2300/share.
const rebuyer = { ...ctx, positions: { '00020': { shares: 2, basis: 4600 } }, companyBasis: { '00020': 4600 } };
r = computeTransferFromRecord(
  { ...record, sellers: { '00020': 2 * P0 }, buyers: { '00030': 2 * 2300 } },
  rebuyer
);
assert.deepEqual(r.errors, [], r.errors.join('; '));
assert(Math.abs(r.sellers[0].costBasisPerShare - 2300) < 1e-9);
assert.equal(r.sellers[0].gain, 0, 'selling at the round price what cost the round price is no gain');

// --- Oversell guard: per seller, per round ------------------------------------------------------
r = computeTransferFromRecord({ ...record, sellers: { '00010': 5001 }, buyers: { '00020': 4.5001 * 2300 } }, ctx);
assert(r.errors.some((e) => /moving 5001 of "2024 round" but has only 5000/.test(e)), r.errors.join('; '));
r = computeTransferFromRecord(record, { ...ctx, positions: {} });
assert(r.errors.some((e) => /has only 0 of it/.test(e)));
assert(!r.ok);

// --- Missing round, SAFE, DD lead, recipient ----------------------------------------------------
assert(computeTransferFromRecord({ ...record, source_round_name: undefined }, ctx).errors.some((e) => /source round/.test(e)));
assert(computeTransferFromRecord({ ...record, source_round_date: undefined }, ctx).errors.some((e) => /date is required/.test(e)));
assert(computeTransferFromRecord(record, { ...ctx, ddLeadMemberId: null }).errors.some((e) => /no DD lead/.test(e)));
assert(computeTransferFromRecord(record, { ...ctx, managementMemberId: null }).errors.some((e) => /management-carry/.test(e)));

// A SAFE has no share price: a Sale is blocked, a Replacement works (shares = dollars).
const safeCtx = { ...ctx, sourcePrice: null, positions: { '00010': { shares: 2000, basis: 2000 } }, companyBasis: { '00010': 2000 } };
assert(computeTransferFromRecord({ ...record, source_round_name: 'SAFE' }, safeCtx).errors.some((e) => /no price per share/.test(e)));
const safeRepl = { type: 'Internal_Transfer', company: 'X', date: '2026-03-01', source_round_name: 'SAFE', source_round_date: '2025-01-01', transfer_kind: 'Replacement', sellers: { '00010': 500 }, buyers: { '00030': 500 } };
assert(validate(safeRepl), JSON.stringify(validate.errors));
r = computeTransferFromRecord(safeRepl, { ...safeCtx, ddLeadMemberId: null, managementMemberId: null });
assert.deepEqual(r.errors, [], r.errors.join('; '));
assert.equal(r.sellers[0].shares, 500);
assert(Math.abs(r.buyers[0].costBasisPerShare - 1) < 1e-9);

// --- Replacement: plain owner change, no price/carry/costs, buyer inherits basis ----------------
const repl = { type: 'Internal_Transfer', company: 'House of Biryan', date: '2026-03-01', ...round, transfer_kind: 'Replacement', sellers: { '00010': 5000 }, buyers: { '00030': 5000 } };
assert(validate(repl), JSON.stringify(validate.errors)); // prices not required
const replCtx = { ...ctx, ddLeadMemberId: null, managementMemberId: null };
r = computeTransferFromRecord(repl, replCtx);
assert.deepEqual(r.errors, [], r.errors.join('; '));
assert.equal(r.kind, 'REPLACEMENT');
assert.equal(r.feeLines.length, 0); assert.equal(r.totalFees, 0); assert.equal(r.buyers[0].amount, 0);
assert(Math.abs(r.buyers[0].costBasisPerShare - P0) < 1e-9 && Math.abs(r.buyers[0].shares - 4.5) < 1e-9);
// Partial replacement moves proportional basis; two sellers blend into one inherited basis.
r = computeTransferFromRecord({ ...repl, sellers: { '00010': 2000, '00011': 1000 }, buyers: { '00030': 1000, '00031': 2000 } }, replCtx);
assert.deepEqual(r.errors, [], r.errors.join('; '));
assert(Math.abs(r.buyers[0].shares - 1000 / P0) < 1e-9 && Math.abs(r.buyers[1].shares - 2000 / P0) < 1e-9);
assert(Math.abs(r.buyers[0].costBasisPerShare - P0) < 1e-9);
// Sellers' and buyers' amounts must match.
assert(computeTransferFromRecord({ ...repl, sellers: { '00010': 3000 }, buyers: { '00030': 2000 } }, replCtx).errors.some((e) => /must equal/.test(e)));
assert(computeTransferFromRecord({ ...repl, sellers: { '00010': 9000 }, buyers: { '00030': 9000 } }, replCtx).errors.some((e) => /has only 5000/.test(e)));
assert(computeTransferFromRecord({ ...repl, sellers: { '00010': 3000 }, buyers: { '00010': 3000 } }, replCtx).errors.some((e) => /both buyer and seller/.test(e)));
// A replacement of a bought-in position hands the buyer that position's real basis (2300), not the round price.
r = computeTransferFromRecord({ ...repl, sellers: { '00020': 2 * P0 }, buyers: { '00030': 2 * P0 } }, { ...rebuyer, ddLeadMemberId: null, managementMemberId: null });
assert.deepEqual(r.errors, [], r.errors.join('; '));
assert(Math.abs(r.buyers[0].costBasisPerShare - 2300) < 1e-9);

console.log('internal-transfer-record tests passed');
