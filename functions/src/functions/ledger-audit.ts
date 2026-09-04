import { onCall } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import { runLedgerAudit, type AuditFinding } from "../lib/ledgerAudit";

// Backs the "Audit Ledger" admin page — recomputes rollups (self-healing, same operation the
// scheduler already runs), and reports (never auto-corrects) member-valuation sum mismatches,
// price-per-share continuity breaks, and implausible fair-market-value marks across the whole
// ledger. A real fix still goes through the admin's ledger-edit UI (ledgerUpdateRecord) by hand.
export const ledgerAudit = onCall<Record<string, never>, Promise<{ findings: AuditFinding[] }>>(
  { timeoutSeconds: 300 },
  async (request) => {
    await requireAdmin(request);
    const findings = await runLedgerAudit();
    return { findings };
  }
);
