"use client";

import { useEffect, useMemo, useState } from "react";
import { ledgerMassExport, ledgerDeleteRecord } from "@/lib/functions/massIO";
import { LedgerRecordEditModal } from "@/components/LedgerRecordEditModal";

type LedgerRow = Record<string, unknown> & {
  id: string;
  date: string;
  company: string;
  type: string;
  scenario: string;
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; records: LedgerRow[] };

type SortKey = "date" | "company" | "type" | "scenario";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "date", label: "Date" },
  { key: "company", label: "Company" },
  { key: "type", label: "Type" },
  { key: "scenario", label: "Scenario" },
];

// Reuses ledgerMassExport (the same call /admin/ledger/export downloads) as the data source —
// each returned record already carries the full legacy-schema shape plus `id`, which is
// exactly what an edit popup needs to pre-fill, with no separate per-row fetch.
export function ManageLedgerTable() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [editing, setEditing] = useState<LedgerRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "date", dir: "asc" });

  const sortedRecords = useMemo(() => {
    if (state.status !== "ready") return [];
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...state.records].sort((a, b) => {
      const av = String(a[sort.key]);
      const bv = String(b[sort.key]);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [state, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  async function load() {
    try {
      const { records } = await ledgerMassExport();
      setState({ status: "ready", records: records as LedgerRow[] });
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "Could not load the ledger." });
    }
  }

  useEffect(() => {
    let cancelled = false;
    ledgerMassExport()
      .then(({ records }) => {
        if (!cancelled) setState({ status: "ready", records: records as LedgerRow[] });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ status: "error", message: err instanceof Error ? err.message : "Could not load the ledger." });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete(row: LedgerRow) {
    if (!confirm(`Delete this ${row.type} entry for ${row.company} (${row.date}, ${row.scenario})? This cannot be undone.`)) {
      return;
    }
    setDeletingId(row.id);
    try {
      await ledgerDeleteRecord(row.id);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  }

  if (state.status === "loading") {
    return <p className="text-sm text-zinc-500 dark:text-zinc-500">Loading...</p>;
  }
  if (state.status === "error") {
    return <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>;
  }

  return (
    <>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{state.records.length} entries.</p>
      <div className="max-h-[70vh] overflow-y-auto rounded-lg border border-zinc-200 bg-card dark:border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              {COLUMNS.map((col) => {
                const active = sort.key === col.key;
                return (
                  <th
                    key={col.key}
                    aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                    className="px-3 py-2 font-medium"
                  >
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
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {sortedRecords.map((row) => (
              <tr key={row.id} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="px-3 py-2 tabular-nums">{String(row.date)}</td>
                <td className="px-3 py-2">{String(row.company)}</td>
                <td className="px-3 py-2">{String(row.type)}</td>
                <td className="px-3 py-2">{String(row.scenario)}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => setEditing(row)}
                    className="mr-3 text-sm underline underline-offset-2"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(row)}
                    disabled={deletingId === row.id}
                    className="text-sm text-red-600 underline underline-offset-2 disabled:opacity-50 dark:text-red-400"
                  >
                    {deletingId === row.id ? "Deleting..." : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <LedgerRecordEditModal
          record={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </>
  );
}
