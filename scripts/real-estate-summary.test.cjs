/* eslint-disable @typescript-eslint/no-require-imports -- Plain Node financial regression checks. */
const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');const Module=require('node:module');const path=require('node:path');
const filename=path.resolve('lib/realEstateSummary.ts');const m=new Module(filename,module);m.paths=module.paths;m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {nativeToUsd,realEstateSummaryUsd}=m.exports;
const row=realEstateSummaryUsd({propertyCostNative:400000,commitmentNative:100000,salePriceNative:600000,defaultFxRateToUsd:4,saleFxRateToUsd:5,deployedUsd:20800,cashBalanceUsd:2761.75,profitUsd:1234.56});
assert.deepEqual(row,{currency:'USD',totalPropertyCost:100000,commitment:25000,salePrice:120000,deployed:20800,cashBalance:2761.75,profit:1234.56});
assert.equal(nativeToUsd(1500,1),1500);assert.equal(nativeToUsd(null,4),null);assert.throws(()=>nativeToUsd(100,0));
const empty=realEstateSummaryUsd({propertyCostNative:null,commitmentNative:0,salePriceNative:null,defaultFxRateToUsd:4,deployedUsd:0,cashBalanceUsd:0,profitUsd:0});assert.equal(empty.totalPropertyCost,null);assert.equal(empty.salePrice,null);
const irrFile=path.resolve('lib/xirr.ts');const irrModule=new Module(irrFile,module);irrModule.paths=module.paths;irrModule._compile(ts.transpileModule(fs.readFileSync(irrFile,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,irrFile);
const flows=[{date:new Date('2025-01-01'),amount:-1000},{date:new Date('2026-01-01'),amount:1000}];assert(Math.abs(irrModule.exports.xirr(flows))<1e-7,'At-cost 1x value means 0% annual IRR');flows[1].amount=1100;assert(Math.abs(irrModule.exports.xirr(flows)-0.1)<1e-7,'A 10% gain over one year means 10% IRR');
console.log('USD summaries and performance: conversions, recorded sale rate, no double conversion, and 1x at cost = 0% IRR verified.');
