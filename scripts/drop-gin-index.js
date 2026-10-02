// Temporarily drops the GIN index from post_migrations/002 so `dataconnect:sql:migrate`'s
// auto-revert-to-text step can run; scripts/apply-post-migrations.js recreates both the jsonb
// conversion and this index afterward. Needed because Data Connect's schema-drift sync
// doesn't know about (and can't drop) indexes it didn't create itself.
//
// Usage: node scripts/drop-gin-index.js --instance <project:region:instance> --database <db> --iam-user <email>
// All flags default to ASV's current values.
const { Connector, IpAddressTypes, AuthTypes } = require("@google-cloud/cloud-sql-connector");
const { Client } = require("pg");
const { FBToolsAuthClient } = require("firebase-tools/lib/gcp/cloudsql/fbToolsAuthClient");
const { requireAuth } = require("firebase-tools/lib/requireAuth");
const { getGlobalDefaultAccount } = require("firebase-tools/lib/auth");

const ASV_DEFAULTS = {
  instance: "angelstar-investments:us-east1:asv-tracker-sql",
  database: "asvtrackerdb",
  iamUser: "adiljagmag@gmail.com",
};

function parseArgs(argv) {
  const get = (flag) => {
    const idx = argv.indexOf(flag);
    return idx >= 0 ? argv[idx + 1] : undefined;
  };
  return {
    instance: get("--instance") ?? ASV_DEFAULTS.instance,
    database: get("--database") ?? ASV_DEFAULTS.database,
    iamUser: get("--iam-user") ?? ASV_DEFAULTS.iamUser,
  };
}

async function run() {
  const { instance, database, iamUser } = parseArgs(process.argv.slice(2));

  console.log(`Using instance: ${instance}, DB: ${database}, IAM: ${iamUser}`);

  const account = getGlobalDefaultAccount();
  await requireAuth({ user: account.user, tokens: account.tokens });

  const connector = new Connector({ auth: new FBToolsAuthClient() });
  const clientOpts = await connector.getOptions({
    instanceConnectionName: instance,
    ipType: IpAddressTypes.PUBLIC,
    authType: AuthTypes.IAM,
  });
  const client = new Client({ ...clientOpts, user: iamUser, database });
  await client.connect();

  await client.query(`DROP INDEX IF EXISTS idx_custom_event_detail_data_gin`);
  console.log("Dropped idx_custom_event_detail_data_gin.");

  await client.end();
  connector.close();
}

run().catch((err) => { console.error(err); process.exitCode = 1; });
