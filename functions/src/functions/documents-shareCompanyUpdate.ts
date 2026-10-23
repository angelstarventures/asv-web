import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { withTransaction, query } from "../lib/dataconnect-admin";
import { findOrUploadCompanyUpdateFile, findOrCreateFolder, driveOAuthClientSecret, driveOAuthRefreshToken } from "../lib/dealsDrive";

// Backs saving originals after commit and the "Send via WhatsApp" button on a CompanyUpdate in the AI document-review
// screen (AdminDocumentsFlow.tsx) — persists the file(s) that were only ever held in-memory for
// the AI analysis call (documents-analyze.ts), then inserts a `document` row exactly like the
// ledger's own document intake (documents-onDriveUpload.ts) so it shows up in every member's
// Documents view. Uploads go through the OAuth-delegated Drive client (lib/dealsDrive.ts) rather
// than lib/drive.ts's bare service account — a service account has no Drive storage quota of its
// own (confirmed empirically), so it can never own an uploaded file outside a Shared Drive,
// which Google Workspace-less ASV doesn't have. Analysis alone does not upload discarded drafts.

export interface DocumentsShareCompanyUpdateFile {
  filename: string;
  mimeType: string;
  contentBase64: string;
}

export interface DocumentsShareCompanyUpdateInput {
  companyId?: string;
  companyName?: string;
  files: DocumentsShareCompanyUpdateFile[];
}

export interface DocumentsShareCompanyUpdateOutput {
  driveUrls: string[];
}

const MAX_TOTAL_BYTES = 25 * 1024 * 1024;

export const documentsShareCompanyUpdate = onCall<
  DocumentsShareCompanyUpdateInput,
  Promise<DocumentsShareCompanyUpdateOutput>
>({ secrets: [driveOAuthClientSecret, driveOAuthRefreshToken], timeoutSeconds: 120 }, async (request) => {
  const caller = await requireAdmin(request);
  const { companyId, companyName, files } = request.data;
  if ((!companyId && !companyName) || !Array.isArray(files) || files.length === 0) {
    throw new HttpsError("invalid-argument", "companyId or companyName and at least one file are required.");
  }
  if (files.some((file) => !file || typeof file.filename !== "string" || !file.filename.trim() ||
      typeof file.mimeType !== "string" || !file.mimeType || typeof file.contentBase64 !== "string")) {
    throw new HttpsError("invalid-argument", "Every file needs a filename, mimeType, and base64 content.");
  }

  const fileBuffers = files.map((f) => Buffer.from(f.contentBase64, "base64"));
  const totalBytes = fileBuffers.reduce((sum, buf) => sum + buf.byteLength, 0);
  if (totalBytes > MAX_TOTAL_BYTES) {
    throw new HttpsError("invalid-argument", `Files exceed the ${MAX_TOTAL_BYTES / (1024 * 1024)}MB total limit.`);
  }

  const rootFolderId = process.env.COMPANY_UPDATES_DRIVE_ROOT_FOLDER_ID;
  if (!rootFolderId) {
    throw new HttpsError("failed-precondition", "COMPANY_UPDATES_DRIVE_ROOT_FOLDER_ID is not configured.");
  }

  const companies = await query<{ id: string; name: string; folderName: string }>(
    `SELECT id, name, COALESCE(trade_name, name) AS "folderName" FROM "company" WHERE ${companyId ? "id" : "name"} = $1`,
    [companyId || companyName]
  );
  const company = companies[0];
  if (!company) {
    throw new HttpsError("not-found", `No company row for "${companyId || companyName}".`);
  }

  // Every row this function writes is COMPANY_UPDATE_DOC, so it always lands in the company's
  // "Updates" subfolder (Investments/{Company}/Updates/), not loose in the company folder root.
  const companyFolderId = await findOrCreateFolder(rootFolderId, company.folderName);
  const updatesFolderId = await findOrCreateFolder(companyFolderId, "Updates");

  // Uploads (external, slow) happen before opening the transaction — a DB transaction should
  // never sit open across network round-trips to another service.
  const uploaded: { driveFileId: string; driveUrl: string }[] = [];
  for (let i = 0; i < files.length; i++) {
    uploaded.push(await findOrUploadCompanyUpdateFile(updatesFolderId, files[i].filename, files[i].mimeType, fileBuffers[i]));
  }

  await withTransaction(async (client) => {
    for (let i = 0; i < uploaded.length; i++) {
      const { driveFileId, driveUrl } = uploaded[i];
      await client.query(
        `INSERT INTO "document" ("drive_file_id", "drive_url", filename, "doc_type", "company_id", "uploaded_by_id", "uploaded_at")
         VALUES ($1, $2, $3, 'COMPANY_UPDATE_DOC', $4, $5, now())
         ON CONFLICT ("drive_file_id") DO NOTHING`,
        [driveFileId, driveUrl, files[i].filename, company.id, caller.memberId]
      );
    }
  });

  return { driveUrls: uploaded.map((u) => u.driveUrl) };
});
