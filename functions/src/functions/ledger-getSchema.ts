import { onCall } from "firebase-functions/v2/https";
import { requireAdmin } from "../lib/auth";
import portfolioSchema from "../../schema/asv_master_portfolio_schema.json";

// Lets an admin download the exact schema every ledger record (manual entry, mass import, AI
// draft, edit) is validated against — a single source of truth (the bundled schema file),
// read-only. No upload counterpart: the schema stays a code-deployed artifact, not something an
// admin can swap out live, since a bad schema would block validation for every future write.
export const ledgerGetSchema = onCall<Record<string, never>, Promise<{ schema: unknown }>>(async (request) => {
  await requireAdmin(request);
  return { schema: portfolioSchema };
});
