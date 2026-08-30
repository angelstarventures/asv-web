// FR-8 (optional / Phase 3): view upcoming/candidate investments and rate or comment on them
// — the WatchlistRating table already exists in schema.gql for this, unused until Phase 3
// (plan §2). Clean placeholder, not a 404 (plan §8, Milestone 6 hardening).
export default function MemberWatchlistPage() {
  return (
    <div className="flex flex-col gap-2 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Watchlist</h1>
      <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
        Coming in Phase 3 — rate and comment on upcoming and candidate investments.
      </p>
    </div>
  );
}
