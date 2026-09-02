import { ManageLedgerTable } from "@/components/ManageLedgerTable";

export default function ManageLedgerPage() {
  return (
    <div className="flex flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Manage ledger</h1>
      <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        Every ledger entry, across every scenario. Editing replaces an entry entirely with
        edited JSON (validated the same way as recording a new entry); deleting removes it and
        its allocations/valuations permanently.
      </p>
      <ManageLedgerTable />
    </div>
  );
}
