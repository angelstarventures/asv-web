// Grants the firebasewriter role to the Cloud Functions runtime service account's Cloud SQL
// IAM user. Only roles WITH ADMIN OPTION on firebasewriter_asvtrackerdb_public can grant it —
// my own account is a plain member, not an admin, of that role (see the GRANTs
// `firebase dataconnect:sql:setup` printed). Instead, replicate exactly what
// firebase-tools' own executeSqlCmdsAsSuperUser does internally: (re)create the built-in
// "firebasesuperuser" Postgres role with a fresh temporary password via the Cloud SQL Admin
// API, then connect as that user with plain password auth to run the GRANT.
const { Connector, IpAddressTypes, AuthTypes } = require("@google-cloud/cloud-sql-connector");
const { Client } = require("pg");
const { FBToolsAuthClient } = require("firebase-tools/lib/gcp/cloudsql/fbToolsAuthClient");
const { requireAuth } = require("firebase-tools/lib/requireAuth");
const { getGlobalDefaultAccount } = require("firebase-tools/lib/auth");
const cloudSqlAdminClient = require("firebase-tools/lib/gcp/cloudsql/cloudsqladmin");

const PROJECT_ID = "angelstar-investments";
const INSTANCE_ID = "asv-tracker-sql";
const FUNCTION_DB_USER = "345219246308-compute@developer";

function generatePassword(length) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

async function run() {
  const account = getGlobalDefaultAccount();
  await requireAuth({ user: account.user, tokens: account.tokens });

  const superuser = "firebasesuperuser";
  const temporaryPassword = generatePassword(20);
  await cloudSqlAdminClient.createUser(PROJECT_ID, INSTANCE_ID, "BUILT_IN", superuser, temporaryPassword);

  const connector = new Connector({ auth: new FBToolsAuthClient() });
  const clientOpts = await connector.getOptions({
    instanceConnectionName: `${PROJECT_ID}:us-east1:${INSTANCE_ID}`,
    ipType: IpAddressTypes.PUBLIC,
    authType: AuthTypes.PASSWORD,
  });
  const client = new Client({ ...clientOpts, user: superuser, password: temporaryPassword, database: "asvtrackerdb" });
  await client.connect();

  try {
    await client.query(`SET ROLE = '${superuser}'`);
    await client.query(`GRANT "firebasewriter_asvtrackerdb_public" TO "${FUNCTION_DB_USER}"`);
    console.log(`Granted firebasewriter_asvtrackerdb_public to ${FUNCTION_DB_USER}`);
  } finally {
    await client.end();
    connector.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
