import type { DiffResult } from "@/lib/functions/massIO";

const CLASSIFICATION_STYLES: Record<DiffResult["classification"], string> = {
  NEW: "text-emerald-700 dark:text-emerald-400",
  NEW_CORRECTION: "text-amber-700 dark:text-amber-400",
  UNCHANGED: "text-zinc-500 dark:text-zinc-500",
};

const CLASSIFICATION_LABELS: Record<DiffResult["classification"], string> = {
  NEW: "New",
  NEW_CORRECTION: "Changed — will be appended, existing entry is not modified",
  UNCHANGED: "Unchanged",
};

// Upload -> diff -> confirm wizard's diff view (plan §4). A NEW_CORRECTION is never an
// in-place update — ledger history is append-only, so the label says so explicitly rather
// than implying the old row gets touched.
export function ImportDiffTable({ diff }: { diff: DiffResult[] }) {
  return (
    <>
      <div className="flex flex-col gap-3 md:hidden">
        {diff.map((d, i) => (
          <div key={i} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <div>
              <p className="font-medium">{String(d.record.company)}</p>
              <p className="text-xs text-zinc-500">{String(d.record.date)}</p>
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-xs text-zinc-500">Type</dt>
                <dd>{String(d.record.type)}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">Scenario</dt>
                <dd>{String(d.record.scenario)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-zinc-500">Classification</dt>
                <dd className={`font-medium ${CLASSIFICATION_STYLES[d.classification]}`}>
                  {CLASSIFICATION_LABELS[d.classification]}
                  {d.validationErrors.length > 0 && (
                    <ul className="mt-1 font-normal text-red-600 dark:text-red-400">
                      {d.validationErrors.map((err) => (
                        <li key={err}>{err}</li>
                      ))}
                    </ul>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        ))}
        {diff.length === 0 && <p className="py-6 text-center text-sm text-zinc-500">No records to review.</p>}
      </div>

      <div className="hidden md:block md:overflow-x-auto">
      <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          <th className="py-2 font-medium">Date</th>
          <th className="py-2 font-medium">Company</th>
          <th className="py-2 font-medium">Type</th>
          <th className="py-2 font-medium">Scenario</th>
          <th className="py-2 font-medium">Classification</th>
        </tr>
      </thead>
      <tbody>
        {diff.map((d, i) => (
          <tr key={i} className="border-b border-zinc-100 align-top dark:border-zinc-900">
            <td className="py-2 tabular-nums">{String(d.record.date)}</td>
            <td className="py-2">{String(d.record.company)}</td>
            <td className="py-2">{String(d.record.type)}</td>
            <td className="py-2">{String(d.record.scenario)}</td>
            <td className={`py-2 font-medium ${CLASSIFICATION_STYLES[d.classification]}`}>
              {CLASSIFICATION_LABELS[d.classification]}
              {d.validationErrors.length > 0 && (
                <ul className="mt-1 font-normal text-red-600 dark:text-red-400">
                  {d.validationErrors.map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
    </>
  );
}
