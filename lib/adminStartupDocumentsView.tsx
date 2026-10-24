import "server-only";
import { listCompanies, listAllMembers } from "@/lib/dataconnect/client";
import { AdminDocumentsFlow } from "@/components/AdminDocumentsFlow";
import { SyncDocumentsPanel } from "@/components/SyncDocumentsPanel";
import type { StartupDocumentMode } from "@/components/DocumentDropzone";

export async function AdminStartupDocumentsView({ mode }: { mode: StartupDocumentMode }) {
  const [{ companies }, { members }] = await Promise.all([listCompanies(), listAllMembers()]);
  return (
    <div className="flex flex-col gap-6 px-6 py-10">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">{mode === "investment" ? "Add Startup Investment" : "Add Startup Updates"}</h1>
        <p className="text-sm text-zinc-500">{mode === "investment"
          ? "Enter the new company's name, then upload documents or paste a message for analysis and review."
          : "Select an existing company, then upload documents or paste a message for analysis and review."}</p>
      </div>
      <AdminDocumentsFlow key={mode} mode={mode} companies={companies} members={members} />
      <SyncDocumentsPanel companies={companies} />
    </div>
  );
}
