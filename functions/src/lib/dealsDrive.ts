import { google } from "googleapis";
import { Readable } from "node:stream";
import { defineSecret } from "firebase-functions/params";

// Deal-flow-only Drive client — deliberately separate from lib/drive.ts (used by the admin
// ledger-document intake flow) so these OAuth credentials and this destination folder are
// never reused for anything else. Auth is real end-user OAuth2 for a personal (non-Workspace)
// Google account — a bare service account has no Drive storage quota of its own, and Shared
// Drives (which have real quota) require Google Workspace, which ASV doesn't have. The refresh
// token was obtained once via scripts/get-drive-oauth-token.js; calls made with it act AS that
// real account, using its real personal storage quota. Scope is drive.file only (least
// privilege) — read/write only for files/folders this app creates itself.
export const driveOAuthClientSecret = defineSecret("DRIVE_OAUTH_CLIENT_SECRET");
export const driveOAuthRefreshToken = defineSecret("DRIVE_OAUTH_REFRESH_TOKEN");

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
