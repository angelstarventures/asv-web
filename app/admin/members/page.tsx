import Link from "next/link";
import { listAllMembers } from "@/lib/dataconnect/client";

// Wireframe 5's members table. Add/edit/reset live on the per-member detail page
// (app/admin/members/[memberId]) since provisionMember/adminTriggerPasswordReset/
// setMemberStatus each act on one existing Member row at a time — there's no "create a new
// member" callable, Member rows only ever come from the legacy migration (plan §5).
export const dynamic = "force-dynamic";

export default async function AdminMembersPage() {
  const { members } = await listAllMembers();

  return (
    <div className="flex flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Members</h1>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <th className="py-2 font-medium">ID</th>
            <th className="py-2 font-medium">Name</th>
            <th className="py-2 font-medium">Email</th>
            <th className="py-2 font-medium">Role</th>
            <th className="py-2 font-medium">Status</th>
            <th className="py-2 font-medium">Account</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-2 tabular-nums">{m.id}</td>
              <td className="py-2">{m.displayName}</td>
              <td className="py-2 text-zinc-500 dark:text-zinc-500">{m.email}</td>
              <td className="py-2">{m.role}</td>
              <td className="py-2">
                <span
                  className={
                    m.status === "ACTIVE"
                      ? "text-zinc-700 dark:text-zinc-300"
                      : "text-red-600 dark:text-red-400"
                  }
                >
                  {m.status}
                </span>
              </td>
              <td className="py-2">
                {m.authUid ? (
                  <span className="text-zinc-700 dark:text-zinc-300">Linked</span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">Not provisioned</span>
                )}
              </td>
              <td className="py-2 text-right">
                <Link
                  href={`/admin/members/${m.id}`}
                  className="text-zinc-600 underline underline-offset-2 dark:text-zinc-400"
                >
                  Manage
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
