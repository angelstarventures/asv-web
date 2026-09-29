import { getCurrentMember } from "@/lib/auth/currentMember";
import { hasGlobalPermission } from "@/lib/auth/permissions";
import { DeveloperPermissionCard } from "@/components/DeveloperPermissionCard";

export const dynamic = "force-dynamic";

export default async function DeveloperMigrationsPage() {
  const current = await getCurrentMember();

  return (
    <div className="flex flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Migrations</h1>
      <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        Coming soon — no migration actions are wired up here yet. Schema and data migrations
        are currently run by hand via the scripts in <code>functions/scripts/</code>.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DeveloperPermissionCard
          title="Bulk migration"
          description="Run schema migrations or bulk data migration scripts."
          available={!!current && hasGlobalPermission(current.role, "bulk_migration")}
        />
      </div>
    </div>
  );
}
