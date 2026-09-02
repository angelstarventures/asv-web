"use client";

import { useState } from "react";
import { DealRatingModal } from "@/components/DealRatingModal";
import { DealAdminControls } from "@/components/DealAdminControls";
import type { DealTagOption } from "@/components/DealListTable";

const TABS = ["overview", "deck", "team", "summary", "financials", "documents"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  overview: "Overview",
  deck: "Pitch Deck",
  team: "Team",
  summary: "Executive Summary",
  financials: "Financials",
  documents: "Documents",
};

export interface DealDetail {
  id: string;
  companyName: string;
  companyEmail: string;
  entrepreneurName: string;
  entrepreneurEmail: string;
  entrepreneurPhone: string;
  executiveSummary: string;
  teamInformation: string;
  round: string;
  securityType: string;
  seekingAmount: number;
  preMoneyValuation: number;
  hasLeadInvestor: boolean;
  leadInvestorName?: string | null;
  willHaveInterestBearingDebtAfterClose: boolean;
  hasExistingInterestBearingDebt: boolean;
  hasRestrictedBusinessLines: boolean;
  raiseMethod: string;
  referredBy?: string | null;
  stage: string;
  driveFolderUrl?: string | null;
  createdAt: string;
}

export interface DealDocumentRow {
  id: string;
  docType: string;
  driveUrl: string;
  filename: string;
  uploadedAt: string;
}

export interface DealRatingRow {
  rating: number;
  review?: string | null;
  updatedAt: string;
  member: { id: string; displayName: string };
}

function currency(n: number): string {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function yesNo(v: boolean): string {
  return v ? "Yes" : "No";
}

export function DealDetailView({
  deal,
  documents,
  ratings,
  currentMemberId,
  isAdmin,
  allTags,
  assignedTagIds,
}: {
  deal: DealDetail;
  documents: DealDocumentRow[];
  ratings: DealRatingRow[];
  currentMemberId: string;
  isAdmin: boolean;
  allTags: DealTagOption[];
  assignedTagIds: string[];
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const mine = ratings.find((r) => r.member.id === currentMemberId) ?? null;
  const avgRating = ratings.length ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : null;
  const pitchDeck = documents.find((d) => d.docType === "PITCH_DECK");
  const additionalDocs = documents.filter((d) => d.docType !== "PITCH_DECK");

  return (
    <div className="flex flex-col gap-6 px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{deal.companyName}</h1>
          <p className="text-sm text-zinc-500">
            {deal.round.replaceAll("_", " ")} · Seeking {currency(deal.seekingAmount)} at{" "}
            {currency(deal.preMoneyValuation)} pre-money
          </p>
        </div>
        <DealRatingModal dealId={deal.id} myRating={mine?.rating ?? null} myReview={mine?.review ?? null} />
      </div>

      {isAdmin && (
        <DealAdminControls dealId={deal.id} stage={deal.stage} allTags={allTags} assignedTagIds={assignedTagIds} />
      )}

      <nav className="flex gap-1 rounded-full border border-zinc-200 bg-card p-1.5 self-start">
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

      <div className="rounded-lg border border-zinc-200 bg-card p-6 text-sm dark:border-zinc-800">
        {tab === "overview" && (
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-zinc-500">Entrepreneur</dt>
              <dd>{deal.entrepreneurName}</dd>
              <dd className="text-zinc-500">{deal.entrepreneurEmail}</dd>
              <dd className="text-zinc-500">{deal.entrepreneurPhone}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Company</dt>
              <dd>{deal.companyName}</dd>
              <dd className="text-zinc-500">{deal.companyEmail}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Stage</dt>
              <dd>{deal.stage.replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Submitted</dt>
              <dd>{new Date(deal.createdAt).toLocaleDateString()}</dd>
            </div>
          </dl>
        )}

        {tab === "deck" && (
          <div className="flex flex-col gap-2">
            {pitchDeck ? (
              <a href={pitchDeck.driveUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline dark:text-blue-400">
                {pitchDeck.filename}
              </a>
            ) : (
              <p className="text-zinc-500">No pitch deck on file.</p>
            )}
          </div>
        )}

        {tab === "team" && <p className="whitespace-pre-wrap">{deal.teamInformation}</p>}

        {tab === "summary" && <p className="whitespace-pre-wrap">{deal.executiveSummary}</p>}

        {tab === "financials" && (
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-zinc-500">Round</dt>
              <dd>{deal.round.replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Security type</dt>
              <dd>{deal.securityType.replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Seeking</dt>
              <dd>{currency(deal.seekingAmount)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Pre-money valuation</dt>
              <dd>{currency(deal.preMoneyValuation)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Lead investor?</dt>
              <dd>
                {yesNo(deal.hasLeadInvestor)}
                {deal.hasLeadInvestor && deal.leadInvestorName ? ` — ${deal.leadInvestorName}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Interest-bearing debt after close?</dt>
              <dd>{yesNo(deal.willHaveInterestBearingDebtAfterClose)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Existing interest-bearing debt?</dt>
              <dd>{yesNo(deal.hasExistingInterestBearingDebt)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Restricted business lines?</dt>
              <dd>{yesNo(deal.hasRestrictedBusinessLines)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Raising via</dt>
              <dd>{deal.raiseMethod}</dd>
            </div>
            {deal.referredBy && (
              <div>
                <dt className="text-zinc-500">Referred by</dt>
                <dd>{deal.referredBy}</dd>
              </div>
            )}
          </dl>
        )}

        {tab === "documents" && (
          <div className="flex flex-col gap-2">
            {additionalDocs.length === 0 && <p className="text-zinc-500">No additional documents.</p>}
            {additionalDocs.map((d) => (
              <a key={d.id} href={d.driveUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline dark:text-blue-400">
                {d.filename}
              </a>
            ))}
            {deal.driveFolderUrl && (
              <a href={deal.driveFolderUrl} target="_blank" rel="noreferrer" className="mt-2 text-zinc-500 underline">
                Open Drive folder
              </a>
            )}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-zinc-200 bg-card p-6 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Ratings{avgRating !== null && ` — average ${avgRating.toFixed(1)} / 5`}
          </h2>
        </div>
        {ratings.length === 0 && <p className="mt-2 text-sm text-zinc-500">No ratings yet.</p>}
        <ul className="mt-3 flex flex-col gap-3">
          {ratings.map((r) => (
            <li key={r.member.id} className="border-t border-zinc-100 pt-3 first:border-t-0 first:pt-0 dark:border-zinc-900">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{r.member.displayName}</span>
                <span className="text-amber-500">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
              </div>
              {r.review && <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{r.review}</p>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
