import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireCaller } from "../lib/auth";
import { checkDocumentAccess, type DocumentType } from "../lib/accessMatrix";
import { query, withTransaction } from "../lib/dataconnect-admin";
import { streamDriveFile } from "../lib/drive";

// Backs app/api/documents/[id]/route.ts. Every check — granted or denied — writes a
// DocumentAccessLog row (plan §3). This is a callable rather than raw HTTPS so the ID token
// is verified by the platform before `requireCaller` even runs.

interface DocumentRow {
  id: string;
  driveFileId: string;
  docType: DocumentType;
  companyId: string;
}

export interface GetAccessUrlInput {
  documentId: string;
}

export interface GetAccessUrlOutput {
  downloadUrl: string; // short-lived, proxied through this Function — not a direct Drive link
}

export const documentsGetAccessUrl = onCall<GetAccessUrlInput, Promise<GetAccessUrlOutput>>(
  async (request) => {
    const caller = await requireCaller(request);
    const { documentId } = request.data;
    if (!documentId) {
      throw new HttpsError("invalid-argument", "documentId is required.");
    }

    const docs = await query<DocumentRow>(
      `SELECT id, "drive_file_id" AS "driveFileId", "doc_type" AS "docType", "company_id" AS "companyId"
       FROM "document" WHERE id = $1`,
      [documentId]
    );
    if (docs.length === 0) {
      throw new HttpsError("not-found", "Document not found.");
    }
    const doc = docs[0];

    const access = await checkDocumentAccess(caller.role, caller.memberId, doc.companyId, doc.docType);

    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO "document_access_log" ("document_id", "accessed_by_id", decision, reason)
         VALUES ($1, $2, $3, $4)`,
        [doc.id, caller.memberId, access.granted ? "GRANTED" : "DENIED", access.reason]
      );
    });

    if (!access.granted) {
      throw new HttpsError("permission-denied", access.reason);
    }

    // Confirms the file is retrievable now (fails fast rather than handing back a URL that
    // 404s); the actual byte stream is served by app/api/documents/[id]/route.ts, which
    // re-derives this same access decision rather than trusting a cached URL.
    await streamDriveFile(doc.driveFileId);

    return { downloadUrl: `/api/documents/${doc.id}` };
  }
);
