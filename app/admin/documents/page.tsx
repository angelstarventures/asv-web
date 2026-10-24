import { redirect } from "next/navigation";

// Preserve existing bookmarks to the former default, existing-company document workflow.
export default function AdminDocumentsPage() {
  redirect("/admin/documents/updates");
}
