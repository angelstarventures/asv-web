import { redirect } from "next/navigation";
import { CostsSummaryPanel } from "@/components/CostsSummaryPanel";
import { getCurrentMember } from "@/lib/auth/currentMember";
import { isSiteAdminModeOn } from "@/lib/siteAdminMode";
import { tenantConfig } from "@/lib/config/tenant";

export const dynamic = "force-dynamic";

export default async function AdminCostsPage() {
  // Defense in depth — proxy.ts already gates /admin/costs to site-admin root mode, but this
  // page doesn't only trust the middleware, matching every other root-mode page.
  const current = await getCurrentMember();
  if (!isSiteAdminModeOn(current?.role, current?.siteAdminMode)) {
    redirect("/admin/members");
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Costs</h1>

      <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-card p-5 dark:border-zinc-800 md:max-w-md">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Firebase / Google Cloud</h2>
          <a
            href={`https://console.cloud.google.com/billing?project=${tenantConfig.billingConsoleProjectId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-500 underline underline-offset-2 hover:text-foreground"
          >
            Open Cloud Billing Console
          </a>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          No simple API returns itemized GCP/Firebase spend without setting up BigQuery billing
          export — this links directly to the real Cloud Billing report instead.
        </p>
      </div>

      <CostsSummaryPanel />
    </div>
  );
}
