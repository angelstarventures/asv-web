// Creates a Cloud SQL IAM database user for the Cloud Functions runtime service account
// (the default compute SA, since no dedicated SA was configured at deploy time) so deployed
// functions can authenticate to Postgres via IAM auth, matching the pattern
// `firebase dataconnect:sql:setup` already used for the CLI user and the Data Connect P4SA.
//
// Usage: node scripts/create-function-db-user.js --project <id> --instance <id> --db-user <username>
// All flags default to ASV's current values.
const { requireAuth } = require("firebase-tools/lib/requireAuth");
const { getGlobalDefaultAccount } = require("firebase-tools/lib/auth");
const cloudSqlAdminClient = require("firebase-tools/lib/gcp/cloudsql/cloudsqladmin");

const ASV_DEFAULTS = {
  projectId: "angelstar-investments",
  instanceId: "asv-tracker-sql",
  dbUser: "345219246308-compute@developer",
};

function parseArgs(argv) {
  const get = (flag) => {
    const idx = argv.indexOf(flag);
    return idx >= 0 ? argv[idx + 1] : undefined;
  };
  return {
    projectId: get("--project") ?? ASV_DEFAULTS.projectId,
    instanceId: get("--instance") ?? ASV_DEFAULTS.instanceId,
    dbUser: get("--db-user") ?? ASV_DEFAULTS.dbUser,
  };
}

async function run() {
  const { projectId, instanceId, dbUser } = parseArgs(process.argv.slice(2));

  console.log(`Creating IAM user: ${dbUser} on ${projectId}/${instanceId}`);

  const account = getGlobalDefaultAccount();
  await requireAuth({ user: account.user, tokens: account.tokens });

  await cloudSqlAdminClient.createUser(
    projectId,
    instanceId,
    "CLOUD_IAM_SERVICE_ACCOUNT",
    dbUser
  );
  console.log(`Created Cloud SQL IAM user: ${dbUser}`);
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
