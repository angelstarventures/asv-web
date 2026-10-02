import { google } from "googleapis";
import { Readable } from "node:stream";
import { defineSecret } from "firebase-functions/params";
import { tenantConfig } from "./tenantConfig";

// OAuth-delegated Drive client for the personal (non-Workspace) Google account that actually
// has real Drive storage quota — a bare service account (lib/drive.ts's client, used for the
// admin ledger-document intake flow's reads) has NO storage quota of its own outside a Shared
// Drive, and Shared Drives require Google Workspace, which ASV doesn't have (confirmed
// empirically: uploadToDrive fails with "storageQuotaExceeded" against a plain personal-Drive
// folder). This same OAuth identity now backs two separate destination folders — the deal-flow
// pitch intake (DEALS_DRIVE_ROOT_FOLDER_ID) and company-update document sharing
// (COMPANY_UPDATES_DRIVE_ROOT_FOLDER_ID) — since it's the only account in this whole system with
// real quota to write into, not because the two features share any other credentials/state. The
// refresh token was obtained once via scripts/get-drive-oauth-token.js; calls made with it act
// AS that real account, using its real personal storage quota. Scope is the full `drive` scope
// (not `drive.file`), because `drive.file` only lets the app see files/folders it created itself
// — the sync-from-Drive flow needs to discover files placed directly into shared company folders
// via the Drive web UI (confirmed empirically, see scripts/get-drive-oauth-token.js).
export const driveOAuthClientSecret = defineSecret("DRIVE_OAUTH_CLIENT_SECRET");
export const driveOAuthRefreshToken = defineSecret("DRIVE_OAUTH_REFRESH_TOKEN");

// The Cloud Functions runtime's own default service account — lib/drive.ts's `streamDriveFile`
// (used by documents-getAccessUrl.ts to serve every Document row's download, regardless of
// which upload path created it) reads as this identity, so any folder a NEW company subfolder
// is created in via the OAuth account below must also grant this account view access, or the
// existing member-facing Documents view/download flow can't read files placed here. Sourced from
// tenant config so a new deployment with a different GCP project uses its own compute email.
const DRIVE_SERVICE_ACCOUNT_EMAIL = tenantConfig.driveServiceAccountEmail;

function getDealsDriveClient() {
  const clientId = process.env.DRIVE_OAUTH_CLIENT_ID;
  if (!clientId) {
    throw new Error("DRIVE_OAUTH_CLIENT_ID is not set.");
  }
  const auth = new google.auth.OAuth2(clientId, driveOAuthClientSecret.value());
  auth.setCredentials({ refresh_token: driveOAuthRefreshToken.value() });
  return google.drive({ version: "v3", auth });
}

export interface DriveUploadResult {
  driveFileId: string;
  driveUrl: string;
}

// Creates one subfolder per pitch, named after the company, directly under
// DEALS_DRIVE_ROOT_FOLDER_ID — never reused across pitches, even for a repeat company name.
export async function createDealFolder(parentFolderId: string, companyName: string): Promise<DriveUploadResult> {
  const drive = getDealsDriveClient();

  const res = await drive.files.create({
    requestBody: {
      name: companyName,
      parents: [parentFolderId],
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id, webViewLink",
  });

  if (!res.data.id) {
    throw new Error("Drive folder creation did not return a file id");
  }
  return { driveFileId: res.data.id, driveUrl: res.data.webViewLink ?? "" };
}

// Used by documentsShareCompanyUpdate to keep one subfolder per company under a fixed shared
// root (COMPANY_UPDATES_DRIVE_ROOT_FOLDER_ID) — unlike createDealFolder above (always creates a
// fresh folder per pitch), this reuses an existing company folder across every future update.
// A newly-created folder is also shared (Viewer) with the Drive service account, so
// streamDriveFile can still read files placed inside it later.
export async function findOrCreateFolder(parentFolderId: string, folderName: string): Promise<string> {
  const drive = getDealsDriveClient();

  const escapedName = folderName.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const existing = await drive.files.list({
    q: `'${parentFolderId}' in parents and name = '${escapedName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id)",
    pageSize: 1,
  });
  const existingId = existing.data.files?.[0]?.id;
  if (existingId) return existingId;

  const created = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    },
    fields: "id",
  });
  if (!created.data.id) {
    throw new Error("Drive folder creation did not return a file id");
  }

  await drive.permissions.create({
    fileId: created.data.id,
    sendNotificationEmail: false,
    requestBody: { role: "reader", type: "user", emailAddress: DRIVE_SERVICE_ACCOUNT_EMAIL },
  });

  return created.data.id;
}

// Read-only lookup — unlike findOrCreateFolder, never creates the folder if it's missing.
// Used by the "sync from Drive" flow, where a company with no folder yet simply has nothing
// to sync rather than getting an empty folder created for it.
export async function findFolder(parentFolderId: string, folderName: string): Promise<string | null> {
  const drive = getDealsDriveClient();
  const escapedName = folderName.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const existing = await drive.files.list({
    q: `'${parentFolderId}' in parents and name = '${escapedName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id)",
    pageSize: 1,
  });
  return existing.data.files?.[0]?.id ?? null;
}

export interface DriveFileListing {
  driveFileId: string;
  name: string;
  mimeType: string;
  webViewLink: string;
}

export interface DriveFolderListing {
  driveFileId: string;
  folderName: string;
}

// Direct (non-folder) file children of a folder — backs the "sync from Drive" flow, which
// reconciles whatever's actually sitting in each company's folder against the `document` table
// rather than only ever knowing about files uploaded through the app itself.
// Handles pagination via nextPageToken (folders with >200 files).
export async function listFilesInFolder(folderId: string): Promise<DriveFileListing[]> {
  const drive = getDealsDriveClient();
  const allFiles: DriveFileListing[] = [];
  let pageToken: string | undefined;
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id, name, mimeType, webViewLink), nextPageToken",
      pageSize: 200,
      pageToken,
    });
    for (const f of res.data.files ?? []) {
      allFiles.push({
        driveFileId: f.id!,
        name: f.name ?? "Untitled",
        mimeType: f.mimeType ?? "application/octet-stream",
        webViewLink: f.webViewLink ?? "",
      });
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return allFiles;
}

// Immediate (non-recursive) sub-folders of a folder — used by the sync-from-Drive flow to
// discover files organised into sub-folders the app didn't create itself.
export async function listSubFolders(folderId: string): Promise<DriveFolderListing[]> {
  const drive = getDealsDriveClient();
  const allFolders: DriveFolderListing[] = [];
  let pageToken: string | undefined;
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id, name), nextPageToken",
      pageSize: 200,
      pageToken,
    });
    for (const f of res.data.files ?? []) {
      allFolders.push({
        driveFileId: f.id!,
        folderName: f.name ?? "Untitled",
      });
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return allFolders;
}

export async function deleteDealFolder(driveFolderId: string): Promise<void> {
  const drive = getDealsDriveClient();
  await drive.files.delete({ fileId: driveFolderId });
}

export async function uploadDealFile(
  parentFolderId: string,
  filename: string,
  mimeType: string,
  content: Buffer
): Promise<DriveUploadResult> {
  const drive = getDealsDriveClient();

  const res = await drive.files.create({
    requestBody: { name: filename, parents: [parentFolderId] },
    media: { mimeType, body: Readable.from(content) },
    fields: "id, webViewLink",
  });

  if (!res.data.id) {
    throw new Error("Drive upload did not return a file id");
  }
  return { driveFileId: res.data.id, driveUrl: res.data.webViewLink ?? "" };
}
