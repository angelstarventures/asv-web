// Extracted from DealDetailView's inline star string so the deal-list table's new rating
// column and the detail page's per-review stars never drift apart.
export function StarRatingDisplay({ rating, count }: { rating: number | null; count?: number }) {
  if (rating === null) {
    return <span className="text-xs text-zinc-400">No ratings yet</span>;
  }
  const filled = Math.round(rating);
  return (
    <span className="whitespace-nowrap text-sm">
      <span className="text-amber-500">{"★".repeat(filled)}</span>
      <span className="text-zinc-300 dark:text-zinc-700">{"☆".repeat(5 - filled)}</span>
      <span className="ml-1 text-zinc-500">
        ({rating.toFixed(1)}
        {count != null ? `, ${count}` : ""})
      </span>
    </span>
  );
}
