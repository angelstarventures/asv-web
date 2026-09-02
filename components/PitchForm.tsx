"use client";

import { useState, type FormEvent } from "react";
import { readFileAsBase64 } from "@/lib/files";
import { submitPitch, type FundingRound, type SecurityType } from "@/lib/functions/deals";

const ROUND_OPTIONS: { value: FundingRound; label: string }[] = [
  { value: "PRE_SEED", label: "Pre-seed" },
  { value: "SEED", label: "Seed" },
  { value: "SERIES_A", label: "Series A" },
  { value: "OTHER", label: "Other" },
];

const SECURITY_TYPE_OPTIONS: { value: SecurityType; label: string }[] = [
  { value: "PRICED_ROUND", label: "Priced round" },
  { value: "SAFE", label: "SAFE" },
  { value: "CONVERTIBLE_NOTE", label: "Convertible note" },
  { value: "OTHER", label: "Other" },
];

interface FormState {
  companyName: string;
  companyEmail: string;
  entrepreneurName: string;
  entrepreneurEmail: string;
  entrepreneurPhone: string;
  executiveSummary: string;
  teamInformation: string;
  round: FundingRound;
  securityType: SecurityType;
  seekingAmount: string;
  preMoneyValuation: string;
  hasLeadInvestor: "" | "yes" | "no";
  leadInvestorName: string;
  willHaveInterestBearingDebtAfterClose: "" | "yes" | "no";
  hasExistingInterestBearingDebt: "" | "yes" | "no";
  hasRestrictedBusinessLines: "" | "yes" | "no";
  raiseMethod: string;
  referredBy: string;
}

const INITIAL_STATE: FormState = {
  companyName: "",
  companyEmail: "",
  entrepreneurName: "",
  entrepreneurEmail: "",
  entrepreneurPhone: "",
  executiveSummary: "",
  teamInformation: "",
  round: "SEED",
  securityType: "PRICED_ROUND",
  seekingAmount: "",
  preMoneyValuation: "",
  hasLeadInvestor: "",
  leadInvestorName: "",
  willHaveInterestBearingDebtAfterClose: "",
  hasExistingInterestBearingDebt: "",
  hasRestrictedBusinessLines: "",
  raiseMethod: "",
  referredBy: "",
};

const REQUIRED_TEXT_FIELDS: (keyof FormState)[] = [
  "companyName",
  "companyEmail",
  "entrepreneurName",
  "entrepreneurEmail",
  "entrepreneurPhone",
  "executiveSummary",
  "teamInformation",
  "raiseMethod",
];

const REQUIRED_YES_NO_FIELDS: (keyof FormState)[] = [
  "hasLeadInvestor",
  "willHaveInterestBearingDebtAfterClose",
  "hasExistingInterestBearingDebt",
  "hasRestrictedBusinessLines",
];

function inputClass() {
  return "rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";
}

function YesNoField({
  label,
  value,
  onChange,
  name,
}: {
  label: string;
  value: "" | "yes" | "no";
  onChange: (v: "yes" | "no") => void;
  name: string;
}) {
  return (
    <fieldset className="flex flex-col gap-1 text-sm">
      <legend>{label}</legend>
      <div className="flex gap-4">
        <label className="flex items-center gap-1.5">
          <input type="radio" name={name} checked={value === "yes"} onChange={() => onChange("yes")} required />
          Yes
        </label>
        <label className="flex items-center gap-1.5">
          <input type="radio" name={name} checked={value === "no"} onChange={() => onChange("no")} required />
          No
        </label>
      </div>
    </fieldset>
  );
}

export function PitchForm() {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [pitchDeckFile, setPitchDeckFile] = useState<File | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submittedCompanyName, setSubmittedCompanyName] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    for (const field of REQUIRED_TEXT_FIELDS) {
      if (!String(form[field]).trim()) {
        setError("Please fill in all required fields.");
        return;
      }
    }
    for (const field of REQUIRED_YES_NO_FIELDS) {
      if (!form[field]) {
        setError("Please answer every question in Additional Questions.");
        return;
      }
    }
    if (!pitchDeckFile) {
      setError("A pitch deck is required.");
      return;
    }
    const seekingAmount = Number(form.seekingAmount);
    const preMoneyValuation = Number(form.preMoneyValuation);
    if (!Number.isFinite(seekingAmount) || seekingAmount <= 0) {
      setError("Seeking must be a positive amount.");
      return;
    }
    if (!Number.isFinite(preMoneyValuation) || preMoneyValuation <= 0) {
      setError("Pre-money valuation must be a positive amount.");
      return;
    }

    setBusy(true);
    try {
      const pitchDeck = {
        filename: pitchDeckFile.name,
        mimeType: pitchDeckFile.type || "application/octet-stream",
        contentBase64: await readFileAsBase64(pitchDeckFile),
      };
      const additionalDocuments = await Promise.all(
        additionalFiles.map(async (file) => ({
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          contentBase64: await readFileAsBase64(file),
        }))
      );

      await submitPitch({
        companyName: form.companyName.trim(),
        companyEmail: form.companyEmail.trim(),
        entrepreneurName: form.entrepreneurName.trim(),
        entrepreneurEmail: form.entrepreneurEmail.trim(),
        entrepreneurPhone: form.entrepreneurPhone.trim(),
        executiveSummary: form.executiveSummary.trim(),
        teamInformation: form.teamInformation.trim(),
        round: form.round,
        securityType: form.securityType,
        seekingAmount,
        preMoneyValuation,
        hasLeadInvestor: form.hasLeadInvestor === "yes",
        leadInvestorName: form.leadInvestorName.trim() || undefined,
        willHaveInterestBearingDebtAfterClose: form.willHaveInterestBearingDebtAfterClose === "yes",
        hasExistingInterestBearingDebt: form.hasExistingInterestBearingDebt === "yes",
        hasRestrictedBusinessLines: form.hasRestrictedBusinessLines === "yes",
        raiseMethod: form.raiseMethod.trim(),
        referredBy: form.referredBy.trim() || undefined,
        pitchDeck,
        additionalDocuments,
      });

      setSubmittedCompanyName(form.companyName.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your pitch. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (submittedCompanyName) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-card p-6 text-center dark:border-zinc-800">
        <h2 className="text-lg font-semibold">Thank you!</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          We&apos;ve received {submittedCompanyName}&apos;s pitch. Our team will review it and
          reach out if it&apos;s a fit.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-card p-5 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">Overview</h2>
        <label className="flex flex-col gap-1 text-sm">
          Company name
          <input
            required
            className={inputClass()}
            value={form.companyName}
            onChange={(e) => set("companyName", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Company email
          <input
            required
            type="email"
            className={inputClass()}
            value={form.companyEmail}
            onChange={(e) => set("companyEmail", e.target.value)}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            Entrepreneur name
            <input
              required
              className={inputClass()}
              value={form.entrepreneurName}
              onChange={(e) => set("entrepreneurName", e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Entrepreneur email
            <input
              required
              type="email"
              className={inputClass()}
              value={form.entrepreneurEmail}
              onChange={(e) => set("entrepreneurEmail", e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Entrepreneur phone
            <input
              required
              type="tel"
              className={inputClass()}
              value={form.entrepreneurPhone}
              onChange={(e) => set("entrepreneurPhone", e.target.value)}
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          Executive summary
          <textarea
            required
            rows={4}
            className={inputClass()}
            value={form.executiveSummary}
            onChange={(e) => set("executiveSummary", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Team information
          <textarea
            required
            rows={4}
            placeholder="Founders, key hires, relevant backgrounds..."
            className={inputClass()}
            value={form.teamInformation}
            onChange={(e) => set("teamInformation", e.target.value)}
          />
        </label>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-card p-5 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">Pitch Deck</h2>
        <label className="flex flex-col gap-1 text-sm">
          Pitch deck
          <input
            required
            type="file"
            className="text-sm"
            onChange={(e) => setPitchDeckFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Any additional document (optional)
          <input
            type="file"
            multiple
            className="text-sm"
            onChange={(e) => setAdditionalFiles(e.target.files ? Array.from(e.target.files) : [])}
          />
        </label>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-card p-5 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">Financials</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Round
            <select
              className={inputClass()}
              value={form.round}
              onChange={(e) => set("round", e.target.value as FundingRound)}
            >
              {ROUND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Security type
            <select
              className={inputClass()}
              value={form.securityType}
              onChange={(e) => set("securityType", e.target.value as SecurityType)}
            >
              {SECURITY_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Seeking ($)
            <input
              required
              type="number"
              min={0}
              step="any"
              className={inputClass()}
              value={form.seekingAmount}
              onChange={(e) => set("seekingAmount", e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Pre-money valuation ($)
            <input
              required
              type="number"
              min={0}
              step="any"
              className={inputClass()}
              value={form.preMoneyValuation}
              onChange={(e) => set("preMoneyValuation", e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-card p-5 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">Additional Questions</h2>

        <YesNoField
          name="hasLeadInvestor"
          label="Do you have a lead investor for this round?"
          value={form.hasLeadInvestor}
          onChange={(v) => set("hasLeadInvestor", v)}
        />
        {form.hasLeadInvestor === "yes" && (
          <label className="flex flex-col gap-1 text-sm">
            Lead investor name (optional)
            <input
              className={inputClass()}
              value={form.leadInvestorName}
              onChange={(e) => set("leadInvestorName", e.target.value)}
            />
          </label>
        )}

        <YesNoField
          name="willHaveInterestBearingDebtAfterClose"
          label="Will the company have any interest-bearing debt after the close of this funding round?"
          value={form.willHaveInterestBearingDebtAfterClose}
          onChange={(v) => set("willHaveInterestBearingDebtAfterClose", v)}
        />

        <YesNoField
          name="hasExistingInterestBearingDebt"
          label="Does the company have any interest-bearing debt today?"
          value={form.hasExistingInterestBearingDebt}
          onChange={(v) => set("hasExistingInterestBearingDebt", v)}
        />

        <YesNoField
          name="hasRestrictedBusinessLines"
          label="Does the company's products/services include gambling, alcohol, insurance, or financial services?"
          value={form.hasRestrictedBusinessLines}
          onChange={(v) => set("hasRestrictedBusinessLines", v)}
        />

        <label className="flex flex-col gap-1 text-sm">
          How are you raising the current funding round?
          <textarea
            required
            rows={2}
            className={inputClass()}
            value={form.raiseMethod}
            onChange={(e) => set("raiseMethod", e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Referred by (optional)
          <input
            className={inputClass()}
            value={form.referredBy}
            onChange={(e) => set("referredBy", e.target.value)}
          />
        </label>
      </section>

      <button
        type="submit"
        disabled={busy}
        className="self-start rounded-full bg-foreground px-6 py-2 text-sm font-medium text-background disabled:opacity-50"
      >
        {busy ? "Submitting..." : "Submit pitch"}
      </button>
    </form>
  );
}
