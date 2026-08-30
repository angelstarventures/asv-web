// One-off local runner for the same recomputeAllRollupsAndCheckInvariants() the scheduled
// Cloud Function calls, needed right after the production migration since
// migrate-legacy-data.ts intentionally doesn't touch rollup_cache itself (plan §3: rollups
// are a read-derived cache, not part of the ledger write's atomicity guarantee) — normally
// the ~15 min Cloud Scheduler job would catch this up on its own; this just does it now.
const { recomputeAllRollupsAndCheckInvariants } = require("../lib/src/lib/rollups");

recomputeAllRollupsAndCheckInvariants()
  .then((result) => {
    console.log("Recompute complete.", result);
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => process.exit(process.exitCode ?? 0));
