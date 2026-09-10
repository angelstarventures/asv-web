import { listDeals, listDealTags, listDealTagAssignments, listDealRatings } from "@/lib/dataconnect/client";
import { buildDealTagIdsMap, buildDealRatingSummaryMap } from "@/lib/deals";
import { DealListTable } from "@/components/DealListTable";

export const dynamic = "force-dynamic";

export default async function MemberDealsPage() {
  const [{ deals }, { dealTags }, { dealTagAssignments }, { dealRatings }] = await Promise.all([
    listDeals(),
    listDealTags(),
    listDealTagAssignments(),
    listDealRatings(),
  ]);
  const ratingSummary = buildDealRatingSummaryMap(dealRatings);

  return (
    <div className="flex flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Deals</h1>

      <DealListTable
        deals={deals.map((d) => ({ ...d, ratingAvg: ratingSummary[d.id]?.avg ?? null, ratingCount: ratingSummary[d.id]?.count ?? 0 }))}
        tags={dealTags}
        dealTagIds={buildDealTagIdsMap(dealTagAssignments)}
        detailHrefBase="/member/deals"
      />
    </div>
  );
}
