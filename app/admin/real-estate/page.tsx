import Link from "next/link";
import { listRealEstateInvestments } from "@/lib/dataconnect/client";
import { formatCurrency } from "@/lib/money";
import { nativeToUsd } from "@/lib/realEstateSummary";
export const dynamic = 'force-dynamic';
export default async function RealEstateAdminPage() {
    const { realEstateInvestments } = await listRealEstateInvestments();
    return <div className="flex flex-col gap-6 px-6 py-10"><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-xl font-semibold tracking-tight">Real estate</h1><Link className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background" href="/admin/real-estate/new">Add investment</Link></div>
  {!realEstateInvestments.length && <p className="text-zinc-500">No investments yet. Add a property to configure its shares, payment schedule and sheet sync.</p>}
  <div className="flex flex-col gap-3">{realEstateInvestments.map(p => <article key={p.id} className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-4"><div className="space-y-2"><h2 className="text-lg font-semibold tracking-tight"><Link href={`/admin/real-estate/${p.id}`} className="underline">{p.name}</Link></h2><p className="text-sm text-zinc-500">{p.status} · {formatCurrency(nativeToUsd(p.totalPropertyCost, p.defaultFxRateToUsd), 'USD') + ' USD'}</p><div className="flex gap-4 text-sm">{p.scheduleDocUrl && <a href={p.scheduleDocUrl} target="_blank" rel="noreferrer" className="underline">Payment schedule</a>}{p.transactionSheetUrl && <a href={p.transactionSheetUrl} target="_blank" rel="noreferrer" className="underline">Transaction sheet</a>}</div></div><Link href={`/admin/real-estate/${p.id}#sync`} className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium">Sync from sheet</Link></article>)}</div></div>;
}
