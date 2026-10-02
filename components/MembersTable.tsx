"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getOrganizationMemberships } from "@/lib/functions/organizationMembers";

export interface MemberRow {
  id: string;
  displayName: string;
  investingEntityName: string;
  email: string;
  membershipType: string;
}

// Visible to every admin (not root-mode gated) — sending a WhatsApp reminder opens the
// existing wa.me pattern with a server-built message (real fee amount + template
// substitution); email goes out server-side via membersSendDuesReminder's "email" channel
// (requires the Gmail-send OAuth scope prerequisite — fails clearly if that's not set up yet).
// "Mark as sent" is a separate, explicit action from sending, since a reminder can silently
// fail to land.
type SortKey = "id" | "displayName" | "investingEntityName" | "email" | "membershipType";

const BASE_COLUMNS: { key: SortKey; label: string }[] = [
  { key: "id", label: "ID" },
  { key: "displayName", label: "Name" },
  { key: "investingEntityName", label: "Investing entity" },
  { key: "email", label: "Email" },
  { key: "membershipType", label: "Membership" },
];

function sortValue(row: MemberRow, key: SortKey): string | number {
  return row[key].toLowerCase();
}

// Client-rendered so column headers can drive sort state, same pattern as
// CompanyRollupTable/ManageLedgerTable.
export function MembersTable({ members, callerRole }: { members: MemberRow[]; callerRole?: string }) {
  const router = useRouter();
  const [ventureGroupMemberIds, setVentureGroupMemberIds] = useState<Set<string> | null>(null);

  // Admin callers should only see members who belong to the venture group (not VentureDesk).
  useEffect(() => {
    if (callerRole !== "admin") { setVentureGroupMemberIds(null); return; }
    getOrganizationMemberships().then(({ memberships }) => {
      const ventureGroupIds = memberships
        .filter((m) => !m.organizationName.toLowerCase().includes("venturedesk"))
        .map((m) => m.memberId);
      setVentureGroupMemberIds(new Set(ventureGroupIds));
    }).catch(() => {});
  }, [callerRole]);

  const displayMembers = ventureGroupMemberIds !== null
    ? members.filter((m) => ventureGroupMemberIds.has(m.id))
    : members;

  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "id", dir: "asc" });
  const columns = BASE_COLUMNS;

  const sortedMembers = useMemo(() => {
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...displayMembers].sort((a, b) => {
      const av = sortValue(a, sort.key);
      const bv = sortValue(b, sort.key);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [displayMembers, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-card px-5 py-4">
      <div className="mb-3 flex items-center gap-2 md:hidden">
        <label htmlFor="member-sort" className="text-xs font-semibold uppercase text-zinc-500">
          Sort by
        </label>
        <select
          id="member-sort"
          value={sort.key}
          onChange={(e) => setSort((prev) => ({ ...prev, key: e.target.value as SortKey }))}
          className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {BASE_COLUMNS.map((col) => (
            <option key={col.key} value={col.key}>
              {col.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setSort((prev) => ({ ...prev, dir: prev.dir === "asc" ? "desc" : "asc" }))}
          aria-label={sort.dir === "asc" ? "Sort ascending" : "Sort descending"}
          className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700"
        >
          {sort.dir === "asc" ? "▲" : "▼"}
        </button>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {sortedMembers.map((m) => (
          <div key={m.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{m.displayName}</p>
                <p className="text-xs text-zinc-500">
                  {m.investingEntityName} · {m.email}
                </p>
              </div>
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-xs text-zinc-500">ID</dt>
                <dd className="tabular-nums">{m.id}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Membership</dt>
                <dd>{m.membershipType}</dd>
              </div>
              
            </dl>
            <div className="mt-3 flex flex-wrap pt-3">
              <button
                type="button"
                onClick={() => router.push(`/admin/members/${m.id}`)}
                className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background"
              >
                Manage
              </button>
            </div>
          </div>
        ))}
        {sortedMembers.length === 0 && <p className="py-6 text-center text-sm text-zinc-500">No members found.</p>}
      </div>

      <div className="hidden md:block md:overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            {columns.map((col, i) => {
              const active = sort.key === col.key && i < BASE_COLUMNS.length;
              return (
                <th key={`${col.key}-${i}`} aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className="py-2 font-medium">
                  {i < BASE_COLUMNS.length ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={`inline-flex items-center gap-1 hover:text-foreground ${active ? "text-foreground" : ""}`}
                    >
                      {col.label}
                      <span aria-hidden className="text-[10px]">
                        {active ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                      </span>
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              );
            })}
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {sortedMembers.map((m) => (
            <tr key={m.id} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-2 tabular-nums">{m.id}</td>
              <td className="py-2">{m.displayName}</td>
              <td className="py-2 text-zinc-500 dark:text-zinc-500">{m.investingEntityName}</td>
              <td className="py-2 text-zinc-500 dark:text-zinc-500">{m.email}</td>
              <td className="py-2">{m.membershipType}</td>
              <td className="py-2 text-right">
                <button
                  type="button"
                  onClick={() => router.push(`/admin/members/${m.id}`)}
                  className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background"
                >
                  Manage
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
