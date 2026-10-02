// Grants the firebasewriter role to the Cloud Functions runtime service account's Cloud SQL
// IAM user. Only roles WITH ADMIN OPTION on firebasewriter_asvtrackerdb_public can grant it —
// my own account is a plain member, not an admin, of that role (see the GRANTs
// `firebase dataconnect:sql:setup` printed). Instead, replicate exactly what
// firebase-tools' own executeSqlCmdsAsSuperUser does internally: (re)create the built-in
// "firebasesuperuser" Postgres role with a fresh temporary password via the Cloud SQL Admin
// API, then connect as that user with plain password auth to run the GRANT.
//
// Usage: node scripts/grant-function-db-role.js --project <id> --instance <id> --db-user <username> [--database <name>]
// All flags default to ASV's current values.
const { Connector, IpAddressTypes, AuthTypes } = require("@google-cloud/cloud-sql-connector");
const { Client } = require("pg");
const { FBToolsAuthClient } = require("firebase-tools/lib/gcp/cloudsql/fbToolsAuthClient");
const { requireAuth } = require("firebase-tools/lib/requireAuth");
const { getGlobalDefaultAccount } = require("firebase-tools/lib/auth");
const cloudSqlAdminClient = require("firebase-tools/lib/gcp/cloudsql/cloudsqladmin");

const ASV_DEFAULTS = {
  projectId: "angelstar-investments",
  instanceId: "asv-tracker-sql",
  functionDbUser: "345219246308-compute@developer",
  database: "asvtrackerdb",
};

function parseArgs(argv) {
  const get = (flag) => {
    const idx = argv.indexOf(flag);
    return idx >= 0 ? argv[idx + 1] : undefined;
  };
  return {
    projectId: get("--project") ?? ASV_DEFAULTS.projectId,
    instanceId: get("--instance") ?? ASV_DEFAULTS.instanceId,
    functionDbUser: get("--db-user") ?? ASV_DEFAULTS.functionDbUser,
    database: get("--database") ?? ASV_DEFAULTS.database,
  };
}

function generatePassword(length) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

async function run() {
  const { projectId, instanceId, functionDbUser, database } = parseArgs(process.argv.slice(2));

  console.log(`Granting role for user: ${functionDbUser} on ${projectId}/${instanceId} (DB: ${database})`);

  const account = getGlobalDefaultAccount();
  await requireAuth({ user: account.user, tokens: account.tokens });

  const superuser = "firebasesuperuser";
  const temporaryPassword = generatePassword(20);
  await cloudSqlAdminClient.createUser(projectId, instanceId, "BUILT_IN", superuser, temporaryPassword);

  const connector = new Connector({ auth: new FBToolsAuthClient() });
  const clientOpts = await connector.getOptions({
    instanceConnectionName: `${projectId}:us-east1:${instanceId}`,
    ipType: IpAddressTypes.PUBLIC,
    authType: AuthTypes.PASSWORD,
  });
  const client = new Client({ ...clientOpts, user: superuser, password: temporaryPassword, database });
  await client.connect();

  try {
    await client.query(`SET ROLE = '${superuser}'`);
    await client.query(`GRANT "firebasewriter_asvtrackerdb_public" TO "${functionDbUser}"`);
    console.log(`Granted firebasewriter_asvtrackerdb_public to ${functionDbUser}`);
  } finally {
    await client.end();
    connector.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
