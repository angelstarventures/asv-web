import { LedgerRecordsEditor } from "@/components/LedgerRecordsEditor";

export default function RecordLedgerEntryPage() {
  return (
    <div className="flex flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Record an entry</h1>
      <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        Write or paste one or more ledger records as JSON, matching the ASV portfolio schema.
        Each record needs an explicit lowercase <code>scenario</code> field
        (<code>optimistic</code>, <code>balanced</code>, or <code>conservative</code>).
        Investment-round records (Participating_PricedRound, Participating_SAFERound,
        NonParticipating_Round) need one identical copy per scenario. Checking a record reports
        both schema errors and ledger inconsistencies — for example a company update for a
        company ASV hasn&apos;t invested in, or a valuation whose member list doesn&apos;t match
        the company&apos;s actual investors — before anything is committed.
      </p>
      <LedgerRecordsEditor initialRecords={[]} allowAddRemove />
    </div>
  );
}
