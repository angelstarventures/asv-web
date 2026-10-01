import { LandingHeader } from "@/components/LandingHeader";
import { PitchForm } from "@/components/PitchForm";
import { tenantConfig } from "@/lib/config/tenant";

// FR-15: the entrepreneur-facing pitch intake portal. No login, no Data Connect reads — the
// only server-side dependency is the dealsSubmitPitch Cloud Function, called from PitchForm.
// Uses the same LandingHeader as the home page's Welcome/Our Team/Portfolio tabs so this page
// reads as part of the same nav bar, not a separate standalone page.
export default function PitchPage() {
  return (
    <div className="flex w-full flex-1 flex-col">
      <LandingHeader active="pitch" />

      <div className="flex flex-1 justify-center px-6 py-12">
        <div className="flex w-full max-w-3xl flex-col gap-10">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">About {tenantConfig.orgAbbreviation}</h2>
            <section className="mt-2 rounded-lg border border-zinc-200 bg-card p-6 text-sm dark:border-zinc-800">
              <p className="text-zinc-600 dark:text-zinc-400">
                A diverse group (IT, physicians, architects, real estate developers, fund
                managers, entrepreneurs) of angel investors. Pre-seed, Seed, and Series A. Check
                size $100K to $500K.
              </p>
            </section>
          </div>

          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Our Investment Focus</h2>
            <section className="mt-2 flex flex-col gap-4 rounded-lg border border-zinc-200 bg-card p-6 text-sm dark:border-zinc-800">
              <p className="text-zinc-600 dark:text-zinc-400">
                Early-stage startups in Health, Medical, Build-Tech, CPG, IT, Materials,
                Chemicals, Biotech, and Pharma.
              </p>
              <ul className="flex flex-col gap-1 text-zinc-600 dark:text-zinc-400">
                <li>• We invest in priced rounds or SAFEs. We do not invest in convertible notes.</li>
                <li>
                  • We do not invest in businesses involved in gambling, alcohol, insurance, or
                  financial services.
                </li>
                <li>
                  • We do not invest in leveraged businesses (companies with interest-bearing debt).
                </li>
              </ul>
            </section>
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Pitch to Us</h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Tell us about your company below. We review every submission.
            </p>
          </div>

          <PitchForm />
        </div>
      </div>
    </div>
  );
}
