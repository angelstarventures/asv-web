import type { ReactNode } from "react";
import { AppHeader } from "@/components/AppHeader";
import { DeveloperSubNav } from "@/components/DeveloperSubNav";
import { getCurrentMember } from "@/lib/auth/currentMember";
import { getMemberById } from "@/lib/dataconnect/client";
import { isDevSiteAdminModeOn } from "@/lib/siteAdminMode";

// proxy.ts independently re-verifies role on every /developer/* request — the role checks
// here are defense-in-depth only.
export default async function DeveloperLayout({ children }: { children: ReactNode }) {
  const current = await getCurrentMember();
  const { member } = current ? await getMemberById({ id: current.memberId }) : { member: undefined };
  const isDevSiteAdminRole = current?.role === "dev_site_admin";
  const devSiteAdminModeOn = isDevSiteAdminModeOn(current?.role, current?.devSiteAdminMode);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader isAdmin={current?.role === "admin" || current?.role === "site_admin" || current?.role === "dev_site_admin"} displayName={member?.displayName} photoUrl={member?.photoUrl} isDeveloper={current?.role === "developer" || current?.role === "dev_site_admin"} />
      <DeveloperSubNav isDevSiteAdminRole={isDevSiteAdminRole} devSiteAdminModeOn={devSiteAdminModeOn} />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}