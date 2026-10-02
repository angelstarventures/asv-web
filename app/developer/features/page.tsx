import { getCurrentMember } from "@/lib/auth/currentMember";
import { OrganizationFeatureToggles } from "@/components/OrganizationFeatureToggles";

export const dynamic = "force-dynamic";

export default async function DeveloperFeaturesPage() {
  const current = await getCurrentMember();
  const editable = current?.role === "developer" || current?.role === "dev_site_admin";

  // OrgId is NOT fetched via Cloud Function from the server (Server Components lack auth
  // context for Cloud Function calls). OrganizationFeatureToggles looks it up client-side
  // where Firebase Auth is available when no orgId is passed.
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

      <div className="max-w-md rounded-lg border border-zinc-200 bg-card p-4 dark:border-zinc-800">
        <OrganizationFeatureToggles editable={editable} />
      </div>
    </div>
  );
}
