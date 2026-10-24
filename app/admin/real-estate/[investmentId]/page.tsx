import { notFound } from "next/navigation";
import { getRealEstateInvestmentById, listRealEstatePaymentSchedule, listRealEstateLedgerEntries, listRealEstateShares, listAllMembers } from "@/lib/dataconnect/client";
import { RealEstateSyncPanel } from "@/components/RealEstateSyncPanel";
import { RealEstateAdminEditors, RealEstateAdminLedger } from "@/components/RealEstateAdminEditors";
import { formatCurrency } from "@/lib/money";
export const dynamic = 'force-dynamic';
export default async function InvestmentAdminPage({ params }: {
    params: Promise<{
        investmentId: string;
    }>;
}) {
    const { investmentId } = await params;
    const [{ realEstateInvestment: p }, { realEstatePaymentSchedules: schedule }, { realEstateLedgerEntries: ledger }, { realEstateMemberShares: shares }, { members }] = await Promise.all([getRealEstateInvestmentById({ id: investmentId }), listRealEstatePaymentSchedule({ investmentId }), listRealEstateLedgerEntries({ investmentId }), listRealEstateShares({ investmentId }), listAllMembers()]);
    if (!p)
        notFound();
  // Newly attached schedules can reveal review findings on existing immutable ledger rows.
  // Derive the display flag rather than updating their historical money/provenance fields.
  const reviewedLedger=ledger.map(row=>{
    const match=/\b(\d+)(?:st|nd|rd|th)\s*installment/i.exec(row.description??'');
    const expected=match?schedule.find(s=>s.installmentCode==='I'+match[1].padStart(3,'0')):null;
    return {...row,needsReview:row.needsReview || (row.type==='DEVELOPER_PAYMENT' && row.amountNative!=null && !!expected && Math.round(row.amountNative*100)!==Math.round(expected.total*100))};
  });
    return <div className="flex flex-col gap-6 px-6 py-10"><h1 className="text-xl font-semibold tracking-tight">{p.name}</h1><div className="flex flex-wrap gap-4 text-sm">{p.scheduleDocUrl && <a className="underline" target="_blank" rel="noreferrer" href={p.scheduleDocUrl}>Payment schedule</a>}{p.transactionSheetUrl && <a className="underline" target="_blank" rel="noreferrer" href={p.transactionSheetUrl}>Transaction sheet</a>}{p.driveFolderUrl && <a className="underline" target="_blank" rel="noreferrer" href={p.driveFolderUrl}>Investment folder</a>}</div>
  <RealEstateAdminEditors investment={p} members={members} currentShares={shares.filter(s => !s.supersededBy).map(s => ({ memberId: s.member.id, shareUnits: s.shareUnits, committedAmount: s.committedAmount }))}/>
  <section className="space-y-3 rounded-xl border border-zinc-200 bg-card p-4"><h2 className="text-sm font-semibold">Payment schedule</h2><div className="overflow-auto"><table className="w-full text-left text-sm"><thead><tr>{['Code', 'Milestone', 'Due', '%', 'Amount', 'VAT', 'Total'].map(h => <th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{schedule.map(r => <tr key={r.id} className="border-t"><td className="p-2">{r.installmentCode}</td><td>{r.milestoneLabel}</td><td>{r.dueDate ?? r.eventDate}</td><td>{r.percent}</td><td>{formatCurrency(r.amountDue, p.currency)}</td><td>{formatCurrency(r.vat, p.currency)}</td><td>{formatCurrency(r.total, p.currency)}</td></tr>)}</tbody></table></div></section>
  <RealEstateSyncPanel investmentId={p.id} members={members}/><RealEstateAdminLedger rows={reviewedLedger} currency={p.currency}/></div>;
}
