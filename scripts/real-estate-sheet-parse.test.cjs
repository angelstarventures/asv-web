/* eslint-disable @typescript-eslint/no-require-imports -- Plain Node CommonJS assertion harness. */
// Plain Node assertions. Fixtures below are synthetic examples of the documented layouts,
// NOT captures of the private live spreadsheets. Live TOTAL reconciliation is a release gate.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const Module=require('node:module');
const path=require('node:path');
const filename=path.resolve('functions/src/lib/realEstateSheetParse.ts');
const mod=new Module(filename,module);mod.filename=filename;mod.paths=module.paths;
mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {parseTransactionSheet:parse,splitMoney,money}=mod.exports;
const members=['Alice','Bob','Carol','Dan'].map((name,i)=>({id:String(i+1).padStart(5,'0'),displayName:name,investingEntityName:name+' LLC',email:name.toLowerCase()+'@test.example'}));
const opts={members,sheetId:'test',currency:'AED',defaultFxRateToUsd:3.67,config:{hubAliases:['QH','Qaizar Hassonjee'],developerAliases:['DAMAC'],investorColumnMap:Object.fromEntries(members.map(m=>[m.displayName,m.id]))},storedShares:members.map(m=>({memberId:m.id,shareUnits:1,effectiveFrom:'2024-01-01'}))};
const header=[' Date ','Transaction Description','From/To',' AED ','USD','Alice  ','Bob','Carol','Dan','Txn ID'];
const hills=[header,['','TOTAL==>',20,null,null,5,5,5,5],['9/15/24','Deposit','From Investors to QH',400,100,25,25,25,25,1],['9/16/24','Downpayment (20%-90K)','From Investors to DAMAC',-305200,-83200,null,null,null,null,2],['8/24/24','Expense','From QH to DAMAC',-320,-80,-20,-20,-20,-20,3]];
let out=parse(hills,opts);
assert.deepEqual(out.errors,[]);assert.equal(out.entries.length,3);assert(out.reconciliation.every(r=>r.matches));
const direct=out.entries[1];assert.equal(direct.type,'DEVELOPER_PAYMENT');assert(direct.fundedOutsideHub);assert(direct.allocations.every(a=>a.amountUsd===20800));
assert(out.reconciliation.every(r=>r.actual===5));assert(out.warnings.some(w=>w.kind==='INFERRED_SPLIT'));assert(!out.warnings.some(w=>w.kind==='YEAR_TYPO'));
assert.equal(out.entries.filter(e=>e.type==='DEVELOPER_PAYMENT').reduce((n,e)=>n+e.allocations[0].amountUsd,0),20820);
// Shares row and unequal units. Obligation is intentionally smaller than cash collected.
const islands=[header,['','Shares==>',2.5,null,null,1,1,0.5,0],['','TOTAL==>',50,null,null,20,20,10,0],['12/1/25','Receipt','From Investors to ASV',367,100,60,60,30,0,1],['12/2/25','1st (1%)','ASV to DAMAC',-367,-100,-40,-40,-20,0,2]];
const asv={...opts,config:{...opts.config,hubAliases:['ASV']}};
out=parse(islands,asv);assert.deepEqual(out.errors,[]);assert.equal(out.shares.reduce((n,s)=>n+s.shareUnits,0),2.5);assert.equal(out.entries[0].amountUsd,100);assert.equal(out.entries[0].allocations.reduce((n,a)=>n+a.amountUsd,0),150);
// Duplicate-looking installments remain distinct; fee refunds retain direction and type.
const islands2=[header,['','Shares==>',4,null,null,1,1,1,1],['','TOTAL==>',0,null,null,0,0,0,0],['4/10/26','1st installment','ASV to DAMAC',-400,-100,-25,-25,-25,-25,1],['4/10/26','2nd installment','ASV to DAMAC',-400,-100,-25,-25,-25,-25,2],['4/11/26','Nazral Mukam','',null,200,50,50,50,50,3]];
out=parse(islands2,asv);assert.deepEqual(out.errors,[]);assert.equal(out.entries.length,3);assert.notEqual(out.entries[0].hash,out.entries[1].hash);assert.equal(out.entries[2].type,'FEE_OR_CHARGE');assert.equal(out.entries[2].cashDirection,1);assert.equal(out.entries[2].amountNative,null);
const dates=[header,['','TOTAL==>',0,null,null,0,0,0,0],['11/10/25','a','',0,0,0,0,0,0,1],['11/11/28','b','',0,0,0,0,0,0,2],['11/12/25','c','',0,0,0,0,0,0,3],['1/16/26','d','',0,0,0,0,0,0,4],['1/17/25','e','',0,0,0,0,0,0,5],['1/18/26','f','',0,0,0,0,0,0,6],['','fee','',null,0,0,0,0,0,7],['2/2/26','later','',0,0,0,0,0,0,8],['1/21/26','out of order','',0,0,0,0,0,0,9]];
out=parse(dates,asv);assert.deepEqual(out.errors,[]);assert.equal(out.entries[1].eventDate,'2025-11-11');assert.equal(out.entries[4].eventDate,'2026-01-17');assert.equal(out.entries[6].eventDate,'2026-01-18');assert.equal(out.entries[8].eventDate,'2026-01-21');assert.equal(out.warnings.filter(w=>w.kind==='YEAR_TYPO').length,2);assert(out.warnings.some(w=>w.kind==='MISSING_DATE'));assert(out.entries[1].description.includes('2028-11-11'));
const serial=structuredClone(hills);serial[2][0]=45550;out=parse(serial,opts);assert.equal(out.entries[0].eventDate,'2024-09-15');
const idMoved=structuredClone(hills);idMoved.splice(2,0,[]);assert.equal(parse(hills,opts).entries[0].hash,parse(idMoved,opts).entries[0].hash);
const edited=structuredClone(hills);edited[2][5]=26;assert.notEqual(parse(edited,opts).entries[0].hash,parse(hills,opts).entries[0].hash);assert(parse(edited,opts).errors.some(s=>s.includes('mismatch')));
const duplicate=structuredClone(hills);duplicate[3][9]=1;assert(parse(duplicate,opts).errors.some(s=>s.includes('unique')));
const blank=structuredClone(hills);blank[2][9]='';assert(parse(blank,opts).errors.some(s=>s.includes('non-blank')));
const legacy=hills.map(r=>r.slice(0,9));assert.equal(parse(legacy,opts).entries[0].rowKey,'row:3');
const namedId=structuredClone(hills);namedId[0][9]='Transaction ID';assert.equal(parse(namedId,opts).entries[0].rowKey,'1');
const fractional=[header,['','TOTAL==>',1,null,null,1/3,1/3,1/3,0],['1/1/26','Formula split','From Investors to QH',null,1,1/3,1/3,1/3,0,1]];
assert.deepEqual(parse(fractional,opts).errors,[],'Do not sum individually rounded investor totals for the checksum');
const fractionalRows=[header,['','TOTAL==>',1,null,null,1,0,0,0],...[1,2,3].map(id=>['1/1/26','Fractional movement','From Investors to QH',null,1/3,1/3,0,0,0,id])];
assert.deepEqual(parse(fractionalRows,opts).errors,[],'Do not round every formula-derived transaction before summing');
const unmapped=parse(hills,{...opts,config:{hubAliases:['QH']}});assert.equal(unmapped.unresolvedInvestorLabels.length,4);assert.equal(unmapped.proposedInvestorColumnMap.Alice,'00001');
const nativeOnly=structuredClone(hills);nativeOnly[2][4]='';assert.equal(parse(nativeOnly,opts).entries[0].amountUsd,100);
const usdOnly=hills.map(r=>r.filter((_,i)=>i!==3));out=parse(usdOnly,{...opts,currency:'USD',defaultFxRateToUsd:1});assert.equal(out.currency,'USD');assert.equal(out.entries[0].amountNative,100);assert.equal(out.unresolvedInvestorLabels.length,0);
const neither=structuredClone(hills);neither[2][3]='';neither[2][4]='';assert.equal(parse(neither,opts).entries[0].amountUsd,100);
const zero=structuredClone(islands);zero[3][8]=1;assert(parse(zero,asv).warnings.some(w=>w.kind==='ZERO_SHARE_HISTORY'));
const noSplit=structuredClone(hills);assert(parse(noSplit,{...opts,storedShares:[]}).errors.some(s=>s.includes('share units')));
const invalid=structuredClone(hills);invalid[2][4]='bad';assert(parse(invalid,opts).errors.some(s=>s.includes('Invalid amount')));
assert.equal(money(' $ (20,000)'),-20000);assert.equal(money('-$1,068,095'),-1068095);assert.equal(money('14000'),14000);assert.equal(money(null),null);assert.throws(()=>money('n/a'));
for(const amount of [0.01,0.02,1,100.01,83200]){const split=splitMoney(amount,[{memberId:'a',shareUnits:1},{memberId:'b',shareUnits:1},{memberId:'c',shareUnits:.5}]);assert.equal(split.reduce((n,s)=>n+Math.round(s.amountUsd*100),0),Math.round(amount*100));}
console.log('Real-estate parser: all assertions passed (synthetic Hills 2 / Islands / Islands 2 layouts and edge cases).');
