import { listCompanies, listCompanyDdLeads, listAllMembers } from "@/lib/dataconnect/client";
import { AdminCompanyLogoUpload } from "@/components/AdminCompanyLogoUpload";
import { AdminCompanyDdLead } from "@/components/AdminCompanyDdLead";
import { AdminCompanyCeoInfo } from "@/components/AdminCompanyCeoInfo";
import { AdminCompanyMemberAssignment } from "@/components/AdminCompanyMemberAssignment";
import { getCurrentMember } from "@/lib/auth/currentMember";

export const dynamic = "force-dynamic";

export default async function AdminCompaniesPage() {
  const [current, { companies }, { companies: ddLeads }, { members }] = await Promise.all([
    getCurrentMember(),
    listCompanies(),
    listCompanyDdLeads(),
    listAllMembers(),
  ]);
  const isDevSiteAdmin = current?.role === "dev_site_admin";
  const ddLeadByCompanyId = new Map(ddLeads.map((c) => [c.id, c.ddLead?.id ?? null]));
  const ceoInfoByCompanyId = new Map(ddLeads.map((c) => [c.id, { ceoName: c.ceoName ?? null, ceoContact: c.ceoContact ?? null }]));

  return (
    <div className="flex flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Companies</h1>
      <div className="flex flex-col gap-3">
        {[...companies]
          .sort((a, b) => (a.tradeName ?? a.name).localeCompare(b.tradeName ?? b.name))
          .map((c) => {
          const ceoInfo = ceoInfoByCompanyId.get(c.id) ?? { ceoName: null, ceoContact: null };
          return (
            <div key={c.id} className="flex flex-col gap-3 border-b border-zinc-200 pb-3 dark:border-zinc-800">
              <AdminCompanyLogoUpload companyId={c.id} name={c.tradeName ?? c.name} currentLogoUrl={c.logoUrl ?? null} />
              <AdminCompanyCeoInfo companyId={c.id} ceoName={ceoInfo.ceoName} ceoContact={ceoInfo.ceoContact} />
              <AdminCompanyDdLead companyId={c.id} ddLeadId={ddLeadByCompanyId.get(c.id) ?? null} members={members} />
              {isDevSiteAdmin && <AdminCompanyMemberAssignment companyId={c.id} members={members} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
