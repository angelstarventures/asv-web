import { listAllMembers } from "@/lib/dataconnect/client";
import { NewMemberForm } from "@/components/NewMemberForm";
import { MembersTable } from "@/components/MembersTable";
import { WelcomeBanner } from "@/components/WelcomeBanner";
import { getCurrentMember } from "@/lib/auth/currentMember";
import { tenantConfig } from "@/lib/config/tenant";

// Wireframe 5's members table. Provisioning a login/reset/status live on the per-member
// detail page (app/admin/members/[memberId]) since those each act on one existing Member row
// — createMember (NewMemberForm) is the one path that inserts a brand-new row (plan §5).
export const dynamic = "force-dynamic";

export default async function AdminMembersPage() {
  const [{ members }, current] = await Promise.all([listAllMembers(), getCurrentMember()]);

  return (
    <div className="flex flex-col gap-6 px-6 py-10">
      <WelcomeBanner
        subtitle={`Build, manage, and review ${tenantConfig.orgAbbreviation}'s membership and ledger in one place.`}
      />

      <h1 className="text-xl font-semibold tracking-tight">Members</h1>

      <NewMemberForm callerRole={current?.role} />

      <MembersTable members={members} callerRole={current?.role} />
    </div>
  );
}
