import type { PoolClient } from "pg";
import { computeExitCarry, type ExitCarryResult } from "./transferCalc";
import { loadMemberPositions } from "./memberPositions";
import { loadTransferContext, clientRunner, type Run } from "./transferWrites";
import { insertFeeLine } from "./ledgerWriteBuilders";

// Carry on a complete exit (Phase 7). Applies once a fund-wide management-carry recipient is
// configured (the same setting a Sale transfer needs), unless the record opts out with
// `apply_carry: false`. Until then exits behave exactly as before. Once it applies, a company
// without a DD lead is a hard error whenever carry would actually be charged.

export interface ExitCarryMemberRow {
  memberId: string;
  displayName: string;
  payout: number;
  basis: number;
  gain: number;
  carry: number;
  net: number;
}

export interface ExitCarryPreview {
  applies: boolean;
  reason: string | null; // why carry does not apply, when applies is false
  errors: string[];
  members: ExitCarryMemberRow[];
  result: ExitCarryResult | null;
  ddLeadPercent: number;
  managementPercent: number;
}

// Read-only: what carry the exit would be charged. Shared by the admin form's live preview and the write path.
export async function previewExitCarry(run: Run, companyId: string, record: Record<string, unknown>): Promise<ExitCarryPreview> {
  const payouts = (record.member_payouts as Record<string, number> | undefined) ?? {};
  const payeeIds = Object.keys(payouts);
  const ctx = await loadTransferContext(run, companyId, []);
  const base = { ddLeadPercent: ctx.ddLeadPercent, managementPercent: ctx.managementPercent };
  const none = (reason: string): ExitCarryPreview => ({ applies: false, reason, errors: [], members: [], result: null, ...base });

  if (record.apply_carry === false) return none('This exit opts out of carry ("apply_carry": false).');
  if (payeeIds.length === 0) return none("No member payouts.");
  if (!ctx.managementMemberId) {
    return none("No management-carry recipient is set, so no carry is charged (Admin > Settings > Transfer carry).");
  }

  const positions = await loadMemberPositions(run, companyId, payeeIds);
  const basis = Object.fromEntries(positions.map((p) => [p.memberId, p.basis]));
  const names = new Map(positions.map((p) => [p.memberId, p.displayName]));
  const anyGain = payeeIds.some((id) => payouts[id] - (basis[id] ?? 0) > 0.005);

  if (anyGain && !ctx.ddLeadMemberId) {
    return {
      applies: true,
      reason: null,
      errors: ["This company has no DD lead, so carry cannot be charged. Set one under Admin > Companies, or opt this exit out of carry."],
      members: [],
      result: null,
      ...base,
    };
  }

  const result = computeExitCarry({
    payouts,
    basis,
    ddLeadMemberId: ctx.ddLeadMemberId ?? "",
    managementMemberId: ctx.managementMemberId,
    ddLeadPercent: ctx.ddLeadPercent,
    managementPercent: ctx.managementPercent,
  });
  const members = payeeIds.map((memberId) => ({
    memberId,
    displayName: names.get(memberId) ?? memberId,
    payout: payouts[memberId],
    basis: basis[memberId] ?? 0,
    gain: result.gains[memberId] ?? 0,
    carry: Math.round((payouts[memberId] - result.net[memberId]) * 100) / 100,
    net: result.net[memberId],
  }));
  return { applies: true, reason: null, errors: [], members, result, ...base };
}

export async function applyExitCarry(
  client: PoolClient,
  args: { ledgerEntryId: string; companyId: string; record: Record<string, unknown> }
): Promise<ExitCarryResult | null> {
  const { ledgerEntryId, companyId, record } = args;
  const preview = await previewExitCarry(clientRunner(client), companyId, record);
  if (preview.errors.length > 0) throw new Error(`Exit for company ${companyId}: ${preview.errors.join(" ")}`);
  if (!preview.applies || !preview.result) return null;
  for (const f of preview.result.feeLines) {
    await insertFeeLine(client, ledgerEntryId, {
      kind: f.kind,
      recipientMemberId: f.recipientMemberId,
      chargedToMemberId: f.chargedToMemberId,
      percent: f.percent,
      amount: f.amount,
    });
  }
  return preview.result;
}
