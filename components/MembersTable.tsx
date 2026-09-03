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
          {COLUMNS.map((col) => (
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
              <span className={m.status === "ACTIVE" ? "text-xs text-zinc-700 dark:text-zinc-300" : "text-xs text-red-600 dark:text-red-400"}>
                {m.status}
              </span>
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
              <div>
                <dt className="text-xs text-zinc-500">Role</dt>
                <dd>{m.role}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Account</dt>
                <dd>
                  {m.authUid ? (
                    <span className="text-zinc-700 dark:text-zinc-300">Linked</span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400">Not provisioned</span>
                  )}
                </dd>
              </div>
            </dl>
            <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-900">
              <Link href={`/admin/members/${m.id}`} className="text-sm text-zinc-600 underline underline-offset-2 dark:text-zinc-400">
                Manage
              </Link>
            </div>
          </div>
        ))}
        {sortedMembers.length === 0 && <p className="py-6 text-center text-sm text-zinc-500">No members found.</p>}
      </div>

      <div className="hidden md:block md:overflow-x-auto">
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
    </div>
  );
}
