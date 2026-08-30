// Temporarily drops the GIN index from post_migrations/002 so `dataconnect:sql:migrate`'s
// auto-revert-to-text step can run; scripts/apply-post-migrations.js recreates both the jsonb
// conversion and this index afterward. Needed because Data Connect's schema-drift sync
// doesn't know about (and can't drop) indexes it didn't create itself.
const { Connector, IpAddressTypes, AuthTypes } = require("@google-cloud/cloud-sql-connector");
const { Client } = require("pg");
const { FBToolsAuthClient } = require("firebase-tools/lib/gcp/cloudsql/fbToolsAuthClient");
const { requireAuth } = require("firebase-tools/lib/requireAuth");
const { getGlobalDefaultAccount } = require("firebase-tools/lib/auth");

async function run() {
  const account = getGlobalDefaultAccount();
  await requireAuth({ user: account.user, tokens: account.tokens });

  const connector = new Connector({ auth: new FBToolsAuthClient() });
  const clientOpts = await connector.getOptions({
    instanceConnectionName: "angelstar-investments:us-east1:asv-tracker-sql",
    ipType: IpAddressTypes.PUBLIC,
    authType: AuthTypes.IAM,
  });
  const client = new Client({ ...clientOpts, user: "adiljagmag@gmail.com", database: "asvtrackerdb" });
  await client.connect();

  await client.query(`DROP INDEX IF EXISTS idx_custom_event_detail_data_gin`);
  console.log("Dropped idx_custom_event_detail_data_gin.");

  await client.end();
  connector.close();
}

run().catch((err) => { console.error(err); process.exitCode = 1; });
