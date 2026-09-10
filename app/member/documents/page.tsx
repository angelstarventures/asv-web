import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth/currentMember";
import {
  listAllDocuments,
  listMemberAllocationsAllScenarios,
  listMemberValuationsAllScenarios,
  listTaxDocumentsByMember,
} from "@/lib/dataconnect/client";
import { canViewDocument } from "@/lib/auth/documentAccess";
import { MemberDocumentsTable, type MemberDocumentCompanyGroup } from "@/components/MemberDocumentsTable";
import { MemberTaxDocumentsList } from "@/components/MemberTaxDocumentsList";
import { DocumentsTabs } from "@/components/DocumentsTabs";

// Wireframe-adjacent member page (repo layout: app/member/documents) — the role+allocation
// visibility check is scenario-agnostic on purpose (plan §3/§8.5): held-company membership is
// computed across every scenario, not just the one currently selected elsewhere in the app.
export const dynamic = "force-dynamic";

const DOC_TYPE_LABELS: Record<string, string> = {
  PITCH_DECK: "Pitch deck",
  DD_REPORT: "Due diligence report",
  DATA_ROOM: "Data room",
  COMPANY_UPDATE_DOC: "Company update document",
  SPA: "SPA (deal paperwork)",
  ALLOCATION_SCHEDULE: "Allocation schedule",
};

export default async function MemberDocumentsPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/login");

  const [{ documents }, { allocations }, { memberValuations }, { taxDocuments }] = await Promise.all([
    listAllDocuments(),
    listMemberAllocationsAllScenarios(member.authUid),
    listMemberValuationsAllScenarios(member.authUid),
    listTaxDocumentsByMember({ memberId: member.memberId }),
  ]);

  const heldCompanyIds = new Set([
    ...allocations.map((a) => a.ledgerEntry.company.id),
    ...memberValuations.map((v) => v.ledgerEntry.company.id),
  ]);

  const byCompany = new Map<string, MemberDocumentCompanyGroup>();
  for (const doc of documents) {
    const group = byCompany.get(doc.company.id) ?? {
      companyId: doc.company.id,
      companyName: doc.company.tradeName ?? doc.company.name,
      documents: [],
    };
    group.documents.push({
      id: doc.id,
      // Real filename once available (every doc uploaded after the filename fix); falls back
      // to the generic per-type label for older rows uploaded before it was captured.
      label: doc.filename ?? DOC_TYPE_LABELS[doc.docType] ?? doc.docType,
      uploadedAt: doc.uploadedAt,
      canAccess: canViewDocument(member.role, doc.docType, heldCompanyIds.has(doc.company.id)),
    });
    byCompany.set(doc.company.id, group);
  }

  const groups = [...byCompany.values()].sort((a, b) => a.companyName.localeCompare(b.companyName));

  return (
    <div className="flex flex-col gap-8 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Documents</h1>

      <DocumentsTabs
        companyTab={
          groups.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-500">No documents have been uploaded yet.</p>
          ) : (
            <MemberDocumentsTable groups={groups} />
          )
        }
        taxTab={<MemberTaxDocumentsList documents={taxDocuments} />}
      />
    </div>
  );
}
