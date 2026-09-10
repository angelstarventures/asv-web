export interface MemberTaxDocumentRow {
  id: string;
  filename: string;
  taxYear?: number | null;
  uploadedAt: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// Already scoped to one member server-side (ListTaxDocumentsByMember) — no grouping needed,
// unlike the company-documents tab.
export function MemberTaxDocumentsList({ documents }: { documents: MemberTaxDocumentRow[] }) {
  if (documents.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-500">No tax documents have been uploaded yet.</p>;
  }

  const sorted = [...documents].sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));

  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((doc) => (
        <li
          key={doc.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800"
        >
          <span className="text-sm">
            {doc.filename}
            {doc.taxYear != null && <span className="ml-2 text-xs text-zinc-500">Tax year {doc.taxYear}</span>}
          </span>
          <span className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 tabular-nums">{formatDate(doc.uploadedAt)}</span>
            <a
              href={`/api/tax-documents/${doc.id}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-zinc-600 underline underline-offset-2 dark:text-zinc-400"
            >
              View
            </a>
          </span>
        </li>
      ))}
    </ul>
  );
}
