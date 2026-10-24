"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { realEstateSetShares, realEstateImportSchedule, realEstateRecordEntry, realEstateUpdateInvestment, type RecordRealEstateEntryInput, type InvestmentFields } from "@/lib/functions/realEstate";
import type { GetRealEstateInvestmentByIdData, ListRealEstateLedgerEntriesData } from "@/lib/dataconnect/generated";
import { formatCurrency } from "@/lib/money";
const control = 'rounded-md border border-zinc-300 bg-card px-3 py-1.5 text-sm';
export function RealEstateAdminEditors({ investment, members, currentShares }: {
    investment: NonNullable<GetRealEstateInvestmentByIdData['realEstateInvestment']>;
    members: {
        id: string;
        displayName: string;
    }[];
    currentShares: {
        memberId: string;
        shareUnits: number;
        committedAmount?: number | null;
    }[];
}) {
    const router = useRouter(), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [roster, setRoster] = useState(currentShares), [date, setDate] = useState(new Date().toISOString().slice(0, 10)), [csv, setCsv] = useState('installmentCode,milestoneLabel,eventDate,dueDate,percent,amountDue,vat,total\n'), [type, setType] = useState<RecordRealEstateEntryInput['type']>('VALUATION_MARK');
    async function action(fn: () => Promise<unknown>) { setBusy(true); setMessage(''); try {
        await fn();
        setMessage('Saved.');
        router.refresh();
    }
    catch (e) {
        setMessage((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    function record(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const f = new FormData(e.currentTarget); void action(() => realEstateRecordEntry({ investmentId: investment.id, type, eventDate: String(f.get('date')), amountNative: Number(f.get('amount')), fxRateToUsd: Number(f.get('fx')), description: String(f.get('description')), fromMemberId: type === 'SHARE_TRANSFER' ? String(f.get('from')) : undefined, toMemberId: type === 'SHARE_TRANSFER' ? String(f.get('to')) : undefined, shareUnits: type === 'SHARE_TRANSFER' ? Number(f.get('units')) : undefined, sellingCosts: type === 'SALE' ? Number(f.get('costs')) : undefined })); }
    function edit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const f = new FormData(e.currentTarget); const fields: Partial<InvestmentFields> = {}; for (const key of ['name', 'developerName', 'projectName', 'locationLabel', 'unitIdentifier', 'publicBlurb', 'scheduleDocUrl', 'transactionSheetUrl'] as const)
        fields[key] = String(f.get(key) ?? ''); fields.showPublicly = f.has('public'); fields.carryPercent = Number(f.get('carryPercent')); fields.totalPropertyCost = Number(f.get('totalPropertyCost')); fields.estimatedCompletionDate = String(f.get('estimatedCompletionDate')) || null; fields.actualCompletionDate = String(f.get('actualCompletionDate')) || null; void action(() => realEstateUpdateInvestment({ investmentId: investment.id, fields })); }
    return <div className="space-y-6">
    <details className="rounded-xl border border-zinc-200 bg-card p-4 text-sm"><summary className="cursor-pointer text-sm font-medium">Edit property and public showcase</summary><form onSubmit={edit} className="mt-4 grid gap-3 md:grid-cols-2">{(['name', 'developerName', 'projectName', 'locationLabel', 'unitIdentifier', 'publicBlurb', 'scheduleDocUrl', 'transactionSheetUrl'] as const).map(key => <label key={key} className="grid gap-1 text-sm">{key}<input className={control} name={key} defaultValue={investment[key] ?? ''} required={['name', 'scheduleDocUrl', 'transactionSheetUrl'].includes(key)}/></label>)}{(['carryPercent', 'totalPropertyCost'] as const).map(key => <label key={key} className="grid gap-1 text-sm">{key}<input className={control} type="number" step="any" min="0" name={key} defaultValue={investment[key] ?? 0}/></label>)}{(['estimatedCompletionDate', 'actualCompletionDate'] as const).map(key => <label key={key} className="grid gap-1 text-sm">{key}<input className={control} type="date" name={key} defaultValue={investment[key] ?? ''}/></label>)}<label><input type="checkbox" name="public" defaultChecked={investment.showPublicly}/> Show publicly</label><button disabled={busy} className={control}>Save property</button></form></details>
    <section className="space-y-3 rounded-xl border border-zinc-200 bg-card p-4 text-sm"><h2 className="text-sm font-semibold">Share units</h2><p className="text-sm text-zinc-500">Save a complete ownership generation. Keep departed members at zero shares. Record later member sales as share transfers.</p><label className="grid gap-1">Effective from<input className={control} type="date" value={date} onChange={e => setDate(e.target.value)}/></label>
    {roster.map((s, i) => <div key={i} className="grid gap-2 sm:grid-cols-3"><select aria-label="Member" value={s.memberId} className={control} onChange={e => setRoster(rows => rows.map((r, j) => j === i ? { ...r, memberId: e.target.value } : r))}><option value="">Choose member</option>{members.map(m => <option key={m.id} value={m.id}>{m.displayName}</option>)}</select><input aria-label="Share units" className={control} type="number" min="0" step="any" value={s.shareUnits} onChange={e => setRoster(rows => rows.map((r, j) => j === i ? { ...r, shareUnits: Number(e.target.value) } : r))}/><input aria-label="Committed amount (native), optional" placeholder="Commitment (native), optional" className={control} type="number" min="0" step="0.01" value={s.committedAmount ?? ''} onChange={e => setRoster(rows => rows.map((r, j) => j === i ? { ...r, committedAmount: e.target.value === '' ? null : Number(e.target.value) } : r))}/></div>)}
    <p className="text-sm">Total units: {roster.reduce((s, r) => s + r.shareUnits, 0)} · {roster.map(r => `${members.find(m => m.id === r.memberId)?.displayName ?? 'Member'} ${((r.shareUnits / (roster.reduce((s, r) => s + r.shareUnits, 0) || 1)) * 100).toFixed(2)}%`).join(' · ')}</p><button className={control} onClick={() => setRoster(r => [...r, { memberId: '', shareUnits: 0 }])}>Add member</button>{' '}<button disabled={busy} className={control} onClick={() => action(() => realEstateSetShares({ investmentId: investment.id, effectiveFrom: date, shares: roster }))}>Save share generation</button></section>
    <section className="space-y-3 rounded-xl border border-zinc-200 bg-card p-4 text-sm"><h2 className="text-sm font-semibold">Import payment schedule</h2><p className="text-sm">Paste CSV or TSV with the headers below. Import replaces the schedule. Use YYYY-MM-DD dates.</p><textarea aria-label="Schedule CSV or TSV" className="min-h-40 w-full rounded-lg border p-3 font-mono text-sm" value={csv} onChange={e => setCsv(e.target.value)}/><button disabled={busy} className={control} onClick={() => action(() => realEstateImportSchedule({ investmentId: investment.id, text: csv }))}>Replace schedule</button></section>
    <section className="space-y-3 rounded-xl border border-zinc-200 bg-card p-4 text-sm"><h2 className="text-sm font-semibold">Record ledger entry</h2><form onSubmit={record} className="grid gap-3 md:grid-cols-2"><label className="grid gap-1">Type<select className={control} value={type} onChange={e => setType(e.target.value as typeof type)}>{['VALUATION_MARK', 'SHARE_TRANSFER', 'SALE', 'DISTRIBUTION', 'CARRY', 'STATUS_UPDATE'].map(t => <option key={t}>{t}</option>)}</select></label><label className="grid gap-1">Date<input required name="date" type="date" defaultValue={date} className={control}/></label><label className="grid gap-1">Amount ({investment.currency})<input required className={control} type="number" min="0" step="0.01" name="amount"/></label><label className="grid gap-1">Native units per USD<input required className={control} type="number" min="0.000001" step="any" defaultValue={investment.defaultFxRateToUsd} name="fx"/></label><label className="grid gap-1 md:col-span-2">Description<input name="description" className={control}/></label>
    {type === 'SALE' && <label className="grid gap-1">Selling costs ({investment.currency})<input name="costs" defaultValue="0" type="number" min="0" step="0.01" className={control}/></label>}
    {type === 'SHARE_TRANSFER' && <>{['from', 'to'].map(key => <label className="grid gap-1" key={key}>{key === 'from' ? 'Seller' : 'Buyer'}<select name={key} required className={control}><option value="">Choose member</option>{members.map(m => <option key={m.id} value={m.id}>{m.displayName}</option>)}</select></label>)}<label className="grid gap-1">Units transferred<input name="units" required min="0.000001" step="any" type="number" className={control}/></label><p className="text-sm">Amount is the total price. Seller carry is computed from ledger cost basis.</p></>}
    <button disabled={busy} className={control}>Record entry</button></form></section>
    {message && <p role="status">{message}</p>}
  </div>;
}
export function RealEstateAdminLedger({ rows, currency }: {
    rows: ListRealEstateLedgerEntriesData['realEstateLedgerEntries'];
    currency: string;
}) {
    const [review, setReview] = useState(false);
    return <section className="space-y-3 rounded-xl border border-zinc-200 bg-card p-4 text-sm"><h2 className="text-sm font-semibold">Ledger</h2><label className="flex gap-2"><input type="checkbox" checked={review} onChange={e => setReview(e.target.checked)}/>Needs review only</label><div className="max-h-[36rem] overflow-auto"><table className="w-full text-left text-sm"><thead><tr>{['Date', 'Type', 'Description', currency, 'USD', 'Review'].map(h => <th className="p-2" key={h}>{h}</th>)}</tr></thead><tbody>{rows.filter(r => !review || r.needsReview).map(r => <tr key={r.id} className="border-t"><td className="p-2">{r.eventDate}</td><td>{r.type}{r.reversesEntry ? ' (reversal)' : ''}</td><td className="max-w-sm p-2">{r.description}{r.fundedOutsideHub && <span className="block text-xs">Paid outside hub</span>}</td><td>{formatCurrency(r.amountNative, currency)}</td><td>{formatCurrency(r.amountUsd)}</td><td>{r.needsReview ? 'Review' : ''}</td></tr>)}</tbody></table></div></section>;
}
