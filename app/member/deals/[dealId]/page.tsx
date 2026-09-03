import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getDealById,
  listDealDocumentsByDeal,
  listDealRatingsByDeal,
  listDealFundingRoundsByDeal,
  listDealTags,
  listDealTagAssignments,
} from "@/lib/dataconnect/client";
import { getCurrentMember } from "@/lib/auth/currentMember";
import { DealDetailView } from "@/components/DealDetailView";

export const dynamic = "force-dynamic";

// A regular member never sees admin controls, so tags aren't fetched for them at all — but an
// admin who is also an investor can reach this same route (see app/member/layout.tsx's note),
// so the admin branch still needs the full tag set for DealAdminControls to render correctly.
export default async function MemberDealDetailPage({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  const current = await getCurrentMember();
  if (!current) notFound();
  const isAdmin = current.role === "admin";

  const [{ deal }, { dealDocuments }, { dealRatings }, { dealFundingRoundEntries }] = await Promise.all([
    getDealById({ dealId }),
    listDealDocumentsByDeal({ dealId }),
    listDealRatingsByDeal({ dealId }),
    listDealFundingRoundsByDeal({ dealId }),
  ]);
  if (!deal) notFound();

  const dealTags = isAdmin ? (await listDealTags()).dealTags : [];
  const dealTagAssignments = isAdmin ? (await listDealTagAssignments()).dealTagAssignments : [];
  const assignedTagIds = dealTagAssignments.filter((a) => a.deal.id === dealId).map((a) => a.tag.id);

  return (
    <>
      <div className="px-6 pt-6">
        <Link href="/member/deals" className="text-sm text-zinc-500 underline underline-offset-2">
          &larr; Deals
        </Link>
      </div>
      <DealDetailView
        deal={deal}
        documents={dealDocuments}
        ratings={dealRatings}
        fundingHistory={dealFundingRoundEntries}
        currentMemberId={current.memberId}
        isAdmin={isAdmin}
        allTags={dealTags}
        assignedTagIds={assignedTagIds}
      />
    </>
  );
}
