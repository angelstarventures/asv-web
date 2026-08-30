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

  const counts = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM "member") AS members,
      (SELECT COUNT(*) FROM "company") AS companies,
      (SELECT COUNT(*) FROM "ledger_entry") AS ledger_entries,
      (SELECT COUNT(*) FROM "ledger_entry" WHERE scenario = 'OPTIMISTIC') AS optimistic,
      (SELECT COUNT(*) FROM "ledger_entry" WHERE scenario = 'BALANCED') AS balanced,
      (SELECT COUNT(*) FROM "ledger_entry" WHERE scenario = 'CONSERVATIVE') AS conservative
  `);
  console.log(counts.rows[0]);

  await client.end();
  connector.close();
}

run().catch((err) => { console.error(err); process.exitCode = 1; });
