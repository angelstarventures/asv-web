import "server-only";
import {
  listMemberValuationsForCompanies,
  listTransferFeeLinesForScenario,
  listTransferPartiesForScenario,
} from "@/lib/dataconnect/client";
import {
  CompanyStatus,
  FeeKind,
  LedgerEntryType,
  TransferSide,
  type Scenario as ScenarioType,
} from "@/lib/dataconnect/generated";
import { memberTransferEffects, type CompanyTransferEffect, type TransferLeg, type ValuationSnapshot } from "@/lib/transferAdjust";

// What internal transfers mean for ONE member's own views (dashboard, full-ledger export).
// Everything is read with admin trust and then reduced to the signed-in member's own legs; other
// members' amounts never leave this module (a buyer's moved value is computed from sellers' values
// here, server-side, and only the member's own number is returned).

export interface MemberTransferCompany {
  companyId: string;
  name: string;
  sector: string | null;
  status: CompanyStatus;
}

export interface MemberTransferData {
  effects: Map<string, CompanyTransferEffect>;
  companies: Map<string, MemberTransferCompany>;
  carryPaid: number; // DD-lead + management carry charged against this member's sales
  carryEarned: number; // carry paid TO this member as recipient
  // Carry charged to this member on a full exit, by exit ledger entry id: the recorded payout stays
  // gross, views show payout minus this.
  exitCarryByEntry: Map<string, number>;
  warnings: string[];
  // This member's own legs, for the full-ledger export.
  legs: (TransferLeg & {
    realizedGain: number | null;
    feesCharged: number | null;
    kind: "SALE" | "REPLACEMENT";
    referenceRoundName: string | null;
    roundPricePerShare: number | null;
    transferPricePerShare: number | null;
    docLink: string | null;
  })[];
}

const CARRY_KINDS = new Set<FeeKind>([FeeKind.DD_LEAD_CARRY, FeeKind.MANAGEMENT_CARRY]);

export async function loadMemberTransferData(authUid: string, scenario: ScenarioType): Promise<MemberTransferData> {
  const empty: MemberTransferData = {
    effects: new Map(),
    companies: new Map(),
    carryPaid: 0,
    carryEarned: 0,
    exitCarryByEntry: new Map(),
    warnings: [],
    legs: [],
  };

  const [{ transferParties }, { feeLines }] = await Promise.all([
    listTransferPartiesForScenario({ scenario }),
    listTransferFeeLinesForScenario({ scenario }),
  ]);

  const mineParties = transferParties.filter((p) => p.member.authUid === authUid);
  const myMemberId = mineParties[0]?.member.id ?? feeLines.find((f) => f.recipient?.authUid === authUid)?.recipient?.id;

  let carryPaid = 0;
  let carryEarned = 0;
  const exitCarryByEntry = new Map<string, number>();
  for (const f of feeLines) {
    if (!CARRY_KINDS.has(f.kind)) continue;
    if (f.chargedToMember?.authUid === authUid) {
      carryPaid += f.amount;
      if (f.ledgerEntry.type === LedgerEntryType.EXIT_EVENT) {
        exitCarryByEntry.set(f.ledgerEntry.id, (exitCarryByEntry.get(f.ledgerEntry.id) ?? 0) + f.amount);
      }
    }
    if (f.recipient?.authUid === authUid) carryEarned += f.amount;
  }
  if (!myMemberId) return { ...empty, carryPaid, carryEarned, exitCarryByEntry };

  const legs: TransferLeg[] = transferParties.map((p) => ({
    entryId: p.ledgerEntry.id,
    date: p.ledgerEntry.eventDate,
    companyId: p.ledgerEntry.company.id,
    memberId: p.member.id,
    side: p.side === TransferSide.SELLER ? "SELLER" : "BUYER",
    shares: p.shares,
    costBasisPerShare: p.costBasisPerShare,
    amount: p.amount,
    sharesHeldBefore: p.sharesHeldBefore ?? null,
  }));

  // Only companies this member took part in a transfer of matter for their own view.
  const myCompanyIds = [...new Set(mineParties.map((p) => p.ledgerEntry.company.id))];
  const companies = new Map<string, MemberTransferCompany>();
  for (const p of mineParties) {
    const c = p.ledgerEntry.company;
    companies.set(c.id, { companyId: c.id, name: c.tradeName ?? c.name, sector: c.sector ?? null, status: c.status });
  }

  let snapshots: ValuationSnapshot[] = [];
  if (myCompanyIds.length > 0) {
    const { memberValuations } = await listMemberValuationsForCompanies({ scenario, companyIds: myCompanyIds });
    // The latest non-exit valuation entry per company, with every member's value at that entry.
    const latest = new Map<string, { entryId: string; date: string }>();
    for (const v of memberValuations) {
      if (v.ledgerEntry.type === LedgerEntryType.EXIT_EVENT) continue;
      const cur = latest.get(v.ledgerEntry.company.id);
      if (!cur || v.ledgerEntry.eventDate > cur.date) {
        latest.set(v.ledgerEntry.company.id, { entryId: v.ledgerEntry.id, date: v.ledgerEntry.eventDate });
      }
    }
    snapshots = [...latest].map(([companyId, { entryId, date }]) => ({
      companyId,
      date,
      values: Object.fromEntries(memberValuations.filter((v) => v.ledgerEntry.id === entryId).map((v) => [v.member.id, v.value])),
    }));
  }

  const effects = memberTransferEffects(myMemberId, legs, snapshots);
  const warnings = [...effects.values()].flatMap((e) => e.warnings);

  const myLegs = transferParties.flatMap((p, i) =>
    p.member.authUid === authUid
      ? [
          {
            ...legs[i],
            realizedGain: p.realizedGain ?? null,
            feesCharged: p.feesCharged ?? null,
            kind: (String(p.ledgerEntry.internalTransferDetail_on_ledgerEntry?.kind) === "REPLACEMENT" ? "REPLACEMENT" : "SALE") as
              | "SALE"
              | "REPLACEMENT",
            referenceRoundName: p.ledgerEntry.internalTransferDetail_on_ledgerEntry?.referenceRoundName ?? null,
            roundPricePerShare: p.ledgerEntry.internalTransferDetail_on_ledgerEntry?.roundPricePerShare ?? null,
            transferPricePerShare: p.ledgerEntry.internalTransferDetail_on_ledgerEntry?.transferPricePerShare ?? null,
            docLink: p.ledgerEntry.internalTransferDetail_on_ledgerEntry?.docLink ?? p.ledgerEntry.sourceDocument ?? null,
          },
        ]
      : []
  );
  return { effects, companies, carryPaid, carryEarned, exitCarryByEntry, warnings, legs: myLegs };
}
