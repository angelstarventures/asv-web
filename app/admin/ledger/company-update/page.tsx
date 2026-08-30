import { listCompanies } from "@/lib/dataconnect/client";
import { CompanyUpdateForm } from "@/components/CompanyUpdateForm";

// Health/trajectory/highlights form, with an optional per-scenario Internal_ValuationAssessment
// sub-form (plan §4).
export const dynamic = "force-dynamic";

export default async function CompanyUpdatePage() {
  const { companies } = await listCompanies();

  return (
    <div className="flex flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Company update</h1>
      <CompanyUpdateForm companies={companies} />
    </div>
  );
}
