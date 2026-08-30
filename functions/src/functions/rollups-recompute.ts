import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { recomputeAllRollupsAndCheckInvariants } from "../lib/rollups";

// Cloud Scheduler job, ~15 min: recomputes RollupCache from scratch as a safety net beyond
// the synchronous per-write recompute, and re-checks the "3 scenario rows for one
// investment-round entry must be identical" invariant, logging a warning on divergence
// rather than enforcing it as a DB trigger (plan §2/§3).
export const rollupsRecompute = onSchedule("every 15 minutes", async () => {
  const { warnings } = await recomputeAllRollupsAndCheckInvariants();
  for (const warning of warnings) {
    logger.warn(warning);
  }
});
