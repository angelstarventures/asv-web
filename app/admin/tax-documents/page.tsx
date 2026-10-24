import { listAllMembers, listAllTaxDocuments } from "@/lib/dataconnect/client";
import { AdminTaxDocumentUploadForm } from "@/components/AdminTaxDocumentUploadForm";
import { TaxDocumentsTable, type TaxDocumentMemberGroup } from "@/components/TaxDocumentsTable";

export const dynamic = "force-dynamic";
export default async function AdminTaxDocumentsPage() {
  const [{ members }, { taxDocuments }] = await Promise.all([listAllMembers(), listAllTaxDocuments()]);
  const byMember = new Map<string, TaxDocumentMemberGroup>();
  for (const doc of taxDocuments) {
    const group = byMember.get(doc.member.id) ?? { memberId: doc.member.id, memberName: doc.member.displayName, documents: [] };
    group.documents.push({ id: doc.id, label: doc.taxYear != null ? `${doc.filename} (${doc.taxYear})` : doc.filename, uploadedAt: doc.uploadedAt });
    byMember.set(doc.member.id, group);
  }
  const groups = [...byMember.values()].sort((a, b) => a.memberName.localeCompare(b.memberName));
  return (
    <div className="flex flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Tax Documents</h1>
      <AdminTaxDocumentUploadForm members={members} />
      <TaxDocumentsTable groups={groups} />
    </div>
  );
}
