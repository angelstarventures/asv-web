import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth/currentMember";
import { listMemberAllocationsAllScenarios, listMemberValuationsAllScenarios } from "@/lib/dataconnect/client";

// FR-6: download own investment ledger as JSON. API routes are NOT covered by proxy.ts's
// page matcher, so this independently re-verifies the session cookie and derives memberId
// server-side — never from a query param (plan §4, Data isolation).
export async function GET() {
  const member = await getCurrentMember();
  if (!member) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const [{ allocations }, { memberValuations }] = await Promise.all([
    listMemberAllocationsAllScenarios({ memberId: member.memberId }),
    listMemberValuationsAllScenarios({ memberId: member.memberId }),
  ]);

  const body = {
    memberId: member.memberId,
    generatedAt: new Date().toISOString(),
    allocations: allocations.map((a) => ({
      company: a.ledgerEntry.company.name,
      scenario: a.ledgerEntry.scenario.toLowerCase(),
      date: a.ledgerEntry.eventDate,
      amount: a.amount,
    })),
    valuations: memberValuations.map((v) => ({
      company: v.ledgerEntry.company.name,
      scenario: v.ledgerEntry.scenario.toLowerCase(),
      date: v.ledgerEntry.eventDate,
      value: v.value,
    })),
  };

  return new NextResponse(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="asv-my-ledger-${member.memberId}.json"`,
    },
  });
}
