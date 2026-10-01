"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  listOrganizations,
  assignOrganizationMember,
  removeOrganizationMember,
  listOrganizationMembers,
} from "@/lib/functions/organizationMembers";

// dev_site_admin-only organization-membership assignment — determines which org (the angel
// fund itself, not a portfolio company) an admin "belongs to" for company_member_management
// scoping (see the permissions-overhaul plan). Rendered only for dev_site_admin callers by
// the page; the real boundary is the requireExactRole check inside
// assignOrganizationMember/removeOrganizationMember themselves. Expect exactly one
// organization under the template-per-deployment model — this UI doesn't need a picker for
// it, just the first (only) one returned.
export function AdminOrganizationMembers({ members }: { members: { id: string; displayName: string }[] }) {
  const router = useRouter();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [assigned, setAssigned] = useState<
    { memberId: string; displayName: string; email: string; roleInOrganization: string | null }[] | null
  >(null);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { organizations } = await listOrganizations();
      const org = organizations[0];
      if (!org) {
        setError("No organization found.");
        return;
      }
      setOrganizationId(org.id);
      setOrganizationName(org.name);
      const { members: m } = await listOrganizationMembers({ organizationId: org.id });
      setAssigned(m);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load organization members.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAssign() {
    if (!selectedMemberId || !organizationId) return;
    setBusy(true);
    setError(null);
    try {
      await assignOrganizationMember({ memberId: selectedMemberId, organizationId });
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
      await removeOrganizationMember({ memberId });
      await load();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove member.");
    } finally {
      setBusy(false);
    }
  }

  if (assigned === null) {
    return (
      <div className="flex flex-col gap-1 rounded-lg border border-zinc-200 bg-card p-4 dark:border-zinc-800">
        {error ? (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        ) : (
          <span className="text-xs text-zinc-500">Loading organization members…</span>
        )}
      </div>
    );
  }

  const assignedIds = new Set(assigned.map((a) => a.memberId));
  const unassignedMembers = members.filter((m) => !assignedIds.has(m.id));

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-card p-4 dark:border-zinc-800">
      <span className="text-xs font-medium text-zinc-500">
        Organization members{organizationName ? ` — ${organizationName}` : ""}
      </span>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      {assigned.length === 0 ? (
        <p className="text-xs text-zinc-400">No members assigned to the organization yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {assigned.map((a) => (
            <li key={a.memberId} className="flex items-center gap-2 text-xs">
              <span>{a.displayName}</span>
              {a.roleInOrganization && <span className="text-zinc-400">({a.roleInOrganization})</span>}
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
          disabled={busy || !organizationId}
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
    </div>
  );
}
