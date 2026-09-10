import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { withTransaction, query } from "../lib/dataconnect-admin";
import { uploadDealFile, findOrCreateFolder, driveOAuthClientSecret, driveOAuthRefreshToken } from "../lib/dealsDrive";
import type { DocumentType } from "../lib/accessMatrix";

// Manual company-document upload — backs the "Company Documents/Updates" tab's upload form. Same
// OAuth-delegated Drive client + per-company-subfolder pattern as documents-shareCompanyUpdate.ts
// (a bare service account has no Drive storage quota of its own, confirmed empirically), rather
// than a caller-supplied driveFolderId — the company's subfolder under
// COMPANY_UPDATES_DRIVE_ROOT_FOLDER_ID is resolved/created here, same root every company-update
// document already lands in.

export interface DocumentsOnDriveUploadInput {
  companyId: string;
  docType: DocumentType;
  filename: string;
  mimeType: string;
  contentBase64: string;
}

export interface DocumentsOnDriveUploadOutput {
  documentId: string;
  driveUrl: string;
}

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB — generous for SPAs/decks, not for video

export const documentsOnDriveUpload = onCall<DocumentsOnDriveUploadInput, Promise<DocumentsOnDriveUploadOutput>>(
  { secrets: [driveOAuthClientSecret, driveOAuthRefreshToken] },
  async (request) => {
    const caller = await requireAdmin(request);
    const input = request.data;

    if (!input.companyId || !input.docType || !input.filename || !input.contentBase64) {
      throw new HttpsError("invalid-argument", "companyId, docType, filename, and contentBase64 are required.");
    }

    const content = Buffer.from(input.contentBase64, "base64");
    if (content.byteLength > MAX_UPLOAD_BYTES) {
      throw new HttpsError("invalid-argument", `File exceeds the ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB limit.`);
    }

    const rootFolderId = process.env.COMPANY_UPDATES_DRIVE_ROOT_FOLDER_ID;
    if (!rootFolderId) {
      throw new HttpsError("failed-precondition", "COMPANY_UPDATES_DRIVE_ROOT_FOLDER_ID is not configured.");
    }

    const companies = await query<{ name: string }>(`SELECT name FROM "company" WHERE id = $1`, [input.companyId]);
    const company = companies[0];
    if (!company) {
      throw new HttpsError("not-found", `No company row for id "${input.companyId}".`);
    }

    // Company updates land in Investments/{Company}/Updates/, same as documentsShareCompanyUpdate.ts;
    // every other doc type (SPA, data room, etc.) stays directly in the company folder root.
    const companyFolderId = await findOrCreateFolder(rootFolderId, company.name);
    const targetFolderId =
      input.docType === "COMPANY_UPDATE_DOC" ? await findOrCreateFolder(companyFolderId, "Updates") : companyFolderId;
    const { driveFileId, driveUrl } = await uploadDealFile(targetFolderId, input.filename, input.mimeType, content);

    const documentId = await withTransaction(async (client) => {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO "document" ("drive_file_id", "drive_url", filename, "doc_type", "company_id", "uploaded_by_id", "uploaded_at")
         VALUES ($1, $2, $3, $4, $5, $6, now())
         RETURNING id`,
        [driveFileId, driveUrl, input.filename, input.docType, input.companyId, caller.memberId]
      );
      return rows[0].id;
    });

    return { documentId, driveUrl };
  }
);
