import { listAllMembers, listCompanies } from "@/lib/dataconnect/client";
import { ExitForm } from "@/components/ExitForm";

// Admin form for recording a complete exit or write-off. Per-company holders are loaded in the form
// (ledgerTransferHoldings); this page only supplies the company and member lists.
export const dynamic = "force-dynamic";

export default async function RecordExitPage() {
  const [{ companies }, { members }] = await Promise.all([listCompanies(), listAllMembers()]);

  return (
    <div className="flex flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Record an exit</h1>
      <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        Record a company&apos;s exit or write-off. Member payouts are recorded gross; when a management-carry recipient is set under
        Settings, DD-lead and management carry are charged on each member&apos;s gain and shown net to that member.
      </p>
      <ExitForm
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
