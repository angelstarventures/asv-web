import { getCurrentMember } from "@/lib/auth/currentMember";
import { hasGlobalPermission } from "@/lib/auth/permissions";
import { DeveloperPermissionCard } from "@/components/DeveloperPermissionCard";

export const dynamic = "force-dynamic";

export default async function DeveloperDeployPage() {
  const current = await getCurrentMember();

  return (
    <div className="flex flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Deploy</h1>
      <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        Coming soon — no deploy actions are wired up here yet. Deploys are currently run by hand
        via the Firebase CLI.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DeveloperPermissionCard
          title="Deploy website"
          description="Trigger a production deploy of the Next.js frontend and/or Cloud Functions."
          available={!!current && hasGlobalPermission(current.role, "configure_deploy_website")}
        />
      </div>
    </div>
  );
}
