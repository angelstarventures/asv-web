"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setDealRating } from "@/lib/functions/deals";

// Matches the reference screenshot: 1-5 star rating + free-text review, upserted per
// (deal, member) — "not shared with the entrepreneur" is trivially true since entrepreneurs
// have no login/read access to this app at all.
export function DealRatingModal({
  dealId,
  myRating,
  myReview,
}: {
  dealId: string;
  myRating: number | null;
  myReview: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(myRating ?? 0);
  const [review, setReview] = useState(myReview ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    if (rating < 1) {
      setError("Please choose a rating.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await setDealRating({ dealId, rating, review: review.trim() || undefined });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your rating.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium hover:bg-card dark:border-zinc-700"
      >
        {myRating ? "Edit your rating" : "Add your rating"}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold">Add your rating</h2>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-zinc-400 hover:text-foreground">
            ×
          </button>
        </div>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Please rate this deal. Your feedback will not be shared with the entrepreneur.
        </p>

        {error && (
          <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="mt-4 flex gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              onClick={() => setRating(n)}
              className={`text-2xl ${n <= rating ? "text-amber-500" : "text-zinc-300 dark:text-zinc-700"}`}
            >
              ★
            </button>
          ))}
        </div>

        <label className="mt-4 flex flex-col gap-1 text-sm">
          Write a review
          <textarea
            rows={4}
            maxLength={2000}
            value={review}
            onChange={(e) => setReview(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <span className="self-end text-xs text-zinc-400">{review.length}/2000</span>
        </label>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium dark:border-zinc-700"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleSave}
            className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background disabled:opacity-50"
          >
            {busy ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
