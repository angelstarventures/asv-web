import { google } from "googleapis";
import { Readable } from "node:stream";

// V1 streams file bytes through the Function rather than mutating Drive ACLs (the PRD
// explicitly rejected native Drive sharing to avoid syncing Google Groups on every
// allocation change — plan §3). Auth uses a dedicated service account with domain-wide
// delegation scoped to the fixed ASV Drive folder structure, never end-user OAuth.

function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  return google.drive({ version: "v3", auth });
}

export async function streamDriveFile(fileId: string): Promise<{
  stream: Readable;
  mimeType: string;
  name: string;
}> {
  const drive = getDriveClient();
  const meta = await drive.files.get({ fileId, fields: "name,mimeType" });
  const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "stream" });
  return {
    stream: res.data as unknown as Readable,
    mimeType: meta.data.mimeType ?? "application/octet-stream",
    name: meta.data.name ?? fileId,
  };
}

export interface DriveUploadResult {
  driveFileId: string;
  driveUrl: string;
}

// Called by app/admin/ledger/*'s DocumentDropzone via a backend endpoint — the frontend
// never touches Drive credentials (plan §4).
export async function uploadToDrive(
  parentFolderId: string,
  filename: string,
  mimeType: string,
  content: Buffer
): Promise<DriveUploadResult> {
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });
  const drive = google.drive({ version: "v3", auth });

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
