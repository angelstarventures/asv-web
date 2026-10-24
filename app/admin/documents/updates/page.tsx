import { AdminStartupDocumentsView } from "@/lib/adminStartupDocumentsView";

export const dynamic = "force-dynamic";
export default function AddStartupUpdatesPage() {
  return <AdminStartupDocumentsView mode="updates" />;
}
