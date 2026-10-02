import { notFound } from "next/navigation";
import Link from "next/link";
import { getMemberById } from "@/lib/dataconnect/client";
import { MemberActions } from "@/components/MemberActions";
import { EditMemberForm } from "@/components/EditMemberForm";
import { AdminPhotoUpload } from "@/components/AdminPhotoUpload";
import { getCurrentMember } from "@/lib/auth/currentMember";

export const dynamic = "force-dynamic";

export default async function AdminMemberDetailPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const [{ member }, viewer] = await Promise.all([getMemberById({ id: memberId }), getCurrentMember()]);
  if (!member) notFound();

  return (
    <div className="flex flex-col gap-6 px-6 py-10">
      <div>
        <Link href="/admin/members" className="text-sm text-zinc-500 underline underline-offset-2 dark:text-zinc-500">
          &larr; Members
        </Link>
        <div className="mt-2">
          <AdminPhotoUpload memberId={member.id} displayName={member.displayName} currentPhotoUrl={member.photoUrl ?? null} />
        </div>
      </div>

      <div className="max-w-md rounded-lg border border-zinc-200 bg-card p-5 text-sm dark:border-zinc-800">
        <dl className="flex flex-col gap-2">
          <div className="flex justify-between">
            <dt className="text-zinc-500 dark:text-zinc-400">Email</dt>
            <dd>{member.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500 dark:text-zinc-400">Membership</dt>
            <dd>{member.membershipType}</dd>
          </div>
        </dl>
        {member.profileText && (
          <p className="mt-4 border-t border-zinc-200 pt-4 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
            {member.profileText}
          </p>
        )}
        <div className="mt-4 border-t border-zinc-200 pt-4 text-xs text-zinc-500 dark:border-zinc-800">
          {member.authUid ? "Account linked" : "Account not yet provisioned"} &middot; {member.status}
        </div>
      </div>

      <EditMemberForm
        memberId={member.id}
        displayName={member.displayName}
        investingEntityName={member.investingEntityName}
        membershipType={member.membershipType}
        profileText={member.profileText ?? null}
        phoneNumber={member.phoneNumber ?? null}
        email={member.email}
        professionalProfileUrl={member.professionalProfileUrl ?? null}
        interests={member.interests ?? null}
        expertise={member.expertise ?? null}
      />

      <MemberActions
        memberId={member.id}
        email={member.email}
        displayName={member.displayName}
        isLinked={Boolean(member.authUid)}
        role={member.role.toLowerCase() as "developer" | "dev_site_admin" | "site_admin" | "admin" | "user"}
        viewerRole={viewer?.role}
      />
    </div>
  );
}
