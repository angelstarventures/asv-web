import { redirect } from "next/navigation";
import { listAllMembers } from "@/lib/dataconnect/client";
import { listOrganizations } from "@/lib/functions/organizationMembers";
import { MemberOrganizationFeaturesPanel } from "@/components/MemberOrganizationFeaturesPanel";
import { getCurrentMember } from "@/lib/auth/currentMember";
import { isSiteAdminModeOn } from "@/lib/siteAdminMode";

export const dynamic = "force-dynamic";

export default async function AdminFeaturesPage() {
  const current = await getCurrentMember();
  if (!isSiteAdminModeOn(current?.role, current?.siteAdminMode)) {
    redirect("/admin/members");
  }

  const [{ members: allMembers }, { organizations }] = await Promise.all([
    listAllMembers(),
    listOrganizations(),
  ]);
  const org = organizations[0];

  return (
    <div className="flex flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Features</h1>
      <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        Per-member feature overrides. Changes take effect immediately.
      </p>

      {org ? (
        <MemberOrganizationFeaturesPanel organizationId={org.id} organizationName={org.name} members={allMembers} />
      ) : (
        <p className="text-sm text-red-600 dark:text-red-400">No organization found.</p>
      )}
    </div>
  );
}
