import { getDealById, listDealDocumentsByDeal } from "@/lib/dataconnect/client";
import { truncateBlurb } from "@/lib/deals";
import { PublicDealReviewForm } from "@/components/PublicDealReviewForm";

export const dynamic = "force-dynamic";

// A link admins copy and send to a non-member reviewer (DealListTable's "Copy public review
// link"). No login, no Data Connect reads on the client — same posture as app/(public)/pitch —
// only a hand-picked safe subset of the deal (company name/sector/blurb/deck link) ever crosses
// into the client component; seeking amount, valuation, and entrepreneur contact never do.
export default async function PublicDealReviewPage({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  const { deal } = await getDealById({ dealId });

  if (!deal) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-24">
        <p className="text-sm text-zinc-500">This deal link isn&apos;t valid or is no longer available.</p>
      </div>
    );
  }

  const { dealDocuments } = await listDealDocumentsByDeal({ dealId });
  const pitchDeck = dealDocuments.find((d) => d.docType === "PITCH_DECK");
  const blurb = truncateBlurb(deal.executiveSummary, 400);

  return (
    <div className="flex flex-1 justify-center px-6 py-12">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{deal.companyName}</h1>
          {deal.sector && <p className="mt-1 text-sm text-zinc-500">{deal.sector}</p>}
        </div>

        <div className="rounded-lg border border-zinc-200 bg-card p-6 text-sm dark:border-zinc-800">
          <p className="text-zinc-600 dark:text-zinc-400">{blurb ?? "No summary provided."}</p>
          {pitchDeck && (
            <a
              href={pitchDeck.driveUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium hover:bg-background dark:border-zinc-700"
            >
              View pitch deck
            </a>
          )}
        </div>

        <PublicDealReviewForm dealId={deal.id} companyName={deal.companyName} />
      </div>
    </div>
  );
}
