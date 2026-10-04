"use client";

import { useMemo, useState } from "react";
import { DocumentDropzone, type AnalyzedFile } from "@/components/DocumentDropzone";
import { LedgerRecordsEditor } from "@/components/LedgerRecordsEditor";
import { UnknownMemberReferences } from "@/components/UnknownMemberReferences";
import { documentsAnalyze, documentsShareCompanyUpdate, type RecordGroup } from "@/lib/functions/documents";

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
// and Drive link(s) pre-filled. The admin picks the recipient/group themselves. Deliberately
// independent of commit — rendered above the review editor, so sending doesn't require (or
// wait on) committing the records first.
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

// Orchestrates the AI-2 flow: upload+analyze (DocumentDropzone) -> conversational review
// (ask for a change -> regenerate -> check -> repeat) -> commit (LedgerRecordsEditor). Split
// into its own client component so the page itself can stay an async server component fetching
// the company list.
//
// The AI drafts one record per scenario for every event (up to 3), which documentsAnalyze.ts
// has already grouped by identical content and marked visible/hidden per the reviewing
// site-admin/admin's own scenario-visibility setting (functions/src/lib/appSettings.ts). Only
// visible groups are shown here, one editable card per group (never 3 near-duplicate cards for
// an investment round); hidden groups are carried through untouched and spliced back in at
// commit time via LedgerRecordsEditor's expandForSubmit hook.
export function AdminDocumentsFlow({
  companies,
  members,
}: {
  companies: { id: string; name: string; tradeName?: string | null }[];
  members: { id: string; displayName: string; investingEntityName?: string | null }[];
}) {
  const memberNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of members) map[m.id] = m.displayName;
    return map;
  }, [members]);
  const [proposedRecords, setProposedRecords] = useState<Record<string, unknown>[] | null>(null);
  const [groups, setGroups] = useState<RecordGroup[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [unknownMemberReferences, setUnknownMemberReferences] = useState<string[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [newCompanyName, setNewCompanyName] = useState<string | null>(null);
  const [analyzedFiles, setAnalyzedFiles] = useState<AnalyzedFile[]>([]);
  // Bumped on every (re)analysis, used as LedgerRecordsEditor's `key` — that component's own
  // editing state only initializes once per mount, so without a changing key, a new draft
  // (from re-analyzing or regenerating, without discarding first) would leave it silently
  // checking/committing against stale JSON from the PRIOR draft instead of the new one.
  const [analysisId, setAnalysisId] = useState(0);
  const [committedNotice, setCommittedNotice] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [modifyInstruction, setModifyInstruction] = useState("");
  const [lastCheckErrors, setLastCheckErrors] = useState<string[]>([]);

  function handleDiscard() {
    setProposedRecords(null);
    setWarnings([]);
    setGroups([]);
    setUnknownMemberReferences([]);
    setCompanyId(null);
    setNewCompanyName(null);
    setAnalyzedFiles([]);
    setModifyInstruction("");
    setLastCheckErrors([]);
  }

  function handleCommitted() {
    handleDiscard();
    setCommittedNotice(true);
  }

  function handleAnalyzed(
    records: Record<string, unknown>[],
    newWarnings: string[],
    newGroups: RecordGroup[],
    newCompanyId: string | null,
    files: AnalyzedFile[],
    newUnknownMemberReferences: string[],
    analyzedNewCompanyName: string | null
  ) {
    // The dropzone stays usable while a review is already in progress (e.g. to attach a
    // supporting document — a prior SAFE agreement — that the first pass didn't have, to fix a
    // valuation reconciliation issue). Resubmitting it is a fresh `documentsAnalyze` call, but
    // for the SAME company/review it's additive from the admin's point of view: re-uploading
    // should carry forward every file the review has seen so far (so a Drive share/WhatsApp send
    // afterward still includes the very first batch's documents, e.g. a unit schedule), not
    // discard earlier ones just because this call's `files` only re-sent the new attachment.
    const continuingSameReview =
      proposedRecords !== null && newCompanyId === companyId && analyzedNewCompanyName === newCompanyName;
    setAnalyzedFiles((prev) => {
      if (!continuingSameReview) return files;
      const merged = [...prev];
      for (const f of files) {
        if (!merged.some((m) => m.filename === f.filename)) merged.push(f);
      }
      return merged;
    });
    setProposedRecords(records);
    setWarnings(newWarnings);
    setGroups(newGroups);
    setUnknownMemberReferences(newUnknownMemberReferences);
    setCompanyId(newCompanyId);
    setNewCompanyName(analyzedNewCompanyName);
    setAnalysisId((id) => id + 1);
    setCommittedNotice(false);
    setModifyInstruction("");
    setLastCheckErrors([]);
  }

  // The conversational "ask for a change" loop: revises the CURRENT draft (not a fresh
  // from-scratch analysis) per a free-text instruction, optionally informed by the most recent
  // failed Check's exact validation errors — used both by the "ask for a change" box and by
  // "Re-analyze" on an unresolved investor reference (framed as a specific instruction so it
  // goes through the same revise-don't-redraft path).
  async function handleRegenerate(instruction: string) {
    if (!proposedRecords) return;
    setRegenerateError(null);
    setRegenerating(true);
    try {
      const result = await documentsAnalyze(
        newCompanyName
          ? { newCompanyName, files: analyzedFiles, instruction, previousRecords: proposedRecords, checkErrors: lastCheckErrors }
          : {
              companyId: companyId!,
              files: analyzedFiles,
              instruction,
              previousRecords: proposedRecords,
              checkErrors: lastCheckErrors,
            }
      );
      handleAnalyzed(
        result.proposedRecords,
        result.warnings,
        result.groups,
        companyId,
        analyzedFiles,
        result.unknownMemberReferences,
        newCompanyName
      );
    } catch (err) {
      setRegenerateError(err instanceof Error ? err.message : "Could not apply that change.");
    } finally {
      setRegenerating(false);
    }
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
      {committedNotice && (
        <p className="rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
          Committed. Ready for another document.
        </p>
      )}
      <DocumentDropzone companies={companies} onAnalyzed={handleAnalyzed} />

      {proposedRecords && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">AI-drafted ledger record(s)</h2>
            <button
              type="button"
              onClick={handleDiscard}
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
          {regenerateError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {regenerateError}
            </p>
          )}
          <UnknownMemberReferences
            references={unknownMemberReferences}
            onReanalyze={() =>
              handleRegenerate(
                "The member list has been updated — re-resolve any investor name(s) you previously couldn't confidently match against it."
              )
            }
            reanalyzing={regenerating}
          />
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

          <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <label className="flex flex-col gap-1 text-sm">
              Ask for a change (optional)
              <textarea
                value={modifyInstruction}
                onChange={(e) => setModifyInstruction(e.target.value)}
                rows={2}
                placeholder={
                  lastCheckErrors.length > 0
                    ? "Describe the fix, or leave blank to just resubmit the check's errors as-is..."
                    : "e.g. \"the price per share for the new round should be $12.50, not $1.25\""
                }
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            {lastCheckErrors.length > 0 && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                The last check found {lastCheckErrors.length} issue(s) — they&apos;ll be sent along automatically
                when you regenerate.
              </p>
            )}
            <button
              type="button"
              onClick={() => handleRegenerate(modifyInstruction)}
              disabled={regenerating || (!modifyInstruction.trim() && lastCheckErrors.length === 0)}
              className="self-start rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium disabled:opacity-50 dark:border-zinc-700"
            >
              {regenerating ? "Regenerating..." : "Regenerate"}
            </button>
          </div>

          <LedgerRecordsEditor
            key={analysisId}
            initialRecords={visibleRecords}
            recordLabels={visibleLabels}
            expandForSubmit={expandForSubmit}
            onCommitted={handleCommitted}
            onDiffResult={setLastCheckErrors}
            formattedView
            memberNames={memberNames}
          />
        </div>
      )}
    </div>
  );
}
