import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { withTransaction } from "../lib/dataconnect-admin";
import { uploadToDrive } from "../lib/drive";
import type { DocumentType } from "../lib/accessMatrix";

// Backs DocumentDropzone.tsx (app/admin/ledger/* intake pages) — the frontend never touches
// Drive credentials; it posts file bytes here and this Function does the upload + Document
// row creation in one step (plan §4). Manual per-company admin upload pass, not automated
// (plan §5: "the PRD's intake flow is deliberately manual in V1").

export interface DocumentsOnDriveUploadInput {
  companyId: string;
  driveFolderId: string; // the fixed ASV Drive folder for this company (PRD §8.5 structure)
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
  async (request) => {
    const caller = await requireAdmin(request);
    const input = request.data;

    if (!input.companyId || !input.driveFolderId || !input.docType || !input.filename || !input.contentBase64) {
      throw new HttpsError("invalid-argument", "companyId, driveFolderId, docType, filename, and contentBase64 are required.");
    }

    const content = Buffer.from(input.contentBase64, "base64");
    if (content.byteLength > MAX_UPLOAD_BYTES) {
      throw new HttpsError("invalid-argument", `File exceeds the ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB limit.`);
    }

    const { driveFileId, driveUrl } = await uploadToDrive(
      input.driveFolderId,
      input.filename,
      input.mimeType,
      content
    );

    const documentId = await withTransaction(async (client) => {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO "document" ("drive_file_id", "drive_url", "doc_type", "company_id", "uploaded_by_id")
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [driveFileId, driveUrl, input.docType, input.companyId, caller.memberId]
      );
      return rows[0].id;
    });

    return { documentId, driveUrl };
  }
);
