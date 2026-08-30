"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { DynamicEntryForm } from "./DynamicEntryForm";
import { getBuiltinEventType } from "@/lib/eventTypes/builtins";
import { validateSharedValues } from "@/lib/eventTypes/schema";
import { ledgerCreateInvestmentRound, type CreateInvestmentRoundInput } from "@/lib/functions/ledgerWrites";

const ROUND_KINDS = ["PARTICIPATING_PRICED_ROUND", "PARTICIPATING_SAFE_ROUND", "NON_PARTICIPATING_ROUND"] as const;
type RoundKind = (typeof ROUND_KINDS)[number];
const ROUND_LABELS: Record<RoundKind, string> = {
  PARTICIPATING_PRICED_ROUND: "Priced Round",
  PARTICIPATING_SAFE_ROUND: "SAFE Round",
  NON_PARTICIPATING_ROUND: "Non-Participating Round (Markup/Markdown)",
};

const EMPTY_PER_SCENARIO = { OPTIMISTIC: {}, BALANCED: {}, CONSERVATIVE: {} } as const;

interface Company {
  name: string;
}
interface Member {
  id: string;
  displayName: string;
}

export function NewInvestmentForm({ companies, members }: { companies: Company[]; members: Member[] }) {
  const router = useRouter();
  const [roundKind, setRoundKind] = useState<RoundKind>("PARTICIPATING_PRICED_ROUND");
  const [companyName, setCompanyName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [sourceDocument, setSourceDocument] = useState("");
  const [shared, setShared] = useState<Record<string, unknown>>({});
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const eventType = useMemo(() => getBuiltinEventType(roundKind)!, [roundKind]);

  function handleRoundKindChange(next: RoundKind) {
    setRoundKind(next);
    setShared({});
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setNotice(null);
    const validationErrors = validateSharedValues(eventType.fields, shared);
    if (!companyName.trim()) validationErrors.push("company: required");
    if (!eventDate) validationErrors.push("eventDate: required");
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors([]);
    setBusy(true);

    const { sector, ...detail } = shared;
    const allocationEntries = Object.entries(allocations)
      .map(([memberId, amount]) => [memberId, Number(amount)] as const)
      .filter(([, amount]) => amount > 0);

    const input: CreateInvestmentRoundInput = {
      companyName: companyName.trim(),
      sector: (sector as string) || undefined,
      eventDate,
      roundKind,
      sourceDocument: sourceDocument || undefined,
      allocations: Object.fromEntries(allocationEntries),
      detail,
    };

    try {
      await ledgerCreateInvestmentRound(input);
      setNotice("Investment round recorded across all 3 scenarios.");
      router.refresh();
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Could not record this investment."]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Round type
        <select
          value={roundKind}
          onChange={(e) => handleRoundKindChange(e.target.value as RoundKind)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {ROUND_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {ROUND_LABELS[kind]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Company
        <input
          type="text"
          required
          list="existing-companies"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Existing company name, or a new one"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <datalist id="existing-companies">
          {companies.map((c) => (
            <option key={c.name} value={c.name} />
          ))}
        </datalist>
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
        perScenario={EMPTY_PER_SCENARIO}
        onPerScenarioChange={() => {}}
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

      <div>
        <h2 className="mb-2 text-sm font-medium">Allocations</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <th className="py-1 font-medium">Member</th>
              <th className="py-1 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="py-1">{m.displayName}</td>
                <td className="py-1">
                  <input
                    type="number"
                    min={0}
                    value={allocations[m.id] ?? ""}
                    onChange={(e) => setAllocations((prev) => ({ ...prev, [m.id]: e.target.value }))}
                    className="w-32 rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
        {busy ? "Saving..." : "Record investment"}
      </button>
    </form>
  );
}
