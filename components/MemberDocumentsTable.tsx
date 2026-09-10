"use client";

import { useState } from "react";
import { DocumentLink } from "@/components/DocumentLink";

export interface MemberDocumentRow {
  id: string;
  label: string;
  uploadedAt: string;
  canAccess: boolean;
}

export interface MemberDocumentCompanyGroup {
  companyId: string;
  companyName: string;
  documents: MemberDocumentRow[];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// One row per company; clicking it expands sub-rows of date + document name (the name itself
// is the clickable DocumentLink) — replaces the old flat per-company <ul> of generic doc-type
// labels (plan follow-up: real filenames now live on Document.filename).
export function MemberDocumentsTable({ groups }: { groups: MemberDocumentCompanyGroup[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(companyId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(companyId)) next.delete(companyId);
      else next.add(companyId);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {groups.map((group) => {
        const isOpen = expanded.has(group.companyId);
        const sorted = [...group.documents].sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
        return (
          <div key={group.companyId} className="rounded-lg border border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => toggle(group.companyId)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              <span>{group.companyName}</span>
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
                    <DocumentLink documentId={doc.id} label={doc.label} canAccess={doc.canAccess} />
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
