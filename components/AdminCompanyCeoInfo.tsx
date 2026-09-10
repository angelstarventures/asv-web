"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setCeoInfo } from "@/lib/functions/companies";

// Same per-row inline-editor shape as AdminCompanyDdLead.
export function AdminCompanyCeoInfo({
  companyId,
  ceoName,
  ceoContact,
}: {
  companyId: string;
  ceoName: string | null;
  ceoContact: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(ceoName ?? "");
  const [contact, setContact] = useState(ceoContact ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    setError(null);
    setBusy(true);
    try {
      await setCeoInfo({ companyId, ceoName: name.trim() || null, ceoContact: contact.trim() || null });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save CEO info.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span className="w-14 shrink-0">CEO</span>
        <input
          type="text"
          value={name}
          disabled={busy}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleSave}
          placeholder="Name"
          className="w-32 rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
        />
        <input
          type="text"
          value={contact}
          disabled={busy}
          onChange={(e) => setContact(e.target.value)}
          onBlur={handleSave}
          placeholder="Email or phone"
          className="w-40 rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
