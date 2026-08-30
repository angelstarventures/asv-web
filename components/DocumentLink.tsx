// Centralizes the role+allocation visibility check's *rendering* (plan §4) — callers pass an
// already-computed `canAccess` (see lib/auth/documentAccess.ts) rather than this component
// deciding for itself, so the same check is never implemented twice. Real enforcement lives
// server-side in /api/documents/[id], which never trusts this being true.
export function DocumentLink({
  documentId,
  label,
  canAccess,
}: {
  documentId: string;
  label: string;
  canAccess: boolean;
}) {
  if (!canAccess) {
    return (
      <span
        className="text-sm text-zinc-400 dark:text-zinc-600"
        title="You don't have access to this document."
      >
        {label} (restricted)
      </span>
    );
  }

  return (
    <a
      href={`/api/documents/${documentId}`}
      className="text-sm text-zinc-600 underline underline-offset-2 dark:text-zinc-400"
    >
      {label}
    </a>
  );
}
