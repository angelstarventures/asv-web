"use client";

import { useState, type FormEvent } from "react";
import { readFileAsBase64 } from "@/lib/files";
import { submitPitch, type FundingRound, type SecurityType } from "@/lib/functions/deals";
import { ROUND_OPTIONS, SECURITY_TYPE_OPTIONS, CurrencySelect, YesNoField, inputClass, resolveCurrency } from "@/components/dealFormShared";

interface FundingHistoryRow {
  key: string;
  round: FundingRound;
  amount: string;
  currency: string;
  customCurrency: string;
}

function emptyFundingHistoryRow(): FundingHistoryRow {
  return {
    key: Math.random().toString(36).slice(2),
    round: "SEED",
    amount: "",
    currency: "USD",
    customCurrency: "",
  };
}

interface FormState {
  companyName: string;
  companyEmail: string;
  companyUrl: string;
  entrepreneurName: string;
  entrepreneurEmail: string;
  entrepreneurPhone: string;
  executiveSummary: string;
  teamInformation: string;
  round: FundingRound;
  securityType: SecurityType;
  seekingAmount: string;
  currency: string;
  customCurrency: string;
  preMoneyValuation: string;
  valuationCap: string;
  discountPercent: string;
  hasLeadInvestor: "" | "yes" | "no";
  leadInvestorName: string;
  willHaveInterestBearingDebtAfterClose: "" | "yes" | "no";
  hasExistingInterestBearingDebt: "" | "yes" | "no";
  hasRestrictedBusinessLines: "" | "yes" | "no";
  referredBy: string;
  fundingHistory: FundingHistoryRow[];
}

const INITIAL_STATE: FormState = {
  companyName: "",
  companyEmail: "",
  companyUrl: "",
  entrepreneurName: "",
  entrepreneurEmail: "",
  entrepreneurPhone: "",
  executiveSummary: "",
  teamInformation: "",
  round: "SEED",
  securityType: "PRICED_ROUND",
  seekingAmount: "",
  currency: "USD",
  customCurrency: "",
  preMoneyValuation: "",
  valuationCap: "",
  discountPercent: "",
  hasLeadInvestor: "",
  leadInvestorName: "",
  willHaveInterestBearingDebtAfterClose: "",
  hasExistingInterestBearingDebt: "",
  hasRestrictedBusinessLines: "",
  referredBy: "",
  fundingHistory: [],
};

const REQUIRED_TEXT_FIELDS: (keyof FormState)[] = [
  "companyName",
  "companyEmail",
  "companyUrl",
  "entrepreneurName",
  "entrepreneurEmail",
  "entrepreneurPhone",
];

const REQUIRED_YES_NO_FIELDS: (keyof FormState)[] = [
  "hasLeadInvestor",
  "willHaveInterestBearingDebtAfterClose",
  "hasExistingInterestBearingDebt",
  "hasRestrictedBusinessLines",
];

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
    if (!Number.isFinite(seekingAmount) || seekingAmount <= 0) {
      setError("Seeking must be a positive amount.");
      return;
    }
    const currency = resolveCurrency(form.currency, form.customCurrency);
    if (currency.length < 3 || currency.length > 10) {
      setError("Please enter a valid currency code.");
      return;
    }

    const isSafe = form.securityType === "SAFE";
    let preMoneyValuation: number | undefined;
    let valuationCap: number | undefined;
    let discountPercent: number | undefined;
    if (isSafe) {
      valuationCap = Number(form.valuationCap);
      if (!Number.isFinite(valuationCap) || valuationCap <= 0) {
        setError("Valuation cap must be a positive amount.");
        return;
      }
      if (form.discountPercent.trim()) {
        discountPercent = Number(form.discountPercent);
        if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
          setError("Discount must be between 0 and 100.");
          return;
        }
      }
    } else {
      preMoneyValuation = Number(form.preMoneyValuation);
      if (!Number.isFinite(preMoneyValuation) || preMoneyValuation <= 0) {
        setError("Pre-money valuation must be a positive amount.");
        return;
      }
    }

    const fundingHistory: { round: FundingRound; amount: number; currency: string }[] = [];
    for (const row of form.fundingHistory) {
      const amount = Number(row.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        setError("Each funding history round needs a valid amount, or remove the row.");
        return;
      }
      const rowCurrency = resolveCurrency(row.currency, row.customCurrency);
      if (rowCurrency.length < 3 || rowCurrency.length > 10) {
        setError("Please enter a valid currency code for each funding history round.");
        return;
      }
      fundingHistory.push({ round: row.round, amount, currency: rowCurrency });
    }

    // The website field accepts a bare domain (e.g. "faunabio.com") for entrepreneurs who
    // don't type the scheme — normalize to an absolute https:// URL so it's both a valid
    // clickable link later and a URL the backend's own fetch() (for sector detection) can use.
    const companyUrl = /^https?:\/\//i.test(form.companyUrl.trim())
      ? form.companyUrl.trim()
      : `https://${form.companyUrl.trim()}`;

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
        companyUrl,
        entrepreneurName: form.entrepreneurName.trim(),
        entrepreneurEmail: form.entrepreneurEmail.trim(),
        entrepreneurPhone: form.entrepreneurPhone.trim(),
        executiveSummary: form.executiveSummary.trim() || undefined,
        teamInformation: form.teamInformation.trim() || undefined,
        round: form.round,
        securityType: form.securityType,
        seekingAmount,
        currency,
        preMoneyValuation,
        valuationCap,
        discountPercent,
        hasLeadInvestor: form.hasLeadInvestor === "yes",
        leadInvestorName: form.leadInvestorName.trim() || undefined,
        willHaveInterestBearingDebtAfterClose: form.willHaveInterestBearingDebtAfterClose === "yes",
        hasExistingInterestBearingDebt: form.hasExistingInterestBearingDebt === "yes",
        hasRestrictedBusinessLines: form.hasRestrictedBusinessLines === "yes",
        referredBy: form.referredBy.trim() || undefined,
        fundingHistory: fundingHistory.length > 0 ? fundingHistory : undefined,
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
        <label className="flex flex-col gap-1 text-sm">
          Company website
          <input
            required
            type="text"
            placeholder="yourcompany.com"
            className={inputClass()}
            value={form.companyUrl}
            onChange={(e) => set("companyUrl", e.target.value)}
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
          Executive summary (optional)
          <textarea
            rows={4}
            className={inputClass()}
            value={form.executiveSummary}
            onChange={(e) => set("executiveSummary", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Team information (optional)
          <textarea
            rows={4}
            placeholder="Founders, key hires, relevant backgrounds..."
            className={inputClass()}
            value={form.teamInformation}
            onChange={(e) => set("teamInformation", e.target.value)}
          />
        </label>
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-card p-5 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">Documents</h2>
        <div className="flex flex-col gap-1.5 text-sm">
          Pitch deck
          <div className="flex items-center gap-3">
            <label className="w-fit cursor-pointer rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium dark:border-zinc-700">
              Choose file
              <input
                required
                type="file"
                className="hidden"
                onChange={(e) => setPitchDeckFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <span className="min-w-0 truncate text-zinc-500">{pitchDeckFile?.name ?? "No file chosen"}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 text-sm">
          Any additional document (optional)
          <div className="flex items-center gap-3">
            <label className="w-fit cursor-pointer rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium dark:border-zinc-700">
              Choose file(s)
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => setAdditionalFiles(e.target.files ? Array.from(e.target.files) : [])}
              />
            </label>
            <span className="min-w-0 truncate text-zinc-500">
              {additionalFiles.length > 0 ? additionalFiles.map((f) => f.name).join(", ") : "No files chosen"}
            </span>
          </div>
        </div>
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
            Currency
            <CurrencySelect
              value={form.currency}
              onChange={(v) => set("currency", v)}
              customValue={form.customCurrency}
              onCustomChange={(v) => set("customCurrency", v)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Seeking
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
          {form.securityType === "SAFE" ? (
            <>
              <label className="flex flex-col gap-1 text-sm">
                Valuation cap
                <input
                  required
                  type="number"
                  min={0}
                  step="any"
                  className={inputClass()}
                  value={form.valuationCap}
                  onChange={(e) => set("valuationCap", e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Discount % (optional)
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="any"
                  className={inputClass()}
                  value={form.discountPercent}
                  onChange={(e) => set("discountPercent", e.target.value)}
                />
              </label>
            </>
          ) : (
            <label className="flex flex-col gap-1 text-sm">
              Pre-money valuation
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
          )}
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-card p-5 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">Funding History (optional)</h2>
        <p className="text-sm text-zinc-500">Any prior rounds this company has raised, if applicable.</p>
        {form.fundingHistory.map((row, i) => (
          <div key={row.key} className="grid gap-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-800 sm:grid-cols-4">
            <label className="flex flex-col gap-1 text-sm">
              Round
              <select
                className={inputClass()}
                value={row.round}
                onChange={(e) =>
                  set(
                    "fundingHistory",
                    form.fundingHistory.map((r, j) => (j === i ? { ...r, round: e.target.value as FundingRound } : r))
                  )
                }
              >
                {ROUND_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Amount
              <input
                type="number"
                min={0}
                step="any"
                className={inputClass()}
                value={row.amount}
                onChange={(e) =>
                  set(
                    "fundingHistory",
                    form.fundingHistory.map((r, j) => (j === i ? { ...r, amount: e.target.value } : r))
                  )
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Currency
              <CurrencySelect
                value={row.currency}
                onChange={(v) =>
                  set(
                    "fundingHistory",
                    form.fundingHistory.map((r, j) => (j === i ? { ...r, currency: v } : r))
                  )
                }
                customValue={row.customCurrency}
                onCustomChange={(v) =>
                  set(
                    "fundingHistory",
                    form.fundingHistory.map((r, j) => (j === i ? { ...r, customCurrency: v } : r))
                  )
                }
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => set("fundingHistory", form.fundingHistory.filter((_, j) => j !== i))}
                className="rounded-full border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 dark:border-red-900 dark:text-red-400"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => set("fundingHistory", [...form.fundingHistory, emptyFundingHistoryRow()])}
          className="w-fit rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium dark:border-zinc-700"
        >
          Add a prior round
        </button>
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
          name="hasExistingInterestBearingDebt"
          label="Does the company have any interest-bearing debt today?"
          value={form.hasExistingInterestBearingDebt}
          onChange={(v) => set("hasExistingInterestBearingDebt", v)}
        />

        <YesNoField
          name="willHaveInterestBearingDebtAfterClose"
          label="Will the company have any interest-bearing debt after the close of this funding round?"
          value={form.willHaveInterestBearingDebtAfterClose}
          onChange={(v) => set("willHaveInterestBearingDebtAfterClose", v)}
        />

        <YesNoField
          name="hasRestrictedBusinessLines"
          label="Does the company's products/services include gambling, alcohol, insurance, or financial services?"
          value={form.hasRestrictedBusinessLines}
          onChange={(v) => set("hasRestrictedBusinessLines", v)}
        />

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
