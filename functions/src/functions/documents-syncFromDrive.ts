import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { withTransaction, query } from "../lib/dataconnect-admin";
import { findFolder, listFilesInFolder, listSubFolders, driveOAuthClientSecret, driveOAuthRefreshToken } from "../lib/dealsDrive";

// "Pull from what's there" — reconciles whatever's actually sitting in each company's
// Investments/{Company}/ folder (and its Updates/ subfolder, plus any other sub-folders
// created directly in Drive) against the `document` table, registering any file the app
// didn't already know about. Read-only against Drive (findFolder, not findOrCreateFolder —
// a company with no folder yet simply has nothing to sync) and additive against the DB
// (never deletes a Document row for a file that's since been removed from Drive).
// Files directly in the company folder or any non-Updates sub-folder default to DATA_ROOM
// (same allocation-gated visibility as COMPANY_UPDATE_DOC — a safer unknown-type default
// than a publicly-visible type like PITCH_DECK); files in the Updates subfolder are
// COMPANY_UPDATE_DOC, matching where the app itself now uploads company updates.

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

      // Always scan root files + the known "Updates" subfolder (same as before).
      const rootFiles = await listFilesInFolder(companyFolderId);
      const updatesFolderId = await findFolder(companyFolderId, "Updates");
      const updateFiles = updatesFolderId ? await listFilesInFolder(updatesFolderId) : [];

      const candidates = [
        ...rootFiles.map((f) => ({ ...f, docType: "DATA_ROOM" as const })),
        ...updateFiles.map((f) => ({ ...f, docType: "COMPANY_UPDATE_DOC" as const })),
      ];

      // Also scan any other sub-folders directly in the company folder (ones the app
      // didn't create — e.g. "Legal", "Financials", etc.) — files there default to
      // DATA_ROOM, the safest allocation-gated type.
      const subFolders = (await listSubFolders(companyFolderId)).filter(
        (s) => s.folderName !== "Updates"
      );
      for (const sub of subFolders) {
        const subFiles = await listFilesInFolder(sub.driveFileId);
        candidates.push(...subFiles.map((f) => ({ ...f, docType: "DATA_ROOM" as const })));
      }

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

    // --- Phase 2: Update ledger detail records from Drive folder structure ---
    // For rounds without driveFolderId, find the Company/Rounds/RoundName folder.
    // For updates without driveFileId, find the matching "Update - MMDDYYYY.*" file.
    {
      const roundDetails = await query<{
        id: string; ledgerEntryId: string; companyId: string; companyName: string;
        roundName: string; driveFolderId: string | null; type: string;
      }>(`
        SELECT prd.id, prd.ledger_entry_id AS "ledgerEntryId",
               c.id AS "companyId", COALESCE(c.trade_name, c.name) AS "companyName",
               prd.round_name AS "roundName", prd.drive_folder_id AS "driveFolderId",
               'PARTICIPATING_PRICED_ROUND' AS type
        FROM priced_round_detail prd
        JOIN ledger_entry le ON le.id = prd.ledger_entry_id
        JOIN company c ON c.id = le.company_id
        WHERE prd.drive_folder_id IS NULL
          AND ($1::uuid IS NULL OR le.company_id = $1::uuid)
        UNION ALL
        SELECT srd.id, srd.ledger_entry_id, c.id, COALESCE(c.trade_name, c.name),
               srd.round_name AS "roundName", srd.drive_folder_id, 'PARTICIPATING_SAFE_ROUND'
        FROM safe_round_detail srd
        JOIN ledger_entry le ON le.id = srd.ledger_entry_id
        JOIN company c ON c.id = le.company_id
        WHERE srd.drive_folder_id IS NULL
          AND ($1::uuid IS NULL OR le.company_id = $1::uuid)
        UNION ALL
        SELECT nrd.id, nrd.ledger_entry_id, c.id, COALESCE(c.trade_name, c.name),
               nrd.round_name, nrd.drive_folder_id, 'NON_PARTICIPATING_ROUND'
        FROM non_participating_round_detail nrd
        JOIN ledger_entry le ON le.id = nrd.ledger_entry_id
        JOIN company c ON c.id = le.company_id
        WHERE nrd.drive_folder_id IS NULL
          AND ($1::uuid IS NULL OR le.company_id = $1::uuid)
      `, [companyId ?? null]);

      const updateDetails = await query<{
        id: string; ledgerEntryId: string; companyId: string;
        companyName: string; eventDate: string; driveFileId: string | null;
      }>(`
        SELECT cud.id, cud.ledger_entry_id AS "ledgerEntryId",
               c.id AS "companyId", COALESCE(c.trade_name, c.name) AS "companyName",
               le.event_date::text AS "eventDate", cud.drive_file_id AS "driveFileId"
        FROM company_update_detail cud
        JOIN ledger_entry le ON le.id = cud.ledger_entry_id
        JOIN company c ON c.id = le.company_id
        WHERE cud.drive_file_id IS NULL
          AND ($1::uuid IS NULL OR le.company_id = $1::uuid)
      `, [companyId ?? null]);

      // Process rounds: find Company/Rounds/RoundName folder and set driveFolderId.
      // Groups by (companyId, roundName, type) to deduplicate across scenarios,
      // then updates ALL scenario records for each matched folder.
      {
        const folderCountByCompany = new Map<string, Map<string, number>>(); // companyId → baseName → count seen

        function nextRoundFolderName(companyId: string, baseName: string): string {
          const companyCounts = folderCountByCompany.get(companyId) ?? new Map();
          const count = (companyCounts.get(baseName) ?? 0) + 1;
          companyCounts.set(baseName, count);
          folderCountByCompany.set(companyId, companyCounts);
          return count === 1 ? baseName : `${baseName}-${count}`;
        }

        // Group records by (companyId + roundName + type) so each unique round
        // is processed once, but all scenario copies get updated.
        type RoundKey = `${string}|${string}|${string}`;
        const byKey = new Map<RoundKey, typeof roundDetails>([]);
        for (const detail of roundDetails) {
          const key: RoundKey = `${detail.companyId}|${detail.roundName}|${detail.type}`;
          const group = byKey.get(key) ?? [];
          group.push(detail);
          byKey.set(key, group);
        }

        for (const group of byKey.values()) {
          const first = group[0];
          const companyFolderId = await findFolder(rootFolderId, first.companyName);
          if (!companyFolderId) continue;
          const roundsFolderId = await findFolder(companyFolderId, "Rounds");
          if (!roundsFolderId) continue;

          const folderName = nextRoundFolderName(first.companyId, first.roundName);
          const roundFolderId = await findFolder(roundsFolderId, folderName);
          if (!roundFolderId) continue;

          // Update ALL scenario copies of this round with the same folder ID.
          const tableName =
            first.type === "PARTICIPATING_PRICED_ROUND" ? "priced_round_detail" :
            first.type === "PARTICIPATING_SAFE_ROUND" ? "safe_round_detail" :
            "non_participating_round_detail";
          const ids = group.map((d) => d.id);
          await withTransaction(async (client) => {
            await client.query(
              `UPDATE "${tableName}" SET drive_folder_id = $1 WHERE id = ANY($2::uuid[])`,
              [roundFolderId, ids]
            );
          });
        }
      }

      // Process updates: find "Update - MMDDYYYY.*" file in Company/Updates/ and set driveFileId.
      // Groups by (companyId, eventDate) to deduplicate across scenarios.
      {
        type UpdateKey = `${string}|${string}`;
        const updatesByKey = new Map<UpdateKey, typeof updateDetails>([]);
        for (const detail of updateDetails) {
          const key: UpdateKey = `${detail.companyId}|${detail.eventDate}`;
          const group = updatesByKey.get(key) ?? [];
          group.push(detail);
          updatesByKey.set(key, group);
        }

        for (const group of updatesByKey.values()) {
          const first = group[0];
          const companyFolderId = await findFolder(rootFolderId, first.companyName);
          if (!companyFolderId) continue;
          const updatesFolderId = await findFolder(companyFolderId, "Updates");
          if (!updatesFolderId) continue;

          const eventDate = new Date(first.eventDate);
          const mm = String(eventDate.getMonth() + 1).padStart(2, "0");
          const dd = String(eventDate.getDate()).padStart(2, "0");
          const yyyy = eventDate.getFullYear();
          const prefix = `Update - ${mm}${dd}${yyyy}`;

          const files = await listFilesInFolder(updatesFolderId);
          const match = files.find((f) => f.name.startsWith(prefix));
          if (!match) continue;

          // Update ALL scenario copies with the same file ID.
          const ids = group.map((d) => d.id);
          await withTransaction(async (client) => {
            await client.query(
              `UPDATE company_update_detail SET drive_file_id = $1, drive_url = $2 WHERE id = ANY($3::uuid[])`,
              [match.driveFileId, match.webViewLink, ids]
            );
          });
        }
      }
    }

    return { imported, alreadyTracked, companiesScanned: companies.length };
  }
);
