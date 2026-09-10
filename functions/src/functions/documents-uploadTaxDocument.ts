import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { withTransaction, query } from "../lib/dataconnect-admin";
import { uploadDealFile, findOrCreateFolder, driveOAuthClientSecret, driveOAuthRefreshToken } from "../lib/dealsDrive";

// Manual per-member tax-document upload (e.g. a K-1) — same OAuth-delegated Drive client + one-
// subfolder-per-entity pattern as documents-shareCompanyUpdate.ts/documents-onDriveUpload.ts,
// but rooted at TAX_DOCUMENTS_DRIVE_ROOT_FOLDER_ID with one subfolder per MEMBER instead of per
// company — tax_document is a wholly separate table from document (see schema.gql's own
// comment): the confidentiality boundary is "this one member + admins," not the allocation-based
// matrix Document/DocumentAccessLog implement.

export interface DocumentsUploadTaxDocumentInput {
  memberId: string;
  taxYear?: number | null;
  filename: string;
  mimeType: string;
  contentBase64: string;
}

export interface DocumentsUploadTaxDocumentOutput {
  taxDocumentId: string;
  driveUrl: string;
}

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const documentsUploadTaxDocument = onCall<
  DocumentsUploadTaxDocumentInput,
  Promise<DocumentsUploadTaxDocumentOutput>
>({ secrets: [driveOAuthClientSecret, driveOAuthRefreshToken] }, async (request) => {
  const caller = await requireAdmin(request);
  const input = request.data;

  if (!input.memberId || !input.filename || !input.contentBase64) {
    throw new HttpsError("invalid-argument", "memberId, filename, and contentBase64 are required.");
  }
  if (input.taxYear != null && (!Number.isInteger(input.taxYear) || input.taxYear < 1900 || input.taxYear > 2100)) {
    throw new HttpsError("invalid-argument", "taxYear must be a plausible calendar year.");
  }

  const content = Buffer.from(input.contentBase64, "base64");
  if (content.byteLength > MAX_UPLOAD_BYTES) {
    throw new HttpsError("invalid-argument", `File exceeds the ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB limit.`);
  }

  const rootFolderId = process.env.TAX_DOCUMENTS_DRIVE_ROOT_FOLDER_ID;
  if (!rootFolderId) {
    throw new HttpsError("failed-precondition", "TAX_DOCUMENTS_DRIVE_ROOT_FOLDER_ID is not configured.");
  }

  const members = await query<{ displayName: string }>(
    `SELECT "display_name" AS "displayName" FROM "member" WHERE id = $1`,
    [input.memberId]
  );
  const member = members[0];
  if (!member) {
    throw new HttpsError("not-found", `No member row for id "${input.memberId}".`);
  }

  const memberFolderId = await findOrCreateFolder(rootFolderId, member.displayName);
  const { driveFileId, driveUrl } = await uploadDealFile(memberFolderId, input.filename, input.mimeType, content);

  const taxDocumentId = await withTransaction(async (client) => {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO "tax_document" ("member_id", "tax_year", "drive_file_id", "drive_url", filename, "uploaded_by_id", "uploaded_at")
       VALUES ($1, $2, $3, $4, $5, $6, now())
       RETURNING id`,
      [input.memberId, input.taxYear ?? null, driveFileId, driveUrl, input.filename, caller.memberId]
    );
    return rows[0].id;
  });

  return { taxDocumentId, driveUrl };
});
