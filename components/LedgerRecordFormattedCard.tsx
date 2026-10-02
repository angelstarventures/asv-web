"use client";

import { formatCurrencyCompact } from "@/components/StatTile";

// Shared record type labels — mirrors CompanyDetailView.tsx.
const ROUND_TYPE_LABEL: Record<string, string> = {
  Participating_PricedRound: "Priced Equity",
  Participating_SAFERound: "SAFE",
  NonParticipating_Round: "Non-participating",
  Exit_Event: "Exit",
  Transaction_ValuationChange: "Valuation Change",
  Internal_ValuationAssessment: "Internal Assessment",
  Compliance_FlagChange: "Compliance Flag",
  CompanyUpdate: "Company Update",
};

const SCENARIO_DISPLAY: Record<string, string> = {
  optimistic: "Optimistic",
  balanced: "Balanced",
  conservative: "Conservative",
};
function field(label: string, value: unknown, fullWidth?: boolean): Field | null {
  if (value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) return null;
  return { label, value: typeof value === "number" ? value : String(value), fullWidth };
}

function numberField(label: string, value: unknown, fullWidth?: boolean): Field | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return null;
  return field(label, formatCurrencyCompact(n), fullWidth);
}

function listField(label: string, items: unknown, fullWidth?: boolean): Field | null {
  if (!Array.isArray(items) || items.length === 0) return null;
  return {
    label,
    value: items.map((item) => `• ${String(item)}`).join("\n"),
    fullWidth,
  };
}

function buildAllocationsField(allocations: unknown): Field | null {
  if (allocations === null || allocations === undefined) return null;
  if (typeof allocations === "object") {
    const entries = Object.entries(allocations);
    if (entries.length === 0) return null;
    return {
      label: "Allocations",
      value: entries.map(([memberId, amount]) => {
        if (typeof amount === "number") return `  ${memberId}: ${formatCurrencyCompact(amount)}`;
        return `  ${memberId}: ${String(amount)}`;
      }).join("\n"),
      fullWidth: true,
    };
  }
  return null;
}
function buildFields(type: string, record: Record<string, unknown>): Field[] {
  switch (type) {
    case "Participating_PricedRound":
    case "Participating_SAFERound":
    case "NonParticipating_Round": {
      const roundName = record.round_name ?? record.roundName ?? "";
      const amountRaised = record.amount_raised ?? record.amountRaised ?? record.asv_total ?? record.asvTotal;
      const valuation = record.post_money_valuation ?? record.postMoneyValuation ?? record.valuation;
      const discount = record.discount_percent ?? record.discountPercent ?? record.discount;
      const pricePerShare = record.price_per_share ?? record.pricePerShare;
      const totalRoundSize = record.total_round_size ?? record.totalRoundSize;
      const notes = record.notes ?? record.round_notes ?? record.roundNotes;
      const allocations = record.allocations ?? record.member_allocations ?? record.memberAllocations;
      return [
        roundName ? field("Round", roundName) : null,
        numberField("Amount raised", amountRaised),
        totalRoundSize ? numberField("Total round size", totalRoundSize) : null,
        numberField("Valuation", valuation),
        pricePerShare ? field("Price per share", pricePerShare) : null,
        discount ? field("Discount", `${discount}%`) : null,
        notes ? field("Notes", notes, true) : null,
        buildAllocationsField(allocations),
      ].filter((f) => f !== null) as Field[];
    }

    case "Exit_Event": {
      const amountRealized = record.amount_realized ?? record.amountRealized ?? record.exit_amount ?? record.exitAmount;
      const totalReturned = record.total_returned ?? record.totalReturned;
      const notes = record.notes ?? record.exit_notes ?? record.exitNotes;
      return [
        numberField("Amount realized", amountRealized, true),
        totalReturned ? numberField("Total returned", totalReturned) : null,
        notes ? field("Notes", notes, true) : null,
      ].filter((f) => f !== null) as Field[];
    }

    case "Transaction_ValuationChange": {
      const newValuation = record.new_valuation ?? record.newValuation ?? record.asv_total_fair_market_value ?? record.asvTotalFairMarketValue;
      const impliedValue = record.implied_enterprise_value ?? record.impliedEnterpriseValue;
      const rationale = record.rationale ?? record.change_rationale ?? record.changeRationale ?? record.assessment_rationale ?? record.assessmentRationale;
      return [
        numberField("New valuation", newValuation, true),
        impliedValue ? numberField("Implied enterprise value", impliedValue) : null,
        rationale ? field("Rationale", rationale, true) : null,
      ].filter((f) => f !== null) as Field[];
    }

    case "Internal_ValuationAssessment": {
      const fmv = record.asv_total_fair_market_value ?? record.asvTotalFairMarketValue;
      const impliedValue = record.implied_enterprise_value ?? record.impliedEnterpriseValue;
      const rationale = record.assessment_rationale ?? record.assessmentRationale ?? record.rationale;
      return [
        numberField("Fair market value", fmv, true),
        impliedValue ? numberField("Implied enterprise value", impliedValue) : null,
        rationale ? field("Assessment rationale", rationale, true) : null,
      ].filter((f) => f !== null) as Field[];
    }

    case "Compliance_FlagChange": {
      const complianceStatus = record.compliance_status as Record<string, unknown> | undefined;
      const auditType = record.audit_type ?? record.auditType;
      const notes = record.compliance_officer_notes ?? record.complianceOfficerNotes ?? record.compliance_notes ?? record.complianceNotes;
      const statusStr = complianceStatus?.status ?? record.status ?? "";
      return [
        statusStr ? field("Status", String(statusStr)) : null,
        auditType ? field("Audit type", String(auditType)) : null,
        notes ? field("Officer notes", notes, true) : null,
      ].filter((f) => f !== null) as Field[];
    }

    case "CompanyUpdate": {
      const summary = record.summary as Record<string, unknown> | undefined;
      const health = record.health ?? "";
      const trajectory = record.trajectory ?? "";
      const healthStr = HEALTH_LABEL[String(health)] ?? health;
      return [
        health ? field("Health", healthStr) : null,
        trajectory ? field("Trajectory", String(trajectory)) : null,
        summary ? listField("Highlights", summary.highlights, true) : null,
        summary ? listField("Lowlights", summary.lowlights, true) : null,
        summary ? listField("Upcoming plans", summary.upcoming_plans, true) : null,
      ].filter((f) => f !== null) as Field[];
    }

    default: {
      const skipKeys = new Set(["scenario", "company", "date", "type"]);
      return Object.entries(record)
        .filter(([k]) => !skipKeys.has(k))
        .map(([k, v]) => field(k, v))
        .filter((f) => f !== null) as Field[];
    }
  }
}
// Renders a single AI-drafted ledger record as a formatted card rather than raw JSON,
// matching the look of the company detail view's rounds/updates sections.
export function LedgerRecordFormattedCard({ record }: { record: Record<string, unknown> }) {
  const type = String(record.type ?? "");
  const date = String(record.date ?? "");
  const company = String(record.company ?? "");
  const scenario = String(record.scenario ?? "");
  const typeLabel = ROUND_TYPE_LABEL[type] ?? type;

  const fields = buildFields(type, record);

  return (
    <div className="rounded-lg border border-zinc-200 bg-card p-4 text-sm dark:border-zinc-800">
      <div className="flex flex-wrap items-center gap-2">
        <span className="tabular-nums font-medium">{date}</span>
        <span className="font-medium">{company}</span>
        <span className="text-zinc-500">{typeLabel}</span>
        {scenario && (
          <>
            <span className="text-zinc-400">·</span>
            <span className="text-zinc-500">{SCENARIO_DISPLAY[scenario.toLowerCase()] ?? scenario}</span>
          </>
        )}
      </div>
      {fields.length > 0 && (
        <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
          {fields.map(({ label, value, fullWidth }) => (
            <div key={label} className={fullWidth ? "sm:col-span-2" : ""}>
              <dt className="text-xs text-zinc-500">{label}</dt>
              <dd className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

const HEALTH_LABEL: Record<string, string> = {
  Green: "Healthy",
  Yellow: "Watch",
  Red: "Critical",
};

interface Field {
  label: string;
  value: string | number;
  fullWidth?: boolean;
}