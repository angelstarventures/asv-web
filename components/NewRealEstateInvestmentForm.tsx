"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { realEstateCreateInvestment, type BrochureFile, type InvestmentFields } from "@/lib/functions/realEstate";
import { readFileAsBase64 } from "@/lib/files";
const textFields = [['name', 'Investment name'], ['scheduleDocUrl', 'Payment schedule URL'], ['transactionSheetUrl', 'Transaction sheet URL'], ['developerName', 'Developer'], ['projectName', 'Project'], ['locationLabel', 'Location'], ['unitIdentifier', 'Unit identifier'], ['publicBlurb', 'Public description']] as const;
export function NewRealEstateInvestmentForm() {
    const router = useRouter(), [busy, setBusy] = useState(false), [error, setError] = useState('');
    async function submit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setBusy(true);
        setError('');
        const f = new FormData(e.currentTarget);
        try {
            const file = f.get('brochure') as File | null;
            let brochure: BrochureFile | undefined;
            if (file?.size) {
                if (file.size > 5000000 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
                    throw new Error('Choose a PNG, JPEG or WebP image up to 5 MB.');
                brochure = { filename: file.name, mimeType: file.type as BrochureFile['mimeType'], contentBase64: await readFileAsBase64(file) };
            }
            const data = { ...Object.fromEntries(textFields.map(([key]) => [key, String(f.get(key) ?? '').trim()])), kind: 'UNDER_CONSTRUCTION', currency: String(f.get('currency')).toUpperCase(), defaultFxRateToUsd: Number(f.get('fx')), carryPercent: Number(f.get('carry')), totalPropertyCost: Number(f.get('cost')), firstInvestmentDate: String(f.get('first')) || null, estimatedCompletionDate: String(f.get('completion')) || null, showPublicly: f.has('public'), brochure } as InvestmentFields & {
                brochure?: BrochureFile;
            };
            const r = await realEstateCreateInvestment(data);
            router.push(`/admin/real-estate/${r.investmentId}`);
            router.refresh();
        }
        catch (err) {
            setError((err as Error).message);
        }
        finally {
            setBusy(false);
        }
    }
    return <form onSubmit={submit} className="grid max-w-3xl gap-4 md:grid-cols-2">{textFields.map(([key, label]) => <label key={key} className="grid gap-1 text-sm">{label}<input className="rounded-md border border-zinc-300 bg-card px-3 py-1.5 text-sm" name={key} required={['name', 'scheduleDocUrl', 'transactionSheetUrl'].includes(key)} type={key.endsWith('Url') ? 'url' : 'text'}/></label>)}
    <label className="grid gap-1 text-sm">Property type<select className="rounded-md border border-zinc-300 bg-card px-3 py-1.5 text-sm" name="kind"><option>Under construction / investment</option><option disabled>Rental (coming in phase 2)</option></select></label>
    <label className="grid gap-1 text-sm">Native currency<input name="currency" required pattern="[A-Za-z]{3}" defaultValue="AED" className="rounded-md border border-zinc-300 bg-card px-3 py-1.5 text-sm"/></label>
    <label className="grid gap-1 text-sm">Native units per USD<input name="fx" type="number" required min="0.000001" step="any" defaultValue="3.6725" className="rounded-md border border-zinc-300 bg-card px-3 py-1.5 text-sm"/></label>
    <label className="grid gap-1 text-sm">Carry %<input name="carry" type="number" required min="0" max="100" step="any" defaultValue="5" className="rounded-md border border-zinc-300 bg-card px-3 py-1.5 text-sm"/></label>
    <label className="grid gap-1 text-sm">Total property cost (native)<input name="cost" type="number" required min="0" step="0.01" className="rounded-md border border-zinc-300 bg-card px-3 py-1.5 text-sm"/></label>
    <label className="grid gap-1 text-sm">First investment date<input name="first" type="date" className="rounded-md border border-zinc-300 bg-card px-3 py-1.5 text-sm"/></label>
    <label className="grid gap-1 text-sm">Estimated completion<input name="completion" type="date" className="rounded-md border border-zinc-300 bg-card px-3 py-1.5 text-sm"/></label>
    <label className="grid gap-1 text-sm">Brochure image<input name="brochure" type="file" accept="image/png,image/jpeg,image/webp" className="rounded-md border border-zinc-300 bg-card px-3 py-1.5 text-sm"/></label>
    <label className="flex items-center gap-2"><input name="public" type="checkbox"/>Show publicly</label>
    {error && <p role="alert" className="text-red-700 md:col-span-2">{error}</p>}<button disabled={busy} className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background disabled:opacity-50">{busy ? 'Creating…' : 'Create investment'}</button>
  </form>;
}
