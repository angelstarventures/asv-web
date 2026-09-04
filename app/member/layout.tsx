import type { ReactNode } from "react";
import { AppHeader } from "@/components/AppHeader";
import { getCurrentMember } from "@/lib/auth/currentMember";
import { getMemberById } from "@/lib/dataconnect/client";

// proxy.ts is the real enforcement point for everything under /member/* — role isn't
// restricted here at all (only /admin/* checks role), so an admin who is also a real
// investor (board members are LPs too) can already reach their own /member/* pages. This
// layout just needs to know whether to render the "Admin" tab.
export default async function MemberLayout({ children }: { children: ReactNode }) {
  const current = await getCurrentMember();
  const isAdmin = current?.role === "admin" || current?.role === "site_admin";
  const { member } = current ? await getMemberById({ id: current.memberId }) : { member: undefined };

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader isAdmin={isAdmin} displayName={member?.displayName} photoUrl={member?.photoUrl} />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
