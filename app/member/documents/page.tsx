import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth/currentMember";
import {
  listAllDocuments,
  listMemberAllocationsAllScenarios,
  listMemberValuationsAllScenarios,
} from "@/lib/dataconnect/client";
import { canViewDocument } from "@/lib/auth/documentAccess";
import { DocumentLink } from "@/components/DocumentLink";

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

  const [{ documents }, { allocations }, { memberValuations }] = await Promise.all([
    listAllDocuments(),
    listMemberAllocationsAllScenarios(member.authUid),
    listMemberValuationsAllScenarios(member.authUid),
  ]);

  const heldCompanyIds = new Set([
    ...allocations.map((a) => a.ledgerEntry.company.id),
    ...memberValuations.map((v) => v.ledgerEntry.company.id),
  ]);

  const byCompany = new Map<string, { name: string; docs: typeof documents }>();
  for (const doc of documents) {
    const entry = byCompany.get(doc.company.id) ?? { name: doc.company.tradeName ?? doc.company.name, docs: [] };
    entry.docs.push(doc);
    byCompany.set(doc.company.id, entry);
  }

  return (
    <div className="flex flex-col gap-8 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Documents</h1>

      {byCompany.size === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          No documents have been uploaded yet.
        </p>
      ) : (
        [...byCompany.entries()].map(([companyId, { name, docs }]) => (
          <section key={companyId}>
            <h2 className="mb-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">{name}</h2>
            <ul className="flex flex-col gap-1">
              {docs.map((doc) => (
                <li key={doc.id}>
                  <DocumentLink
                    documentId={doc.id}
                    label={DOC_TYPE_LABELS[doc.docType] ?? doc.docType}
                    canAccess={canViewDocument(member.role, doc.docType, heldCompanyIds.has(companyId))}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
