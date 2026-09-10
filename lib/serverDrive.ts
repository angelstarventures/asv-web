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
  const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "stream" });
  return {
    stream: res.data as unknown as Readable,
    mimeType: meta.data.mimeType ?? "application/octet-stream",
    name: meta.data.name ?? fileId,
  };
}
