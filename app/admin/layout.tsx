import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { AdminSubNav } from "@/components/AdminSubNav";
import { getCurrentMember } from "@/lib/auth/currentMember";
import { getMemberById } from "@/lib/dataconnect/client";
import { getMyOrganizationMembership } from "@/lib/functions/organizationMembers";
// Rollout mode for the org-membership gate — mirrors ORG_GATE_MODE on the functions side.
// "log"     — warn and allow (safe default during rollout)
// "enforce" — redirect unassigned admins to /member/dashboard
const ORG_GATE_MODE = (process.env.NEXT_PUBLIC_ORG_GATE_MODE ?? "log") === "enforce" ? "enforce" : "log";

// proxy.ts independently re-verifies role === 'admin' on every /admin/* request — isAdmin is
// hardcoded true here rather than re-derived, since this layout only ever renders after that
// check already passed.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const current = await getCurrentMember();

  // Admin-role members must have an organization_member row to access /admin/* pages.
  // site_admin/dev_site_admin bypass the check (they're global).
  let orgId: string | null = null;
  try {
    if (current?.role === "admin") {
      const membership = await getMyOrganizationMembership();
      if (!membership.hasMembership) {
        if (ORG_GATE_MODE === "enforce") {
          redirect("/member/dashboard");
        } else {
          console.warn(
            `[ORG_GATE] Admin ${current.memberId} (${current.authUid}) has no organization_member row. ` +
            `Would redirect to /member/dashboard in enforce mode.`
          );
        }
      } else {
        orgId = membership.organizationId;
      }
    } else if (current?.role === "site_admin" || current?.role === "dev_site_admin") {
      const membership = await getMyOrganizationMembership();
      orgId = membership.organizationId;
    }
  } catch (err) {
    // getMyOrganizationMembership not yet deployed — gracefully degrade by showing all nav items.
    console.warn(`[ORG_GATE] Failed to check membership: ${err}`);
  }

  // Feature flags are computed client-side in AdminSubNav (Server Components can't authenticate
  // Cloud Function calls). The subnav falls back to fetching features itself when no
  // enabledFeatures is passed.

  const { member } = current ? await getMemberById({ id: current.memberId }) : { member: undefined };
  const isSiteAdminRole = current?.role === "site_admin" || current?.role === "dev_site_admin";

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader isAdmin displayName={member?.displayName} photoUrl={member?.photoUrl} isDeveloper={current?.role === "developer" || current?.role === "dev_site_admin"} />
      <AdminSubNav isSiteAdminRole={isSiteAdminRole} />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
