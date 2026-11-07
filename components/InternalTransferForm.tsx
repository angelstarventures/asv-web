"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ledgerRecordInternalTransfer,
  ledgerTransferHoldings,
  type DeclaredHolding,
  type RecordInternalTransferInput,
  type RecordInternalTransferOutput,
  type TransferHoldingsOutput,
  type TransferKind,
  type TransferResult,
} from "@/lib/functions/transfers";

// Records an internal (member-to-member) transfer. Two kinds:
//   Replacement - a plain change of owner for all or part of a holding: no price, carry or costs;
//                 the buyer inherits the seller's cost basis. Buyers are given in SHARES.
//   Sale        - buyers pay the round price, sellers receive the lower transfer price, and the
//                 spread funds DD-lead + management carry and legal costs. Buyers are given in DOLLARS.
// Holdings are never derived from old rounds: a seller with no recorded holding must have their
// whole holding declared here ("shares held before this transfer"). Every figure shown comes from
// the same server calculator that records the transfer (the callable's preview mode).

type CompanyOption = { id: string; name: string; label: string };
type MemberOption = { id: string; displayName: string };
type SellerRow = { key: number; memberId: string; shares: string; correct: boolean; heldShares: string; heldBasis: string; soldBasis: string };
type BuyerRow = { key: number; memberId: string; value: string };

const inputCls = "rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";
const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
const qty = (n: number) => (Math.round(n * 1e6) / 1e6).toLocaleString("en-US", { maximumFractionDigits: 6 });
const num = (s: string) => (s.trim() === "" ? NaN : Number(s));
const isFull = (r: RecordInternalTransferOutput["preview"]): r is TransferResult => "kind" in r;

const FEE_LABEL: Record<string, string> = {
  DD_LEAD_CARRY: "DD-lead carry",
  MANAGEMENT_CARRY: "Management carry",
  LEGAL_COSTS: "Legal costs",
  OTHER: "Other",
};

let nextKey = 1;
const newSeller = (): SellerRow => ({ key: nextKey++, memberId: "", shares: "", correct: false, heldShares: "", heldBasis: "", soldBasis: "" });
const newBuyer = (): BuyerRow => ({ key: nextKey++, memberId: "", value: "" });

interface FormState {
  company: CompanyOption | undefined;
  holdings: TransferHoldingsOutput | null;
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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date)) problems.push("enter the transfer date");
  const sale = f.kind === "Sale";

  const sellers: Record<string, number> = {};
  const holdingsBefore: Record<string, DeclaredHolding> = {};
  const soldCostBasis: Record<string, number> = {};
  const holderById = new Map((f.holdings?.holders ?? []).map((h) => [h.memberId, h]));
  for (const s of f.sellers) {
    if (!s.memberId) continue;
    const shares = num(s.shares);
    if (!(shares > 0)) {
      problems.push("enter the shares each seller is moving");
      continue;
    }
    sellers[s.memberId] = shares;
    if (s.soldBasis.trim() !== "") {
      const sold = num(s.soldBasis);
      if (sold >= 0) soldCostBasis[s.memberId] = sold;
      else problems.push("the cost basis of the shares sold must be 0 or more (or leave it blank)");
    }
    const holder = holderById.get(s.memberId);
    if (holder?.shares == null || s.correct) {
      const held = num(s.heldShares);
      if (!(held > 0)) {
        problems.push("enter each seller's whole holding before this transfer");
        continue;
      }
      const basis = num(s.heldBasis);
      holdingsBefore[s.memberId] = Number.isFinite(basis) ? { shares: held, cost_basis: basis } : { shares: held };
    }
  }
  if (Object.keys(sellers).length === 0) problems.push("add at least one seller");

  const buyers: Record<string, number> = {};
  for (const b of f.buyers) {
    if (!b.memberId) continue;
    const v = num(b.value);
    if (!(v > 0)) {
      problems.push(sale ? "enter the dollars each buyer pays" : "enter the shares each buyer receives");
      continue;
    }
    buyers[b.memberId] = v;
  }
  if (Object.keys(buyers).length === 0) problems.push("add at least one buyer");

  const round = num(f.roundPrice);
  const transfer = num(f.transferPrice);
  if (sale) {
    if (!(round > 0)) problems.push("enter the round price per share");
    if (!(transfer >= 0)) problems.push("enter the transfer price per share");
  }
  if (problems.length > 0 || !f.company) return { problems: [...new Set(problems)] };

  const legal = num(f.legalCosts);
  const input: RecordInternalTransferInput = {
    company: f.company.name,
    date: f.date,
    transferKind: f.kind,
    sellers,
    buyers,
    ...(Object.keys(holdingsBefore).length ? { holdingsBefore } : {}),
    ...(Object.keys(soldCostBasis).length ? { soldCostBasis } : {}),
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
  const nameOf = useMemo(() => {
    const m = new Map(members.map((x) => [x.id, x.displayName]));
    return (id: string) => (m.has(id) ? `${m.get(id)} (${id})` : id);
  }, [members]);
  const holderById = useMemo(() => new Map((holdings?.holders ?? []).map((h) => [h.memberId, h])), [holdings]);

  const built = useMemo(
    () => buildInput({ company, holdings, kind, date, sellers, buyers, roundPrice, transferPrice, referenceRound, legalCosts, docLink, notes }),
    [company, holdings, kind, date, sellers, buyers, roundPrice, transferPrice, referenceRound, legalCosts, docLink, notes]
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
    setSellers([newSeller()]);
    setBuyers([newBuyer()]);
    setRecorded(null);
    if (!id) return;
    setLoadingHoldings(true);
    try {
      setHoldings(await ledgerTransferHoldings(id));
    } catch (err) {
      setHoldingsError(err instanceof Error ? err.message : "Could not load this company's holders.");
    } finally {
      setLoadingHoldings(false);
    }
  }

  function patchSeller(key: number, patch: Partial<SellerRow>) {
    setSellers((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function patchBuyer(key: number, patch: Partial<BuyerRow>) {
    setBuyers((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  const sellerTotal = sellers.reduce((n, s) => n + (num(s.shares) > 0 ? num(s.shares) : 0), 0);
  const buyerValueTotal = buyers.reduce((n, b) => n + (num(b.value) > 0 ? num(b.value) : 0), 0);
  const saleBlocked = kind === "Sale" && (holdings?.saleBlockers.length ?? 0) > 0;

  async function record() {
    if (!built.input) return;
    setBusy(true);
    setSubmitError(null);
    try {
      const out = await ledgerRecordInternalTransfer(built.input);
      if (!out.recorded) throw new Error("The transfer was not recorded.");
      setRecorded(`Recorded in all three scenarios on ${built.input.date}.`);
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
      await chooseCompany(companyId); // refresh recorded holdings
      setRecorded(`Recorded in all three scenarios on ${built.input.date}.`);
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
          ? "A plain change of owner for all or part of a holding. No price, carry or costs; the new owner inherits the seller's cost basis. Enter buyers in shares."
          : "Buyers pay the round price, sellers receive the lower transfer price, and the difference funds DD-lead and management carry plus legal costs. Enter buyers in dollars."}
      </p>

      {loadingHoldings && <p className="text-sm text-zinc-500">Loading holders…</p>}
      {holdingsError && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {holdingsError}
        </p>
      )}
      {saleBlocked && holdings && (
        <ul role="alert" className="list-disc rounded-md border border-amber-300 bg-amber-50 py-2 pl-7 pr-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {holdings.saleBlockers.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      )}

      {holdings && (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium">Sellers</h2>
            {sellers.map((s) => {
              const holder = holderById.get(s.memberId);
              const known = holder?.shares != null;
              const declaring = Boolean(s.memberId) && (!known || s.correct);
              const used = new Set(sellers.filter((x) => x.key !== s.key).map((x) => x.memberId));
              return (
                <div key={s.key} className="flex flex-col gap-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1 text-sm">
                      Seller
                      <select value={s.memberId} onChange={(e) => patchSeller(s.key, { memberId: e.target.value, correct: false, heldShares: "", heldBasis: "", soldBasis: "" })} className={inputCls}>
                        <option value="">Select…</option>
                        {holdings.holders
                          .filter((h) => !used.has(h.memberId))
                          .map((h) => (
                            <option key={h.memberId} value={h.memberId}>
                              {h.displayName} ({h.memberId})
                            </option>
                          ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      Shares moving
                      <input type="number" min="0" step="any" value={s.shares} onChange={(e) => patchSeller(s.key, { shares: e.target.value })} className={`${inputCls} w-36`} />
                    </label>
                    {known && !s.correct && (
                      <button type="button" onClick={() => patchSeller(s.key, { shares: String(holder.shares) })} className="rounded-full border border-zinc-300 px-3 py-1 text-xs dark:border-zinc-700">
                        Move entire position
                      </button>
                    )}
                    {sellers.length > 1 && (
                      <button type="button" onClick={() => setSellers((rows) => rows.filter((r) => r.key !== s.key))} className="text-xs text-zinc-500 underline underline-offset-2">
                        Remove
                      </button>
                    )}
                  </div>

                  {s.memberId && known && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      Recorded holding: {qty(holder.shares as number)} shares, cost basis {money(holder.basis)}.{" "}
                      <label className="inline-flex items-center gap-1">
                        <input type="checkbox" checked={s.correct} onChange={(e) => patchSeller(s.key, { correct: e.target.checked })} />
                        Correct this holding
                      </label>
                    </p>
                  )}
                  {s.memberId && !known && (
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      No holding is recorded for this member — enter their whole holding in {holdings.companyName} before this transfer.
                      They have {money(holder?.invested ?? 0)} invested.
                    </p>
                  )}
                  {s.memberId && (
                    <label className="flex max-w-md flex-col gap-1 text-sm">
                      Cost basis of the shares sold ($, optional)
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={s.soldBasis}
                        placeholder={known && num(s.shares) > 0 ? String(Math.round(((holder.basis * num(s.shares)) / (holder.shares as number)) * 100) / 100) : ""}
                        onChange={(e) => patchSeller(s.key, { soldBasis: e.target.value })}
                        className={`${inputCls} w-44`}
                      />
                      <span className="text-xs text-zinc-500">
                        Leave blank to use this member&apos;s average cost. Enter the total cost of these specific shares if they came from one round (the rest of their basis stays with the shares they keep).
                      </span>
                    </label>
                  )}
                  {declaring && (
                    <div className="flex flex-wrap items-end gap-3">
                      <label className="flex flex-col gap-1 text-sm">
                        Shares held before this transfer
                        <input type="number" min="0" step="any" value={s.heldShares} onChange={(e) => patchSeller(s.key, { heldShares: e.target.value })} className={`${inputCls} w-44`} />
                      </label>
                      <label className="flex flex-col gap-1 text-sm">
                        Total cost basis ($, optional)
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={s.heldBasis}
                          placeholder={holder ? String(holder.invested) : ""}
                          onChange={(e) => patchSeller(s.key, { heldBasis: e.target.value })}
                          className={`${inputCls} w-44`}
                        />
                      </label>
                      {s.heldShares && num(s.shares) > 0 && num(s.heldShares) > 0 && num(s.shares) === num(s.heldShares) && (
                        <span className="text-xs text-zinc-600 dark:text-zinc-400">Whole position.</span>
                      )}
                      <span className="text-xs text-zinc-500">Blank cost basis defaults to the dollars they invested.</span>
                    </div>
                  )}
                </div>
              );
            })}
            <button type="button" onClick={() => setSellers((rows) => [...rows, newSeller()])} className="self-start rounded-full border border-zinc-300 px-3 py-1 text-xs dark:border-zinc-700">
              Add seller
            </button>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium">Buyers {kind === "Replacement" ? "(shares received)" : "(dollars paid)"}</h2>
            {buyers.map((b) => {
              const used = new Set([...sellers.map((x) => x.memberId), ...buyers.filter((x) => x.key !== b.key).map((x) => x.memberId)]);
              const others = buyers.filter((x) => x.key !== b.key).reduce((n, x) => n + (num(x.value) > 0 ? num(x.value) : 0), 0);
              const remaining = sellerTotal - others;
              return (
                <div key={b.key} className="flex flex-wrap items-end gap-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                  <label className="flex flex-col gap-1 text-sm">
                    Buyer
                    <select value={b.memberId} onChange={(e) => patchBuyer(b.key, { memberId: e.target.value })} className={inputCls}>
                      <option value="">Select…</option>
                      {members
                        .filter((m) => !used.has(m.id))
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.displayName} ({m.id})
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    {kind === "Replacement" ? "Shares" : "Dollars paid"}
                    <input type="number" min="0" step="any" value={b.value} onChange={(e) => patchBuyer(b.key, { value: e.target.value })} className={`${inputCls} w-40`} />
                  </label>
                  {kind === "Sale" && num(roundPrice) > 0 && num(b.value) > 0 && (
                    <span className="pb-2 text-xs text-zinc-500">= {qty(num(b.value) / num(roundPrice))} shares</span>
                  )}
                  {kind === "Replacement" && remaining > 0 && (
                    <button type="button" onClick={() => patchBuyer(b.key, { value: String(Math.round(remaining * 1e6) / 1e6) })} className="rounded-full border border-zinc-300 px-3 py-1 text-xs dark:border-zinc-700">
                      Assign remaining ({qty(remaining)})
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
            {kind === "Replacement" && sellerTotal > 0 && (
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {qty(sellerTotal)} shares moving; {qty(buyerValueTotal)} assigned to buyers.
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
            {previewResult && isFull(previewResult) && <PreviewPanel result={previewResult} nameOf={nameOf} />}
          </section>

          {submitError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {submitError}
            </p>
          )}
          <button
            type="button"
            onClick={record}
            disabled={!canRecord}
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

function PreviewPanel({ result, nameOf }: { result: TransferResult; nameOf: (id: string) => string }) {
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

      {result.openingAdjustments.length > 0 && (
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          Declared holdings that will be recorded:{" "}
          {result.openingAdjustments.map((o) => `${nameOf(o.memberId)} — ${qty(o.shares)} shares, ${money(o.costBasis)} basis`).join("; ")}.
        </p>
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
              <th className={th}>Shares</th>
              <th className={th}>Held before</th>
              <th className={th}>Basis / share</th>
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
                <td className={td}>{qty(s.shares)}</td>
                <td className={td}>{qty(s.sharesHeldBefore)}</td>
                <td className={td}>{money(s.costBasisPerShare)}</td>
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
              <th className={th}>Shares</th>
              <th className={th}>{sale ? "Cost / share" : "Inherited basis / share"}</th>
              {sale && <th className={th}>Pays</th>}
            </tr>
          </thead>
          <tbody>
            {result.buyers.map((b) => (
              <tr key={b.memberId} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className={td}>{nameOf(b.memberId)}</td>
                <td className={td}>{qty(b.shares)}</td>
                <td className={td}>{money(b.costBasisPerShare)}</td>
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
