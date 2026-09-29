"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { assignCompanyMember, removeCompanyMember, listCompanyMembers } from "@/lib/functions/companyMembers";

// dev_site_admin-only company-membership assignment — determines which company an admin
// "belongs to" for company_member_management scoping (see the permissions-overhaul plan).
// Rendered only for dev_site_admin callers by the page; the real boundary is the
// requireExactRole check inside assignCompanyMember/removeCompanyMember themselves.
export function AdminCompanyMemberAssignment({
  companyId,
  members,
}: {
  companyId: string;
  members: { id: string; displayName: string }[];
}) {
  const router = useRouter();
  const [assigned, setAssigned] = useState<
    { memberId: string; displayName: string; email: string; roleInCompany: string | null }[] | null
  >(null);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { members: m } = await listCompanyMembers({ companyId });
      setAssigned(m);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load company members.");
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAssign() {
    if (!selectedMemberId) return;
    setBusy(true);
    setError(null);
    try {
      await assignCompanyMember({ memberId: selectedMemberId, companyId });
      setSelectedMemberId("");
      await load();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assign member.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(memberId: string) {
    setBusy(true);
    setError(null);
    try {
      await removeCompanyMember({ memberId });
      await load();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove member.");
    } finally {
      setBusy(false);
    }
  }

  if (assigned === null) return <span className="text-xs text-zinc-500">Loading company members…</span>;

  const assignedIds = new Set(assigned.map((a) => a.memberId));
  const unassignedMembers = members.filter((m) => !assignedIds.has(m.id));

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-zinc-500">Company members</span>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      {assigned.length === 0 ? (
        <p className="text-xs text-zinc-400">No members assigned to this company yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {assigned.map((a) => (
            <li key={a.memberId} className="flex items-center gap-2 text-xs">
              <span>{a.displayName}</span>
              {a.roleInCompany && <span className="text-zinc-400">({a.roleInCompany})</span>}
              <button
                type="button"
                onClick={() => handleRemove(a.memberId)}
                disabled={busy}
                className="rounded-full border border-zinc-300 px-2 py-0.5 text-xs text-zinc-600 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2">
        <select
          value={selectedMemberId}
          disabled={busy}
          onChange={(e) => setSelectedMemberId(e.target.value)}
          className="rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">Select a member…</option>
          {unassignedMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.displayName}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleAssign}
          disabled={busy || !selectedMemberId}
          className="rounded-full border border-zinc-300 px-2 py-0.5 text-xs text-zinc-600 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400"
        >
          Assign
        </button>
      </div>
      <p className="text-xs text-zinc-400">
        A member belongs to at most one company — assigning one already assigned elsewhere moves them here.
      </p>
    </div>
  );
}
