import type { ReactNode } from "react";
import { AppHeader } from "@/components/AppHeader";
import { AdminSubNav } from "@/components/AdminSubNav";
import { getCurrentMember } from "@/lib/auth/currentMember";
import { getMemberById } from "@/lib/dataconnect/client";

// proxy.ts independently re-verifies role === 'admin' on every /admin/* request — isAdmin is
// hardcoded true here rather than re-derived, since this layout only ever renders after that
// check already passed.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const current = await getCurrentMember();
  const { member } = current ? await getMemberById({ id: current.memberId }) : { member: undefined };

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader isAdmin displayName={member?.displayName} photoUrl={member?.photoUrl} />
      <AdminSubNav />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
