import { listCompanies } from "@/lib/dataconnect/client";
import { AdminDocumentsFlow } from "@/components/AdminDocumentsFlow";

export const dynamic = "force-dynamic";

export default async function AdminDocumentsPage() {
  const { companies } = await listCompanies();

  return (
    <div className="flex flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Document uploads</h1>
      <AdminDocumentsFlow companies={companies} />
    </div>
  );
}
