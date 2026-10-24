"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import type { ListPublicRealEstateInvestmentsData } from "@/lib/dataconnect/generated";
import { realEstateShowcaseContent } from "@/lib/realEstateShowcaseContent";
export function RealEstateShowcase({ investments }: {
    investments: ListPublicRealEstateInvestmentsData['realEstateInvestments'];
}) {
    const [index, setIndex] = useState(0);
    const [navigationCount, setNavigationCount] = useState(0);
    const [manualNavigation, setManualNavigation] = useState(false);
    useEffect(() => {
        if (investments.length < 2) return;
        const media = window.matchMedia('(prefers-reduced-motion: reduce)');
        let timer: number | undefined;
        const schedule = () => {
            window.clearTimeout(timer);
            if (!media.matches) timer = window.setTimeout(() => {
                setManualNavigation(false);
                setIndex(i => (i + 1) % investments.length);
            }, 7000);
        };
        schedule();
        media.addEventListener('change', schedule);
        return () => { window.clearTimeout(timer); media.removeEventListener('change', schedule); };
    }, [index, navigationCount, investments.length]);
    if (!investments.length)
        return <p className="text-zinc-500">Our real estate portfolio will appear here soon.</p>;
    const p = investments[index % investments.length];
    const community = realEstateShowcaseContent(p);
    const select = (next: number) => {
        setManualNavigation(true);
        setIndex((next + investments.length) % investments.length);
        setNavigationCount(count => count + 1);
    };
    const move = (delta: number) => select(index + delta);
    return <section aria-label="Real estate investments" aria-roledescription="carousel" tabIndex={0} onKeyDown={e => { if (e.key === 'ArrowLeft') {
        e.preventDefault();
        move(-1);
    } if (e.key === 'ArrowRight') {
        e.preventDefault();
        move(1);
    } }} className="font-sans overflow-hidden rounded-2xl border border-zinc-200 bg-card shadow-sm">
    <div className="group/image relative aspect-[4/3] bg-zinc-100 sm:aspect-[16/9]">
      {p.brochureDriveFileId && <Image unoptimized fill sizes="(max-width: 1024px) 100vw, 1024px" src={`/api/real-estate/${p.id}/brochure?v=${encodeURIComponent(p.brochureDriveFileId)}`} alt={community?.imageAlt ?? `${p.projectName ?? p.name} property picture`} className="object-cover"/>}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/45 via-transparent to-transparent"/>
      {p.locationLabel && <p className="absolute bottom-4 left-4 text-xs font-medium tracking-wide text-white sm:bottom-6 sm:left-6">{p.locationLabel}</p>}
      {investments.length > 1 && <>
        <button type="button" className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-card/35 opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-hover/image:opacity-100 group-focus-within/image:opacity-100 [@media(hover:none)]:opacity-100" onClick={() => move(-1)} aria-label="Previous property"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
        <button type="button" className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-card/35 opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-hover/image:opacity-100 group-focus-within/image:opacity-100 [@media(hover:none)]:opacity-100" onClick={() => move(1)} aria-label="Next property"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
      </>}
    </div>
    <div className="flex items-center justify-center gap-1 pt-3" aria-label="Investment position">{investments.map((r, i) => <button type="button" key={r.id} aria-label={`Show investment ${i + 1} of ${investments.length}: ${r.name}`} aria-current={i === index ? 'true' : undefined} onClick={() => select(i)} className="flex h-9 w-9 items-center justify-center rounded-full"><span className={`h-2.5 w-2.5 rounded-full ${i === index ? 'bg-foreground' : 'bg-zinc-300'}`}/></button>)}</div>
    <div className="space-y-5 p-6 sm:p-8" aria-live={manualNavigation ? 'polite' : 'off'} aria-atomic="true">
      <div className="space-y-2"><p className="text-xs font-medium uppercase tracking-widest text-zinc-500">{p.developerName} · Real estate portfolio</p><h2 className="text-lg font-semibold tracking-tight">{p.projectName ?? p.name}</h2>{(p.publicBlurb || community) && <p className="max-w-3xl text-sm leading-relaxed text-zinc-600">{p.publicBlurb || community?.description}</p>}</div>
      {community && <ul className="flex flex-wrap gap-2" aria-label="Community highlights">{community.highlights.map(highlight => <li key={highlight} className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700">{highlight}</li>)}</ul>}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-200 pt-4"><p className="text-xs text-zinc-500">{p.locationLabel}{p.unitIdentifier && <span className="mt-1 block break-all">Unit {p.unitIdentifier}</span>}</p>{community && <a href={community.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium">Explore the community <span aria-hidden="true">↗</span></a>}</div>
      {community && <p className="text-xs text-zinc-500">Community imagery · <a href={community.website} target="_blank" rel="noreferrer" className="underline underline-offset-2">{community.sourceLabel}</a></p>}
    </div>
  </section>;
}
