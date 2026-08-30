import { listCompanies } from "@/lib/dataconnect/client";
import { getBuiltinEventType } from "@/lib/eventTypes/builtins";
import { CustomEntryLoader } from "@/components/CustomEntryLoader";
import { EntryForm } from "@/components/EntryForm";

// The generic entry point for every built-in type that isn't a round or a company update
// (those have their own dedicated pages, wireframe 6 and app/admin/ledger/company-update) —
// Exit Event, both valuation-change flavors, Compliance Flag — plus any admin-defined custom
// type, all driven by DynamicEntryForm (plan §4, FR-10a).
//
// Built-ins resolve here (server-side, no DB read needed — BUILTIN_EVENT_TYPES is a plain
// constant). Custom types resolve client-side instead, via CustomEntryLoader: the only way to
// read a custom type's fieldSchema is the eventTypesGetByKey Cloud Functions callable (see the
// note in dataconnect/connector/queries.gql for why Data Connect can't do this read), and a
// callable needs the browser's own ID token, which a Server Component doesn't have.
export const dynamic = "force-dynamic";

export default async function LedgerEntryPage({
  params,
}: {
  params: Promise<{ eventType: string }>;
}) {
  const { eventType: key } = await params;
  const builtin = getBuiltinEventType(key.toUpperCase());
  const { companies } = await listCompanies();

  if (builtin) {
    return (
      <div className="flex flex-col gap-6 px-6 py-10">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{builtin.label}</h1>
        </div>
        <EntryForm eventType={builtin} companies={companies} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-10">
      <CustomEntryLoader eventTypeKey={key} companies={companies} />
    </div>
  );
}
