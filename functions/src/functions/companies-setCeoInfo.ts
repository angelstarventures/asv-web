import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { query, withTransaction } from "../lib/dataconnect-admin";

// Sets a portfolio company's CEO name/contact — same shape as companies-setDdLead.ts.
export interface CompaniesSetCeoInfoInput {
  companyId: string;
  ceoName: string | null;
  ceoContact: string | null;
}

export const companiesSetCeoInfo = onCall<CompaniesSetCeoInfoInput, Promise<{ ok: true }>>(async (request) => {
  await requireAdmin(request);
  const { companyId, ceoName, ceoContact } = request.data;
  if (!companyId) {
    throw new HttpsError("invalid-argument", "companyId is required.");
  }

  const companies = await query<{ id: string }>(`SELECT id FROM "company" WHERE id = $1`, [companyId]);
  if (companies.length === 0) {
    throw new HttpsError("not-found", `No Company row for id "${companyId}".`);
  }

  await withTransaction(async (client) => {
    await client.query(`UPDATE "company" SET "ceo_name" = $1, "ceo_contact" = $2 WHERE id = $3`, [
      ceoName || null,
      ceoContact || null,
      companyId,
    ]);
  });

  return { ok: true };
});
