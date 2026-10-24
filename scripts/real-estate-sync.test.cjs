/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS harness with explicit I/O doubles. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const Module=require('node:module');
function load(file,mocks={}){
  const filename=path.resolve(file),mod=new Module(filename,module);mod.paths=module.paths;
  mod.require=name=>name in mocks?mocks[name]:require(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
  return mod.exports;
}
const inputs=load('functions/src/lib/realEstateInputs.ts',{'zod':require('../functions/node_modules/zod')});
assert.equal(inputs.memberId.parse('00001'),'00001');
assert(!inputs.memberId.safeParse('1').success);
assert(!inputs.memberId.safeParse('11111111-1111-4111-8111-111111111111').success);
const configSchema=inputs.fields.shape.sheetConfig;
assert(configSchema.safeParse({investorColumnMap:{Alice:'00001'}}).success);
assert(!configSchema.safeParse({investorColumnMap:{Alice:'11111111-1111-4111-8111-111111111111'}}).success);
const parser=load('functions/src/lib/realEstateSheetParse.ts');
const id='11111111-1111-4111-8111-111111111111';
const members=[{id:'00001',displayName:'Alice',email:'alice@example.test'},{id:'00002',displayName:'Bob',email:'bob@example.test'}];
const p={id,currency:'AED',default_fx_rate_to_usd:4,transaction_sheet_id:'sheet',sheet_config:{hubAliases:['QH'],developerAliases:['DAMAC'],investorColumnMap:{Alice:'00001',Bob:'00002'}}};
let grid=[['Date','Transaction Description','From/To','AED','USD','Alice','Bob','Txn ID'],['','TOTAL==>',100,null,null,50,50],['1/1/26','Deposit','From Investors to QH',400,100,50,50,1]];
let ledger=[],audits=[],writes=0,schedule=[];
const shareWrites=[];
const oldRows=()=>ledger.filter(e=>!e.reversal&&!ledger.some(r=>r.reversal===e.id)).map(e=>({id:e.id,key:e.entry.rowKey,hash:e.entry.hash}));
async function query(sql,args=[]){
  if(sql.startsWith('SELECT * FROM real_estate_investment'))return [p];
  if(sql.startsWith('SELECT id FROM real_estate_investment'))return [{id}];
  if(sql.includes('FROM member WHERE id = ANY'))return members.filter(m=>args[0].includes(m.id));
  if(sql.includes('FROM member'))return members;
  if(sql.startsWith('INSERT INTO real_estate_member_share')){shareWrites.push(args);return [];}
  if(sql.startsWith('UPDATE real_estate_member_share'))return [];
  if(sql.includes('FROM real_estate_member_share'))return [];
  if(sql.includes('FROM real_estate_payment_schedule'))return schedule;
  if(sql.startsWith('SELECT e.id,'))return oldRows();
  if(sql.startsWith('SELECT * FROM real_estate_ledger_entry')){
    const e=ledger.find(e=>e.id===args[0]).entry;
    return [{type:e.type,event_date:new Date(e.eventDate),amount_usd:e.amountUsd,amount_native:e.amountNative,fx_rate_to_usd:e.fxRateToUsd,currency:e.currency,counterparty:e.counterparty,description:e.description,funded_outside_hub:e.fundedOutsideHub,cash_direction:e.cashDirection}];
  }
  if(sql.includes('FROM real_estate_allocation'))return ledger.find(e=>e.id===args[0]).entry.allocations.map(a=>({...a,cashDirection:-a.cashDirection}));
  if(sql.startsWith('INSERT INTO real_estate_sheet_sync_run')){audits.push(args);return [];}
  throw new Error('Unexpected SQL: '+sql);
}
class HttpsError extends Error {constructor(code,message){super(message);this.code=code;}}
const service=load('functions/src/lib/realEstateService.ts',{
  'firebase-functions/v2/https':{HttpsError},
  './dataconnect-admin':{query,withTransaction:async fn=>{const snapshot=structuredClone({ledger,audits,writes});try{return await fn({query:async(sql,args)=>({rows:await query(sql,args)})});}catch(e){ledger=snapshot.ledger;audits=snapshot.audits;writes=snapshot.writes;throw e;}}},
  './realEstateSheetParse':parser,'./sheets':{readFirstTransactionSheet:async()=>({grid,revision:'revision'})},
  './realEstateLedgerWrites':{writeRealEstateEntry:async(_client,_investment,_member,entry,reversal=null)=>{const entryId='entry-'+(++writes);ledger.push({id:entryId,entry:structuredClone(entry),reversal});return entryId;}},
  './realEstateInputs':inputs
});
(async()=>{
  const client={query:async(sql,args)=>({rows:await query(sql,args)})};
  await assert.rejects(()=>service.setShares(client,id,'00003','2026-01-01',[{memberId:'99999',shareUnits:1}]),e=>e.code==='invalid-argument');
  assert.equal(shareWrites.length,0,'Unknown member must not create a share or Member record');
  await service.setShares(client,id,'00003','2026-01-01',[{memberId:'00001',shareUnits:1},{memberId:'00002',shareUnits:1}]);
  assert.deepEqual(shareWrites.map(args=>args[2]),['00001','00002']);
  let preview=await service.sheetPreview(id);assert.equal(writes,0);assert.equal(audits.length,0);assert.equal(preview.rows[0].classification,'NEW');
  await service.commitSheet(id,'00003',preview.token,false);assert.equal(writes,1);assert.equal(audits.length,1);
  preview=await service.sheetPreview(id);assert.equal(preview.rows[0].classification,'UNCHANGED');
  await service.commitSheet(id,'00003',preview.token,false);assert.equal(writes,1,'Unchanged sync must not append ledger entries');
  const stale=preview.token;grid[2][1]='Edited description';preview=await service.sheetPreview(id);assert.equal(preview.rows[0].classification,'CHANGED');
  await assert.rejects(()=>service.commitSheet(id,'00003',stale,false),e=>e.code==='failed-precondition');assert.equal(writes,1);
  await service.commitSheet(id,'00003',preview.token,false);assert.equal(writes,3);assert.equal(ledger[0].entry.description,'Deposit');assert.equal(ledger[1].reversal,'entry-1');assert.equal(ledger[1].entry.amountUsd,100);assert.equal(ledger[1].entry.cashDirection,-1);assert(ledger[1].entry.allocations.every(a=>a.cashDirection===-1));assert(ledger[1].entry.needsReview);assert(ledger[2].entry.needsReview);
  preview=await service.sheetPreview(id);assert.equal(preview.rows[0].classification,'UNCHANGED');assert.equal(preview.orphaned.length,0);
  // A warning acknowledgement is checked again inside the committing transaction.
  grid.push(['1/2/26','Unknown counterparty','Unrecognized',0,0,0,0,2]);preview=await service.sheetPreview(id);assert(preview.warnings.length);
  await assert.rejects(()=>service.commitSheet(id,'00003',preview.token,false),e=>e.code==='failed-precondition');assert.equal(writes,3);
  await service.commitSheet(id,'00003',preview.token,true);assert.equal(writes,4);
  grid.pop();preview=await service.sheetPreview(id);assert.equal(preview.orphaned.length,1);assert.equal(writes,4,'Orphan detection must never delete ledger history');
  schedule=[{installment_code:'I001',total:360}];grid[1][2]=-100;grid[1][5]=-50;grid[1][6]=-50;grid[2]=['1/1/26','1st installment','QH to DAMAC',-400,-100,-50,-50,1];preview=await service.sheetPreview(id);assert(preview.warnings.some(w=>w.kind==='SCHEDULE_AMOUNT_DIFFERENCE'));assert(preview.entries[0].needsReview);assert.equal(preview.entries[0].amountNative,400,'Preserve source amount when schedule differs');
  schedule=[{installment_code:'I026',total:999}];grid[2][1]='Aug-26 installment';preview=await service.sheetPreview(id);assert(!preview.warnings.some(w=>w.kind==='SCHEDULE_AMOUNT_DIFFERENCE'),'Month/year text must not be parsed as an installment number');
  console.log('Real-estate sync: preview, idempotency, stale-preview rejection, append-only correction, warning acknowledgement, schedule differences and orphan assertions passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
