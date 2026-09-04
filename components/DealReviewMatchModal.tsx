"use client";

import { useEffect, useState } from "react";
import { findReviewers, type ReviewerMatch } from "@/lib/functions/deals";

// "Send for review" flow: AI-matches the 3 members whose expertise best fits this deal
// (dealsFindReviewers, semantic matching over Deal.sector/keywords vs. each member's own
// expertiseKeywords), then lets the admin nudge each one individually via a wa.me link — no way
// to target a specific pre-chosen WhatsApp group/contact automatically beyond that, so this is
// always a per-member, phone-number-targeted link, unlike the company-update share's group
// picker.
export function DealReviewMatchModal({
  dealId,
  companyName,
  onClose,
}: {
  dealId: string;
  companyName: string;
  onClose: () => void;
}) {
  const [matches, setMatches] = useState<ReviewerMatch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let cancelled = false;
    findReviewers({ dealId })
      .then((res) => {
        if (!cancelled) setMatches(res.matches);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not find matching reviewers.");
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dealId]);

  function handleSend(member: ReviewerMatch) {
    if (!member.phoneNumber) return;
    const digits = member.phoneNumber.replace(/\D/g, "");
    const reviewUrl = `${window.location.origin}/member/deals/${dealId}`;
    const message = `Hi ${member.displayName}, ${companyName} may be in your domain of interest — could you take a look and share your thoughts? ${reviewUrl}`;
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-lg bg-card p-6 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Send {companyName} for review</h3>
          <button type="button" onClick={onClose} className="text-sm text-zinc-500 hover:text-foreground">
            Close
          </button>
        </div>

        {busy && <p className="text-sm text-zinc-500">Finding the best-matched members...</p>}
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        {matches && matches.length === 0 && (
          <p className="text-sm text-zinc-500">
            No members with expertise keywords on file were a plausible match for this deal.
          </p>
        )}

        {matches && matches.length > 0 && (
          <ul className="flex flex-col gap-3">
            {matches.map((m) => (
              <li
                key={m.memberId}
                className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <div>
                  <p className="text-sm font-medium">{m.displayName}</p>
                  <p className="text-xs text-zinc-500">{m.reason}</p>
                </div>
                {m.phoneNumber ? (
                  <button
                    type="button"
                    onClick={() => handleSend(m)}
                    className="shrink-0 rounded-full border border-green-600 px-3 py-1.5 text-xs font-medium text-green-700 dark:border-green-500 dark:text-green-400"
                  >
                    Send via WhatsApp
                  </button>
                ) : (
                  <span className="shrink-0 text-xs text-zinc-400">No phone number on file</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
