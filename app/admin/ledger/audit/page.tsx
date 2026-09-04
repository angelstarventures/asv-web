import Link from "next/link";
import { LedgerAuditRunner } from "@/components/LedgerAuditRunner";

export const dynamic = "force-dynamic";

export default function LedgerAuditPage() {
  return (
    <div className="flex flex-col gap-6 px-6 py-10">
      <div>
        <Link href="/admin/ledger" className="text-sm text-zinc-500 underline underline-offset-2 dark:text-zinc-500">
          &larr; Ledger
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Audit Ledger</h1>
      </div>
      <LedgerAuditRunner />
    </div>
  );
}
