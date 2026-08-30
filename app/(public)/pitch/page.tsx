// FR-15 (Phase 2.5): company pitch/questionnaire portal. Explicitly omitted from V1's landing
// page nav/CTA (plan §4 — "Pitch link omitted entirely for V1, not just greyed out"), but the
// route itself still resolves to a clean placeholder rather than a 404 (plan §8, Milestone 6).
export default function PitchPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Pitch portal</h1>
      <p className="mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
        Coming in Phase 2.5 — a portal for companies to submit pitches and questionnaires.
      </p>
    </div>
  );
}
