"use client";
import { useMemo, useState } from "react";
import { formatCurrency, formatPercent } from "@/lib/money";
export interface RealEstateRow {
    id: string;
    name: string;
    currency: "USD";
    firstInvestmentDate: string | null;
    estimatedCompletionDate: string | null;
    actualCompletionDate: string | null;
    saleDate: string | null;
    totalPropertyCost: number | null;
    commitment: number;
    deployed: number;
    cashBalance: number;
    sharePercent: number;
    salePrice: number | null;
    profit: number;
    roi: number | null;
    irr: number | null;
    scheduleDocUrl: string | null;
    transactionSheetUrl: string | null;
}
type SortKey = 'name' | 'firstInvestmentDate' | 'estimatedCompletionDate' | 'totalPropertyCost' | 'commitment' | 'deployed' | 'cashBalance' | 'sharePercent' | 'actualCompletionDate' | 'saleDate' | 'salePrice' | 'profit' | 'roi' | 'irr';
const COLUMNS: {
    key: SortKey;
    label: string;
}[] = [{ key: 'name', label: 'Investment' }, { key: 'firstInvestmentDate', label: 'First investment' }, { key: 'estimatedCompletionDate', label: 'Est. completion' }, { key: 'totalPropertyCost', label: 'Property cost (USD)' }, { key: 'sharePercent', label: 'Your share' }, { key: 'commitment', label: 'Your commitment (USD)' }, { key: 'deployed', label: 'Your invested to date (USD)' }, { key: 'cashBalance', label: 'Your cash balance (USD)' }];
const COMPLETED_COLUMNS: {
    key: SortKey;
    label: string;
}[] = [{ key: 'actualCompletionDate', label: 'Completed' }, { key: 'saleDate', label: 'Sold' }, { key: 'salePrice', label: 'Selling price (USD)' }, { key: 'profit', label: 'Your realized profit (USD)' }, { key: 'roi', label: 'ROI' }, { key: 'irr', label: 'IRR' }];
function sortValue(r: RealEstateRow, key: SortKey): string | number { switch (key) {
    case 'name': return r.name.toLowerCase();
    case 'firstInvestmentDate':
    case 'estimatedCompletionDate':
    case 'actualCompletionDate':
    case 'saleDate': return r[key] ?? '';
    default: return r[key] ?? -Infinity;
} }
function value(r: RealEstateRow, key: SortKey) { if(key==='cashBalance')return formatCurrency(r.cashBalance,'USD'); if (['totalPropertyCost', 'commitment', 'deployed', 'salePrice', 'profit'].includes(key))
    return formatCurrency(r[key] as number | null, 'USD'); if (['sharePercent', 'roi', 'irr'].includes(key))
    return formatPercent(r[key] as number | null); return r[key] ?? '—'; }
function Links({ row: r }: {
    row: RealEstateRow;
}) { return <div className="mt-2 flex flex-wrap gap-3 text-xs">{r.scheduleDocUrl && <a href={r.scheduleDocUrl} target="_blank" rel="noreferrer" className="underline">Payment schedule</a>}{r.transactionSheetUrl && <a href={r.transactionSheetUrl} target="_blank" rel="noreferrer" className="underline">Transaction sheet</a>}</div>; }
export function RealEstateActiveTable({ rows, completed = false }: {
    rows: RealEstateRow[];
    completed?: boolean;
}) {
    const [sort, setSort] = useState<{
        key: SortKey;
        dir: 'asc' | 'desc';
    }>({ key: 'name', dir: 'asc' });
    const columns = completed ? [...COLUMNS, ...COMPLETED_COLUMNS] : COLUMNS;
    const sorted = useMemo(() => [...rows].sort((a, b) => { const av = sortValue(a, sort.key), bv = sortValue(b, sort.key); return (av < bv ? -1 : av > bv ? 1 : 0) * (sort.dir === 'asc' ? 1 : -1); }), [rows, sort]);
    const toggle = (key: SortKey) => setSort(s => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));
    if (!rows.length)
        return <p className="text-sm text-zinc-500">No {completed ? 'completed' : 'active'} investments.</p>;
    return <div>
    <div className="flex flex-col gap-3 md:hidden"><label className="flex gap-2">Sort by<select className="rounded border p-1" value={sort.key} onChange={e => toggle(e.target.value as SortKey)}>{columns.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}</select><button aria-label="Reverse sort direction" onClick={() => toggle(sort.key)}>{sort.dir === 'asc' ? '↑' : '↓'}</button></label>{sorted.map(r => <article key={r.id} className="rounded-2xl border bg-card p-4"><h3 className="font-semibold">{r.name}</h3><dl className="mt-3 space-y-2">{columns.filter(c => c.key !== 'name').map(c => <div key={c.key} className="flex justify-between gap-3 text-sm"><dt className="text-zinc-500">{c.label}</dt><dd>{value(r, c.key)}</dd></div>)}</dl><Links row={r}/></article>)}</div>
    <div className="hidden md:block md:overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{columns.map(c => <th key={c.key} aria-sort={sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'} className="whitespace-nowrap p-3"><button onClick={() => toggle(c.key)}>{c.label} {sort.key === c.key ? (sort.dir === 'asc' ? '↑' : '↓') : ''}</button></th>)}</tr></thead><tbody>{sorted.map(r => <tr className="border-t" key={r.id}>{columns.map(c => <td key={c.key} className="whitespace-nowrap p-3">{value(r, c.key)}{c.key === 'name' && <Links row={r}/>}</td>)}</tr>)}</tbody></table></div>
  </div>;
}
