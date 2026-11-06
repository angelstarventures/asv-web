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

console.log('internal-transfer-record tests passed');
