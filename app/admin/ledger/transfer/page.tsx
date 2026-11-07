import { listAllMembers, listCompanies } from "@/lib/dataconnect/client";
import { InternalTransferForm } from "@/components/InternalTransferForm";

// Admin form for recording an internal (member-to-member) transfer. Which members can sell is
// loaded per company in the form (ledgerTransferHoldings); this page only supplies the lists.
export const dynamic = "force-dynamic";

export default async function RecordTransferPage() {
  const [{ companies }, { members }] = await Promise.all([listCompanies(), listAllMembers()]);

  return (
    <div className="flex flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Record a transfer</h1>
      <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        Record a member selling or handing shares in a portfolio company to another member. The fund&apos;s own position is
        unchanged, so fund-level MOIC and IRR do not move; member-level views follow the shares.
      </p>
      <InternalTransferForm
        companies={[...companies]
          .sort((a, b) => (a.tradeName ?? a.name).localeCompare(b.tradeName ?? b.name))
          .map((c) => ({ id: c.id, name: c.name, label: c.tradeName ?? c.name }))}
        members={members
          .filter((m) => m.status === "ACTIVE")
          .map((m) => ({ id: m.id, displayName: m.displayName }))}
      />
    </div>
  );
}
