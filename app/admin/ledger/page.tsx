import Link from "next/link";
import { listCustomEventTypes } from "@/lib/dataconnect/client";

const PRIMARY_ACTIONS = [
  { href: "/admin/ledger/record", label: "Record a JSON Entry" },
  { href: "/admin/ledger/manage", label: "Manage Ledger" },
  { href: "/admin/ledger/export", label: "Export Ledger" },
  { href: "/admin/ledger/import", label: "Import Ledger" },
];

// Landing hub for the ledger write flows — not itself a wireframe, just somewhere to link to
// recording an entry (JSON), managing the full ledger, mass export/import, and any
// already-defined custom type + the type builder.
export const dynamic = "force-dynamic";

export default async function LedgerIndexPage() {
  const { eventTypeDefinitions } = await listCustomEventTypes();

  return (
    <div className="flex flex-col gap-8 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Ledger</h1>

      <div className="flex flex-wrap gap-3">
        {PRIMARY_ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium dark:border-zinc-700"
          >
            {action.label}
          </Link>
        ))}
      </div>

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
