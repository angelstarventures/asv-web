/* eslint-disable @typescript-eslint/no-require-imports -- Plain Node CommonJS assertion harness. */
// Carry on a complete exit: gain = payout - position basis, per member, never negative, no netting.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');

const filename = path.resolve('functions/src/lib/transferCalc.ts');
const mod = new Module(filename, module); mod.filename = filename; mod.paths = module.paths;
mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { computeExitCarry } = mod.exports;

const base = { ddLeadMemberId: 'DD', managementMemberId: 'MG' };

// A gains 5000 (payout 10000 on 5000), B has a loss (payout 1000 on 3000), C breaks even.
let r = computeExitCarry({ ...base, payouts: { A: 10000, B: 1000, C: 2000 }, basis: { A: 5000, B: 3000, C: 2000 } });
assert.equal(r.gains.A, 5000); assert.equal(r.gains.B, 0); assert.equal(r.gains.C, 0);
assert.equal(r.feeLines.length, 2, 'only A is charged: DD + management');
const dd = r.feeLines.find((l) => l.kind === 'DD_LEAD_CARRY');
const mg = r.feeLines.find((l) => l.kind === 'MANAGEMENT_CARRY');
assert.equal(dd.amount, 150); assert.equal(dd.recipientMemberId, 'DD'); assert.equal(dd.chargedToMemberId, 'A');
assert.equal(mg.amount, 250); assert.equal(mg.recipientMemberId, 'MG');
assert.equal(r.net.A, 9600); assert.equal(r.net.B, 1000); assert.equal(r.net.C, 2000, 'losses are not netted against gains');
assert.equal(r.totalCarry, 400);

// Unknown basis counts as 0 (whole payout is gain); custom percents honoured.
r = computeExitCarry({ ...base, payouts: { Z: 1000 }, basis: {}, ddLeadPercent: 10, managementPercent: 2 });
assert.equal(r.net.Z, 880);

// Zero payouts (shutdown) charge nothing.
r = computeExitCarry({ ...base, payouts: { A: 0 }, basis: { A: 5000 } });
assert.equal(r.feeLines.length, 0); assert.equal(r.net.A, 0);

console.log('exit-carry tests passed');
