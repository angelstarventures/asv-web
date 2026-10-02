"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  updateMemberAiSettings,
  sendDuesReminder,
  updateMemberDuesStatus,
  type ScenarioLockValue,
} from "@/lib/functions/adminMembers";
import { getOrganizationMemberIds } from "@/lib/functions/organizationMembers";

export interface MemberRow {
  id: string;
  displayName: string;
  investingEntityName: string;
  email: string;
  role: string;
  status: string;
  authUid?: string | null;
  membershipType: string;
  phoneNumber?: string | null;
  aiChatEnabled: boolean;
  lockedScenario?: string | null;
  duesSentForYear?: number | null;
}

const CURRENT_YEAR = new Date().getFullYear();

// Visible to every admin (not root-mode gated) — sending a WhatsApp reminder opens the
// existing wa.me pattern with a server-built message (real fee amount + template
// substitution); email goes out server-side via membersSendDuesReminder's "email" channel
// (requires the Gmail-send OAuth scope prerequisite — fails clearly if that's not set up yet).
// "Mark as sent" is a separate, explicit action from sending, since a reminder can silently
// fail to land.
function MemberDuesControls({ member }: { member: MemberRow }) {
  const [sentForYear, setSentForYear] = useState(member.duesSentForYear ?? null);
  const [busy, setBusy] = useState<"whatsapp" | "email" | "mark" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(channel: "whatsapp" | "email") {
    setError(null);
    setBusy(channel);
    try {
      const { message } = await sendDuesReminder({ memberId: member.id, channel });
      if (channel === "whatsapp") {
        if (!member.phoneNumber) {
          setError("No phone number on file.");
          return;
        }
        const digits = member.phoneNumber.replace(/\D/g, "");
        window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send.");
    } finally {
      setBusy(null);
    }
  }

  async function handleToggleSent() {
    setError(null);
    setBusy("mark");
    const nextSent = sentForYear !== CURRENT_YEAR;
    try {
      await updateMemberDuesStatus({ memberId: member.id, sent: nextSent });
      setSentForYear(nextSent ? CURRENT_YEAR : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <span
        className={
          sentForYear === CURRENT_YEAR
            ? "text-xs text-green-700 dark:text-green-400"
            : "text-xs text-amber-600 dark:text-amber-400"
        }
      >
        {sentForYear === CURRENT_YEAR ? `Sent ${CURRENT_YEAR}` : "Not sent"}
      </span>
      <div className="flex flex-wrap gap-2 text-xs">
        <button type="button" onClick={() => handleSend("whatsapp")} disabled={busy !== null} className="underline">
          {busy === "whatsapp" ? "..." : "WhatsApp"}
        </button>
        <button type="button" onClick={() => handleSend("email")} disabled={busy !== null} className="underline">
          {busy === "email" ? "..." : "Email"}
        </button>
        <button type="button" onClick={handleToggleSent} disabled={busy !== null} className="underline">
          {busy === "mark" ? "..." : sentForYear === CURRENT_YEAR ? "Mark unsent" : "Mark sent"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
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

const BASE_COLUMNS: { key: SortKey; label: string }[] = [
  { key: "id", label: "ID" },
  { key: "displayName", label: "Name" },
  { key: "investingEntityName", label: "Investing entity" },
  { key: "email", label: "Email" },
  { key: "membershipType", label: "Membership" },
  { key: "role", label: "Role" },
  { key: "status", label: "Status" },
  { key: "account", label: "Account" },
];

const SCENARIO_LOCK_OPTIONS: { value: ScenarioLockValue; label: string }[] = [
  { value: "", label: "Unlocked" },
  { value: "optimistic", label: "Optimistic only" },
  { value: "balanced", label: "Balanced only" },
  { value: "conservative", label: "Conservative only" },
];

function sortValue(row: MemberRow, key: SortKey): string | number {
  if (key === "account") return row.authUid ? 1 : 0;
  return row[key].toLowerCase();
}

// Root-mode-only inline editor for a member's AI-chat/scenario-lock settings — no separate
// form, saves immediately on change (same posture as other inline admin-table controls in this
// app). requireSiteAdmin-gated server-side (updateMemberAiSettings), so even a crafted request
// from a non-root admin would be rejected there regardless of what this component renders.
function MemberAiSettingsControls({ member }: { member: MemberRow }) {
  const [aiChatEnabled, setAiChatEnabled] = useState(member.aiChatEnabled);
  const [lockedScenario, setLockedScenario] = useState<ScenarioLockValue>(
    (member.lockedScenario?.toLowerCase() as ScenarioLockValue | undefined) ?? ""
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(next: { aiChatEnabled: boolean; lockedScenario: ScenarioLockValue }) {
    setError(null);
    setBusy(true);
    try {
      await updateMemberAiSettings({ memberId: member.id, ...next });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-1.5 text-xs">
        <input
          type="checkbox"
          checked={aiChatEnabled}
          disabled={busy}
          onChange={(e) => {
            setAiChatEnabled(e.target.checked);
            save({ aiChatEnabled: e.target.checked, lockedScenario });
          }}
        />
        AI chat
      </label>
      <select
        value={lockedScenario}
        disabled={busy}
        onChange={(e) => {
          const next = e.target.value as ScenarioLockValue;
          setLockedScenario(next);
          save({ aiChatEnabled, lockedScenario: next });
        }}
        className="rounded-md border border-zinc-300 px-1.5 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      >
        {SCENARIO_LOCK_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

// Client-rendered so column headers can drive sort state, same pattern as
// CompanyRollupTable/ManageLedgerTable.
export function MembersTable({
  members,
  siteAdminModeOn,
  callerRole,
}: {
  members: MemberRow[];
  siteAdminModeOn: boolean;
  callerRole?: string;
}) {
  const [orgMemberIds, setOrgMemberIds] = useState<Set<string> | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);

  // For admin-role callers, fetch org member IDs client-side and filter the list to only
  // show members who belong to the org. Global roles (site_admin/dev_site_admin) see all.
  useEffect(() => {
    if (callerRole !== "admin") {
      setOrgMemberIds(null); // No filtering for global roles
      return;
    }
    getOrganizationMemberIds()
      .then(({ memberIds }) => setOrgMemberIds(new Set(memberIds)))
      .catch((err) => {
        console.warn("Failed to fetch org member IDs:", err);
        setFilterError("Could not load organization membership data.");
        setOrgMemberIds(null); // Fall back to showing all
      });
  }, [callerRole]);

  // Filter the member list when org member IDs are available and caller is admin.
  const displayMembers = orgMemberIds !== null
    ? members.filter((m) => orgMemberIds.has(m.id))
    : members;

  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "id", dir: "asc" });
  const columns = siteAdminModeOn
    ? [...BASE_COLUMNS, { key: "id" as SortKey, label: "AI settings" }, { key: "id" as SortKey, label: "Dues" }]
    : [...BASE_COLUMNS, { key: "id" as SortKey, label: "Dues" }];

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
            {siteAdminModeOn && (
              <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-900">
                <MemberAiSettingsControls member={m} />
              </div>
            )}
            <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-900">
              <MemberDuesControls member={m} />
            </div>
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
              {siteAdminModeOn && (
                <td className="py-2">
                  <MemberAiSettingsControls member={m} />
                </td>
              )}
              <td className="py-2">
                <MemberDuesControls member={m} />
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
