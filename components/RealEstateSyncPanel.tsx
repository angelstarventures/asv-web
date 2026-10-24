"use client";
import { useEffect,useState } from "react";
import { useRouter } from "next/navigation";
import { realEstateSheetPreview, realEstateSheetSync, realEstateUpdateInvestment, type SheetPreview, type SheetConfig } from "@/lib/functions/realEstate";
import { formatCurrency } from "@/lib/money";
export function RealEstateSyncPanel({ investmentId, initialConfig, members }: {
    investmentId: string;
    initialConfig?: string | null;
    members: {
        id: string;
        displayName: string;
    }[];
}) {
    const router = useRouter(), [config, setConfig] = useState(initialConfig || '{"hubAliases":["ASV"],"developerAliases":["DAMAC"],"investorColumnMap":{}}'), [preview, setPreview] = useState<SheetPreview | null>(null), [busy, setBusy] = useState(false), [ack, setAck] = useState(false), [message, setMessage] = useState(''), [mapping, setMapping] = useState<Record<string, string>>({});
    const [loaded,setLoaded]=useState(!!initialConfig);
    useEffect(()=>{
        if(initialConfig)return;
        let active=true;
        // JSONB configuration is read through the admin callable; Data Connect's String
        // scalar cannot serialize a native Postgres jsonb object.
        realEstateUpdateInvestment({investmentId,fields:{}}).then(result=>{if(active){setConfig(result.sheetConfig);setLoaded(true);}}).catch(error=>{if(active)setMessage((error as Error).message);});
        return()=>{active=false;};
    },[investmentId,initialConfig]);
    async function action(fn: () => Promise<void>) { setBusy(true); setMessage(''); try {
        await fn();
    }
    catch (e) {
        setMessage((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    return <section id="sync" className="space-y-4 rounded-xl border border-zinc-200 bg-card p-4 text-sm"><h2 className="text-sm font-semibold">Sheet configuration and sync</h2>
    <p className="text-sm text-zinc-500">Only the first tab is read. Configure hub aliases and confirm each investor column before syncing.</p>
    <label className="grid gap-2">Sheet configuration (JSON)<textarea disabled={!loaded||busy} className="min-h-40 rounded-lg border p-3 font-mono text-sm" value={config} onChange={e => { setConfig(e.target.value); setPreview(null); }}/></label>
    <button disabled={busy||!loaded} className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium" onClick={() => action(async () => { await realEstateUpdateInvestment({ investmentId, fields: { sheetConfig: JSON.parse(config) } }); setPreview(null); setMessage('Configuration saved.'); router.refresh(); })}>Save configuration</button>{' '}
    <button disabled={busy||!loaded} className="rounded-full bg-foreground px-4 py-2 text-background" onClick={() => action(async () => { await realEstateUpdateInvestment({ investmentId, fields: { sheetConfig: JSON.parse(config) } }); const p = await realEstateSheetPreview({ investmentId }); setPreview(p); setMapping(p.proposedInvestorColumnMap); setAck(false); })}>{!loaded?'Loading configuration…':busy ? 'Working…' : 'Preview'}</button>
    {preview && <>
      {!!preview.unresolvedInvestorLabels.length && <div className="space-y-3 rounded-xl border border-amber-400 p-4"><h3 className="font-semibold">Confirm investor mapping</h3>{preview.unresolvedInvestorLabels.map(label => <label className="grid gap-1" key={label}>{label}<select className="rounded border p-2" value={mapping[label] ?? ''} onChange={e => setMapping(m => ({ ...m, [label]: e.target.value }))}><option value="">Choose member</option>{members.map(m => <option key={m.id} value={m.id}>{m.displayName}</option>)}</select></label>)}<button disabled={busy || preview.unresolvedInvestorLabels.some(l => !mapping[l])} className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium" onClick={() => action(async () => { const next: SheetConfig = JSON.parse(config); next.investorColumnMap = { ...next.investorColumnMap, ...mapping }; await realEstateUpdateInvestment({ investmentId, fields: { sheetConfig: next } }); setConfig(JSON.stringify(next, null, 2)); setPreview(null); setMessage('Mapping saved. Preview again to reconcile.'); router.refresh(); })}>Confirm and save mapping</button></div>}
      {preview.errors.map((error, i) => <p key={i} role="alert" className="text-red-700">{error}</p>)}
      <div className="max-h-96 overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Row</th><th>Status</th><th>Description</th></tr></thead><tbody>{preview.rows.map(r => <tr className="border-t" key={r.rowKey}><td className="p-2">{r.rowNumber}</td><td>{r.classification}</td><td>{r.description}</td></tr>)}{preview.orphaned.map(r => <tr key={r.rowKey}><td className="p-2">{r.rowKey}</td><td>ORPHANED</td><td>Reported; retained in ledger</td></tr>)}</tbody></table></div>
      <h3 className="font-semibold">Cash reconciliation (USD)</h3><div className="overflow-auto"><table className="w-full text-sm"><thead><tr><th>Member</th><th>Sheet</th><th>Computed</th><th>Result</th></tr></thead><tbody>{preview.reconciliation.map(r => <tr key={r.memberId}><td>{members.find(m => m.id.replaceAll('-', '') === r.memberId.replaceAll('-', ''))?.displayName ?? r.memberId}</td><td>{formatCurrency(r.expected)}</td><td>{formatCurrency(r.actual)}</td><td>{r.matches ? 'Matches' : 'Mismatch'}</td></tr>)}</tbody></table></div>
      {!!preview.warnings.length && <div className="space-y-3 rounded-xl border border-amber-400 p-4"><h3 className="font-semibold">Data-quality findings</h3>{preview.warnings.map((w, i) => <div key={i} className="text-sm"><p className="font-medium">Row {w.rowNumber} · {w.kind}</p><p className="break-all">{JSON.stringify(w.rawValue)} → {JSON.stringify(w.correctedValue)}</p><p>{w.explanation}</p></div>)}<label className="flex gap-2"><input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)}/>I reviewed and acknowledge these findings.</label></div>}
      <button disabled={busy || !!preview.errors.length || !!preview.unresolvedInvestorLabels.length || (!!preview.warnings.length && !ack)} className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background disabled:opacity-40" onClick={() => action(async () => { const r = await realEstateSheetSync({ investmentId, previewToken: preview.token, acknowledgeWarnings: ack }); setPreview(null); setMessage(`Imported ${r.imported}; corrected ${r.corrected}.`); router.refresh(); })}>Sync reviewed preview</button>
    </>}{message && <p role="status" className="whitespace-pre-wrap">{message}</p>}
  </section>;
}
