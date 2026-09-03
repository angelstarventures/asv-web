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
  companyUrl?: string | null;
  entrepreneurName: string;
  entrepreneurEmail: string;
  entrepreneurPhone: string;
  executiveSummary?: string | null;
  teamInformation?: string | null;
  round: string;
  securityType: string;
  seekingAmount: number;
  currency?: string | null;
  preMoneyValuation?: number | null;
  valuationCap?: number | null;
  discountPercent?: number | null;
  hasLeadInvestor: boolean;
  leadInvestorName?: string | null;
  willHaveInterestBearingDebtAfterClose: boolean;
  hasExistingInterestBearingDebt: boolean;
  hasRestrictedBusinessLines: boolean;
  raiseMethod?: string | null;
  referredBy?: string | null;
  sector?: string | null;
  keywords?: string[] | null;
  companyLocation?: string | null;
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

export interface DealFundingRoundRow {
  id: string;
  round: string;
  amount: number;
  currency: string;
}

function currency(n: number, code?: string | null): string {
  if (code) {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: code, maximumFractionDigits: 0 }).format(
        n
      );
    } catch {
      // Fall through to the $-prefixed fallback for an invalid/unrecognized code.
    }
  }
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function yesNo(v: boolean): string {
  return v ? "Yes" : "No";
}

// A SAFE has no pre-money valuation — fall back to its valuation cap so this always shows
// something meaningful, labeled to distinguish it from a priced round's pre-money figure.
function valuationLabel(deal: DealDetail): string {
  if (deal.preMoneyValuation != null) return `${currency(deal.preMoneyValuation, deal.currency)} pre-money`;
  if (deal.valuationCap != null) return `${currency(deal.valuationCap, deal.currency)} valuation cap`;
  return "valuation not provided";
}

// A document "button" (rounded-full border pill, matching the rest of this app's button
// styling) rather than a plain underlined text link.
function DocumentButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium hover:bg-card dark:border-zinc-700"
    >
      {children}
    </a>
  );
}

export function DealDetailView({
  deal,
  documents,
  ratings,
  fundingHistory,
  currentMemberId,
  isAdmin,
  allTags,
  assignedTagIds,
}: {
  deal: DealDetail;
  documents: DealDocumentRow[];
  ratings: DealRatingRow[];
  fundingHistory: DealFundingRoundRow[];
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
    <div className="flex flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{deal.companyName}</h1>
          <p className="text-sm text-zinc-500">
            {deal.round.replaceAll("_", " ")} · Seeking {currency(deal.seekingAmount, deal.currency)} at{" "}
            {valuationLabel(deal)}
            {deal.companyLocation ? ` · ${deal.companyLocation}` : ""}
          </p>
        </div>
        <DealRatingModal dealId={deal.id} myRating={mine?.rating ?? null} myReview={mine?.review ?? null} />
      </div>

      {isAdmin && (
        <DealAdminControls dealId={deal.id} stage={deal.stage} allTags={allTags} assignedTagIds={assignedTagIds} />
      )}

      <nav className="flex flex-wrap gap-1 rounded-2xl border border-zinc-200 bg-card p-1.5 self-start">
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
              {deal.companyUrl && (
                <dd>
                  <a href={deal.companyUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline dark:text-blue-400">
                    {deal.companyUrl}
                  </a>
                </dd>
              )}
            </div>
            <div>
              <dt className="text-zinc-500">Sector</dt>
              <dd>{deal.sector ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Location</dt>
              <dd>{deal.companyLocation ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Keywords</dt>
              <dd>
                {deal.keywords && deal.keywords.length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {deal.keywords.map((k) => (
                      <span key={k} className="rounded-full border border-zinc-300 px-2 py-0.5 text-xs dark:border-zinc-700">
                        {k}
                      </span>
                    ))}
                  </div>
                ) : (
                  "—"
                )}
              </dd>
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
              <DocumentButton href={pitchDeck.driveUrl}>{pitchDeck.filename}</DocumentButton>
            ) : (
              <p className="text-zinc-500">No pitch deck on file.</p>
            )}
          </div>
        )}

        {tab === "team" && <p className="whitespace-pre-wrap">{deal.teamInformation || "Not provided."}</p>}

        {tab === "summary" && <p className="whitespace-pre-wrap">{deal.executiveSummary || "Not provided."}</p>}

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
              <dd>{currency(deal.seekingAmount, deal.currency)}</dd>
            </div>
            {deal.preMoneyValuation != null ? (
              <div>
                <dt className="text-zinc-500">Pre-money valuation</dt>
                <dd>{currency(deal.preMoneyValuation, deal.currency)}</dd>
              </div>
            ) : (
              <>
                <div>
                  <dt className="text-zinc-500">Valuation cap</dt>
                  <dd>{deal.valuationCap != null ? currency(deal.valuationCap, deal.currency) : "—"}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Discount</dt>
                  <dd>{deal.discountPercent != null ? `${deal.discountPercent}%` : "—"}</dd>
                </div>
              </>
            )}
            <div>
              <dt className="text-zinc-500">Lead investor?</dt>
              <dd>
                {yesNo(deal.hasLeadInvestor)}
                {deal.hasLeadInvestor && deal.leadInvestorName ? ` — ${deal.leadInvestorName}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Existing interest-bearing debt?</dt>
              <dd>{yesNo(deal.hasExistingInterestBearingDebt)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Interest-bearing debt after close?</dt>
              <dd>{yesNo(deal.willHaveInterestBearingDebtAfterClose)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Restricted business lines?</dt>
              <dd>{yesNo(deal.hasRestrictedBusinessLines)}</dd>
            </div>
            {deal.raiseMethod && (
              <div>
                <dt className="text-zinc-500">Raising via</dt>
                <dd>{deal.raiseMethod}</dd>
              </div>
            )}
            {deal.referredBy && (
              <div>
                <dt className="text-zinc-500">Referred by</dt>
                <dd>{deal.referredBy}</dd>
              </div>
            )}
            {fundingHistory.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-zinc-500">Funding history</dt>
                <dd>
                  <ul className="mt-1 flex flex-col gap-1">
                    {fundingHistory.map((f) => (
                      <li key={f.id}>
                        {f.round.replaceAll("_", " ")} — {currency(f.amount, f.currency)}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
          </dl>
        )}

        {tab === "documents" && (
          <div className="flex flex-col gap-2">
            {additionalDocs.length === 0 && <p className="text-zinc-500">No additional documents.</p>}
            {additionalDocs.map((d) => (
              <DocumentButton key={d.id} href={d.driveUrl}>
                {d.filename}
              </DocumentButton>
            ))}
            {deal.driveFolderUrl && (
              <DocumentButton href={deal.driveFolderUrl}>Open Drive folder</DocumentButton>
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
