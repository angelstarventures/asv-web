"use client";

import { useState } from "react";
import { feedbackSend } from "@/lib/functions/feedback";

// A small Feedback button in the signed-in header. Opens a modal with a
// pre-populated name field and a comment textarea. Submissions are emailed
// to angelstarvestments@gmail.com via a Cloud Function.
export function FeedbackButton({ displayName }: { displayName?: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(displayName ?? "");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (!comment.trim()) return;
    setError(null);
    setBusy(true);
    try {
      await feedbackSend({ name: name.trim() || "Anonymous", comment: comment.trim() });
      setDone(true);
      setTimeout(() => {
        setOpen(false);
        setDone(false);
        setComment("");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send feedback.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-amber-500 bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600"
      >
        Feedback
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
            <div className="flex items-start justify-between">
              <h2 className="text-base font-semibold">Send feedback</h2>
              <button
                type="button"
                onClick={() => { setOpen(false); setError(null); setDone(false); }}
                aria-label="Close"
                className="text-lg text-zinc-400 hover:text-foreground"
              >
                &times;
              </button>
            </div>

            {done ? (
              <p className="mt-4 text-sm text-green-600 dark:text-green-400">
                Thank you! Your feedback has been sent.
              </p>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  Name
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Comments
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    placeholder="Share your thoughts, suggestions, or bug reports..."
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </label>
                {error && (
                  <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                    {error}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => { setOpen(false); setError(null); }}
                    disabled={busy}
                    className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium disabled:opacity-50 dark:border-zinc-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={busy || !comment.trim()}
                    className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background disabled:opacity-50"
                  >
                    {busy ? "Sending..." : "Send"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}