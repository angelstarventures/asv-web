import "server-only";
import { listMyRealEstateShares, listMyRealEstateAllocations, listMyRealEstatePositions, listMyRealEstateTransfers } from "@/lib/dataconnect/client";
import { RealEstateActiveTable, type RealEstateRow } from "@/components/RealEstateActiveTable";
import { RealEstateCompletedTable } from "@/components/RealEstateCompletedTable";
import { StatTile } from "@/components/StatTile";
import { formatCurrency, formatPercent,formatMoic } from "@/lib/money";
import { xirr, type CashFlow } from "@/lib/xirr";
import { realEstateSummaryUsd } from "@/lib/realEstateSummary";
async function loadRealEstateView(authUid: string) {
    const [{ realEstateMemberShares: shares }, { realEstateAllocations: allocations }, { realEstateMemberShares: positions }, { sales: transfers }] = await Promise.all([listMyRealEstateShares(authUid), listMyRealEstateAllocations(authUid), listMyRealEstatePositions(authUid), listMyRealEstateTransfers(authUid)]);
    const current = shares.filter(s => !s.supersededBy && s.investment.kind === 'UNDER_CONSTRUCTION');
    const reversed = new Set(allocations.flatMap(a => a.ledgerEntry.reversesEntry ? [a.ledgerEntry.reversesEntry.id] : []));
    const active = allocations.filter(a => !a.ledgerEntry.reversesEntry && !reversed.has(a.ledgerEntry.id));
    const allFlows: CashFlow[] = [];
    let committedUsd = 0, deployedUsd = 0, realizedUsd = 0, currentValueUsd = 0, contributedUsd = 0, distributedUsd = 0;
    const rows = current.map(s => {
        const p = s.investment, pos = positions.find(r => r.investment.id === p.id)?.investment;
        const totalShares = pos?.realEstateMemberShares_on_investment.reduce((n, r) => n + r.shareUnits, 0) ?? 0;
        const fraction = totalShares ? s.shareUnits / totalShares : 0;
        const entries = active.filter(a => a.ledgerEntry.investment.id === p.id);
        const sum = (types: string[], direction: number) => entries.filter(a => types.includes(a.ledgerEntry.type)).reduce((n, a) => n + a.amountUsd * (a.cashDirection ? direction * a.cashDirection : 1), 0);
        const deployed = sum(['DEVELOPER_PAYMENT', 'ACQUISITION_COST'], -1);
        const contributed = sum(['MEMBER_CONTRIBUTION'], 1) + entries.filter(a => a.ledgerEntry.fundedOutsideHub).reduce((n, a) => n + a.amountUsd, 0) + entries.filter(a => a.ledgerEntry.type === 'SHARE_TRANSFER' && a.cashDirection < 0).reduce((n, a) => n + a.amountUsd, 0);
        const distributed = sum(['DISTRIBUTION'], -1) + entries.filter(a => a.ledgerEntry.type === 'SHARE_TRANSFER' && a.cashDirection > 0).reduce((n, a) => n + a.amountUsd, 0);
        const cash = entries.filter(a => !a.ledgerEntry.fundedOutsideHub && !['VALUATION_MARK', 'SHARE_TRANSFER', 'STATUS_UPDATE'].includes(a.ledgerEntry.type)).reduce((n, a) => n + a.amountUsd * a.cashDirection, 0);
        const marks = pos?.realEstateLedgerEntries_on_investment ?? [];
        const reversedMarks = new Set(marks.flatMap(e => e.reversesEntry ? [e.reversesEntry.id] : []));
        const mark = marks.filter(e => e.type === 'VALUATION_MARK' && !e.reversesEntry && !reversedMarks.has(e.id)).at(-1)?.amountUsd;
        const closed = ['SOLD', 'WRITTEN_OFF', 'ARCHIVED'].includes(p.status);
        // Equity is paid-in capital plus unrealized appreciation; unpaid installments are a liability.
        const propertyDeployed = pos?.realEstateRollupCaches_on_investment[0]?.capitalDeployedUsd ?? 0;
        const equity = closed ? 0 : Math.max(0, (propertyDeployed + (mark == null ? 0 : mark - (p.totalPropertyCost ?? 0) / p.defaultFxRateToUsd)) * fraction);
        const value = cash + equity;
        const flows = entries.filter(a => ['MEMBER_CONTRIBUTION', 'DISTRIBUTION', 'SHARE_TRANSFER'].includes(a.ledgerEntry.type) || a.ledgerEntry.fundedOutsideHub).map(a => ({ date: new Date(a.ledgerEntry.eventDate), amount: a.ledgerEntry.fundedOutsideHub ? -a.amountUsd : a.ledgerEntry.type === 'MEMBER_CONTRIBUTION' ? -a.amountUsd * a.cashDirection : a.ledgerEntry.type === 'DISTRIBUTION' ? -a.amountUsd * a.cashDirection : a.amountUsd * a.cashDirection }));
        const profit = closed ? value + distributed - contributed : transfers.filter(t => t.ledgerEntry.investment.id === p.id).reduce((n, t) => n + t.ledgerEntry.amountUsd - t.sellerCostBasis - t.carryAmount, 0);
        const commitment = s.committedAmount ?? (p.totalPropertyCost ?? 0) * fraction;
        committedUsd += commitment / p.defaultFxRateToUsd;
        deployedUsd += deployed;
        realizedUsd += profit;
        currentValueUsd += value;
        contributedUsd += contributed;
        distributedUsd += distributed;
        allFlows.push(...flows);
        flows.push({ date: new Date(), amount: value });
        const summary=realEstateSummaryUsd({propertyCostNative:p.totalPropertyCost,commitmentNative:commitment,salePriceNative:p.salePrice,defaultFxRateToUsd:p.defaultFxRateToUsd,saleFxRateToUsd:entries.findLast(a=>a.ledgerEntry.type==='SALE')?.ledgerEntry.fxRateToUsd,deployedUsd:deployed,cashBalanceUsd:cash,profitUsd:profit});
        const row: RealEstateRow = { id: p.id, name: p.name, ...summary, firstInvestmentDate: p.firstInvestmentDate ?? entries.map(a => a.ledgerEntry.eventDate).sort()[0] ?? null, estimatedCompletionDate: p.estimatedCompletionDate ?? null, actualCompletionDate: p.actualCompletionDate ?? null, saleDate: p.saleDate ?? null, sharePercent: fraction, roi: contributed ? (value + distributed - contributed) / contributed : null, irr: xirr(flows), scheduleDocUrl: p.scheduleDocUrl ?? null, transactionSheetUrl: p.transactionSheetUrl ?? null };
        return { row, closed,hasValuation:mark!=null };
    });
    allFlows.push({ date: new Date(), amount: currentValueUsd });
    const moic=contributedUsd?(currentValueUsd+distributedUsd)/contributedUsd:null;
    return { rows, allFlows, committedUsd, deployedUsd, realizedUsd, currentValueUsd, contributedUsd, distributedUsd,moic };
}
export async function RealEstateView({ authUid }: {
    authUid: string;
}) {
    const { rows, allFlows, committedUsd, deployedUsd, realizedUsd, currentValueUsd, contributedUsd, distributedUsd,moic } = await loadRealEstateView(authUid);
    const atCostCount=rows.filter(r=>!r.closed&&!r.hasValuation).length;
    return <div className="space-y-8"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatTile label="Active / inactive investments" value={`${rows.filter(r => !r.closed).length} / ${rows.filter(r => r.closed).length}`} variant="green"/><StatTile label="Capital committed (USD)" value={formatCurrency(committedUsd)}/><StatTile label="Capital deployed (USD)" value={formatCurrency(deployedUsd)} variant="amber"/><StatTile label="Realized profit (USD)" value={formatCurrency(realizedUsd)}/><StatTile label="Actual portfolio value (USD)" value={formatCurrency(currentValueUsd)} sub="Includes cash held and paid-in equity" variant="violet"/><StatTile label="Investment multiple (MOIC)" value={moic==null?"\u2014":formatMoic(moic)}/><StatTile label="Portfolio ROI" value={formatPercent(contributedUsd ? (currentValueUsd + distributedUsd - contributedUsd) / contributedUsd : null)}/><StatTile label="Portfolio IRR" value={formatPercent(xirr(allFlows))}/></div>{atCostCount>0&&<p className="text-sm text-zinc-500">{atCostCount} active {atCostCount===1?"investment uses":"investments use"} cost as the current valuation. Updated market valuations are needed to reflect appreciation.</p>}<section className="space-y-3"><h2 className="text-sm font-medium text-zinc-500">Active investments</h2><RealEstateActiveTable rows={rows.filter(r => !r.closed).map(r => r.row)}/></section><section className="space-y-3"><h2 className="text-sm font-medium text-zinc-500">Completed investments</h2><RealEstateCompletedTable rows={rows.filter(r => r.closed).map(r => r.row)}/></section></div>;
}
