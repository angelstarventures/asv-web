import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { query, withTransaction } from "../lib/dataconnect-admin";

// Same data: URL storage approach as updatePhotoForMember (users-onCreateProvision.ts) — no
// Cloud Storage bucket exists in this project, and a company logo is small enough that storing
// it directly on the row is a reasonable shortcut, matching the existing member-photo pattern.
export interface UpdateCompanyLogoInput {
  companyId: string;
  // A full `data:image/<type>;base64,<data>` URI, or null to remove the current logo.
  photoDataUrl: string | null;
}

const PHOTO_DATA_URL_PATTERN = /^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,([A-Za-z0-9+/]+=*)$/;
const MAX_LOGO_BYTES = 1.5 * 1024 * 1024;

export const updateCompanyLogo = onCall<UpdateCompanyLogoInput, Promise<{ ok: true }>>(async (request) => {
  await requireAdmin(request);
  const { companyId, photoDataUrl } = request.data;
  if (!companyId) {
    throw new HttpsError("invalid-argument", "companyId is required.");
  }

  const companies = await query<{ id: string }>(`SELECT id FROM "company" WHERE id = $1`, [companyId]);
  if (companies.length === 0) {
    throw new HttpsError("not-found", `No Company row for id "${companyId}".`);
  }

  if (photoDataUrl === null) {
    await withTransaction(async (client) => {
      await client.query(`UPDATE "company" SET "logo_url" = NULL WHERE id = $1`, [companyId]);
    });
    return { ok: true };
  }

  const match = PHOTO_DATA_URL_PATTERN.exec(photoDataUrl);
  if (!match) {
    throw new HttpsError(
      "invalid-argument",
      "photoDataUrl must be a data:image/(png|jpeg|webp|gif|svg+xml);base64,... URI."
    );
  }
  const decodedBytes = Buffer.from(match[2], "base64").byteLength;
  if (decodedBytes > MAX_LOGO_BYTES) {
    throw new HttpsError("invalid-argument", `Logo exceeds the ${MAX_LOGO_BYTES / (1024 * 1024)}MB limit.`);
  }

  await withTransaction(async (client) => {
    await client.query(`UPDATE "company" SET "logo_url" = $1 WHERE id = $2`, [photoDataUrl, companyId]);
  });

  return { ok: true };
});
