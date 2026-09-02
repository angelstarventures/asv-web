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
