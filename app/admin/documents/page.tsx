import { listCompanies, listAllMembers, listAllDocuments, listAllTaxDocuments } from "@/lib/dataconnect/client";
import { AdminDocumentsFlow } from "@/components/AdminDocumentsFlow";
import { AdminTaxDocumentUploadForm } from "@/components/AdminTaxDocumentUploadForm";
import { TaxDocumentsTable, type TaxDocumentMemberGroup } from "@/components/TaxDocumentsTable";
import { DocumentsTabs } from "@/components/DocumentsTabs";
import { SyncDocumentsPanel } from "@/components/SyncDocumentsPanel";

export const dynamic = "force-dynamic";

const DOC_TYPE_LABELS: Record<string, string> = {
  PITCH_DECK: "Pitch deck",
  DD_REPORT: "Due diligence report",
  DATA_ROOM: "Data room",
  COMPANY_UPDATE_DOC: "Company update document",
  SPA: "SPA (deal paperwork)",
  ALLOCATION_SCHEDULE: "Allocation schedule",
};

export default async function AdminDocumentsPage() {
  const [{ companies }, { members }, { taxDocuments }] = await Promise.all([
    listCompanies(),
    listAllMembers(),
    listAllTaxDocuments(),
  ]);

  const byMember = new Map<string, TaxDocumentMemberGroup>();
  for (const doc of taxDocuments) {
    const group = byMember.get(doc.member.id) ?? {
      memberId: doc.member.id,
      memberName: doc.member.displayName,
      documents: [],
    };
    group.documents.push({
      id: doc.id,
      label: doc.taxYear != null ? `${doc.filename} (${doc.taxYear})` : doc.filename,
      uploadedAt: doc.uploadedAt,
    });
    byMember.set(doc.member.id, group);
  }
  const taxDocumentGroups = [...byMember.values()].sort((a, b) => a.memberName.localeCompare(b.memberName));

  return (
    <div className="flex flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Documents</h1>

      <DocumentsTabs
        companyTab={
          <div className="flex flex-col gap-6">
            <AdminDocumentsFlow companies={companies} />
            <SyncDocumentsPanel companies={companies} />
          </div>
        }
        taxTab={
          <div className="flex flex-col gap-6">
            <AdminTaxDocumentUploadForm members={members} />
            <TaxDocumentsTable groups={taxDocumentGroups} />
          </div>
        }
      />
    </div>
  );
}
