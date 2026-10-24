/* eslint-disable @typescript-eslint/no-require-imports -- Standalone server-page regression check. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');

const members = [
  { id: '00021', displayName: 'First member', authUid: 'first-uid' },
  { id: '00013', displayName: 'Second member', authUid: 'second-uid' },
  { id: '00002', displayName: 'Unlinked member', authUid: null },
];
const PortfolioView = () => null;
const RealEstateView = () => null;
const mocks = {
  '@/lib/dataconnect/client': { listAllMembers: async () => ({ members }) },
  '@/lib/dataconnect/generated': { Scenario: { BALANCED: 'BALANCED' } },
  '@/lib/scenarioTypes': { SCENARIOS: ['balanced'], SCOPES: ['mine', 'asv'] },
  '@/components/WelcomeBanner': { WelcomeBanner: () => null },
  '@/components/MemberPortfolioPicker': { MemberPortfolioPicker: () => null },
  '@/lib/portfolioView': { PortfolioView },
  '@/lib/realEstateView': { RealEstateView },
  '@/lib/portfolioTab': { parsePortfolioTab: () => 'overview' },
};
const filename = path.resolve('app/admin/portfolios/page.tsx');
const loaded = new Module(filename, module);
loaded.paths = module.paths;
loaded.require = name => Object.hasOwn(mocks, name) ? mocks[name] : require(name);
loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText, filename);

function find(tree, type) {
  if (!React.isValidElement(tree)) return [];
  return [...(tree.type === type ? [tree] : []), ...React.Children.toArray(tree.props.children).flatMap(child => find(child, type))];
}
async function main() {
  for (const member of members.slice(0, 2)) {
    // The organization-wide startup scope must never broaden the real-estate member scope.
    const tree = await loaded.exports.default({ searchParams: Promise.resolve({ memberId: member.id, scope: 'asv' }) });
    assert.equal(find(tree, PortfolioView)[0].props.authUid, member.authUid);
    const realEstate = find(tree, RealEstateView);
    assert.equal(realEstate.length, 1);
    assert.equal(realEstate[0].props.authUid, member.authUid);
  }
  for (const memberId of [undefined, 'unknown', '00002']) {
    const tree = await loaded.exports.default({ searchParams: Promise.resolve({ memberId }) });
    assert.equal(find(tree, RealEstateView).length, 0, 'No member query without a verified linked identity');
  }
  console.log('Admin portfolios: both asset views use the selected member; switching members and invalid/unlinked selections are scoped correctly.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
