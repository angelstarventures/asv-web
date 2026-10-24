import { AdminStartupDocumentsView } from "@/lib/adminStartupDocumentsView";

export const dynamic = "force-dynamic";
export default function AddStartupInvestmentPage() {
  return <AdminStartupDocumentsView mode="investment" />;
}
