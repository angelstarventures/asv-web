import { listCompanies } from "@/lib/dataconnect/client";
import { CustomEntryLoader } from "@/components/CustomEntryLoader";

// Entry point for admin-defined custom event types only — the built-in legacy-schema types
// (rounds, exit, valuation, compliance, company update) are recorded via the JSON flow at
// /admin/ledger/record instead. Custom types resolve client-side via CustomEntryLoader: the
// only way to read a custom type's fieldSchema is the eventTypesGetByKey Cloud Functions
// callable (see the note in dataconnect/connector/queries.gql for why Data Connect can't do
// this read), and a callable needs the browser's own ID token, which a Server Component doesn't have.
export const dynamic = "force-dynamic";

export default async function LedgerEntryPage({
  params,
}: {
  params: Promise<{ eventType: string }>;
}) {
  const { eventType: key } = await params;
  const { companies } = await listCompanies();

  return (
    <div className="flex flex-col gap-6 px-6 py-10">
      <CustomEntryLoader eventTypeKey={key} companies={companies} />
    </div>
  );
}
