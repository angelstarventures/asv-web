import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { query } from "../lib/dataconnect-admin";
import { loadMemberPositions } from "../lib/memberPositions";
import { loadTransferContext, type Run } from "../lib/transferWrites";

// Read-only lookup behind the admin transfer form: who holds (or has invested in) a company, what
// is recorded for them, and whether the fund-wide carry settings are ready for a Sale. Share
// counts are null unless known (declared on an earlier transfer) — the form then asks for them.

export interface TransferHoldingsInput {
  companyId: string;
}

export interface TransferHolder {
  memberId: string;
  displayName: string;
  invested: number;
  basis: number;
  shares: number | null; // null = no recorded holding; ask the admin to declare it
  hasOpening: boolean;
}

export interface TransferHoldingsOutput {
  companyName: string;
  holders: TransferHolder[];
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

  const ctx = await loadTransferContext(dbRun, companyId, []);
  const holders = await loadMemberPositions(dbRun, companyId);

  const nameOf = async (id: string | null): Promise<string | null> => {
    if (!id) return null;
    const rows = await query<{ displayName: string }>(`SELECT "display_name" AS "displayName" FROM "member" WHERE id = $1`, [id]);
    return rows[0]?.displayName ?? null;
  };

  const saleBlockers: string[] = [];
  if (!ctx.ddLeadMemberId) saleBlockers.push("This company has no DD lead. Set one under Admin > Companies.");
  if (!ctx.managementMemberId) saleBlockers.push("No management-carry recipient is set. Choose one under Admin > Settings.");

  return {
    companyName: company[0].name,
    holders: holders.map((h) => ({
      memberId: h.memberId,
      displayName: h.displayName,
      invested: h.invested,
      basis: h.basis,
      shares: h.shares,
      hasOpening: h.hasOpening,
    })),
    ddLeadMemberId: ctx.ddLeadMemberId,
    ddLeadName: await nameOf(ctx.ddLeadMemberId),
    managementMemberId: ctx.managementMemberId,
    managementName: await nameOf(ctx.managementMemberId),
    ddLeadPercent: ctx.ddLeadPercent,
    managementPercent: ctx.managementPercent,
    saleBlockers,
  };
});
