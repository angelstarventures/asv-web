import { listCompanies } from "@/lib/dataconnect/client";
import { AdminCompanyLogoUpload } from "@/components/AdminCompanyLogoUpload";

export const dynamic = "force-dynamic";

export default async function AdminCompaniesPage() {
  const { companies } = await listCompanies();

  return (
    <div className="flex flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Companies</h1>
      <div className="flex flex-col gap-3">
        {companies.map((c) => (
          <AdminCompanyLogoUpload key={c.id} companyId={c.id} name={c.tradeName ?? c.name} currentLogoUrl={c.logoUrl ?? null} />
        ))}
      </div>
    </div>
  );
}
