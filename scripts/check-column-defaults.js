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

  const res = await client.query(`
    SELECT table_name, column_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (column_default IS NULL AND is_nullable = 'NO')
    ORDER BY table_name, ordinal_position
  `);
  console.log("Columns that are NOT NULL with NO Postgres-level default (must be supplied explicitly on every raw INSERT):");
  for (const row of res.rows) {
    console.log(` - ${row.table_name}.${row.column_name}`);
  }

  await client.end();
  connector.close();
}

run().catch((err) => { console.error(err); process.exitCode = 1; });
