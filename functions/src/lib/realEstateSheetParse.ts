import { createHash } from "node:crypto";
export type EntryType = "MEMBER_CONTRIBUTION" | "DEVELOPER_PAYMENT" | "ACQUISITION_COST" | "FEE_OR_CHARGE" | "DISTRIBUTION" | "FX_ADJUSTMENT" | "VALUATION_MARK" | "SHARE_TRANSFER" | "SALE" | "CARRY" | "STATUS_UPDATE";
export interface SheetConfig {
    hubAliases?: string[];
    developerAliases?: string[];
    investorColumnMap?: Record<string, string>;
    columnOverrides?: Record<string, string>;
    typeRules?: {
        contains: string;
        type: EntryType;
    }[];
}
export interface Finding {
    rowNumber: number;
    kind: string;
    rawValue: unknown;
    correctedValue: unknown;
    explanation: string;
}
export interface ParsedEntry {
    rowKey: string;
    rowNumber: number;
    hash: string;
    type: EntryType;
    eventDate: string;
    amountUsd: number;
    amountNative: number | null;
    fxRateToUsd: number | null;
    currency: string;
    counterparty: string;
    description: string;
    fundedOutsideHub: boolean;
    // Direction is explicit because refunds can have the same type as expenses.
    cashDirection: number;
    needsReview: boolean;
    allocations: {
        memberId: string;
        amountUsd: number;
        cashDirection: number;
    }[];
}
export interface ParsedSheet {
    currency: string;
    entries: ParsedEntry[];
    warnings: Finding[];
    errors: string[];
    unresolvedInvestorLabels: string[];
    proposedInvestorColumnMap: Record<string, string>;
    shares: {
        memberId: string;
        shareUnits: number;
    }[];
    reconciliation: {
        memberId: string;
        expected: number;
        actual: number;
        matches: boolean;
    }[];
}
const norm = (v: unknown) => String(v ?? "").trim().replace(/\s+/g, " ").toLowerCase();
export const cents = (v: number) => Math.round((v + Number.EPSILON) * 100);
export function money(v: unknown): number | null {
    if (v === "" || v == null)
        return null;
    if (typeof v === "number") {
        if (!Number.isFinite(v))
            throw new Error("Non-finite amount");
        return v;
    }
    const raw = String(v).trim();
    const s = raw.replace(/[$,\s]/g, "").replace(/^\((.*)\)$/, "-$1");
    if (!/^-?\d+(\.\d+)?$/.test(s))
        throw new Error(`Invalid amount: ${raw}`);
    return Number(s);
}
function date(v: unknown): string | null {
    if (v == null || v === "")
        return null;
    if (typeof v === "number")
        return new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * 86400000).toISOString().slice(0, 10);
    const s = String(v).trim();
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(s);
    const iso = m ? `${m[3].length === 2 ? "20" + m[3] : m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}` : s;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || !Number.isFinite(Date.parse(iso)) || new Date(iso).toISOString().slice(0, 10) !== iso)
        throw new Error(`Invalid date: ${s}`);
    return iso;
}
// Largest-remainder split keeps every cent and has a stable member-id tie break.
export function splitMoney(amount: number, shares: {
    memberId: string;
    shareUnits: number;
}[]) {
    const roster = shares.filter(s => s.shareUnits > 0).sort((a, b) => a.memberId.localeCompare(b.memberId));
    const total = roster.reduce((s, r) => s + r.shareUnits, 0);
    if (!(total > 0))
        throw new Error("Positive share units are required for attribution.");
    const target = cents(amount);
    const rows = roster.map(s => { const exact = target * s.shareUnits / total; return { memberId: s.memberId, units: Math.floor(exact), remainder: exact % 1 }; });
    let left = target - rows.reduce((s, r) => s + r.units, 0);
    for (const r of [...rows].sort((a, b) => b.remainder - a.remainder || a.memberId.localeCompare(b.memberId))) {
        if (left-- > 0)
            r.units++;
    }
    return rows.map(r => ({ memberId: r.memberId, amountUsd: r.units / 100 }));
}
export function parseTransactionSheet(grid: unknown[][], opts: {
    members: {
        id: string;
        displayName: string;
        investingEntityName?: string | null;
        email: string;
    }[];
    config?: SheetConfig;
    sheetId?: string;
    defaultFxRateToUsd?: number;
    storedShares?: {
        memberId: string;
        shareUnits: number;
        effectiveFrom?: string;
    }[];
    currency?: string;
}): ParsedSheet {
    const config = opts.config ?? {};
    const out: ParsedSheet = { currency: opts.currency ?? "USD", entries: [], warnings: [], errors: [], unresolvedInvestorLabels: [], proposedInvestorColumnMap: {}, shares: [], reconciliation: [] };
    const warning = (rowNumber: number, kind: string, rawValue: unknown, correctedValue: unknown, explanation: string) => out.warnings.push({ rowNumber, kind, rawValue, correctedValue, explanation });
    const label = (key: string) => norm(config.columnOverrides?.[key] ?? key);
    const hi = grid.findIndex(r => r.some(c => norm(c) === label("Date")) && r.some(c => norm(c) === label("Transaction Description")));
    if (hi < 0)
        throw new Error("Missing Date / Transaction Description header.");
    const headers = grid[hi].map(c => String(c ?? "").trim().replace(/\s+/g, " "));
    const col = (s: string) => headers.findIndex(h => norm(h) === label(s));
    const di = col("Date"), desc = col("Transaction Description"), cp = col("From/To"), usd = col("USD");
    const txn = col("Txn ID") >= 0 ? col("Txn ID") : headers.findIndex(h => norm(h) === 'transaction id');
    // Native money precedes USD in the canonical template. A three-letter investor name
    // (for example Dan) must never be mistaken for a currency in a USD-only workbook.
    const native = headers.findIndex((h,i) => /^[A-Z]{3}$/.test(h.toUpperCase()) && norm(h) !== "usd" && ![di, desc, cp, txn].includes(i) && (opts.currency && opts.currency !== 'USD' ? norm(h) === norm(opts.currency) : i < usd));
    if (native >= 0)
        out.currency = headers[native].toUpperCase();
    if (usd < 0 || cp < 0)
        throw new Error("Missing USD or From/To column.");
    const investors = headers.map((h, i) => ({ h, i })).filter(c => c.i > Math.max(usd, native) && c.i !== txn && c.h);
    const map: Record<string, string> = {};
    for (const { h } of investors) {
        const saved = config.investorColumnMap && Object.entries(config.investorColumnMap).find(([k]) => norm(k) === norm(h))?.[1];
        const matches = opts.members.filter(m => [m.displayName, m.investingEntityName, m.email].some(v => v && norm(v) === norm(h)));
        if (saved && opts.members.some(m => m.id === saved))
            map[h] = saved;
        else {
            out.unresolvedInvestorLabels.push(h);
            if (matches.length === 1)
                out.proposedInvestorColumnMap[h] = matches[0].id;
            warning(hi + 1, "UNMAPPED_INVESTOR", h, null, "Confirm and save the investor column mapping before syncing.");
        }
    }
    if (new Set(Object.values(map)).size !== Object.values(map).length)
        out.errors.push("Multiple investor columns map to the same member.");
    const totalIndex = grid.findIndex((r, i) => i > hi && /^total\s*=*>?$/i.test(String(r[desc] ?? "").trim()));
    const shareIndex = grid.findIndex((r, i) => i > hi && /^shares\s*=*>?$/i.test(String(r[desc] ?? "").trim()));
    if (totalIndex < 0)
        throw new Error("Missing TOTAL==> reconciliation row.");
    if (shareIndex >= 0) {
        out.shares = investors.filter(c => map[c.h]).map(c => ({ memberId: map[c.h], shareUnits: money(grid[shareIndex][c.i]) ?? 0 }));
        if (out.shares.some(s => s.shareUnits < 0))
            out.errors.push("Share units cannot be negative.");
        const sum = out.shares.reduce((s, r) => s + r.shareUnits, 0), stated = money(grid[shareIndex][cp]);
        if (stated != null && Math.abs(sum - stated) > 1e-8) {
            out.errors.push("Shares checksum does not match.");
            warning(shareIndex + 1, "SHARES_CHECKSUM", stated, sum, "Resolve share units before sync.");
        }
    }
    const balances: Record<string, number> = {};
    const keys = new Set<string>();
    let lastDate: string | null = null, lastFx = opts.defaultFxRateToUsd ?? 1;
    for (let i = totalIndex + 1; i < grid.length; i++) {
        const r = grid[i];
        if (!r.some(v => v != null && String(v).trim() !== ""))
            continue;
        try {
            let eventDate = date(r[di]);
            if (!eventDate) {
                warning(i + 1, "MISSING_DATE", r[di] ?? null, lastDate, "Inherited the immediately preceding transaction date.");
                eventDate = lastDate;
            }
            if (!eventDate)
                throw new Error("First transaction needs a date.");
            // Correct a year only when both adjacent dates form a plausible interval containing the month/day.
            let nextDate: string | null = null;
            for (let j = i + 1; j < grid.length; j++) {
                if (grid[j].some(v => v != null && v !== "")) {
                    try {
                        nextDate = date(grid[j][di]);
                    }
                    catch { /* The next row reports its own invalid date. */ }
                    break;
                }
            }
            if (lastDate && nextDate && lastDate <= nextDate && Math.abs(Number(eventDate.slice(0, 4)) - Number(lastDate.slice(0, 4))) >= 1) {
                const candidates: string[] = [...new Set([lastDate.slice(0, 4), nextDate.slice(0, 4)])].map(y => y + eventDate!.slice(4)).filter(d => d >= lastDate! && d <= nextDate!);
                if (!(eventDate >= lastDate && eventDate <= nextDate) && candidates.length === 1) {
                    warning(i + 1, "YEAR_TYPO", eventDate, candidates[0], "Only the year changed; month/day fit between adjacent transactions.");
                    eventDate = candidates[0];
                }
            }
            lastDate = eventDate;
            const signed = investors.map(c => ({ memberId: map[c.h], amount: money(r[c.i]) }));
            const nativeAmount = native >= 0 ? money(r[native]) : out.currency === "USD" ? money(r[usd]) : null;
            const usdAmount = money(r[usd]) ?? signed.reduce((s, a) => s + (a.amount ?? 0), 0);
            if (nativeAmount && !usdAmount && !signed.some(a => a.amount))
                throw new Error("Native-only amount has no USD attribution; supply a USD amount or investor cells.");
            if (nativeAmount && usdAmount)
                lastFx = Math.abs(nativeAmount / usdAmount);
            const direction = Math.sign(usdAmount || nativeAmount || 0);
            const counterparty = String(r[cp] ?? ""), text = norm(counterparty);
            const hubs = config.hubAliases ?? ["ASV"], developers = config.developerAliases ?? ["DAMAC"];
            const toHub = hubs.some(h => text.includes("to " + norm(h))), fromHub = hubs.some(h => text.includes(norm(h) + " to "));
            const toDeveloper = developers.some(d => text.includes("to " + norm(d)));
            let type: EntryType;
            const rule = config.typeRules?.find(t => text.includes(norm(t.contains)));
            if (rule)
                type = rule.type;
            else if (text.includes("from investors") && toHub)
                type = "MEMBER_CONTRIBUTION";
            else if (fromHub && text.includes("to investors"))
                type = "DISTRIBUTION";
            else if (toDeveloper)
                type = "DEVELOPER_PAYMENT";
            else if (fromHub)
                type = "ACQUISITION_COST";
            else if (!text)
                type = "FEE_OR_CHARGE";
            else {
                type = direction >= 0 ? "MEMBER_CONTRIBUTION" : "FEE_OR_CHARGE";
                warning(i + 1, "UNKNOWN_COUNTERPARTY", counterparty, type, "Inferred from sign; confirm classification.");
            }
            const fundedOutsideHub = type === "DEVELOPER_PAYMENT" && toDeveloper && !fromHub && !toHub;
            let allocations = signed.filter(a => a.memberId && a.amount != null).map(a => ({ memberId: a.memberId, amountUsd: Math.abs(a.amount!), cashDirection: Math.sign(a.amount!) }));
            if (!allocations.some(a => a.amountUsd) && ["DEVELOPER_PAYMENT", "ACQUISITION_COST"].includes(type)) {
                const roster = out.shares.length ? out.shares : (opts.storedShares ?? []).filter(s => !s.effectiveFrom || s.effectiveFrom <= eventDate!).reduce((acc, s) => { const existing = acc.findIndex(a => a.memberId === s.memberId); if (existing >= 0)
                    acc[existing] = s;
                else
                    acc.push(s); return acc; }, [] as {
                    memberId: string;
                    shareUnits: number;
                }[]);
                allocations = splitMoney(Math.abs(usdAmount), roster).map(a => ({ ...a, cashDirection: direction }));
                warning(i + 1, "INFERRED_SPLIT", null, allocations, "Attributed by share units. Direct developer funding is excluded from hub cash.");
            }
            for (const a of allocations) {
                const share = out.shares.find(s => s.memberId === a.memberId);
                if (share?.shareUnits === 0 && a.amountUsd)
                    warning(i + 1, "ZERO_SHARE_HISTORY", a.memberId, null, "Member has cash history and zero current shares.");
                if (!fundedOutsideHub)
                    balances[a.memberId] = (balances[a.memberId] ?? 0) + a.amountUsd * a.cashDirection;
            }
            const rowKey = txn >= 0 ? String(r[txn] ?? "").trim() : `row:${i + 1}`;
            if (!rowKey || keys.has(rowKey))
                throw new Error("Txn ID must be non-blank and unique.");
            if (txn >= 0 && (!/^\d+$/.test(rowKey) || !Number.isSafeInteger(Number(rowKey)) || Number(rowKey) < 1))
                throw new Error("Txn ID must be a positive integer constant.");
            keys.add(rowKey);
            const entry: ParsedEntry = { rowKey, rowNumber: i + 1, hash: "", type, eventDate: eventDate!, amountUsd: Math.abs(usdAmount), amountNative: nativeAmount == null ? null : Math.abs(nativeAmount), fxRateToUsd: nativeAmount != null && usdAmount ? lastFx : null, currency: out.currency, counterparty, description: String(r[desc] ?? ""), fundedOutsideHub, cashDirection: direction, needsReview: out.warnings.some(w => w.rowNumber === i + 1), allocations };
            const corrections = out.warnings.filter(w => w.rowNumber === i + 1 && ['YEAR_TYPO', 'MISSING_DATE'].includes(w.kind));
            if (corrections.length)
                entry.description += ' ' + corrections.map(w => `[${w.kind}: ${JSON.stringify(w.rawValue)} → ${JSON.stringify(w.correctedValue)}]`).join(' ');
            entry.hash = createHash("sha256").update(JSON.stringify([opts.sheetId ?? "", rowKey, { ...entry, hash: undefined, rowNumber: undefined, needsReview: undefined }])).digest("hex");
            out.entries.push(entry);
        }
        catch (e) {
            out.errors.push(`Row ${i + 1}: ${(e as Error).message}`);
            warning(i + 1, "INVALID_ROW", r, null, (e as Error).message);
        }
    }
    for (const c of investors.filter(c => map[c.h])) {
        // Sheets contain formula-produced fractional cents. Preserve source precision and
        // round only the closing comparison, rather than rounding every transaction.
        const expected = money(grid[totalIndex][c.i]) ?? 0, actual = balances[map[c.h]] ?? 0;
        const matches = cents(expected) === cents(actual);
        out.reconciliation.push({ memberId: map[c.h], expected, actual, matches });
        if (!matches) {
            out.errors.push(`Cash balance mismatch for ${c.h}.`);
            warning(totalIndex + 1, "BALANCE_MISMATCH", expected, actual, c.h);
        }
    }
    const checksum = money(grid[totalIndex][cp]);
    const total = out.reconciliation.reduce((s, r) => s + r.expected, 0);
    if (checksum != null && cents(checksum) !== cents(total)) {
        out.errors.push("TOTAL checksum does not match member balances.");
        warning(totalIndex + 1, "TOTAL_CHECKSUM", checksum, total, "Column C checksum.");
    }
    return out;
}
