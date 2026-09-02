import { CompanyStatus, type ListCompaniesData } from "@/lib/dataconnect/generated";
import { SectorIcon } from "@/components/SectorIcon";

type Company = ListCompaniesData["companies"][number];

export function CompanyLogo({ company }: { company: Company }) {
  if (!company.logoUrl) {
    return (
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-xl font-semibold text-zinc-500">
        {(company.tradeName ?? company.name).charAt(0)}
      </div>
    );
  }

  // Some source assets are a white-on-transparent variant (filename says so) meant for a dark
  // backdrop — give those a dark chip so they don't disappear on our light card, everything
  // else renders directly.
  const img = /white/i.test(company.logoUrl) ? (
    <div className="flex h-16 w-full items-center justify-center rounded-md bg-zinc-900 px-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- external company-hosted logo URL, arbitrary domains */}
      <img src={company.logoUrl} alt={company.name} className="h-12 w-full object-contain" />
    </div>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element -- external company-hosted logo URL, arbitrary domains
    <img src={company.logoUrl} alt={company.name} className="h-16 w-full object-contain" />
  );

  if (!company.website) return img;

  return (
    <a href={company.website} target="_blank" rel="noopener noreferrer" className="w-full" aria-label={`Visit ${company.tradeName ?? company.name}'s website`}>
      {img}
    </a>
  );
}

function CompanyLogoCard({ company }: { company: Company }) {
  const name = company.tradeName ?? company.name;

  const logo = !company.logoUrl ? (
    // No logo on file (e.g. a folded company never worth backfilling one for) — a bare
    // monogram identifies nothing, so pair it with the name rather than leaving it anonymous.
    <div className="flex flex-col items-center gap-2">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-2xl font-semibold text-zinc-500">
        {name.charAt(0)}
      </div>
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{name}</p>
    </div>
  ) : /white/i.test(company.logoUrl) ? (
    <div className="flex h-full w-full items-center justify-center rounded-md bg-zinc-900 px-4">
      {/* eslint-disable-next-line @next/next/no-img-element -- external company-hosted logo URL, arbitrary domains */}
      <img src={company.logoUrl} alt={name} className="h-full w-full object-contain" />
    </div>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element -- external company-hosted logo URL, arbitrary domains
    <img src={company.logoUrl} alt={name} className="h-full w-full object-contain" />
  );

  const hasOverlayContent = Boolean(company.tagline || company.sector);

  const content = (
    <div className="group relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-card p-4 dark:border-zinc-800">
      {logo}
      {hasOverlayContent && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-card/95 p-3 text-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 dark:bg-zinc-950/95">
          {company.sector && (
            <div className="flex items-center gap-1.5">
              <SectorIcon sector={company.sector} className="h-4 w-4 shrink-0 text-zinc-500" />
              <p className="text-xs font-medium text-zinc-500">{company.sector}</p>
            </div>
          )}
          {company.tagline && (
            <p className="line-clamp-3 text-xs leading-snug text-zinc-700 dark:text-zinc-300">{company.tagline}</p>
          )}
        </div>
      )}
    </div>
  );

  if (!company.website) return content;

  return (
    <a href={company.website} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${name}'s website`}>
      {content}
    </a>
  );
}

function CompanyLogoSection({ title, companies }: { title: string; companies: Company[] }) {
  if (companies.length === 0) return null;
  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold tracking-tight">{title}</h2>
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
        {companies.map((c) => (
          <CompanyLogoCard key={c.id} company={c} />
        ))}
      </div>
    </section>
  );
}

// Logo-card grid modeled on angelstarventures.com/portfolio's public portfolio page layout —
// just the logo by default, tagline + sector reveal on hover (plan per user request). Grouped
// into current (still ACTIVE) vs past (exited/written-off/archived) rather than hiding the
// latter outright, per user request.
export function CompanyLogoGrid({ companies }: { companies: Company[] }) {
  const current = companies.filter((c) => c.status === CompanyStatus.ACTIVE);
  const past = companies.filter((c) => c.status !== CompanyStatus.ACTIVE);

  return (
    <div className="flex flex-col gap-10">
      <CompanyLogoSection title="Current Portfolio Companies" companies={current} />
      <CompanyLogoSection title="Past Portfolio Companies" companies={past} />
    </div>
  );
}
