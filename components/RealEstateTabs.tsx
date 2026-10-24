"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { REAL_ESTATE_TABS, type RealEstateTab } from "@/lib/realEstateTab";
export function RealEstateTabs({ active }: {
    active: RealEstateTab;
}) {
    const router = useRouter(), pathname = usePathname(), params = useSearchParams();
    return <nav aria-label="Property type" className="flex flex-wrap gap-1 self-start rounded-2xl border border-zinc-200 bg-card p-1.5">{REAL_ESTATE_TABS.map(tab => <button key={tab} aria-current={active === tab ? 'page' : undefined} className={`rounded-full px-4 py-1.5 text-sm font-medium ${active === tab ? 'bg-foreground text-background' : 'bg-card'}`} onClick={() => { const next = new URLSearchParams(params.toString()); next.set('retab', tab); router.push(`${pathname}?${next}`); }}>{tab === 'investment' ? 'Investment properties' : 'Rental properties'}</button>)}</nav>;
}
