"use client";

import { useState } from "react";
import { SyncDocumentsFromDriveButton } from "@/components/SyncDocumentsFromDriveButton";
import { SyncDocumentsToDriveButton } from "@/components/SyncDocumentsToDriveButton";

// Per-company sync panel with a company selector.
// When "All companies" is selected, syncs everything.
// When a specific company is selected, syncs only that company.
export function SyncDocumentsPanel({
  companies,
}: {
  companies: { id: string; name: string; tradeName?: string | null }[];
}) {
  const [companyId, setCompanyId] = useState<string>("");

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-card p-5 dark:border-zinc-800">
      <h2 className="text-sm font-semibold">Sync Drive folders</h2>
      <label className="flex flex-col gap-1 text-sm">
        Company
        <select
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">All companies</option>
          {[...companies]
            .sort((a, b) => (a.tradeName ?? a.name).localeCompare(b.tradeName ?? b.name))
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.tradeName ?? c.name}
              </option>
            ))}
        </select>
      </label>
      <div className="flex flex-wrap gap-3">
        <SyncDocumentsToDriveButton companyId={companyId || undefined} />
        <SyncDocumentsFromDriveButton companyId={companyId || undefined} />
      </div>
    </div>
  );
}