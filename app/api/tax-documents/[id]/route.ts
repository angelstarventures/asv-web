import { Readable } from "node:stream";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentMember } from "@/lib/auth/currentMember";
import { getTaxDocumentById } from "@/lib/dataconnect/client";
import { getMyOrganizationMembership } from "@/lib/functions/organizationMembers";
import { streamDriveFile } from "@/lib/serverDrive";

// Mirrors app/api/documents/[id]/route.ts's shape, but with a much simpler access rule: a tax
// document is confidential to the one member it belongs to, plus admins — no allocation-based
// matrix applies here (see schema.gql's own comment on TaxDocument).
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const member = await getCurrentMember();
  if (!member) {
    return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  }

  const { id } = await params;
  const { taxDocument } = await getTaxDocumentById({ id });
  if (!taxDocument) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const isOwnDocument = taxDocument.member.id === member.memberId;
  // Admin callers without org membership are denied (org-gate rollout).
const isOrgMember = member.role === "admin"
  ? (await getMyOrganizationMembership()).hasMembership
  : true;
const isAdmin = (member.role === "admin" ? isOrgMember : false) || member.role === "site_admin" || member.role === "dev_site_admin";
  if (!isOwnDocument && !isAdmin) {
    return NextResponse.json({ error: "You don't have access to this document." }, { status: 403 });
  }

  const { stream, mimeType, name } = await streamDriveFile(taxDocument.driveFileId);
  const filename = taxDocument.filename ?? name;

  return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `inline; filename="${filename.replace(/"/g, "")}"`,
    },
  });
}
