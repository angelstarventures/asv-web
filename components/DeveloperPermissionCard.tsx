// Shared card shell for the /developer surfaces — purely descriptive today (permission
// scaffolding only, no deploy/migration actions wired up yet). Rendering derives from
// hasGlobalPermission so narrowing a permission later (e.g. bulk_migration becoming
// dev_site_admin-only) is a one-line change in lib/auth/permissions.ts, not a page rewrite.
export function DeveloperPermissionCard({
  title,
  description,
  available,
}: {
  title: string;
  description: string;
  available: boolean;
}) {
  return (
    <div
      className={
        available
          ? "rounded-lg border border-zinc-200 bg-card p-5 dark:border-zinc-800"
          : "rounded-lg border border-zinc-100 bg-zinc-50 p-5 opacity-60 dark:border-zinc-900 dark:bg-zinc-950"
      }
    >
      <h2 className="text-sm font-medium">{title}</h2>
      <p className="mt-1 text-xs text-zinc-500">{description}</p>
      {!available && (
        <p className="mt-2 text-xs font-medium text-zinc-400">Not available to your role.</p>
      )}
    </div>
  );
}
