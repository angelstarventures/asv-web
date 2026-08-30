import Link from "next/link";

// Wireframe 1's full tabbed layout (Welcome / Board & Member profiles / Portfolio companies)
// lands in Milestone 2 once Data Connect read queries exist — this is the Milestone 1
// placeholder whose job is just to carry the Login CTA. Pitch link is omitted entirely for
// V1, not just greyed out, per plan §4.
export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Angel Star Ventures</h1>
      <p className="mt-3 max-w-md text-zinc-600 dark:text-zinc-400">
        Investment tracking for ASV members and the board.
      </p>
      <Link
        href="/login"
        className="mt-8 rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
      >
        Member sign in
      </Link>
    </div>
  );
}
