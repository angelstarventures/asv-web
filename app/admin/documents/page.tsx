import { listCompanies, listAllMembers, listAllDocuments, listAllTaxDocuments } from "@/lib/dataconnect/client";
import { AdminDocumentsFlow } from "@/components/AdminDocumentsFlow";
import { AdminDocumentUploadForm } from "@/components/AdminDocumentUploadForm";
import { AdminTaxDocumentUploadForm } from "@/components/AdminTaxDocumentUploadForm";
import { MemberDocumentsTable, type MemberDocumentCompanyGroup } from "@/components/MemberDocumentsTable";
import { TaxDocumentsTable, type TaxDocumentMemberGroup } from "@/components/TaxDocumentsTable";
import { DocumentsTabs } from "@/components/DocumentsTabs";
import { SyncDocumentsFromDriveButton } from "@/components/SyncDocumentsFromDriveButton";

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
  const [{ companies }, { members }, { documents }, { taxDocuments }] = await Promise.all([
    listCompanies(),
    listAllMembers(),
    listAllDocuments(),
    listAllTaxDocuments(),
  ]);

  const byCompany = new Map<string, MemberDocumentCompanyGroup>();
  for (const doc of documents) {
    const group = byCompany.get(doc.company.id) ?? {
      companyId: doc.company.id,
      companyName: doc.company.tradeName ?? doc.company.name,
      documents: [],
    };
    // Admins always pass canViewDocument — every row is always shown, unlike the member view.
    group.documents.push({
      id: doc.id,
      label: doc.filename ?? DOC_TYPE_LABELS[doc.docType] ?? doc.docType,
      uploadedAt: doc.uploadedAt,
      canAccess: true,
    });
    byCompany.set(doc.company.id, group);
  }
  const documentGroups = [...byCompany.values()].sort((a, b) => a.companyName.localeCompare(b.companyName));

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
            <AdminDocumentUploadForm companies={companies} />
            <SyncDocumentsFromDriveButton />
            {documentGroups.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-500">No documents have been uploaded yet.</p>
            ) : (
              <MemberDocumentsTable groups={documentGroups} />
            )}
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
