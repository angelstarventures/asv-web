import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getDealById,
  listDealDocumentsByDeal,
  listDealRatingsByDeal,
  listDealFundingRoundsByDeal,
  listDealTags,
  listDealTagAssignments,
  listDealPublicReviewsByDeal,
} from "@/lib/dataconnect/client";
import { getCurrentMember } from "@/lib/auth/currentMember";
import { DealDetailView } from "@/components/DealDetailView";

export const dynamic = "force-dynamic";

export default async function AdminDealDetailPage({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  const current = await getCurrentMember();
  if (!current) notFound();

  const [
    { deal },
    { dealDocuments },
    { dealRatings },
    { dealFundingRoundEntries },
    { dealTags },
    { dealTagAssignments },
    { dealPublicReviews },
  ] = await Promise.all([
    getDealById({ dealId }),
    listDealDocumentsByDeal({ dealId }),
    listDealRatingsByDeal({ dealId }),
    listDealFundingRoundsByDeal({ dealId }),
    listDealTags(),
    listDealTagAssignments(),
    listDealPublicReviewsByDeal({ dealId }),
  ]);
  if (!deal) notFound();

  const assignedTagIds = dealTagAssignments.filter((a) => a.deal.id === dealId).map((a) => a.tag.id);

  return (
    <>
      <div className="px-6 pt-6">
        <Link href="/admin/deals" className="text-sm text-zinc-500 underline underline-offset-2">
          &larr; Deals
        </Link>
      </div>
      <DealDetailView
        deal={deal}
        documents={dealDocuments}
        ratings={dealRatings}
        fundingHistory={dealFundingRoundEntries}
        currentMemberId={current.memberId}
        isAdmin
        allTags={dealTags}
        assignedTagIds={assignedTagIds}
        publicReviews={dealPublicReviews}
      />
    </>
  );
}
