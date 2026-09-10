"use client";

import { useState } from "react";

export interface TaxDocumentRow {
  id: string;
  label: string;
  uploadedAt: string;
}

export interface TaxDocumentMemberGroup {
  memberId: string;
  memberName: string;
  documents: TaxDocumentRow[];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// Admin-only Tax Documents list — same expand/collapse-by-group shell as MemberDocumentsTable,
// grouped by member instead of company, linking straight to /api/tax-documents/[id] (that route
// re-derives the own-member-or-admin check itself; no DocumentAccessLog-style audit trail here,
// unlike the company-document flow).
export function TaxDocumentsTable({ groups }: { groups: TaxDocumentMemberGroup[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(memberId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  }

  if (groups.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-500">No tax documents have been uploaded yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {groups.map((group) => {
        const isOpen = expanded.has(group.memberId);
        const sorted = [...group.documents].sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
        return (
          <div key={group.memberId} className="rounded-lg border border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => toggle(group.memberId)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              <span>{group.memberName}</span>
              <span className="flex items-center gap-2 text-xs text-zinc-500">
                {group.documents.length} document{group.documents.length === 1 ? "" : "s"}
                <span aria-hidden className="text-[10px]">
                  {isOpen ? "▲" : "▼"}
                </span>
              </span>
            </button>
            {isOpen && (
              <div className="flex flex-col gap-2 border-t border-zinc-100 px-4 py-3 dark:border-zinc-900">
                {sorted.map((doc) => (
                  <div key={doc.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-zinc-500 tabular-nums">{formatDate(doc.uploadedAt)}</span>
                    <a
                      href={`/api/tax-documents/${doc.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-left text-sm text-zinc-600 underline underline-offset-2 dark:text-zinc-400"
                    >
                      {doc.label}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
