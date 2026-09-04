import { google } from "googleapis";
import { Readable } from "node:stream";
import { defineSecret } from "firebase-functions/params";

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
// AS that real account, using its real personal storage quota. Scope is drive.file only (least
// privilege) — read/write only for files/folders this app creates itself.
export const driveOAuthClientSecret = defineSecret("DRIVE_OAUTH_CLIENT_SECRET");
export const driveOAuthRefreshToken = defineSecret("DRIVE_OAUTH_REFRESH_TOKEN");

// The Cloud Functions runtime's own default service account — lib/drive.ts's `streamDriveFile`
// (used by documents-getAccessUrl.ts to serve every Document row's download, regardless of
// which upload path created it) reads as this identity, so any folder a NEW company subfolder
// is created in via the OAuth account below must also grant this account view access, or the
// existing member-facing Documents view/download flow can't read files placed here.
const DRIVE_SERVICE_ACCOUNT_EMAIL = "345219246308-compute@developer.gserviceaccount.com";

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
