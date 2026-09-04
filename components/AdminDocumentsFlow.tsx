"use client";

import { useState } from "react";
import { DocumentDropzone, type AnalyzedFile } from "@/components/DocumentDropzone";
import { LedgerRecordsEditor } from "@/components/LedgerRecordsEditor";
import { documentsShareCompanyUpdate, type RecordGroup } from "@/lib/functions/documents";

const SCENARIO_DISPLAY: Record<string, string> = {
  optimistic: "Optimistic",
  balanced: "Balanced",
  conservative: "Conservative",
};

function formatScenarioLabel(scenarios: string[]): string {
  const names = scenarios.map((s) => SCENARIO_DISPLAY[s] ?? s);
  return scenarios.length > 1 ? `Will be added to: ${names.join(", ")}` : names[0];
}

interface CompanyUpdateSummary {
  highlights?: string[];
  lowlights?: string[];
  upcoming_plans?: string[];
}

function buildUpdateMessage(companyName: string, summary: CompanyUpdateSummary): string {
  const section = (label: string, items?: string[]) =>
    items && items.length > 0 ? `${label}:\n${items.map((i) => `- ${i}`).join("\n")}` : null;
  return [
    `*${companyName} — company update*`,
    section("Highlights", summary.highlights),
    section("Lowlights", summary.lowlights),
    section("Upcoming", summary.upcoming_plans),
  ]
    .filter(Boolean)
    .join("\n\n");
}

// One "Send via WhatsApp" action for a visible, committed-or-not CompanyUpdate group — persists
// the originally-uploaded file(s) to Drive (lazily, only on this click; see
// documents-shareCompanyUpdate.ts) and opens WhatsApp's own chat/group picker with the summary
// and Drive link(s) pre-filled. The admin picks the recipient/group themselves.
function CompanyUpdateShareButton({
  companyId,
  companyName,
  record,
  files,
}: {
  companyId: string;
  companyName: string;
  record: Record<string, unknown>;
  files: AnalyzedFile[];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    setError(null);
    setBusy(true);
    try {
      const { driveUrls } = await documentsShareCompanyUpdate({ companyId, files });
      const summary = (record.summary as CompanyUpdateSummary) ?? {};
      const message = [
        buildUpdateMessage(companyName, summary),
        driveUrls.length > 0 ? `Document(s):\n${driveUrls.join("\n")}` : null,
      ]
        .filter(Boolean)
        .join("\n\n");
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not prepare the WhatsApp share.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleSend}
        disabled={busy}
        className="self-start rounded-full border border-green-600 px-4 py-1.5 text-sm font-medium text-green-700 disabled:opacity-50 dark:border-green-500 dark:text-green-400"
      >
        {busy ? "Preparing..." : "Send via WhatsApp"}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

// Orchestrates the AI-2 flow: upload+analyze (DocumentDropzone) -> review/edit/commit
// (LedgerRecordsEditor). Split into its own client component so the page itself can stay
// an async server component fetching the company list.
//
// The AI drafts one record per scenario for every event (up to 3), which documentsAnalyze.ts
// has already grouped by identical content and marked visible/hidden per the reviewing
// site-admin/admin's own scenario-visibility setting (functions/src/lib/appSettings.ts). Only
// visible groups are shown here, one editable card per group (never 3 near-duplicate cards for
// an investment round); hidden groups are carried through untouched and spliced back in at
// commit time via LedgerRecordsEditor's expandForSubmit hook.
export function AdminDocumentsFlow({
  companies,
}: {
  companies: { id: string; name: string; tradeName?: string | null }[];
}) {
  const [proposedRecords, setProposedRecords] = useState<Record<string, unknown>[] | null>(null);
  const [groups, setGroups] = useState<RecordGroup[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [analyzedFiles, setAnalyzedFiles] = useState<AnalyzedFile[]>([]);

  function handleAnalyzed(
    records: Record<string, unknown>[],
    newWarnings: string[],
    newGroups: RecordGroup[],
    newCompanyId: string | null,
    files: AnalyzedFile[]
  ) {
    setProposedRecords(records);
    setWarnings(newWarnings);
    setGroups(newGroups);
    setCompanyId(newCompanyId);
    setAnalyzedFiles(files);
  }

  const visibleGroups = groups.filter((g) => g.visible);
  const hiddenGroups = groups.filter((g) => !g.visible);

  // One representative record per visible group (the first scenario copy in that group — since
  // the group is identical-content, any of them is equivalent) — this is what actually gets
  // rendered/edited.
  const visibleRecords = proposedRecords
    ? visibleGroups.map((g) => proposedRecords[g.recordIndexes[0]])
    : [];
  const visibleLabels = visibleGroups.map((g) => formatScenarioLabel(g.scenarios));
  const companyName = companies.find((c) => c.id === companyId)?.name ?? "";

  function expandForSubmit(editedVisibleRecords: Record<string, unknown>[]): Record<string, unknown>[] {
    if (!proposedRecords) return editedVisibleRecords;
    const expanded: Record<string, unknown>[] = [];
    // Each edited representative stands in for every scenario its group covers — stamp the
    // correct `scenario` onto a copy for each, regardless of whatever the admin left in the
    // textarea's own scenario field.
    visibleGroups.forEach((g, i) => {
      const edited = editedVisibleRecords[i] ?? {};
      for (const scenario of g.scenarios) {
        expanded.push({ ...edited, scenario });
      }
    });
    // Hidden groups are never shown for editing — committed exactly as the AI drafted them.
    for (const g of hiddenGroups) {
      for (const index of g.recordIndexes) {
        expanded.push(proposedRecords[index]);
      }
    }
    return expanded;
  }

  return (
    <div className="flex flex-col gap-8">
      <DocumentDropzone companies={companies} onAnalyzed={handleAnalyzed} />

      {proposedRecords && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">AI-drafted ledger record(s)</h2>
            <button
              type="button"
              onClick={() => {
                setProposedRecords(null);
                setWarnings([]);
                setGroups([]);
                setCompanyId(null);
                setAnalyzedFiles([]);
              }}
              className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Discard and start over
            </button>
          </div>
          {warnings.length > 0 && (
            <div className="flex flex-col gap-1 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              <p className="font-medium">Review before committing:</p>
              <ul className="list-disc pl-5">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          {hiddenGroups.length > 0 && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {hiddenGroups.length} record(s) for other scenarios aren&apos;t shown here (per your scenario
              setting) — they&apos;ll be committed exactly as drafted, alongside whatever you approve below.
            </p>
          )}
          {companyId &&
            visibleGroups.map((g, i) => {
              const record = visibleRecords[i];
              if (record.type !== "CompanyUpdate") return null;
              return (
                <div
                  key={i}
                  className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
                >
                  <p className="text-sm font-medium">Share this update ({visibleLabels[i]})</p>
                  <CompanyUpdateShareButton
                    companyId={companyId}
                    companyName={companyName}
                    record={record}
                    files={analyzedFiles}
                  />
                </div>
              );
            })}
          <LedgerRecordsEditor
            initialRecords={visibleRecords}
            recordLabels={visibleLabels}
            expandForSubmit={expandForSubmit}
          />
        </div>
      )}
    </div>
  );
}
