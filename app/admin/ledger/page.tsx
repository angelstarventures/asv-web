import Link from "next/link";
import { listCustomEventTypes } from "@/lib/dataconnect/client";

const GENERIC_ENTRY_TYPES = [
  { key: "EXIT_EVENT", label: "Exit Event" },
  { key: "TRANSACTION_VALUATION_CHANGE", label: "Valuation Change (Transaction)" },
  { key: "INTERNAL_VALUATION_ASSESSMENT", label: "Valuation Assessment (Internal)" },
  { key: "COMPLIANCE_FLAG_CHANGE", label: "Compliance Flag" },
];

// Landing hub for the ledger write flows — not itself a wireframe, just somewhere to link to
// new-investment (wireframe 6), company-update, the 4 generic built-in entry types, any
// already-defined custom type, and the type builder (plan §4).
export const dynamic = "force-dynamic";

export default async function LedgerIndexPage() {
  const { eventTypeDefinitions } = await listCustomEventTypes();

  return (
    <div className="flex flex-col gap-8 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Ledger</h1>

      <section>
        <h2 className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">Record an entry</h2>
        <ul className="flex flex-col gap-1">
          <li>
            <Link href="/admin/ledger/new-investment" className="text-sm underline underline-offset-2">
              New investment (Priced / SAFE / Non-Participating round)
            </Link>
          </li>
          <li>
            <Link href="/admin/ledger/company-update" className="text-sm underline underline-offset-2">
              Company update
            </Link>
          </li>
          {GENERIC_ENTRY_TYPES.map((t) => (
            <li key={t.key}>
              <Link href={`/admin/ledger/entry/${t.key}`} className="text-sm underline underline-offset-2">
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">Custom event types</h2>
        {eventTypeDefinitions.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-500">None defined yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {eventTypeDefinitions.map((t) => (
              <li key={t.id}>
                <Link href={`/admin/ledger/entry/${t.key}`} className="text-sm underline underline-offset-2">
                  {t.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/admin/ledger/event-types/new"
          className="mt-3 inline-block rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium dark:border-zinc-700"
        >
          Define a new event type
        </Link>
      </section>
    </div>
  );
}
