// Shared by /admin/deals and /member/deals server pages — reduces ListDealTagAssignments'
// flat rows into a per-deal lookup for DealListTable's tag filter.
export function buildDealTagIdsMap(
  assignments: { deal: { id: string }; tag: { id: string } }[]
): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const a of assignments) {
    (map[a.deal.id] ??= []).push(a.tag.id);
  }
  return map;
}

// Same reduction shape as buildDealTagIdsMap, for ListDealRatings' flat rows — backs the deal-
// list table's rating column.
export function buildDealRatingSummaryMap(
  ratings: { deal: { id: string }; rating: number }[]
): Record<string, { avg: number; count: number }> {
  const totals: Record<string, { sum: number; count: number }> = {};
  for (const r of ratings) {
    const t = (totals[r.deal.id] ??= { sum: 0, count: 0 });
    t.sum += r.rating;
    t.count += 1;
  }
  const map: Record<string, { avg: number; count: number }> = {};
  for (const [dealId, t] of Object.entries(totals)) {
    map[dealId] = { avg: t.sum / t.count, count: t.count };
  }
  return map;
}

export interface DealReviewerMatchInfo {
  memberId: string;
  displayName: string;
  phoneNumber: string | null;
  reason: string;
}

// Same reduction shape as buildDealTagIdsMap, for ListDealReviewerMatches' flat rows — backs
// the deal-list card's "message this reviewer" WhatsApp buttons.
export function buildDealReviewerMatchMap(
  matches: { deal: { id: string }; member: { id: string; displayName: string; phoneNumber?: string | null }; reason: string }[]
): Record<string, DealReviewerMatchInfo[]> {
  const map: Record<string, DealReviewerMatchInfo[]> = {};
  for (const m of matches) {
    (map[m.deal.id] ??= []).push({
      memberId: m.member.id,
      displayName: m.member.displayName,
      phoneNumber: m.member.phoneNumber ?? null,
      reason: m.reason,
    });
  }
  return map;
}

// Same reduction shape as buildDealTagIdsMap, for ListDealPitchDecks' flat rows — one pitch
// deck per deal in practice (dealsSubmitPitch always uploads exactly one), so the first row
// wins if that's ever violated.
export function buildDealPitchDeckUrlMap(decks: { deal: { id: string }; driveUrl: string }[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const d of decks) {
    if (!(d.deal.id in map)) map[d.deal.id] = d.driveUrl;
  }
  return map;
}

// Same 200-char-with-ellipsis convention as functions/src/functions/deals-findReviewers.ts'
// companyBlurb — duplicated rather than shared since Cloud Functions and this Next.js app are
// separate runtimes/bundles.
export function truncateBlurb(text: string | null | undefined, maxLength = 140): string | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength)}...` : trimmed;
}
