import { Readable } from "node:stream";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentMember } from "@/lib/auth/currentMember";
import { getDocumentById, listMemberAllocationsAllScenarios, listMemberValuationsAllScenarios } from "@/lib/dataconnect/client";
import { canViewDocument } from "@/lib/auth/documentAccess";
import { getMyOrganizationMembership } from "@/lib/functions/organizationMembers";
import { streamDriveFile } from "@/lib/serverDrive";

// API routes are NOT covered by proxy.ts's matcher — independently re-verifies the session,
// same posture as app/api/ledger/my-full-ledger/route.ts. Reached only after the browser
// already navigated to the URL documentsGetAccessUrl returned (which already checked access and
// wrote the audit log — see DocumentLink.tsx/lib/functions/documents.ts) — this route
// re-derives the SAME access decision independently as defense in depth (never trusts a
// documentId being reachable as proof of access) and does the actual byte streaming, which that
// callable deliberately never does.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const member = await getCurrentMember();
  if (!member) {
    return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  }

  const { id } = await params;
  const { document } = await getDocumentById({ id });
  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const [{ allocations }, { memberValuations }] = await Promise.all([
    listMemberAllocationsAllScenarios(member.authUid),
    listMemberValuationsAllScenarios(member.authUid),
  ]);
  const hasHeldAllocation =
    allocations.some((a) => a.ledgerEntry.company.id === document.company.id) ||
    memberValuations.some((v) => v.ledgerEntry.company.id === document.company.id);

  // Admin callers must also have org membership to access documents (org-gate rollout).
  // Non-admin callers don't need this check; the default isOrgMember=true preserves existing behavior.
  const isOrgMember = member.role === "admin"
    ? (await getMyOrganizationMembership()).hasMembership
    : true;

  if (!canViewDocument(member.role, document.docType, hasHeldAllocation, isOrgMember)) {
    return NextResponse.json({ error: "You don't have access to this document." }, { status: 403 });
  }

  const { stream, mimeType, name } = await streamDriveFile(document.driveFileId);
  const filename = document.filename ?? name;

  // Route Handlers speak the Web-standard Response API — the Drive API's response body is a
  // Node Readable, so it has to be adapted rather than passed straight through.
  return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `inline; filename="${filename.replace(/"/g, "")}"`,
    },
  });
}
