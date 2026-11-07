import type { PoolClient } from "pg";
import { computeExitCarry, type ExitCarryResult } from "./transferCalc";
import { loadMemberPositions } from "./memberPositions";
import { loadTransferContext, clientRunner } from "./transferWrites";
import { insertFeeLine } from "./ledgerWriteBuilders";

// Carry on a complete exit (Phase 7). Applies once a fund-wide management-carry recipient is
// configured (the same setting a Sale transfer needs), unless the record opts out with
// `apply_carry: false`. Until then exits behave exactly as before. Once it applies, a company
// without a DD lead is a hard error whenever carry would actually be charged.

export async function applyExitCarry(
  client: PoolClient,
  args: { ledgerEntryId: string; companyId: string; record: Record<string, unknown> }
): Promise<ExitCarryResult | null> {
  const { ledgerEntryId, companyId, record } = args;
  if (record.apply_carry === false) return null;
  const payouts = (record.member_payouts as Record<string, number> | undefined) ?? {};
  const payeeIds = Object.keys(payouts);
  if (payeeIds.length === 0) return null;

  const run = clientRunner(client);
  const ctx = await loadTransferContext(run, companyId, []);
  if (!ctx.managementMemberId) return null; // carry not configured: unchanged behaviour

  const positions = await loadMemberPositions(run, companyId, payeeIds);
  const basis = Object.fromEntries(positions.map((p) => [p.memberId, p.basis]));

  // Check for a DD lead only when there is carry to charge.
  const anyGain = payeeIds.some((id) => payouts[id] - (basis[id] ?? 0) > 0.005);
  if (!anyGain) return null;
  if (!ctx.ddLeadMemberId) {
    throw new Error(
      `Exit for company ${companyId}: carry applies but the company has no DD lead. Set a DD lead, or add "apply_carry": false to this record.`
    );
  }

  const result = computeExitCarry({
    payouts,
    basis,
    ddLeadMemberId: ctx.ddLeadMemberId,
    managementMemberId: ctx.managementMemberId,
    ddLeadPercent: ctx.ddLeadPercent,
    managementPercent: ctx.managementPercent,
  });
  for (const f of result.feeLines) {
    await insertFeeLine(client, ledgerEntryId, {
      kind: f.kind,
      recipientMemberId: f.recipientMemberId,
      chargedToMemberId: f.chargedToMemberId,
      percent: f.percent,
      amount: f.amount,
    });
  }
  return result;
}
