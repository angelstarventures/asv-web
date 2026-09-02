"use client";

import { useRef } from "react";

export interface CompanyEventDetailField {
  label: string;
  value: string;
}

export interface CompanyEventRow {
  id: string;
  eventDate: string;
  type: string;
  needsReview: boolean;
  sourceDocument?: string | null;
  detail: CompanyEventDetailField[];
}

// <dialog>/showModal() rather than a hand-rolled overlay — native focus-trapping and ESC-to-
// close, no extra dependency. Each event renders as its own record card (date/type header +
// a compact label/value grid) rather than one flat table row, since the fields that matter
// differ entirely by event type (a CompanyUpdate's highlights vs. a priced round's price per
// share) — a single shared set of table columns can't represent that.
export function CompanyEventsModal({ companyName, events }: { companyName: string; events: CompanyEventRow[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="text-zinc-600 underline underline-offset-2 dark:text-zinc-400"
      >
        Details
      </button>
      <dialog
        ref={dialogRef}
        className="w-full max-w-2xl rounded-lg border border-zinc-200 bg-card p-0 text-foreground backdrop:bg-black/40 dark:border-zinc-800"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-medium">{companyName} &mdash; event history</h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="text-sm text-zinc-500 hover:text-foreground dark:text-zinc-400"
          >
            Close
          </button>
        </div>
        <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto px-5 py-4">
          {events.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-500">No events recorded.</p>
          ) : (
            events.map((e) => (
              <div key={e.id} className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="tabular-nums font-medium">{e.eventDate}</span>
                  <span className="text-zinc-500 dark:text-zinc-500">{e.type.replaceAll("_", " ")}</span>
                  {e.needsReview && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                      Needs review
                    </span>
                  )}
                  {e.sourceDocument && (
                    <a
                      href={e.sourceDocument}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto text-xs text-zinc-600 underline underline-offset-2 dark:text-zinc-400"
                    >
                      Source
                    </a>
                  )}
                </div>
                {e.detail.length === 0 ? (
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">No further detail recorded.</p>
                ) : (
                  <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                    {e.detail.map((f) => (
                      <div key={f.label} className="flex justify-between gap-3 sm:justify-start">
                        <dt className="text-zinc-500 dark:text-zinc-400">{f.label}</dt>
                        <dd className="text-right sm:text-left">{f.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            ))
          )}
        </div>
      </dialog>
    </>
  );
}
