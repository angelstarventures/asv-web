import "server-only";
import { google } from "googleapis";
import type { Readable } from "node:stream";

// Mirrors functions/src/lib/drive.ts's streamDriveFile exactly — duplicated rather than
// imported because the Next.js app and the Cloud Functions codebase are separate deployables
// (this app can't import from functions/src). Same ADC-based service-account client, scoped
// drive.readonly; the SSR Cloud Run service runs under the same default compute service
// account as the Cloud Functions, which is why this works without any extra credential setup
// — the Drive folders this reads from are already shared with that account (see
// functions/src/lib/dealsDrive.ts's header comment on why that sharing step exists).
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
  // Native Google documents have no downloadable media body; export them for in-app viewing.
  if (["application/vnd.google-apps.document", "application/vnd.google-apps.spreadsheet", "application/vnd.google-apps.presentation", "application/vnd.google-apps.drawing"].includes(meta.data.mimeType ?? "")) {
    const res = await drive.files.export({ fileId, mimeType: "application/pdf" }, { responseType: "stream" });
    return { stream: res.data as unknown as Readable, mimeType: "application/pdf", name: `${meta.data.name ?? fileId}.pdf` };
  }
  const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "stream" });
  return {
    stream: res.data as unknown as Readable,
    mimeType: meta.data.mimeType ?? "application/octet-stream",
    name: meta.data.name ?? fileId,
  };
}

export interface DriveFolderFile {
  id: string;
  name: string;
}

export async function listDriveFolderFiles(folderId: string): Promise<DriveFolderFile[]> {
  const drive = getDriveClient();
  const files: DriveFolderFile[] = [];
  let pageToken: string | undefined;
  // IDs come from the stored ledger record, not a caller-supplied Drive folder.
  const escapedId = folderId.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  do {
    const res = await drive.files.list({
      q: `'${escapedId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder' and mimeType != 'application/vnd.google-apps.shortcut'`,
      fields: "files(id,name),nextPageToken",
      orderBy: "name_natural",
      pageSize: 100,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    for (const file of res.data.files ?? []) {
      if (file.id) files.push({ id: file.id, name: file.name ?? "Untitled document" });
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return files;
}
