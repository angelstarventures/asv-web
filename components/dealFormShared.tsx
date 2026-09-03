"use client";

import type { FundingRound, SecurityType } from "@/lib/functions/deals";

// Shared building blocks between PitchForm (entrepreneur create) and EditDealForm (admin edit) —
// factored out after a bug where the create/update paths' server-side validation drifted apart
// on the same currency/SAFE rules; keeping the client-side pieces in one place too avoids the
// same risk here.

export const ROUND_OPTIONS: { value: FundingRound; label: string }[] = [
  { value: "PRE_SEED", label: "Pre-seed" },
  { value: "SEED", label: "Seed" },
  { value: "SERIES_A", label: "Series A" },
  { value: "SERIES_B", label: "Series B" },
  { value: "SERIES_C", label: "Series C" },
  { value: "OTHER", label: "Other" },
];

export const SECURITY_TYPE_OPTIONS: { value: SecurityType; label: string }[] = [
  { value: "PRICED_ROUND", label: "Priced round" },
  { value: "SAFE", label: "SAFE" },
  { value: "CONVERTIBLE_NOTE", label: "Convertible note" },
  { value: "OTHER", label: "Other" },
];

// A curated list rather than free text for the common case, with "Other" as an escape hatch —
// avoids typo'd/invalid ISO codes for the vast majority of submissions.
export const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "CAD", "AUD", "INR", "AED", "SGD", "OTHER"] as const;
export const CURRENCY_LABELS: Record<(typeof CURRENCY_OPTIONS)[number], string> = {
  USD: "USD ($)",
  EUR: "EUR (€)",
  GBP: "GBP (£)",
  CAD: "CAD ($)",
  AUD: "AUD ($)",
  INR: "INR (₹)",
  AED: "AED (د.إ)",
  SGD: "SGD ($)",
  OTHER: "Other",
};

export function resolveCurrency(selected: string, custom: string): string {
  return selected === "OTHER" ? custom.trim().toUpperCase() : selected;
}

// Splits a stored currency code into the {select value, custom text} pair CurrencySelect needs —
// the inverse of resolveCurrency, used to pre-fill the edit form from an existing deal.
export function currencyToSelectState(code: string | null | undefined): { value: string; custom: string } {
  const upper = (code ?? "USD").toUpperCase();
  return CURRENCY_OPTIONS.includes(upper as (typeof CURRENCY_OPTIONS)[number])
    ? { value: upper, custom: "" }
    : { value: "OTHER", custom: upper };
}

export function inputClass(): string {
  return "rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";
}

export function CurrencySelect({
  value,
  onChange,
  customValue,
  onCustomChange,
}: {
  value: string;
  onChange: (v: string) => void;
  customValue: string;
  onCustomChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <select className={inputClass()} value={value} onChange={(e) => onChange(e.target.value)}>
        {CURRENCY_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {CURRENCY_LABELS[opt]}
          </option>
        ))}
      </select>
      {value === "OTHER" && (
        <input
          placeholder="3-letter currency code"
          maxLength={10}
          className={inputClass()}
          value={customValue}
          onChange={(e) => onCustomChange(e.target.value)}
        />
      )}
    </div>
  );
}

export function YesNoField({
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
