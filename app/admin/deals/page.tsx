import { listDeals, listDealTags, listDealTagAssignments } from "@/lib/dataconnect/client";
import { buildDealTagIdsMap } from "@/lib/deals";
import { DealListTable } from "@/components/DealListTable";
import { DealTagManager } from "@/components/DealTagManager";

export const dynamic = "force-dynamic";

export default async function AdminDealsPage() {
  const [{ deals }, { dealTags }, { dealTagAssignments }] = await Promise.all([
    listDeals(),
    listDealTags(),
    listDealTagAssignments(),
  ]);

  return (
    <div className="flex flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Deals</h1>

      <DealTagManager tags={dealTags} />

      <DealListTable
        deals={deals}
        tags={dealTags}
        dealTagIds={buildDealTagIdsMap(dealTagAssignments)}
        detailHrefBase="/admin/deals"
        isAdmin
      />
    </div>
  );
}
