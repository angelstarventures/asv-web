import { listCompanies, listMemberProfiles } from "@/lib/dataconnect/client";
import { NewInvestmentForm } from "@/components/NewInvestmentForm";

// Wireframe 6: round-type dropdown swaps the active field schema; allocations table; submits
// one payload to ledgerCreateInvestmentRound, which fans it out to 3 identical scenario rows
// atomically (plan §4).
export const dynamic = "force-dynamic";

export default async function NewInvestmentPage() {
  const [{ companies }, { members }] = await Promise.all([listCompanies(), listMemberProfiles()]);

  return (
    <div className="flex flex-col gap-6 px-6 py-10">
      <h1 className="text-xl font-semibold tracking-tight">New investment</h1>
      <NewInvestmentForm companies={companies} members={members} />
    </div>
  );
}
