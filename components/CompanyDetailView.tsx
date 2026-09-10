"use client";

import { useState } from "react";
import Link from "next/link";
import { CompanyHealth, CompanyStatus, CompanyTrajectory, LedgerEntryType } from "@/lib/dataconnect/generated";
import { HealthDot } from "@/components/HealthDot";
import { StatTile, formatCurrencyCompact, formatMoic } from "@/components/StatTile";
import type { CompanyDetail } from "@/lib/portfolioView";
import type { Scope } from "@/lib/scenarioTypes";

const STATUS_LABEL: Record<CompanyStatus, { label: string; className: string }> = {
  [CompanyStatus.ACTIVE]: { label: "Active", className: "text-green-600 dark:text-green-400" },
  [CompanyStatus.EXITED]: { label: "Exited", className: "text-blue-600 dark:text-blue-400" },
  [CompanyStatus.WRITTEN_OFF]: { label: "Written off", className: "text-red-600 dark:text-red-400" },
  [CompanyStatus.ARCHIVED]: { label: "Archived", className: "text-zinc-500" },
};

const ROUND_TYPE_LABEL: Record<string, string> = {
  [LedgerEntryType.PARTICIPATING_PRICED_ROUND]: "Priced Equity",
  [LedgerEntryType.PARTICIPATING_SAFE_ROUND]: "SAFE",
  [LedgerEntryType.NON_PARTICIPATING_ROUND]: "Non-participating",
};

const TABS = ["overview", "rounds", "updates"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = { overview: "Overview", rounds: "Rounds", updates: "Updates" };

export function CompanyDetailView({ detail, scope, backHref }: { detail: CompanyDetail; scope: Scope; backHref: string }) {
  const [tab, setTab] = useState<Tab>("overview");
  const status = STATUS_LABEL[detail.status];

  return (
    <div className="flex flex-col gap-6 px-4 py-10 sm:px-6">
      <Link href={backHref} className="text-sm text-zinc-500 underline underline-offset-2">
        &larr; Portfolio
      </Link>

      <div className="flex items-center gap-4">
        {detail.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- company-supplied logo URL, not an optimizable local asset
          <img src={detail.logoUrl} alt={detail.name} className="h-16 w-16 rounded-md border border-zinc-200 object-contain bg-white dark:border-zinc-800" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-md border border-zinc-200 bg-zinc-100 text-2xl font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
            {detail.name.charAt(0)}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{detail.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
            <span className={`inline-flex items-center gap-1.5 font-medium ${status.className}`}>
              {detail.status === CompanyStatus.ACTIVE && <HealthDot health={detail.health} />}
              {status.label}
            </span>
            <span>{detail.sector ?? "Uncategorized"}</span>
            {detail.website && (
              <a href={detail.website} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                Website
              </a>
            )}
          </div>
        </div>
      </div>

      <nav className="flex flex-wrap gap-1 rounded-2xl border border-zinc-200 bg-card p-1.5 self-start dark:border-zinc-800">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-current={tab === t ? "page" : undefined}
            className={
              tab === t
                ? "rounded-full bg-foreground px-4 py-1.5 text-sm font-semibold text-background"
                : "rounded-full px-4 py-1.5 text-sm font-medium text-zinc-600 hover:text-foreground"
            }
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </nav>

      {tab === "overview" && <OverviewSection detail={detail} />}
      {tab === "rounds" && <RoundsSection detail={detail} scope={scope} />}
      {tab === "updates" && <UpdatesSection detail={detail} />}
    </div>
  );
}

function OverviewSection({ detail }: { detail: CompanyDetail }) {
  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-zinc-200 bg-card px-5 py-4 dark:border-zinc-800">
        <h2 className="mb-3 text-sm font-medium text-zinc-500">Company details</h2>
        <p className="text-sm">{detail.tagline || "No description yet."}</p>
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-zinc-500">CEO</dt>
            <dd>{detail.ceoName || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500">CEO contact</dt>
            <dd>{detail.ceoContact || "—"}</dd>
          </div>
        </dl>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Amount invested" value={formatCurrencyCompact(detail.invested)} variant="amber" />
        <StatTile label="Current value" value={formatCurrencyCompact(detail.unrealizedValue + detail.realizedValue)} variant="violet" />
        <StatTile label="MOIC" value={formatMoic(detail.moic)} variant="green" />
      </div>
    </div>
  );
}

function RoundsSection({ detail, scope }: { detail: CompanyDetail; scope: Scope }) {
  if (detail.rounds.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-500">No rounds recorded yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {detail.rounds.map((r) => (
        <div key={r.ledgerEntryId} className="rounded-lg border border-zinc-200 bg-card p-4 dark:border-zinc-800">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="tabular-nums font-medium">{r.date}</span>
            <span className="font-medium">{r.roundName}</span>
            <span className="text-zinc-500">{ROUND_TYPE_LABEL[r.roundType] ?? r.roundType}</span>
            <span className="text-zinc-400">·</span>
            <span className="text-zinc-500">
              Raising {r.amountRaised != null ? formatCurrencyCompact(r.amountRaised) : "—"}
            </span>
            <span className="text-zinc-400">·</span>
            <span className="text-zinc-500">
              {r.valuationLabel} {formatCurrencyCompact(r.valuation)}
              {r.discount != null && ` · ${r.discount}% discount`}
            </span>
            {r.notes && (
              <>
                <span className="text-zinc-400">·</span>
                <span className="text-zinc-500">{r.notes}</span>
              </>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            {scope === "mine" && r.yourInvested != null && (
              <>
                <span>Your investment: {formatCurrencyCompact(r.yourInvested)}</span>
                <span className="text-zinc-400">·</span>
              </>
            )}
            <span>ASV invested: {formatCurrencyCompact(r.asvInvested)}</span>
            {scope === "mine" && r.yourApproxValue != null && (
              <>
                <span className="text-zinc-400">·</span>
                <span>Approx. value of your shares today: {formatCurrencyCompact(r.yourApproxValue)}</span>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

const HEALTH_LABEL: Record<CompanyHealth, string> = {
  [CompanyHealth.GREEN]: "Healthy",
  [CompanyHealth.YELLOW]: "Watch",
  [CompanyHealth.RED]: "Critical",
};
const TRAJECTORY_LABEL: Record<CompanyTrajectory, string> = {
  [CompanyTrajectory.IMPROVING]: "Improving",
  [CompanyTrajectory.STABLE]: "Stable",
  [CompanyTrajectory.DECLINING]: "Declining",
};

function UpdatesSection({ detail }: { detail: CompanyDetail }) {
  if (detail.updates.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-500">No updates recorded yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {detail.updates.map((u) => (
        <div key={u.id} className="rounded-lg border border-zinc-200 bg-card p-4 dark:border-zinc-800">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="tabular-nums font-medium">{u.eventDate}</span>
            <HealthDot health={u.health} />
            <span className="text-zinc-500">{HEALTH_LABEL[u.health]}</span>
            <span className="text-zinc-400">·</span>
            <span className="text-zinc-500">{TRAJECTORY_LABEL[u.trajectory]}</span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <UpdateList title="Highlights" items={u.highlights} />
            <UpdateList title="Lowlights" items={u.lowlights} />
            <UpdateList title="Upcoming plans" items={u.upcomingPlans} />
          </div>
        </div>
      ))}
    </div>
  );
}

function UpdateList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-xs font-medium uppercase text-zinc-500">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-1 text-sm text-zinc-500">—</p>
      ) : (
        <ul className="mt-1 list-inside list-disc space-y-1 text-sm">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
