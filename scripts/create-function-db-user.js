// Creates a Cloud SQL IAM database user for the Cloud Functions runtime service account
// (the default compute SA, since no dedicated SA was configured at deploy time) so deployed
// functions can authenticate to Postgres via IAM auth, matching the pattern
// `firebase dataconnect:sql:setup` already used for the CLI user and the Data Connect P4SA.
const { requireAuth } = require("firebase-tools/lib/requireAuth");
const { getGlobalDefaultAccount } = require("firebase-tools/lib/auth");
const cloudSqlAdminClient = require("firebase-tools/lib/gcp/cloudsql/cloudsqladmin");

const PROJECT_ID = "angelstar-investments";
const INSTANCE_ID = "asv-tracker-sql";
// Cloud SQL Postgres IAM DB usernames for service accounts strip ".gserviceaccount.com"
// (matches firebase-tools' own toDatabaseUser() in gcp/cloudsql/connect.js).
const DB_USERNAME = "345219246308-compute@developer";

async function run() {
  const account = getGlobalDefaultAccount();
  await requireAuth({ user: account.user, tokens: account.tokens });

  await cloudSqlAdminClient.createUser(
    PROJECT_ID,
    INSTANCE_ID,
    "CLOUD_IAM_SERVICE_ACCOUNT",
    DB_USERNAME
  );
  console.log(`Created Cloud SQL IAM user: ${DB_USERNAME}`);
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
