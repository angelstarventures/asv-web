/* eslint-disable @typescript-eslint/no-require-imports -- Private fixture validation CLI. */
// Captures and confirmed member mappings remain private in .firebase, never in source control.
const fs=require('node:fs');const assert=require('node:assert/strict');
const {parseTransactionSheet}=require('../functions/lib/src/lib/realEstateSheetParse');
const capture=JSON.parse(fs.readFileSync('.firebase/real-estate-preflight.json','utf8'));
const configs=JSON.parse(fs.readFileSync('.firebase/real-estate-live-previews.json','utf8'));
let total=0;
for(const sheet of capture.sheets){
 const config=configs.find(s=>s.id===sheet.id);assert(config,'Missing confirmed mapping');
 const parsed=parseTransactionSheet(sheet.grid,config.opts);
 assert.deepEqual(parsed.errors,[],sheet.name);assert.deepEqual(parsed.unresolvedInvestorLabels,[],sheet.name);
 assert(parsed.reconciliation.every(r=>r.matches));assert(parsed.entries.every(e=>/^\d+$/.test(e.rowKey)),'Use the existing Transaction ID column');
 if(sheet.name==='Hills 2'){const direct=parsed.entries.find(e=>e.fundedOutsideHub);assert(direct);assert.equal(direct.amountUsd,83200);assert(direct.allocations.every(a=>a.amountUsd===20800));assert.deepEqual(parsed.reconciliation.map(r=>Math.round(r.actual*100)),[276175,6616,6475,6175]);}
 total+=parsed.entries.length;
 console.log(sheet.name+': '+parsed.entries.length+' rows; all member cash balances reconcile to the cent.');
}
assert.equal(capture.sheets.length,3);assert.equal(total,122);console.log('Live captures: all 122 source transactions validated.');
