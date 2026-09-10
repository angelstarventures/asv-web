"use client";

import { useState, type FormEvent } from "react";
import { submitPublicReview } from "@/lib/functions/deals";
import { inputClass } from "@/components/dealFormShared";

export function PublicDealReviewForm({
  dealId,
  companyName,
}: {
  dealId: string;
  companyName: string;
}) {
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerContact, setReviewerContact] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!reviewerName.trim() || !reviewerContact.trim() || !comment.trim()) {
      setError("Please fill in every field.");
      return;
    }
    setBusy(true);
    try {
      await submitPublicReview({
        dealId,
        reviewerName: reviewerName.trim(),
        reviewerContact: reviewerContact.trim(),
        comment: comment.trim(),
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your comment. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-card p-6 text-center dark:border-zinc-800">
        <h2 className="text-lg font-semibold">Thank you!</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Your comments on {companyName} have been shared with the team.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-card p-5 dark:border-zinc-800">
      <h2 className="text-sm font-semibold">Share your thoughts</h2>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <label className="flex flex-col gap-1 text-sm">
        Your name
        <input required className={inputClass()} value={reviewerName} onChange={(e) => setReviewerName(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Email or phone
        <input
          required
          className={inputClass()}
          value={reviewerContact}
          onChange={(e) => setReviewerContact(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Comments
        <textarea required rows={4} className={inputClass()} value={comment} onChange={(e) => setComment(e.target.value)} />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="self-start rounded-full bg-foreground px-6 py-2 text-sm font-medium text-background disabled:opacity-50"
      >
        {busy ? "Submitting..." : "Submit comments"}
      </button>
    </form>
  );
}
