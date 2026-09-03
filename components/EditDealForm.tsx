"use client";

import { useState, type FormEvent } from "react";
import { updateDealFields, type FundingRound, type SecurityType } from "@/lib/functions/deals";
import {
  ROUND_OPTIONS,
  SECURITY_TYPE_OPTIONS,
  CurrencySelect,
  YesNoField,
  inputClass,
  resolveCurrency,
  currencyToSelectState,
} from "@/components/dealFormShared";
import type { DealDetail } from "@/components/DealDetailView";

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
  raiseMethod: string;
  referredBy: string;
  sector: string;
  keywords: string;
  companyLocation: string;
}

function yesNoOf(v: boolean): "yes" | "no" {
  return v ? "yes" : "no";
}

function initialStateFrom(deal: DealDetail): FormState {
  const { value: currency, custom: customCurrency } = currencyToSelectState(deal.currency);
  return {
    companyName: deal.companyName,
    companyEmail: deal.companyEmail,
    companyUrl: deal.companyUrl ?? "",
    entrepreneurName: deal.entrepreneurName,
    entrepreneurEmail: deal.entrepreneurEmail,
    entrepreneurPhone: deal.entrepreneurPhone,
    executiveSummary: deal.executiveSummary ?? "",
    teamInformation: deal.teamInformation ?? "",
    round: deal.round as FundingRound,
    securityType: deal.securityType as SecurityType,
    seekingAmount: String(deal.seekingAmount),
    currency,
    customCurrency,
    preMoneyValuation: deal.preMoneyValuation != null ? String(deal.preMoneyValuation) : "",
    valuationCap: deal.valuationCap != null ? String(deal.valuationCap) : "",
    discountPercent: deal.discountPercent != null ? String(deal.discountPercent) : "",
    hasLeadInvestor: yesNoOf(deal.hasLeadInvestor),
    leadInvestorName: deal.leadInvestorName ?? "",
    willHaveInterestBearingDebtAfterClose: yesNoOf(deal.willHaveInterestBearingDebtAfterClose),
    hasExistingInterestBearingDebt: yesNoOf(deal.hasExistingInterestBearingDebt),
    hasRestrictedBusinessLines: yesNoOf(deal.hasRestrictedBusinessLines),
    raiseMethod: deal.raiseMethod ?? "",
    referredBy: deal.referredBy ?? "",
    sector: deal.sector ?? "",
    keywords: deal.keywords?.join(", ") ?? "",
    companyLocation: deal.companyLocation ?? "",
  };
}

// Full-field admin edit, mirroring PitchForm's Overview/Financials/Additional Questions
// sections (same shared building blocks — dealFormShared.tsx) but with no Documents section
// (no re-upload here) and no Funding History section (entrepreneur-only, immutable per an
// earlier decision). Replaces DealDetailView's tabbed read view while active.
export function EditDealForm({
  deal,
  onSaved,
  onCancel,
}: {
  deal: DealDetail;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => initialStateFrom(deal));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    for (const [field, label] of [
      ["companyName", "Company name"],
      ["companyEmail", "Company email"],
      ["companyUrl", "Company website"],
      ["entrepreneurName", "Entrepreneur name"],
      ["entrepreneurEmail", "Entrepreneur email"],
      ["entrepreneurPhone", "Entrepreneur phone"],
    ] as const) {
      if (!form[field].trim()) {
        setError(`${label} is required.`);
        return;
      }
    }
    for (const field of [
      "hasLeadInvestor",
      "willHaveInterestBearingDebtAfterClose",
      "hasExistingInterestBearingDebt",
      "hasRestrictedBusinessLines",
    ] as const) {
      if (!form[field]) {
        setError("Please answer every yes/no question.");
        return;
      }
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

    const companyUrl = /^https?:\/\//i.test(form.companyUrl.trim())
      ? form.companyUrl.trim()
      : `https://${form.companyUrl.trim()}`;

    setBusy(true);
    try {
      await updateDealFields({
        dealId: deal.id,
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
        raiseMethod: form.raiseMethod.trim() || undefined,
        referredBy: form.referredBy.trim() || undefined,
        sector: form.sector.trim() || undefined,
        keywords: form.keywords.trim()
          ? form.keywords
              .split(",")
              .map((k) => k.trim())
              .filter(Boolean)
          : undefined,
        companyLocation: form.companyLocation.trim() || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-card p-5 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">Overview</h2>
        <label className="flex flex-col gap-1 text-sm">
          Company name
          <input required className={inputClass()} value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
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
          <input required type="text" className={inputClass()} value={form.companyUrl} onChange={(e) => set("companyUrl", e.target.value)} />
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
          <textarea rows={4} className={inputClass()} value={form.executiveSummary} onChange={(e) => set("executiveSummary", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Team information (optional)
          <textarea rows={4} className={inputClass()} value={form.teamInformation} onChange={(e) => set("teamInformation", e.target.value)} />
        </label>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-card p-5 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">AI-detected info</h2>
        <p className="text-sm text-zinc-500">Detected from the company website at submission time — correct anything wrong.</p>
        <label className="flex flex-col gap-1 text-sm">
          Sector
          <input className={inputClass()} value={form.sector} onChange={(e) => set("sector", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Keywords (comma-separated)
          <input className={inputClass()} value={form.keywords} onChange={(e) => set("keywords", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Location
          <input className={inputClass()} value={form.companyLocation} onChange={(e) => set("companyLocation", e.target.value)} />
        </label>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-card p-5 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">Financials</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Round
            <select className={inputClass()} value={form.round} onChange={(e) => set("round", e.target.value as FundingRound)}>
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
            <input className={inputClass()} value={form.leadInvestorName} onChange={(e) => set("leadInvestorName", e.target.value)} />
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
          Raising via (optional)
          <input className={inputClass()} value={form.raiseMethod} onChange={(e) => set("raiseMethod", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Referred by (optional)
          <input className={inputClass()} value={form.referredBy} onChange={(e) => set("referredBy", e.target.value)} />
        </label>
      </section>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-foreground px-6 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {busy ? "Saving..." : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-full border border-zinc-300 px-6 py-2 text-sm font-medium disabled:opacity-50 dark:border-zinc-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
