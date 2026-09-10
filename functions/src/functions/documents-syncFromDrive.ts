import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { withTransaction, query } from "../lib/dataconnect-admin";
import { findFolder, listFilesInFolder, driveOAuthClientSecret, driveOAuthRefreshToken } from "../lib/dealsDrive";

// "Pull from what's there" — reconciles whatever's actually sitting in each company's
// Investments/{Company}/ folder (and its Updates/ subfolder) against the `document` table,
// registering any file the app didn't already know about. Read-only against Drive (findFolder,
// not findOrCreateFolder — a company with no folder yet simply has nothing to sync) and additive
// against the DB (never deletes a Document row for a file that's since been removed from Drive).
// Files directly in the company folder default to DATA_ROOM (same allocation-gated visibility as
// COMPANY_UPDATE_DOC — a safer unknown-type default than a publicly-visible type like PITCH_DECK);
// files in the Updates subfolder are COMPANY_UPDATE_DOC, matching where the app itself now
// uploads company updates.

export interface DocumentsSyncFromDriveInput {
  companyId?: string; // omit to sync every company
}

export interface DocumentsSyncFromDriveOutput {
  imported: number;
  alreadyTracked: number;
  companiesScanned: number;
}

export const documentsSyncFromDrive = onCall<DocumentsSyncFromDriveInput, Promise<DocumentsSyncFromDriveOutput>>(
  { secrets: [driveOAuthClientSecret, driveOAuthRefreshToken], timeoutSeconds: 300 },
  async (request) => {
    const caller = await requireAdmin(request);
    const { companyId } = request.data ?? {};

    const rootFolderId = process.env.COMPANY_UPDATES_DRIVE_ROOT_FOLDER_ID;
    if (!rootFolderId) {
      throw new HttpsError("failed-precondition", "COMPANY_UPDATES_DRIVE_ROOT_FOLDER_ID is not configured.");
    }

    const companies = companyId
      ? await query<{ id: string; name: string }>(`SELECT id, name FROM "company" WHERE id = $1`, [companyId])
      : await query<{ id: string; name: string }>(`SELECT id, name FROM "company"`);
    if (companyId && companies.length === 0) {
      throw new HttpsError("not-found", `No company row for id "${companyId}".`);
    }

    const existingIds = await query<{ driveFileId: string }>(`SELECT "drive_file_id" AS "driveFileId" FROM "document"`);
    const knownDriveFileIds = new Set(existingIds.map((r) => r.driveFileId));

    let imported = 0;
    let alreadyTracked = 0;

    for (const company of companies) {
      const companyFolderId = await findFolder(rootFolderId, company.name);
      if (!companyFolderId) continue;

      const rootFiles = await listFilesInFolder(companyFolderId);
      const updatesFolderId = await findFolder(companyFolderId, "Updates");
      const updateFiles = updatesFolderId ? await listFilesInFolder(updatesFolderId) : [];

      const candidates = [
        ...rootFiles.map((f) => ({ ...f, docType: "DATA_ROOM" as const })),
        ...updateFiles.map((f) => ({ ...f, docType: "COMPANY_UPDATE_DOC" as const })),
      ];

      for (const file of candidates) {
        if (knownDriveFileIds.has(file.driveFileId)) {
          alreadyTracked++;
          continue;
        }
        await withTransaction(async (client) => {
          await client.query(
            `INSERT INTO "document" ("drive_file_id", "drive_url", filename, "doc_type", "company_id", "uploaded_by_id", "uploaded_at")
             VALUES ($1, $2, $3, $4, $5, $6, now())`,
            [file.driveFileId, file.webViewLink, file.name, file.docType, company.id, caller.memberId]
          );
        });
        knownDriveFileIds.add(file.driveFileId);
        imported++;
      }
    }

    return { imported, alreadyTracked, companiesScanned: companies.length };
  }
);
