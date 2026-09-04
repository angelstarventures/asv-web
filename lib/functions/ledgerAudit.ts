import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/client";

// Mirrors functions/src/functions/ledger-audit.ts's output shape exactly.

export interface AuditFinding {
  category: "rollup" | "cross_scenario" | "member_valuation_sum" | "price_continuity" | "fmv_plausibility";
  severity: "error" | "warning";
  message: string;
}

export async function ledgerAudit(): Promise<{ findings: AuditFinding[] }> {
  // Recomputes every company's rollups from scratch plus several whole-ledger scans —
  // comfortably longer than the client SDK's 70s default callable timeout.
  const call = httpsCallable<Record<string, never>, { findings: AuditFinding[] }>(functions, "ledgerAudit", {
    timeout: 300000,
  });
  const res = await call({});
  return res.data;
}
