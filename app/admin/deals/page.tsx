import {
  listDeals,
  listDealTags,
  listDealTagAssignments,
  listDealRatings,
  listDealReviewerMatches,
  listDealPitchDecks,
} from "@/lib/dataconnect/client";
import { buildDealTagIdsMap, buildDealRatingSummaryMap, buildDealReviewerMatchMap, buildDealPitchDeckUrlMap } from "@/lib/deals";
import { DealListTable } from "@/components/DealListTable";
import { DealTagManager } from "@/components/DealTagManager";
import { getCurrentMember } from "@/lib/auth/currentMember";

export const dynamic = "force-dynamic";

export default async function AdminDealsPage() {
  const [{ deals }, { dealTags }, { dealTagAssignments }, { dealRatings }, { dealReviewerMatches }, { dealDocuments }, current] =
    await Promise.all([
      listDeals(),
      listDealTags(),
      listDealTagAssignments(),
      listDealRatings(),
      listDealReviewerMatches(),
      listDealPitchDecks(),
      getCurrentMember(),
    ]);
  const ratingSummary = buildDealRatingSummaryMap(dealRatings);

  return (
    <div className="flex flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Deals</h1>

      <DealTagManager tags={dealTags} />

      <DealListTable
        deals={deals.map((d) => ({ ...d, ratingAvg: ratingSummary[d.id]?.avg ?? null, ratingCount: ratingSummary[d.id]?.count ?? 0 }))}
        tags={dealTags}
        dealTagIds={buildDealTagIdsMap(dealTagAssignments)}
        reviewerMatchesByDealId={buildDealReviewerMatchMap(dealReviewerMatches)}
        pitchDeckUrlByDealId={buildDealPitchDeckUrlMap(dealDocuments)}
        detailHrefBase="/admin/deals"
        isAdmin
        isSiteAdmin={current?.role === "site_admin"}
      />
    </div>
  );
}
