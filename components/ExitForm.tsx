"use client";

import { sortByName } from "@/lib/sortMembers";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ledgerRecordExit, type ExitType, type RecordExitInput, type RecordExitOutput } from "@/lib/functions/exits";
import { ledgerTransferHoldings, type TransferHoldingsOutput } from "@/lib/functions/transfers";

// Records a complete exit or write-off. Payouts are GROSS (they add up to ASV's total payout). When
// a management-carry recipient is configured, DD-lead and management carry are charged on each
// member's gain (payout minus their cost basis in the company, floored at 0, never netted) and
// stored separately; members see their payout net of it. Every figure shown comes from the same
// server code that records the exit (the callable's preview mode).

type CompanyOption = { id: string; name: string; label: string };
type MemberOption = { id: string; displayName: string };
type PayoutRow = { key: number; memberId: string; payout: string };

const inputCls = "rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";
const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
const num = (s: string) => (s.trim() === "" ? NaN : Number(s));

const EXIT_TYPES: { value: ExitType; label: string }[] = [
  { value: "Acquisition", label: "Acquisition" },
  { value: "IPO", label: "IPO" },
  { value: "Merger", label: "Merger" },
  { value: "Shutdown", label: "Shutdown (write-off)" },
  { value: "Dissolution", label: "Dissolution (write-off)" },
];
const FEE_LABEL: Record<string, string> = {
  DD_LEAD_CARRY: "DD-lead carry",
  MANAGEMENT_CARRY: "Management carry",
  LEGAL_COSTS: "Legal costs",
  OTHER: "Other",
};

let nextKey = 1;
const newRow = (memberId = ""): PayoutRow => ({ key: nextKey++, memberId, payout: "" });

export function ExitForm({ companies, members }: { companies: CompanyOption[]; members: MemberOption[] }) {
  const [companyId, setCompanyId] = useState("");
  const [holdings, setHoldings] = useState<TransferHoldingsOutput | null>(null);
  const [holdingsError, setHoldingsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState("");
  const [exitType, setExitType] = useState<ExitType>("Acquisition");
  const [totalExitValue, setTotalExitValue] = useState("");
  const [asvTotalPayout, setAsvTotalPayout] = useState("");
  const [docLink, setDocLink] = useState("");
  const [applyCarry, setApplyCarry] = useState(true);
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [recorded, setRecorded] = useState<string | null>(null);

  const company = companies.find((c) => c.id === companyId);
  const nameOf = useMemo(() => {
    const m = new Map(members.map((x) => [x.id, x.displayName]));
    return (id: string) => (m.has(id) ? `${m.get(id)} (${id})` : id);
  }, [members]);
  const holderById = useMemo(() => new Map((holdings?.holders ?? []).map((h) => [h.memberId, h])), [holdings]);

  async function chooseCompany(id: string) {
    setCompanyId(id);
    setHoldings(null);
    setHoldingsError(null);
    setRows([]);
    setRecorded(null);
    if (!id) return;
    setLoading(true);
    try {
      const h = await ledgerTransferHoldings(id);
      setHoldings(h);
      // Everyone who still holds a position (cost basis left) starts with a payout row.
      setRows(h.holders.filter((x) => x.basis > 0.005).map((x) => newRow(x.memberId)));
    } catch (err) {
      setHoldingsError(err instanceof Error ? err.message : "Could not load this company's holders.");
    } finally {
      setLoading(false);
    }
  }

  function patchRow(key: number, patch: Partial<PayoutRow>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  // Splits the ASV payout across the listed members in proportion to their cost basis, to the cent.
  function splitByBasis() {
    const total = num(asvTotalPayout);
    const weights = rows.map((r) => Math.max(0, holderById.get(r.memberId)?.basis ?? 0));
    const sum = weights.reduce((a, b) => a + b, 0);
    if (!(total > 0) || !(sum > 0)) return;
    let assigned = 0;
    const cents = rows.map((_, i) => {
      if (i === rows.length - 1) return Math.round(total * 100) - assigned;
      const c = Math.round((total * weights[i] * 100) / sum);
      assigned += c;
      return c;
    });
    setRows((rs) => rs.map((r, i) => ({ ...r, payout: (cents[i] / 100).toFixed(2) })));
  }

  const built = useMemo((): { input?: RecordExitInput; problems: string[] } => {
    const problems: string[] = [];
    if (!company) problems.push("choose a company");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) problems.push("enter the exit date");
    const total = num(totalExitValue);
    const asv = num(asvTotalPayout);
    if (!(total >= 0)) problems.push("enter the total exit value");
    if (!(asv >= 0)) problems.push("enter ASV's total payout");
    const memberPayouts: Record<string, number> = {};
    for (const r of rows) {
      if (!r.memberId) continue;
      const v = num(r.payout);
      if (!(v >= 0)) {
        problems.push("enter a payout (0 is fine) for every member listed");
        continue;
      }
      memberPayouts[r.memberId] = v;
    }
    if (Object.keys(memberPayouts).length === 0) problems.push("add at least one member payout");
    if (problems.length > 0 || !company) return { problems: [...new Set(problems)] };
    return {
      problems: [],
      input: {
        company: company.name,
        date,
        exitType,
        totalExitValue: total,
        asvTotalPayout: asv,
        memberPayouts,
        ...(docLink.trim() ? { docLink: docLink.trim() } : {}),
        ...(applyCarry ? {} : { applyCarry: false }),
      },
    };
  }, [company, date, exitType, totalExitValue, asvTotalPayout, rows, docLink, applyCarry]);
  const inputKey = built.input ? JSON.stringify(built.input) : null;

  // Live preview, debounced; a result is shown only while its key still matches the current form.
  const [previewState, setPreviewState] = useState<{ key: string; result?: RecordExitOutput; error?: string } | null>(null);
  useEffect(() => {
    if (!inputKey) return;
    const handle = setTimeout(async () => {
      try {
        const out = await ledgerRecordExit({ ...(JSON.parse(inputKey) as RecordExitInput), preview: true });
        setPreviewState({ key: inputKey, result: out });
      } catch (err) {
        setPreviewState({ key: inputKey, error: err instanceof Error ? err.message : "Could not preview this exit." });
      }
    }, 600);
    return () => clearTimeout(handle);
  }, [inputKey]);
  const preview = previewState && previewState.key === inputKey ? previewState : null;
  const result = preview?.result;
  const errors = preview?.error ? [preview.error] : result?.errors ?? [];
  const canRecord = Boolean(inputKey && result && result.errors.length === 0 && !busy);

  const payoutTotal = rows.reduce((n, r) => n + (num(r.payout) >= 0 ? num(r.payout) : 0), 0);
  const used = new Set(rows.map((r) => r.memberId));

  async function record() {
    if (!built.input) return;
    setBusy(true);
    setSubmitError(null);
    try {
      const out = await ledgerRecordExit(built.input);
      if (!out.recorded) throw new Error("The exit was not recorded.");
      const when = built.input.date;
      setDate("");
      setTotalExitValue("");
      setAsvTotalPayout("");
      setDocLink("");
      setPreviewState(null);
      await chooseCompany(companyId);
      setRecorded(`Exit recorded in all three scenarios on ${when}.`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not record this exit.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      {recorded && (
        <p role="status" className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
          {recorded}{" "}
          <Link href="/admin/ledger/manage" className="underline underline-offset-2">
            View in Manage Ledger
          </Link>
        </p>
      )}

      <section className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Company
          <select value={companyId} onChange={(e) => chooseCompany(e.target.value)} className={inputCls}>
            <option value="">Select a company…</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Exit date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Exit type
          <select value={exitType} onChange={(e) => setExitType(e.target.value as ExitType)} className={inputCls}>
            {EXIT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      {loading && <p className="text-sm text-zinc-500">Loading holders…</p>}
      {holdingsError && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {holdingsError}
        </p>
      )}

      {holdings && (
        <>
          <section className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1 text-sm">
              Total exit value ($)
              <input type="number" min="0" step="any" value={totalExitValue} onChange={(e) => setTotalExitValue(e.target.value)} className={`${inputCls} w-44`} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              ASV total payout ($)
              <input type="number" min="0" step="any" value={asvTotalPayout} onChange={(e) => setAsvTotalPayout(e.target.value)} className={`${inputCls} w-44`} />
            </label>
            <label className="flex min-w-60 flex-1 flex-col gap-1 text-sm">
              Document link (optional)
              <input type="url" value={docLink} onChange={(e) => setDocLink(e.target.value)} placeholder="https://…" className={inputCls} />
            </label>
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-medium">Member payouts (gross)</h2>
              <button type="button" onClick={splitByBasis} disabled={!(num(asvTotalPayout) > 0)} className="rounded-full border border-zinc-300 px-3 py-1 text-xs disabled:opacity-50 dark:border-zinc-700">
                Split ASV payout by cost basis
              </button>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Enter what each member receives before carry; they must add up to ASV&apos;s total payout. The split button is only a
              starting point; use the actual figures from the exit paperwork.
            </p>
            {rows.map((r) => {
              const holder = holderById.get(r.memberId);
              return (
                <div key={r.key} className="flex flex-wrap items-end gap-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                  <label className="flex flex-col gap-1 text-sm">
                    Member
                    <select value={r.memberId} onChange={(e) => patchRow(r.key, { memberId: e.target.value })} className={inputCls}>
                      <option value="">Select…</option>
                      {sortByName(members)
                        .filter((m) => m.id === r.memberId || !used.has(m.id))
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.displayName} ({m.id})
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    Payout ($)
                    <input type="number" min="0" step="any" value={r.payout} onChange={(e) => patchRow(r.key, { payout: e.target.value })} className={`${inputCls} w-40`} />
                  </label>
                  {holder && (
                    <span className="pb-2 text-xs text-zinc-500">
                      cost basis {money(holder.basis)}
                    </span>
                  )}
                  <button type="button" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} className="pb-2 text-xs text-red-600 underline underline-offset-2 dark:text-red-400">
                    Remove
                  </button>
                </div>
              );
            })}
            <div className="flex flex-wrap items-center gap-4">
              <button type="button" onClick={() => setRows((rs) => [...rs, newRow()])} className="rounded-full border border-zinc-300 px-3 py-1 text-xs dark:border-zinc-700">
                Add member
              </button>
              <span className="text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
                Payouts total {money(payoutTotal)}
                {num(asvTotalPayout) >= 0 ? ` of ${money(num(asvTotalPayout))}` : ""}
              </span>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={applyCarry} onChange={(e) => setApplyCarry(e.target.checked)} />
              Charge DD-lead and management carry on this exit
            </label>
          </section>

          <section className="flex flex-col gap-3" aria-live="polite">
            <h2 className="text-sm font-medium">Reconciliation</h2>
            {!built.input && <p className="text-sm text-zinc-500">Still needed: {built.problems.join("; ")}.</p>}
            {built.input && !preview && <p className="text-sm text-zinc-500">Checking…</p>}
            {errors.length > 0 && (
              <ul role="alert" className="list-disc rounded-md border border-red-300 bg-red-50 py-2 pl-7 pr-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
            {result && result.warnings.length > 0 && (
              <ul className="list-disc rounded-md border border-amber-300 bg-amber-50 py-2 pl-7 pr-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                {result.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}
            {result && result.carry && result.carry.applies && result.carry.members.length > 0 && (
              <>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Carry: {result.carry.ddLeadPercent}% DD lead + {result.carry.managementPercent}% management, on each member&apos;s gain only
                  (payout minus cost basis, never below zero, no netting). Payouts are recorded gross.
                </p>
                <div className="overflow-x-auto rounded-md border border-zinc-200 dark:border-zinc-800">
                  <table className="w-full text-left text-sm tabular-nums">
                    <thead>
                      <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
                        <th className="px-3 py-2 font-medium">Member</th>
                        <th className="px-3 py-2 text-right font-medium">Payout</th>
                        <th className="px-3 py-2 text-right font-medium">Cost basis</th>
                        <th className="px-3 py-2 text-right font-medium">Gain</th>
                        <th className="px-3 py-2 text-right font-medium">Carry</th>
                        <th className="px-3 py-2 text-right font-medium">Net to member</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.carry.members.map((m) => (
                        <tr key={m.memberId} className="border-b border-zinc-100 dark:border-zinc-900">
                          <td className="px-3 py-2">{nameOf(m.memberId)}</td>
                          <td className="px-3 py-2 text-right">{money(m.payout)}</td>
                          <td className="px-3 py-2 text-right">{money(m.basis)}</td>
                          <td className="px-3 py-2 text-right">{money(m.gain)}</td>
                          <td className="px-3 py-2 text-right">{money(m.carry)}</td>
                          <td className="px-3 py-2 text-right">{money(m.net)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {result.carry.result && result.carry.result.feeLines.length > 0 && (
                  <ul className="text-sm text-zinc-700 dark:text-zinc-300">
                    {result.carry.result.feeLines.map((f, i) => (
                      <li key={i} className="tabular-nums">
                        {FEE_LABEL[f.kind] ?? f.kind}: {money(f.amount)} from {nameOf(f.chargedToMemberId)}
                        {f.recipientMemberId ? ` to ${nameOf(f.recipientMemberId)}` : ""}
                      </li>
                    ))}
                    <li className="font-medium tabular-nums">Total carry: {money(result.carry.result.totalCarry)}</li>
                  </ul>
                )}
              </>
            )}
            {result && result.carry && result.carry.applies && result.carry.members.length > 0 && result.carry.result?.feeLines.length === 0 && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">No member has a gain, so no carry is charged.</p>
            )}
          </section>

          {submitError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {submitError}
            </p>
          )}
          <div>
            <button type="button" onClick={record} disabled={!canRecord} className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background disabled:opacity-50">
              {busy ? "Recording…" : "Record exit"}
            </button>
            <p className="mt-2 text-xs text-zinc-500">Recorded in all three scenarios. An exit can&apos;t be edited; delete its three rows in Manage Ledger and record it again.</p>
          </div>
        </>
      )}
    </div>
  );
}
