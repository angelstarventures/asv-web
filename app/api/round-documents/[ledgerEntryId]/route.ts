import { Readable } from "node:stream";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentMember } from "@/lib/auth/currentMember";
import { getRoundDocuments, RoundDocumentError } from "@/lib/roundDocuments";
import { streamDriveFile } from "@/lib/serverDrive";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ ledgerEntryId: string }> }) {
  const headers = { "Cache-Control": "private, no-store" };
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: "Sign-in required." }, { status: 401, headers });
  if (member.status !== "active" || member.mustChangePassword) {
    return NextResponse.json({ error: "Your account cannot access documents yet." }, { status: 403, headers });
  }
  const { ledgerEntryId } = await params;
  // Data Connect serializes UUIDs without delimiters. Accept that wire format as
  // well as conventional hyphenated UUIDs used by SQL tools and older links.
  if (!/^(?:[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(ledgerEntryId)) {
    return NextResponse.json({ error: "Invalid round." }, { status: 400, headers });
  }
  try {
    const files = await getRoundDocuments(ledgerEntryId, member);
    const fileId = request.nextUrl.searchParams.get("fileId");
    if (fileId) {
      // A guessed Drive ID is never sufficient: re-list the stored round folder and
      // re-check document permissions on every file request, including new-tab links.
      const file = files.find((item) => item.id === fileId);
      if (!file) return NextResponse.json({ error: "Document not found or access denied." }, { status: 404, headers });
      const { stream, mimeType, name } = await streamDriveFile(file.id);
      const inline = ["application/pdf", "image/png", "image/jpeg", "image/gif", "image/webp", "text/plain"].includes(mimeType);
      return new NextResponse(Readable.toWeb(stream) as ReadableStream, { headers: {
        ...headers,
        "Content-Type": mimeType,
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(name).replace(/'/g, "%27")}`,
        "X-Content-Type-Options": "nosniff",
      } });
    }
    return NextResponse.json({ documents: files.map((file) => ({
      name: file.name,
      url: `/api/round-documents/${ledgerEntryId}?fileId=${encodeURIComponent(file.id)}`,
    })) }, { headers });
  } catch (err) {
    if (err instanceof RoundDocumentError) return NextResponse.json({ error: err.message }, { status: err.status, headers });
    console.error("Could not load round documents", err);
    return NextResponse.json({ error: "Could not load round documents. Please try again." }, { status: 502, headers });
  }
}
