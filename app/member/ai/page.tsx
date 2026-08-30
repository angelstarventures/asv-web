// FR-7 (Phase 2): member portfolio Q&A, scoped strictly to that member's own data. V1 has no
// AI in the critical path (PRD §8.6) — this is a clean placeholder, not a 404, so the nav
// link and the URL both resolve to something real (plan §8, Milestone 6 hardening).
export default function MemberAiPage() {
  return (
    <div className="flex flex-col gap-2 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">AI portfolio assistant</h1>
      <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
        Coming in Phase 2 — a query box scoped strictly to your own portfolio.
      </p>
    </div>
  );
}
