import type { ListCompaniesData } from "@/lib/dataconnect/generated";
import { CompanyLogo } from "@/components/CompanyLogoGrid";

type Company = ListCompaniesData["companies"][number];

const SUPPORT_SERVICES = [
  {
    title: "Expert Mentorship",
    body: "Guidance from successful entrepreneurs and industry leaders.",
  },
  {
    title: "Funding Support",
    body: "Strategic advice on fundraising timing and investor connections.",
  },
  {
    title: "Networking Events",
    body: "Exclusive events connecting founders with peers and potential customers.",
  },
];

// Mirrors angelstarventures.com's public homepage structure (hero + mission, a portfolio
// teaser, three support-service pillars) for the landing page's Welcome tab.
export function WelcomeSection({
  companies,
  featuredCompanyIds,
}: {
  companies: Company[];
  featuredCompanyIds: string[];
}) {
  const byId = new Map(companies.map((c) => [c.id, c]));
  const featured = featuredCompanyIds.map((id) => byId.get(id)).filter((c): c is Company => Boolean(c?.logoUrl));

  return (
    <div className="flex flex-col gap-16">
      <section className="grid gap-8 sm:grid-cols-3">
        {SUPPORT_SERVICES.map((s) => (
          <div key={s.title} className="text-center">
            <h3 className="text-sm font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{s.body}</p>
          </div>
        ))}
      </section>

      <div className="rounded-2xl bg-gradient-to-br from-[#8073e6] via-[#6b5d9e] to-[#2c2520] px-6 py-20 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-white drop-shadow-sm sm:text-4xl">
          Empowering startups to reach their full potential
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-white/90 drop-shadow-sm">
          Our mission is to guide the most innovative entrepreneurs with scaling their early stage startups into
          successful businesses.
        </p>
      </div>

      {featured.length > 0 && (
        <section className="text-center">
          <h2 className="mx-auto max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            We&apos;ve invested in several companies from a variety of industries who are solving the most
            challenging problems with cutting edge innovations.
          </h2>
          <div className="mx-auto mt-6 grid max-w-3xl grid-cols-2 items-center gap-6 sm:grid-cols-4">
            {featured.map((c) => (
              <CompanyLogo key={c.id} company={c} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
