import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { query } from "../lib/dataconnect-admin";
import { loadMemberPositions, loadRoundBook } from "../lib/memberPositions";
import { unitPrice } from "../lib/positionCalc";
import { loadFeeContext, type Run } from "../lib/transferWrites";

// Read-only lookup behind the admin transfer form: the company's rounds, who holds what of each
// (in original cost, i.e. shares x the round's price, plus the basis they carry), and whether the
// fund-wide carry settings are ready for a Sale. There are no share counts: a position is derived
// from round allocations and the transfers already recorded.

export interface TransferHoldingsInput {
  companyId: string;
}

export interface RoundHolder {
  memberId: string;
  displayName: string;
  available: number; // original cost still held in this round: shares x the round's price
  basis: number; // cost basis of that position in dollars
}

export interface TransferRound {
  key: string;
  name: string;
  date: string; // YYYY-MM-DD
  pricePerShare: number | null; // null (e.g. a SAFE): only a Replacement can be recorded from it
  holders: RoundHolder[];
}

export interface CompanyHolder {
  memberId: string;
  displayName: string;
  invested: number;
  basis: number;
}

export interface TransferHoldingsOutput {
  companyName: string;
  rounds: TransferRound[];
  holders: CompanyHolder[]; // company-level cost basis per member (used by the exit form)
  ddLeadMemberId: string | null;
  ddLeadName: string | null;
  managementMemberId: string | null;
  managementName: string | null;
  ddLeadPercent: number;
  managementPercent: number;
  saleBlockers: string[]; // reasons a Sale cannot be recorded yet (a replacement is unaffected)
}

const dbRun: Run = (text, params) => query(text, params);

export const ledgerTransferHoldings = onCall<TransferHoldingsInput, Promise<TransferHoldingsOutput>>(async (request) => {
  await requireAdmin(request);
  const companyId = request.data?.companyId;
  if (typeof companyId !== "string" || !companyId) throw new HttpsError("invalid-argument", "companyId is required.");

  const company = await query<{ name: string }>(`SELECT name FROM "company" WHERE id = $1`, [companyId]);
  if (!company[0]) throw new HttpsError("not-found", "Unknown company.");

  const fees = await loadFeeContext(dbRun, companyId);
  const book = await loadRoundBook(dbRun, companyId);
  const companyHolders = await loadMemberPositions(dbRun, companyId);

  const memberIds = [...new Set(book.rounds.flatMap((r) => Object.keys(r.positions)))];
  const names = memberIds.length
    ? await query<{ id: string; displayName: string }>(`SELECT id, "display_name" AS "displayName" FROM "member" WHERE id = ANY($1)`, [memberIds])
    : [];
  const nameBy = new Map(names.map((n) => [n.id, n.displayName]));

  const nameOf = async (id: string | null): Promise<string | null> => {
    if (!id) return null;
    const rows = await query<{ displayName: string }>(`SELECT "display_name" AS "displayName" FROM "member" WHERE id = $1`, [id]);
    return rows[0]?.displayName ?? null;
  };

  const saleBlockers: string[] = [];
  if (!fees.ddLeadMemberId) saleBlockers.push("This company has no DD lead. Set one under Admin > Companies.");
  if (!fees.managementMemberId) saleBlockers.push("No management-carry recipient is set. Choose one under Admin > Settings.");

  return {
    companyName: company[0].name,
    rounds: book.rounds
      .map((r) => ({
        key: r.key,
        name: r.name,
        date: r.date,
        pricePerShare: r.price,
        holders: Object.entries(r.positions)
          .filter(([, p]) => p.shares > 1e-6)
          .map(([memberId, p]) => ({
            memberId,
            displayName: nameBy.get(memberId) ?? memberId,
            available: Math.round(p.shares * unitPrice(r.price) * 100) / 100,
            basis: Math.round(p.basis * 100) / 100,
          }))
          .sort((a, b) => a.displayName.localeCompare(b.displayName)),
      }))
      .filter((r) => r.holders.length > 0),
    holders: companyHolders.map((h) => ({ memberId: h.memberId, displayName: h.displayName, invested: h.invested, basis: h.basis })),
    ddLeadMemberId: fees.ddLeadMemberId,
    ddLeadName: await nameOf(fees.ddLeadMemberId),
    managementMemberId: fees.managementMemberId,
    managementName: await nameOf(fees.managementMemberId),
    ddLeadPercent: fees.ddLeadPercent,
    managementPercent: fees.managementPercent,
    saleBlockers,
  };
});
