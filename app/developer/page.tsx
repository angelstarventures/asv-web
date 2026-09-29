import { getCurrentMember } from "@/lib/auth/currentMember";
import { isDevSiteAdminModeOn } from "@/lib/siteAdminMode";
import { hasGlobalPermission } from "@/lib/auth/permissions";
import { DeveloperPermissionCard } from "@/components/DeveloperPermissionCard";

export const dynamic = "force-dynamic";

export default async function DeveloperDashboard() {
  const current = await getCurrentMember();
  const devSiteAdminModeOn = isDevSiteAdminModeOn(current?.role, current?.devSiteAdminMode);

  return (
    <div className="flex flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Developer Dashboard</h1>
      <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        Deployment, migration, and maintenance tools.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DeveloperPermissionCard
          title="Deploy website"
          description="Trigger a production deploy of the Next.js frontend and/or Cloud Functions."
          available={!!current && hasGlobalPermission(current.role, "configure_deploy_website")}
        />
        <DeveloperPermissionCard
          title="Bulk migration"
          description="Run schema migrations or bulk data migration scripts."
          available={!!current && hasGlobalPermission(current.role, "bulk_migration")}
        />
        <DeveloperPermissionCard
          title="Website maintenance"
          description="Health checks, cache clearing, and maintenance mode controls."
          available={!!current && hasGlobalPermission(current.role, "website_maintenance")}
        />
      </div>

      {devSiteAdminModeOn && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950">
          <h2 className="text-sm font-medium text-amber-800 dark:text-amber-300">Dev-site-admin mode active</h2>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
            Additional management surfaces are visible because dev-site-admin mode is on.
          </p>
        </div>
      )}
    </div>
  );
}
