"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { DynamicEntryForm } from "./DynamicEntryForm";
import { getBuiltinEventType } from "@/lib/eventTypes/builtins";
import { validateSharedValues, validatePerScenarioValues } from "@/lib/eventTypes/schema";
import {
  ledgerCreateCompanyUpdate,
  buildPerScenarioValuationInput,
  type CreateCompanyUpdateInput,
  type Scenario,
} from "@/lib/functions/ledgerWrites";

const EMPTY_PER_SCENARIO = { OPTIMISTIC: {}, BALANCED: {}, CONSERVATIVE: {} } as Record<
  Scenario,
  Record<string, unknown>
>;

const companyUpdateType = getBuiltinEventType("COMPANY_UPDATE")!;
const valuationAssessmentType = getBuiltinEventType("INTERNAL_VALUATION_ASSESSMENT")!;

interface Company {
  id: string;
  name: string;
}

export function CompanyUpdateForm({ companies }: { companies: Company[] }) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [eventDate, setEventDate] = useState("");
  const [sourceDocument, setSourceDocument] = useState("");
  const [shared, setShared] = useState<Record<string, unknown>>({});
  const [includeAssessment, setIncludeAssessment] = useState(false);
  const [assessmentShared, setAssessmentShared] = useState<Record<string, unknown>>({});
  const [assessmentPerScenario, setAssessmentPerScenario] = useState<Record<Scenario, Record<string, unknown>>>(
    EMPTY_PER_SCENARIO
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setNotice(null);
    const validationErrors = [...validateSharedValues(companyUpdateType.fields, shared)];
    if (!companyId) validationErrors.push("company: required");
    if (!eventDate) validationErrors.push("eventDate: required");
    if (includeAssessment) {
      validationErrors.push(
        ...validateSharedValues(valuationAssessmentType.fields, assessmentShared),
        ...validatePerScenarioValues(valuationAssessmentType.fields, assessmentPerScenario)
      );
    }
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors([]);
    setBusy(true);

    try {
      await ledgerCreateCompanyUpdate({
        companyId,
        eventDate,
        sourceDocument: sourceDocument || undefined,
        health: shared.health as CreateCompanyUpdateInput["health"],
        trajectory: shared.trajectory as CreateCompanyUpdateInput["trajectory"],
        highlights: (shared.highlights as string[]) ?? [],
        lowlights: (shared.lowlights as string[]) ?? [],
        upcomingPlans: (shared.upcomingPlans as string[]) ?? [],
        valuationAssessment: includeAssessment
          ? buildPerScenarioValuationInput(assessmentShared.drivingEventDate as string, assessmentPerScenario)
          : undefined,
      });
      setNotice("Company update recorded across all 3 scenarios.");
      router.refresh();
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Could not record this update."]);
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
              {c.name}
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
        fields={companyUpdateType.fields}
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

      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={includeAssessment} onChange={(e) => setIncludeAssessment(e.target.checked)} />
        Include an internal valuation assessment with this update
      </label>

      {includeAssessment && (
        <div className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <DynamicEntryForm
            fields={valuationAssessmentType.fields}
            shared={assessmentShared}
            onSharedChange={(k, v) => setAssessmentShared((prev) => ({ ...prev, [k]: v }))}
            perScenario={assessmentPerScenario}
            onPerScenarioChange={(scenario, k, v) =>
              setAssessmentPerScenario((prev) => ({ ...prev, [scenario]: { ...prev[scenario], [k]: v } }))
            }
          />
        </div>
      )}

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
        {busy ? "Saving..." : "Record update"}
      </button>
    </form>
  );
}
