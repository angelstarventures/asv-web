"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { DynamicEntryForm } from "./DynamicEntryForm";
import type { EventTypeDef } from "@/lib/eventTypes/schema";
import { validateSharedValues, validatePerScenarioValues } from "@/lib/eventTypes/schema";
import { ledgerCustomEventWrite, type Scenario } from "@/lib/functions/ledgerWrites";

const EMPTY_PER_SCENARIO = { OPTIMISTIC: {}, BALANCED: {}, CONSERVATIVE: {} } as Record<
  Scenario,
  Record<string, unknown>
>;

interface Company {
  id: string;
  name: string;
  tradeName?: string | null;
  sector?: string | null;
}

// Only ever rendered for admin-defined custom event types (CustomEntryLoader) — the built-in
// legacy-schema types are recorded via the JSON flow at /admin/ledger/record instead.
// DynamicEntryForm only renders fields; this adapter maps its shared/perScenario buckets into
// ledgerCustomEventWrite's input shape.
async function submitForEventType(
  eventType: EventTypeDef,
  companyId: string,
  eventDate: string,
  sourceDocument: string,
  shared: Record<string, unknown>,
  perScenario: Record<Scenario, Record<string, unknown>>
): Promise<void> {
  await ledgerCustomEventWrite({
    eventTypeKey: eventType.key,
    companyId,
    eventDate,
    sourceDocument: sourceDocument || undefined,
    shared,
    perScenario,
  });
}

export function EntryForm({ eventType, companies }: { eventType: EventTypeDef; companies: Company[] }) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [eventDate, setEventDate] = useState("");
  const [sourceDocument, setSourceDocument] = useState("");
  const [shared, setShared] = useState<Record<string, unknown>>({});
  const [perScenario, setPerScenario] = useState<Record<Scenario, Record<string, unknown>>>(EMPTY_PER_SCENARIO);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setNotice(null);
    const validationErrors = [
      ...validateSharedValues(eventType.fields, shared),
      ...validatePerScenarioValues(eventType.fields, perScenario),
    ];
    if (!companyId) validationErrors.push("company: a company must be selected");
    if (!eventDate) validationErrors.push("eventDate: required");
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors([]);
    setBusy(true);
    try {
      await submitForEventType(eventType, companyId, eventDate, sourceDocument, shared, perScenario);
      setNotice("Entry recorded across all 3 scenarios.");
      router.refresh();
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Could not record this entry."]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Company
        <select
          required
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.tradeName ?? c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Event date
        <input
          type="date"
          required
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      <DynamicEntryForm
        fields={eventType.fields}
        shared={shared}
        onSharedChange={(k, v) => setShared((prev) => ({ ...prev, [k]: v }))}
        perScenario={perScenario}
        onPerScenarioChange={(scenario, k, v) =>
          setPerScenario((prev) => ({ ...prev, [scenario]: { ...prev[scenario], [k]: v } }))
        }
      />

      <label className="flex flex-col gap-1 text-sm">
        Source document (URL, optional)
        <input
          type="text"
          value={sourceDocument}
          onChange={(e) => setSourceDocument(e.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      {errors.length > 0 && (
        <ul className="text-sm text-red-600 dark:text-red-400">
          {errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}
      {notice && <p className="text-sm text-zinc-700 dark:text-zinc-300">{notice}</p>}

      <button
        type="submit"
        disabled={busy}
        className="mt-2 self-start rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background disabled:opacity-50"
      >
        {busy ? "Saving..." : "Save entry"}
      </button>
    </form>
  );
}
