import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth/currentMember";
import {
  listAppSettings,
  listLedgerEntriesForScenario,
  listMemberAllocations,
  listMemberValuations,
} from "@/lib/dataconnect/client";
import { Scenario, type ListLedgerEntriesForScenarioData } from "@/lib/dataconnect/generated";
import type { Scope } from "@/lib/scenarioTypes";
import { tenantConfig } from "@/lib/config/tenant";

// Reads searchParams and the session cookie, so this is already dynamic — explicit for
// clarity (plan §4).
export const dynamic = "force-dynamic";

type Row = ListLedgerEntriesForScenarioData["ledgerEntries"][number];

const SORT_KEYS = ["eventDate", "company", "type"] as const;
type SortKey = (typeof SORT_KEYS)[number];

function parseSort(value: string | string[] | undefined): SortKey {
  const v = Array.isArray(value) ? value[0] : value;
  return (SORT_KEYS as readonly string[]).includes(v ?? "") ? (v as SortKey) : "eventDate";
}

function parseScope(value: string | string[] | undefined): Scope {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "mine" ? "mine" : "asv";
}

function sortRows(rows: Row[], sort: SortKey): Row[] {
  const copy = [...rows];
  switch (sort) {
    case "company":
      return copy.sort((a, b) =>
        (a.company.tradeName ?? a.company.name).localeCompare(b.company.tradeName ?? b.company.name)
      );
    case "type":
      return copy.sort((a, b) => a.type.localeCompare(b.type));
    case "eventDate":
    default:
      return copy.sort((a, b) => (a.eventDate < b.eventDate ? 1 : -1));
  }
}

// Wireframe 4: ?sort=&q=&scope= in the URL (plan §4). No scenario toggle called for by this
// wireframe — defaults to `balanced`, or the admin-configured locked scenario
// (app/admin/settings's "simplified member view") when one is set. Sort/filter apply within
// the server component rather than as separate per-sort Data Connect queries: at V1's scale (a
// handful of companies, a few hundred entries) this is the same "query once, reduce in JS"
// tradeoff already made for ListCompanyUpdatesForScenario (plan §4), not a client-side fetch —
// the browser never sees unfiltered data.
export default async function MemberDetailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const sort = parseSort(params.sort);
  const scope = parseScope(params.scope);
  const q = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim().toLowerCase() ?? "";

  const member = await getCurrentMember();
  if (!member) redirect("/login");

  const { appSettings } = await listAppSettings();
  const lockedScenario = appSettings.find((s) => s.key === "member_locked_scenario")?.value ?? "";
  const scenario = lockedScenario
    ? Scenario[lockedScenario.toUpperCase() as keyof typeof Scenario]
    : Scenario.BALANCED;

  const { ledgerEntries } = await listLedgerEntriesForScenario({ scenario });

  let rows = ledgerEntries;

  if (scope === "mine") {
    const [{ allocations }, { memberValuations }] = await Promise.all([
      listMemberAllocations(member.authUid, { scenario: Scenario.BALANCED }),
      listMemberValuations(member.authUid, { scenario: Scenario.BALANCED }),
    ]);
    const myCompanyIds = new Set([
      ...allocations.map((a) => a.ledgerEntry.company.id),
      ...memberValuations.map((v) => v.ledgerEntry.company.id),
    ]);
    rows = rows.filter((r) => myCompanyIds.has(r.company.id));
  }

  if (q) {
    rows = rows.filter((r) => (r.company.tradeName ?? r.company.name).toLowerCase().includes(q));
  }

  rows = sortRows(rows, sort);

  return (
    <div className="flex flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Ledger detail</h1>

      <form className="flex flex-wrap items-end gap-3" action="/member/detail">
        <input type="hidden" name="scope" value={scope} />
        <label className="flex flex-col gap-1 text-sm">
          Search company
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="e.g. TechNova"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Sort by
          <select
            name="sort"
            defaultValue={sort}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="eventDate">Date</option>
            <option value="company">Company</option>
            <option value="type">Type</option>
          </select>
        </label>
        <div className="flex gap-1 rounded-full border border-zinc-200 p-0.5 dark:border-zinc-800">
          {(["mine", "asv"] as Scope[]).map((s) => (
            <a
              key={s}
              href={`/member/detail?${new URLSearchParams({ q, sort, scope: s }).toString()}`}
              aria-current={scope === s}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                scope === s ? "bg-foreground text-background" : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {s === "mine" ? "My holdings" : `All of ${tenantConfig.orgAbbreviation}`}
            </a>
          ))}
        </div>
        <button
          type="submit"
          className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background"
        >
          Apply
        </button>
      </form>

      <div className="flex flex-col gap-3 md:hidden">
        {rows.map((r) => (
          <div key={r.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{r.company.tradeName ?? r.company.name}</p>
                <p className="text-xs text-zinc-500">{r.eventDate}</p>
              </div>
              {r.needsReview && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  Needs review
                </span>
              )}
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-xs text-zinc-500">Sector</dt>
                <dd>{r.company.sector ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Type</dt>
                <dd>{r.type.replaceAll("_", " ")}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Source</dt>
                {/* Legacy doc_link string, not the access-controlled Document/DocumentAccessLog
                    system (plan §2/§3) — that system gates DocumentLink.tsx + /api/documents/[id],
                    which have nothing to render against yet since no Document rows exist until
                    Milestone 4's admin upload flow creates them. */}
                <dd>
                  {r.sourceDocument ? (
                    <a
                      href={r.sourceDocument}
                      target="_blank"
                      rel="noreferrer"
                      className="text-zinc-600 underline underline-offset-2 dark:text-zinc-400"
                    >
                      Link
                    </a>
                  ) : (
                    <span className="text-zinc-400 dark:text-zinc-600">—</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        ))}
        {rows.length === 0 && <p className="py-6 text-center text-sm text-zinc-500">No ledger entries match this filter.</p>}
      </div>

      <div className="hidden md:block md:overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <th className="py-2 font-medium">Date</th>
            <th className="py-2 font-medium">Company</th>
            <th className="py-2 font-medium">Sector</th>
            <th className="py-2 font-medium">Type</th>
            <th className="py-2 font-medium">Review</th>
            <th className="py-2 font-medium">Source</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-2 tabular-nums">{r.eventDate}</td>
              <td className="py-2">{r.company.tradeName ?? r.company.name}</td>
              <td className="py-2 text-zinc-500 dark:text-zinc-500">{r.company.sector ?? "—"}</td>
              <td className="py-2">{r.type.replaceAll("_", " ")}</td>
              <td className="py-2">
                {r.needsReview && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                    Needs review
                  </span>
                )}
              </td>
              {/* Legacy doc_link string, not the access-controlled Document/DocumentAccessLog
                  system (plan §2/§3) — that system gates DocumentLink.tsx + /api/documents/[id],
                  which have nothing to render against yet since no Document rows exist until
                  Milestone 4's admin upload flow creates them. */}
              <td className="py-2">
                {r.sourceDocument ? (
                  <a
                    href={r.sourceDocument}
                    target="_blank"
                    rel="noreferrer"
                    className="text-zinc-600 underline underline-offset-2 dark:text-zinc-400"
                  >
                    Link
                  </a>
                ) : (
                  <span className="text-zinc-400 dark:text-zinc-600">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {rows.length === 0 && (
        <p className="hidden text-sm text-zinc-500 dark:text-zinc-500 md:block">No ledger entries match this filter.</p>
      )}
    </div>
  );
}
