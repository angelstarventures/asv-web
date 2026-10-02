// Inspects a Cloud SQL instance's IP configuration.
// Usage: node scripts/check-instance-ip.js --project <id> --instance <id>
// All flags default to ASV's current values.
const { requireAuth } = require("firebase-tools/lib/requireAuth");
const { getGlobalDefaultAccount } = require("firebase-tools/lib/auth");
const cloudSqlAdminClient = require("firebase-tools/lib/gcp/cloudsql/cloudsqladmin");

const ASV_DEFAULTS = {
  projectId: "angelstar-investments",
  instanceId: "asv-tracker-sql",
};

function parseArgs(argv) {
  const get = (flag) => {
    const idx = argv.indexOf(flag);
    return idx >= 0 ? argv[idx + 1] : undefined;
  };
  return {
    projectId: get("--project") ?? ASV_DEFAULTS.projectId,
    instanceId: get("--instance") ?? ASV_DEFAULTS.instanceId,
  };
}

async function run() {
  const { projectId, instanceId } = parseArgs(process.argv.slice(2));

  console.log(`Checking IP config for ${projectId}/${instanceId}`);

  const account = getGlobalDefaultAccount();
  await requireAuth({ user: account.user, tokens: account.tokens });
  const instance = await cloudSqlAdminClient.getInstance(projectId, instanceId);
  console.log(JSON.stringify(instance.ipAddresses, null, 2));
  console.log("ipv4Enabled:", instance.settings?.ipConfiguration?.ipv4Enabled);
  console.log("privateNetwork:", instance.settings?.ipConfiguration?.privateNetwork);
}

run().catch((err) => { console.error(err); process.exitCode = 1; });
