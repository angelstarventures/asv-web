"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export interface MemberRow {
  id: string;
  displayName: string;
  investingEntityName: string;
  email: string;
  role: string;
  status: string;
  authUid?: string | null;
  membershipType: string;
}

type SortKey =
  | "id"
  | "displayName"
  | "investingEntityName"
  | "email"
  | "role"
  | "status"
  | "account"
  | "membershipType";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "id", label: "ID" },
  { key: "displayName", label: "Name" },
  { key: "investingEntityName", label: "Investing entity" },
  { key: "email", label: "Email" },
  { key: "membershipType", label: "Membership" },
  { key: "role", label: "Role" },
  { key: "status", label: "Status" },
  { key: "account", label: "Account" },
];

function sortValue(row: MemberRow, key: SortKey): string | number {
  if (key === "account") return row.authUid ? 1 : 0;
  return row[key].toLowerCase();
}

// Client-rendered so column headers can drive sort state, same pattern as
// CompanyRollupTable/ManageLedgerTable.
export function MembersTable({ members }: { members: MemberRow[] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "id", dir: "asc" });

  const sortedMembers = useMemo(() => {
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...members].sort((a, b) => {
      const av = sortValue(a, sort.key);
      const bv = sortValue(b, sort.key);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [members, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-card px-5 py-4">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            {COLUMNS.map((col) => {
              const active = sort.key === col.key;
              return (
                <th key={col.key} aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className="py-2 font-medium">
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
              <td className="py-2">{m.role}</td>
              <td className="py-2">
                <span className={m.status === "ACTIVE" ? "text-zinc-700 dark:text-zinc-300" : "text-red-600 dark:text-red-400"}>
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
                <Link href={`/admin/members/${m.id}`} className="text-zinc-600 underline underline-offset-2 dark:text-zinc-400">
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
