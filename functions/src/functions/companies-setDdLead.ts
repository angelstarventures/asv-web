import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { query, withTransaction } from "../lib/dataconnect-admin";

// Sets the member who ran due diligence on a portfolio company — same shape as
// companies-updateLogo.ts (existence-check, then a plain UPDATE inside a transaction).
export interface CompaniesSetDdLeadInput {
  companyId: string;
  memberId: string | null; // null clears the DD lead
}

export const companiesSetDdLead = onCall<CompaniesSetDdLeadInput, Promise<{ ok: true }>>(async (request) => {
  await requireAdmin(request);
  const { companyId, memberId } = request.data;
  if (!companyId) {
    throw new HttpsError("invalid-argument", "companyId is required.");
  }

  const companies = await query<{ id: string }>(`SELECT id FROM "company" WHERE id = $1`, [companyId]);
  if (companies.length === 0) {
    throw new HttpsError("not-found", `No Company row for id "${companyId}".`);
  }

  if (memberId) {
    const members = await query<{ id: string }>(`SELECT id FROM "member" WHERE id = $1`, [memberId]);
    if (members.length === 0) {
      throw new HttpsError("not-found", `No Member row for id "${memberId}".`);
    }
  }

  await withTransaction(async (client) => {
    await client.query(`UPDATE "company" SET "dd_lead_id" = $1 WHERE id = $2`, [memberId, companyId]);
  });

  return { ok: true };
});
