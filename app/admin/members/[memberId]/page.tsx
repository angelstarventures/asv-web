import { notFound } from "next/navigation";
import Link from "next/link";
import { getMemberById } from "@/lib/dataconnect/client";
import { MemberActions } from "@/components/MemberActions";

export const dynamic = "force-dynamic";

export default async function AdminMemberDetailPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const { member } = await getMemberById({ id: memberId });
  if (!member) notFound();

  return (
    <div className="flex flex-col gap-6 px-6 py-10">
      <div>
        <Link href="/admin/members" className="text-sm text-zinc-500 underline underline-offset-2 dark:text-zinc-500">
          &larr; Members
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">{member.displayName}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-500">Member ID {member.id}</p>
      </div>

      <div className="max-w-md rounded-lg border border-zinc-200 p-5 text-sm dark:border-zinc-800">
        <dl className="flex flex-col gap-2">
          <div className="flex justify-between">
            <dt className="text-zinc-500 dark:text-zinc-400">Email</dt>
            <dd>{member.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500 dark:text-zinc-400">Role</dt>
            <dd>{member.role}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500 dark:text-zinc-400">Status</dt>
            <dd>{member.status}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-zinc-500 dark:text-zinc-400">Account</dt>
            <dd>{member.authUid ? "Linked" : "Not provisioned"}</dd>
          </div>
        </dl>
      </div>

      <MemberActions
        memberId={member.id}
        email={member.email}
        isLinked={Boolean(member.authUid)}
        status={member.status === "ACTIVE" ? "active" : "disabled"}
      />
    </div>
  );
}
