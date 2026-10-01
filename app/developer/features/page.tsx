import { getCurrentMember } from "@/lib/auth/currentMember";
import { listOrganizations } from "@/lib/functions/organizationMembers";
import { OrganizationFeatureToggles } from "@/components/OrganizationFeatureToggles";

export const dynamic = "force-dynamic";

export default async function DeveloperFeaturesPage() {
  const current = await getCurrentMember();
  const editable = current?.role === "developer" || current?.role === "dev_site_admin";

  // listOrganizations is gated to dev_site_admin/site_admin server-side — a bare developer
  // can't call it, but can still see this page via DEVELOPER_TIER_ROLES. Fall back to a
  // read-only empty state rather than erroring for that case.
  let organizationId: string | null = null;
  let organizationName: string | null = null;
  let loadError: string | null = null;
  if (current?.role !== "developer") {
    try {
      const { organizations } = await listOrganizations();
      const org = organizations[0];
      organizationId = org?.id ?? null;
      organizationName = org?.name ?? null;
    } catch (err) {
      loadError = err instanceof Error ? err.message : "Could not load the organization.";
    }
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Features</h1>
      <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        The master switch for this deployment — a disabled feature is unavailable to everyone,
        regardless of any per-member override set on{" "}
        <code className="text-xs">/admin/features</code>. Only developer and dev-site-admin can
        change these.
      </p>

      {current?.role === "developer" && (
        <p className="text-xs text-zinc-500">
          Signed in as a bare developer — organization lookup requires dev-site-admin or
          site-admin. Ask a dev-site-admin to toggle these for now.
        </p>
      )}
      {loadError && <p className="text-xs text-red-600 dark:text-red-400">{loadError}</p>}

      {organizationId && (
        <div className="max-w-md rounded-lg border border-zinc-200 bg-card p-4 dark:border-zinc-800">
          <span className="text-xs font-medium text-zinc-500">
            {organizationName ?? "Organization"}
          </span>
          <div className="mt-2">
            <OrganizationFeatureToggles organizationId={organizationId} editable={editable} />
          </div>
        </div>
      )}
    </div>
  );
}
