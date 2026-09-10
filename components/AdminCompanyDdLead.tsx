"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setDdLead } from "@/lib/functions/companies";

// Same per-row shape as AdminCompanyLogoUpload — a small inline editor, not a separate detail
// page (matches this page's existing density).
export function AdminCompanyDdLead({
  companyId,
  ddLeadId,
  members,
}: {
  companyId: string;
  ddLeadId: string | null;
  members: { id: string; displayName: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleChange(memberId: string) {
    setError(null);
    setBusy(true);
    try {
      await setDdLead({ companyId, memberId: memberId || null });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the DD lead.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-2 text-xs text-zinc-500">
        DD lead
        <select
          value={ddLeadId ?? ""}
          disabled={busy}
          onChange={(e) => handleChange(e.target.value)}
          className="rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">None</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.displayName}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
