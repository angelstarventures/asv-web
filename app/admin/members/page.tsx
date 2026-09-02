import { listAllMembers } from "@/lib/dataconnect/client";
import { NewMemberForm } from "@/components/NewMemberForm";
import { MembersTable } from "@/components/MembersTable";
import { WelcomeBanner } from "@/components/WelcomeBanner";

// Wireframe 5's members table. Provisioning a login/reset/status live on the per-member
// detail page (app/admin/members/[memberId]) since those each act on one existing Member row
// — createMember (NewMemberForm) is the one path that inserts a brand-new row (plan §5).
export const dynamic = "force-dynamic";

export default async function AdminMembersPage() {
  const { members } = await listAllMembers();

  return (
    <div className="flex flex-col gap-6 px-6 py-10">
      <WelcomeBanner subtitle="Build, manage, and review ASV's membership and ledger in one place." />

      <h1 className="text-xl font-semibold tracking-tight">Members</h1>

      <NewMemberForm />

      <MembersTable members={members} />
    </div>
  );
}
