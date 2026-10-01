import { onCall, HttpsError } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { query } from "../lib/dataconnect-admin";
import { findFolder, findOrCreateFolder, listFilesInFolder, uploadDealFile, driveOAuthClientSecret, driveOAuthRefreshToken } from "../lib/dealsDrive";

// Creates the Drive folder structure for ledger entries that don't have a
// corresponding folder yet. For rounds: Company/Rounds/RoundName.
// For updates: Company/Updates/ with a placeholder "Update - MMDDYYYY.pdf" file.
// Read-only against the DB (never updates ledger detail records — that's
// documentsSyncFromDrive's job) and additive against Drive (never deletes).
export interface DocumentsSyncToDriveInput {
  companyId?: string; // omit to process all companies
}

export interface DocumentsSyncToDriveOutput {
  foldersCreated: number;
  filesCreated: number;
  companiesProcessed: number;
}

export const documentsSyncToDrive = onCall<DocumentsSyncToDriveInput, Promise<DocumentsSyncToDriveOutput>>(
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

    // Query all round detail records + their company names in one pass.
    const roundDetails = await query<{
      id: string;
      ledgerEntryId: string;
      companyId: string;
      companyName: string;
      roundName: string;
      driveFolderId: string | null;
      type: string;
    }>(`
      SELECT
        prd.id, prd.ledger_entry_id AS "ledgerEntryId",
        c.id AS "companyId", COALESCE(c.trade_name, c.name) AS "companyName",
        prd.round_name AS "roundName", prd.drive_folder_id AS "driveFolderId",
        'PARTICIPATING_PRICED_ROUND' AS type
      FROM priced_round_detail prd
      JOIN ledger_entry le ON le.id = prd.ledger_entry_id
      JOIN company c ON c.id = le.company_id
      WHERE prd.drive_folder_id IS NULL
        AND le.scenario = 'OPTIMISTIC'
        AND ($1::uuid IS NULL OR le.company_id = $1::uuid)
      UNION ALL
      SELECT
        srd.id, srd.ledger_entry_id,
        c.id, COALESCE(c.trade_name, c.name),
        srd.round_name AS "roundName", srd.drive_folder_id,
        'PARTICIPATING_SAFE_ROUND'
      FROM safe_round_detail srd
      JOIN ledger_entry le ON le.id = srd.ledger_entry_id
      JOIN company c ON c.id = le.company_id
      WHERE srd.drive_folder_id IS NULL
        AND le.scenario = 'OPTIMISTIC'
        AND ($1::uuid IS NULL OR le.company_id = $1::uuid)
      UNION ALL
      SELECT
        nrd.id, nrd.ledger_entry_id,
        c.id, COALESCE(c.trade_name, c.name),
        nrd.round_name, nrd.drive_folder_id,
        'NON_PARTICIPATING_ROUND'
      FROM non_participating_round_detail nrd
      JOIN ledger_entry le ON le.id = nrd.ledger_entry_id
      JOIN company c ON c.id = le.company_id
      WHERE nrd.drive_folder_id IS NULL
        AND le.scenario = 'OPTIMISTIC'
        AND ($1::uuid IS NULL OR le.company_id = $1::uuid)
    `, [companyId ?? null]);

    // Query all update details without a drive file id, joined with company name + event date.
    const updateDetails = await query<{
      id: string;
      ledgerEntryId: string;
      companyId: string;
      companyName: string;
      eventDate: string;
      driveFileId: string | null;
    }>(`
      SELECT
        cud.id, cud.ledger_entry_id AS "ledgerEntryId",
        c.id AS "companyId", COALESCE(c.trade_name, c.name) AS "companyName",
        le.event_date::text AS "eventDate", cud.drive_file_id AS "driveFileId"
      FROM company_update_detail cud
      JOIN ledger_entry le ON le.id = cud.ledger_entry_id
      JOIN company c ON c.id = le.company_id
      WHERE cud.drive_file_id IS NULL
        AND le.scenario = 'OPTIMISTIC'
        AND ($1::uuid IS NULL OR le.company_id = $1::uuid)
    `, [companyId ?? null]);

    let foldersCreated = 0;
    let filesCreated = 0;

    // Assign sequential suffixes for duplicate folder names per company
    // (e.g. second "SAFE" round → "SAFE-2", third → "SAFE-3").
    const usedFolderNames = new Map<string, Set<string>>();

    function assignFolderName(companyId: string, baseName: string): string {
      const used = usedFolderNames.get(companyId) ?? new Set();
      let candidate = baseName;
      let suffix = 1;
      while (used.has(candidate)) {
        suffix++;
        candidate = `${baseName}-${suffix}`;
      }
      used.add(candidate);
      usedFolderNames.set(companyId, used);
      return candidate;
    }

    // --- Process rounds: create Company/Rounds/RoundName folder ---
    for (const detail of roundDetails) {
      const companyFolderId = await findOrCreateFolder(rootFolderId, detail.companyName);
      const roundsFolderId = await findOrCreateFolder(companyFolderId, "Rounds");
      const folderName = assignFolderName(detail.companyId, detail.roundName);
      await findOrCreateFolder(roundsFolderId, folderName);
      foldersCreated++;
    }

    // --- Process updates: create Company/Updates folder + placeholder file ---
    for (const detail of updateDetails) {
      const companyFolderId = await findOrCreateFolder(rootFolderId, detail.companyName);
      const updatesFolderId = await findOrCreateFolder(companyFolderId, "Updates");

      const eventDate = new Date(detail.eventDate);
      const mm = String(eventDate.getMonth() + 1).padStart(2, "0");
      const dd = String(eventDate.getDate()).padStart(2, "0");
      const yyyy = eventDate.getFullYear();
      const placeholderFilename = `Update - ${mm}${dd}${yyyy}.pdf`;

      // Check if file already exists in the Updates folder (prevents duplicates on re-runs)
      const existingFiles = await listFilesInFolder(updatesFolderId);
      if (existingFiles.some((f) => f.name === placeholderFilename)) {
        continue;
      }

      const placeholderContent = Buffer.from(
        `Placeholder for company update on ${detail.eventDate}\n\n` +
        `Replace this file with the actual update document.\n`
      );

      try {
        await uploadDealFile(updatesFolderId, placeholderFilename, "application/pdf", placeholderContent);
        filesCreated++;
      } catch {
        // File may already exist (same name) — skip silently
      }
    }

    return {
      foldersCreated,
      filesCreated,
      companiesProcessed: companies.length,
    };
  }
);