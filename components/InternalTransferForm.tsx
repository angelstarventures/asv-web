"use client";

import { sortByName } from "@/lib/sortMembers";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ledgerRecordInternalTransfer,
  ledgerTransferHoldings,
  type RecordInternalTransferInput,
  type RecordInternalTransferOutput,
  type TransferHoldingsOutput,
  type TransferKind,
  type TransferResult,
  type TransferRound,
} from "@/lib/functions/transfers";

// Records an internal (member-to-member) transfer of shares from ONE round. Positions are tracked
// per round in original cost (shares x the round's price), so there are no share counts to enter.
// Two kinds:
//   Replacement - a plain change of owner: no price, carry or costs; the buyer inherits the
//                 seller's cost basis. Buyers are given as original cost received.
//   Sale        - buyers pay the round price, sellers receive the lower transfer price, and the
//                 spread funds DD-lead + management carry and legal costs. Buyers are given in dollars.
// Every figure shown comes from the same server calculator that records the transfer (the
// callable's preview mode).

type CompanyOption = { id: string; name: string; label: string };
type MemberOption = { id: string; displayName: string };
type SellerRow = { key: number; memberId: string; amount: string };
type BuyerRow = { key: number; memberId: string; value: string };

const inputCls = "rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";
const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
const num = (s: string) => (s.trim() === "" ? NaN : Number(s));
const pos = (s: string) => (num(s) > 0 ? num(s) : 0);
const r2 = (n: number) => Math.round(n * 100) / 100;
const isFull = (r: RecordInternalTransferOutput["preview"]): r is TransferResult => "kind" in r;

const FEE_LABEL: Record<string, string> = {
  DD_LEAD_CARRY: "DD-lead carry",
  MANAGEMENT_CARRY: "Management carry",
  LEGAL_COSTS: "Legal costs",
  OTHER: "Other",
};

let nextKey = 1;
const newSeller = (): SellerRow => ({ key: nextKey++, memberId: "", amount: "" });
const newBuyer = (): BuyerRow => ({ key: nextKey++, memberId: "", value: "" });

interface FormState {
  company: CompanyOption | undefined;
  round: TransferRound | undefined;
  kind: TransferKind;
  date: string;
  sellers: SellerRow[];
  buyers: BuyerRow[];
  roundPrice: string;
  transferPrice: string;
  referenceRound: string;
  legalCosts: string;
  docLink: string;
  notes: string;
}

// Turns the form into the callable's input, or lists what is still missing. Never throws.
function buildInput(f: FormState): { input?: RecordInternalTransferInput; problems: string[] } {
  const problems: string[] = [];
  if (!f.company) problems.push("choose a company");
  if (!f.round) problems.push("choose the round the shares come from");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) problems.push("enter the transfer date");
  const sale = f.kind === "Sale";

  const sellers: Record<string, number> = {};
  for (const s of f.sellers) {
    if (!s.memberId) continue;
    if (!(num(s.amount) > 0)) {
      problems.push("enter the original cost each seller is moving");
      continue;
    }
    sellers[s.memberId] = num(s.amount);
  }
  if (Object.keys(sellers).length === 0) problems.push("add at least one seller");

  const buyers: Record<string, number> = {};
  for (const b of f.buyers) {
    if (!b.memberId) continue;
    if (!(num(b.value) > 0)) {
      problems.push(sale ? "enter the dollars each buyer pays" : "enter the original cost each buyer receives");
      continue;
    }
    buyers[b.memberId] = num(b.value);
  }
  if (Object.keys(buyers).length === 0) problems.push("add at least one buyer");

  const round = num(f.roundPrice);
  const transfer = num(f.transferPrice);
  if (sale) {
    if (!(round > 0)) problems.push("enter the round price per share");
    if (!(transfer >= 0)) problems.push("enter the transfer price per share");
  }
  if (problems.length > 0 || !f.company || !f.round) return { problems: [...new Set(problems)] };

  const legal = num(f.legalCosts);
  const input: RecordInternalTransferInput = {
    company: f.company.name,
    date: f.date,
    transferKind: f.kind,
    sourceRoundName: f.round.name,
    sourceRoundDate: f.round.date,
    sellers,
    buyers,
    ...(sale ? { roundPricePerShare: round, transferPricePerShare: transfer } : {}),
    ...(sale && Number.isFinite(legal) ? { legalCosts: legal } : {}),
    ...(sale && f.referenceRound.trim() ? { referenceRoundName: f.referenceRound.trim() } : {}),
    ...(f.docLink.trim() ? { docLink: f.docLink.trim() } : {}),
    ...(f.notes.trim() ? { notes: f.notes.trim() } : {}),
  };
  return { input, problems: [] };
}

export function InternalTransferForm({ companies, members }: { companies: CompanyOption[]; members: MemberOption[] }) {
  const [companyId, setCompanyId] = useState("");
  const [holdings, setHoldings] = useState<TransferHoldingsOutput | null>(null);
  const [holdingsError, setHoldingsError] = useState<string | null>(null);
  const [loadingHoldings, setLoadingHoldings] = useState(false);
  const [roundKey, setRoundKey] = useState("");
  const [kind, setKind] = useState<TransferKind>("Replacement");
  const [date, setDate] = useState("");
  const [sellers, setSellers] = useState<SellerRow[]>([newSeller()]);
  const [buyers, setBuyers] = useState<BuyerRow[]>([newBuyer()]);
  const [roundPrice, setRoundPrice] = useState("");
  const [transferPrice, setTransferPrice] = useState("");
  const [referenceRound, setReferenceRound] = useState("");
  const [legalCosts, setLegalCosts] = useState("");
  const [docLink, setDocLink] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [recorded, setRecorded] = useState<string | null>(null);

  const company = companies.find((c) => c.id === companyId);
  const round = holdings?.rounds.find((r) => r.key === roundKey);
  const nameOf = useMemo(() => {
    const m = new Map(members.map((x) => [x.id, x.displayName]));
    return (id: string) => (m.has(id) ? `${m.get(id)} (${id})` : id);
  }, [members]);
  const holderById = useMemo(() => new Map((round?.holders ?? []).map((h) => [h.memberId, h])), [round]);
  const unit = round?.pricePerShare && round.pricePerShare > 0 ? round.pricePerShare : 1;
  const saleBlocked = kind === "Sale" && ((holdings?.saleBlockers.length ?? 0) > 0 || (round !== undefined && round.pricePerShare === null));

  const built = useMemo(
    () => buildInput({ company, round, kind, date, sellers, buyers, roundPrice, transferPrice, referenceRound, legalCosts, docLink, notes }),
    [company, round, kind, date, sellers, buyers, roundPrice, transferPrice, referenceRound, legalCosts, docLink, notes]
  );
  const inputKey = built.input ? JSON.stringify(built.input) : null;

  // Live reconciliation: the server's own calculator, debounced. A result is shown only while its
  // key still matches the current form, so a stale response can never be mistaken for current.
  const [previewState, setPreviewState] = useState<{ key: string; result?: RecordInternalTransferOutput["preview"]; error?: string } | null>(null);
  useEffect(() => {
    if (!inputKey) return;
    const handle = setTimeout(async () => {
      try {
        const out = await ledgerRecordInternalTransfer({ ...(JSON.parse(inputKey) as RecordInternalTransferInput), preview: true });
        setPreviewState({ key: inputKey, result: out.preview });
      } catch (err) {
        setPreviewState({ key: inputKey, error: err instanceof Error ? err.message : "Could not preview this transfer." });
      }
    }, 600);
    return () => clearTimeout(handle);
  }, [inputKey]);
  const preview = previewState && previewState.key === inputKey ? previewState : null;
  const previewResult = preview?.result;
  const previewErrors = preview?.error ? [preview.error] : previewResult?.errors ?? [];
  const canRecord = Boolean(inputKey && previewResult && isFull(previewResult) && previewResult.ok && !busy);

  async function chooseCompany(id: string) {
    setCompanyId(id);
    setHoldings(null);
    setHoldingsError(null);
    setRoundKey("");
    setSellers([newSeller()]);
    setBuyers([newBuyer()]);
    setRecorded(null);
    if (!id) return;
    setLoadingHoldings(true);
    try {
      setHoldings(await ledgerTransferHoldings(id));
    } catch (err) {
      setHoldingsError(err instanceof Error ? err.message : "Could not load this company's rounds.");
    } finally {
      setLoadingHoldings(false);
    }
  }

  function chooseRound(key: string) {
    setRoundKey(key);
    setSellers([newSeller()]);
    setBuyers([newBuyer()]);
  }

  function patchSeller(key: number, patch: Partial<SellerRow>) {
    setSellers((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function patchBuyer(key: number, patch: Partial<BuyerRow>) {
    setBuyers((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  // Original cost the sellers are moving (shares x the round's price); for a Sale the buyers pay
  // the round price, so the dollars that balance it are sellerTotal x roundPrice / sourcePrice.
  const sellerTotal = sellers.reduce((n, s) => n + pos(s.amount), 0);
  const buyerValueTotal = buyers.reduce((n, b) => n + pos(b.value), 0);
  const saleDollarsTarget = num(roundPrice) > 0 && round?.pricePerShare ? (sellerTotal / round.pricePerShare) * num(roundPrice) : 0;
  const buyerTarget = kind === "Sale" ? saleDollarsTarget : sellerTotal;

  async function record() {
    if (!built.input) return;
    setBusy(true);
    setSubmitError(null);
    try {
      const out = await ledgerRecordInternalTransfer(built.input);
      if (!out.recorded) throw new Error("The transfer was not recorded.");
      const date = built.input.date;
      setSellers([newSeller()]);
      setBuyers([newBuyer()]);
      setDate("");
      setRoundPrice("");
      setTransferPrice("");
      setLegalCosts("");
      setReferenceRound("");
      setDocLink("");
      setNotes("");
      setPreviewState(null);
      await chooseCompany(companyId); // refresh positions
      setRecorded(`Recorded in all three scenarios on ${date}.`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not record this transfer.");
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
          Transfer date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </label>
        <fieldset className="flex flex-col gap-1 text-sm">
          <legend className="mb-1">Type</legend>
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5">
              <input type="radio" name="kind" checked={kind === "Replacement"} onChange={() => setKind("Replacement")} />
              Owner replacement
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" name="kind" checked={kind === "Sale"} onChange={() => setKind("Sale")} />
              Sale with carry
            </label>
          </div>
        </fieldset>
      </section>

      <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        {kind === "Replacement"
          ? "A plain change of owner for all or part of a member's position in ONE round. No price, carry or costs; the new owner inherits the seller's cost basis."
          : "Buyers pay the round price, sellers receive the lower transfer price, and the difference funds DD-lead and management carry plus legal costs. Shares come from ONE round."}
      </p>

      {loadingHoldings && <p className="text-sm text-zinc-500">Loading rounds…</p>}
      {holdingsError && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {holdingsError}
        </p>
      )}
      {holdings && kind === "Sale" && holdings.saleBlockers.length > 0 && (
        <ul role="alert" className="list-disc rounded-md border border-amber-300 bg-amber-50 py-2 pl-7 pr-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {holdings.saleBlockers.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      )}

      {holdings && holdings.rounds.length === 0 && <p className="text-sm text-zinc-600">This company has no rounds with member allocations.</p>}

      {holdings && holdings.rounds.length > 0 && (
        <>
          <section className="flex flex-col gap-2">
            <label className="flex max-w-xl flex-col gap-1 text-sm">
              Source round (all shares in this transfer come from this one round)
              <select value={roundKey} onChange={(e) => chooseRound(e.target.value)} className={inputCls}>
                <option value="">Select a round…</option>
                {holdings.rounds.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.date} {r.name} — {r.pricePerShare ? `${money(r.pricePerShare)}/share` : "no share price"}
                  </option>
                ))}
              </select>
            </label>
            {round && kind === "Sale" && round.pricePerShare === null && (
              <p role="alert" className="text-sm text-amber-800 dark:text-amber-300">
                This round has no price per share (for example a SAFE), so a Sale cannot be recorded from it. Use an owner replacement.
              </p>
            )}
            {round && (
              <p className="text-xs text-zinc-500">
                Amounts below are original cost: the dollars a member put into this round. Their shares and cost basis are worked out from that.
              </p>
            )}
          </section>
        </>
      )}

      {round && (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium">Sellers (original cost moved)</h2>
            {sellers.map((s) => {
              const holder = holderById.get(s.memberId);
              const used = new Set(sellers.filter((x) => x.key !== s.key).map((x) => x.memberId));
              return (
                <div key={s.key} className="flex flex-col gap-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1 text-sm">
                      Seller
                      <select value={s.memberId} onChange={(e) => patchSeller(s.key, { memberId: e.target.value, amount: "" })} className={inputCls}>
                        <option value="">Select…</option>
                        {sortByName(round.holders)
                          .filter((h) => !used.has(h.memberId))
                          .map((h) => (
                            <option key={h.memberId} value={h.memberId}>
                              {h.displayName} ({h.memberId})
                            </option>
                          ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      Original cost moving ($)
                      <input type="number" min="0" step="any" value={s.amount} onChange={(e) => patchSeller(s.key, { amount: e.target.value })} className={`${inputCls} w-44`} />
                    </label>
                    {holder && (
                      <button type="button" onClick={() => patchSeller(s.key, { amount: String(holder.available) })} className="rounded-full border border-zinc-300 px-3 py-1 text-xs dark:border-zinc-700">
                        Move entire position
                      </button>
                    )}
                    {sellers.length > 1 && (
                      <button type="button" onClick={() => setSellers((rows) => rows.filter((r) => r.key !== s.key))} className="text-xs text-zinc-500 underline underline-offset-2">
                        Remove
                      </button>
                    )}
                  </div>
                  {holder && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      Holds {money(holder.available)} of this round, cost basis {money(holder.basis)}.
                      {pos(s.amount) > holder.available + 0.005 && <span className="text-red-600 dark:text-red-400"> That is more than they hold.</span>}
                    </p>
                  )}
                </div>
              );
            })}
            <button type="button" onClick={() => setSellers((rows) => [...rows, newSeller()])} className="self-start rounded-full border border-zinc-300 px-3 py-1 text-xs dark:border-zinc-700">
              Add seller
            </button>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium">Buyers {kind === "Replacement" ? "(original cost received)" : "(dollars paid)"}</h2>
            {buyers.map((b) => {
              const used = new Set([...sellers.map((x) => x.memberId), ...buyers.filter((x) => x.key !== b.key).map((x) => x.memberId)]);
              const others = buyers.filter((x) => x.key !== b.key).reduce((n, x) => n + pos(x.value), 0);
              const remaining = r2(buyerTarget - others);
              return (
                <div key={b.key} className="flex flex-wrap items-end gap-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                  <label className="flex flex-col gap-1 text-sm">
                    Buyer
                    <select value={b.memberId} onChange={(e) => patchBuyer(b.key, { memberId: e.target.value })} className={inputCls}>
                      <option value="">Select…</option>
                      {sortByName(members)
                        .filter((m) => !used.has(m.id))
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.displayName} ({m.id})
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    {kind === "Replacement" ? "Original cost received ($)" : "Dollars paid"}
                    <input type="number" min="0" step="any" value={b.value} onChange={(e) => patchBuyer(b.key, { value: e.target.value })} className={`${inputCls} w-44`} />
                  </label>
                  {remaining > 0 && (
                    <button type="button" onClick={() => patchBuyer(b.key, { value: String(remaining) })} className="rounded-full border border-zinc-300 px-3 py-1 text-xs dark:border-zinc-700">
                      Assign remaining ({money(remaining)})
                    </button>
                  )}
                  {buyers.length > 1 && (
                    <button type="button" onClick={() => setBuyers((rows) => rows.filter((r) => r.key !== b.key))} className="text-xs text-zinc-500 underline underline-offset-2">
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
            <button type="button" onClick={() => setBuyers((rows) => [...rows, newBuyer()])} className="self-start rounded-full border border-zinc-300 px-3 py-1 text-xs dark:border-zinc-700">
              Add buyer
            </button>
            {sellerTotal > 0 && (
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {kind === "Replacement"
                  ? `${money(sellerTotal)} of original cost moving; ${money(buyerValueTotal)} assigned to buyers.`
                  : saleDollarsTarget > 0
                    ? `Buyers should pay ${money(saleDollarsTarget)} in total at the round price; ${money(buyerValueTotal)} assigned.`
                    : `${money(sellerTotal)} of original cost moving. Enter the round price to see what buyers should pay.`}
              </p>
            )}
          </section>

          {kind === "Sale" && (
            <section className="flex flex-wrap items-end gap-4">
              <label className="flex flex-col gap-1 text-sm">
                Round price per share ($) — what buyers pay
                <input type="number" min="0" step="any" value={roundPrice} onChange={(e) => setRoundPrice(e.target.value)} className={`${inputCls} w-52`} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Transfer price per share ($) — what sellers get
                <input type="number" min="0" step="any" value={transferPrice} onChange={(e) => setTransferPrice(e.target.value)} className={`${inputCls} w-52`} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Legal costs ($, optional)
                <input type="number" min="0" step="any" value={legalCosts} placeholder="derived from the spread" onChange={(e) => setLegalCosts(e.target.value)} className={`${inputCls} w-52`} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Reference round (optional)
                <input value={referenceRound} onChange={(e) => setReferenceRound(e.target.value)} className={`${inputCls} w-52`} />
              </label>
            </section>
          )}

          <section className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1 text-sm">
              Document link (optional)
              <input type="url" value={docLink} onChange={(e) => setDocLink(e.target.value)} className={`${inputCls} w-72`} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Notes (optional)
              <input value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputCls} w-72`} />
            </label>
          </section>

          <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <h2 className="text-sm font-medium">Reconciliation</h2>
            {!built.input && built.problems.length > 0 && <p className="text-sm text-zinc-500">To preview: {built.problems.join("; ")}.</p>}
            {built.input && !preview && <p className="text-sm text-zinc-500">Calculating…</p>}
            {previewErrors.length > 0 && (
              <ul role="alert" className="list-disc rounded-md border border-red-300 bg-red-50 py-2 pl-7 pr-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                {previewErrors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
            {previewResult && isFull(previewResult) && <PreviewPanel result={previewResult} nameOf={nameOf} unit={unit} />}
          </section>

          {submitError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {submitError}
            </p>
          )}
          <button
            type="button"
            onClick={record}
            disabled={!canRecord || saleBlocked}
            className="self-start rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background disabled:opacity-50"
          >
            {busy ? "Recording…" : "Record transfer"}
          </button>
          <p className="text-xs text-zinc-500">
            A recorded transfer can&apos;t be edited — to change one, delete its three scenario rows in Manage Ledger and record it again.
          </p>
        </>
      )}
    </div>
  );
}

function PreviewPanel({ result, nameOf, unit }: { result: TransferResult; nameOf: (id: string) => string; unit: number }) {
  const sale = result.kind === "SALE";
  const th = "px-2 py-1 text-left text-xs font-medium text-zinc-500";
  const td = "px-2 py-1 text-sm tabular-nums";
  return (
    <div className="flex flex-col gap-4">
      {result.warnings.length > 0 && (
        <ul className="list-disc rounded-md border border-amber-300 bg-amber-50 py-2 pl-7 pr-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {result.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      {sale && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
          <div><dt className="text-xs text-zinc-500">Seller gain at round price</dt><dd className="tabular-nums">{money(result.grossGain)}</dd></div>
          <div><dt className="text-xs text-zinc-500">Spread funding fees</dt><dd className="tabular-nums">{money(result.spread)}</dd></div>
          <div><dt className="text-xs text-zinc-500">Total fees charged</dt><dd className="tabular-nums">{money(result.totalFees)}</dd></div>
          <div>
            <dt className="text-xs text-zinc-500">Legal costs{result.legalDerived ? " (derived)" : ""}</dt>
            <dd className="tabular-nums">
              {money(result.legalCosts)}
              {result.legalPercentOfGain !== null && ` · ${result.legalPercentOfGain.toFixed(2)}% of gain`}
            </dd>
          </div>
        </dl>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className={th}>Seller</th>
              <th className={th}>Original cost moved</th>
              <th className={th}>Cost basis moved</th>
              <th className={th}>Round position left</th>
              {sale && <th className={th}>Paid to seller</th>}
              {sale && <th className={th}>Gain</th>}
              {sale && <th className={th}>Fees</th>}
              {sale && <th className={th}>Realized</th>}
            </tr>
          </thead>
          <tbody>
            {result.sellers.map((s) => (
              <tr key={s.memberId} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className={td}>{nameOf(s.memberId)}</td>
                <td className={td}>{money(s.shares * unit)}</td>
                <td className={td}>{money(s.shares * s.costBasisPerShare)}</td>
                <td className={td}>{money(Math.max(0, s.sharesHeldBefore - s.shares) * unit)}</td>
                {sale && <td className={td}>{money(s.amount)}</td>}
                {sale && <td className={td}>{money(s.gain)}</td>}
                {sale && <td className={td}>{money(s.feesCharged)}</td>}
                {sale && <td className={td}>{money(s.realizedGain)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className={th}>Buyer</th>
              <th className={th}>Original cost received</th>
              <th className={th}>{sale ? "Cost basis (paid)" : "Cost basis (inherited)"}</th>
              {sale && <th className={th}>Pays</th>}
            </tr>
          </thead>
          <tbody>
            {result.buyers.map((b) => (
              <tr key={b.memberId} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className={td}>{nameOf(b.memberId)}</td>
                <td className={td}>{money(b.shares * unit)}</td>
                <td className={td}>{money(b.shares * b.costBasisPerShare)}</td>
                {sale && <td className={td}>{money(b.amount)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sale && result.feeLines.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className={th}>Fee</th>
                <th className={th}>Charged to</th>
                <th className={th}>Paid to</th>
                <th className={th}>Rate</th>
                <th className={th}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {result.feeLines.map((f, i) => (
                <tr key={i} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className={td}>{FEE_LABEL[f.kind] ?? f.kind}</td>
                  <td className={td}>{nameOf(f.chargedToMemberId)}</td>
                  <td className={td}>{f.recipientMemberId ? nameOf(f.recipientMemberId) : "Third party"}</td>
                  <td className={td}>{f.percent !== null ? `${f.percent}%` : "—"}</td>
                  <td className={td}>{money(f.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
