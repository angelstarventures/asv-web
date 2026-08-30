const { requireAuth } = require("firebase-tools/lib/requireAuth");
const { getGlobalDefaultAccount } = require("firebase-tools/lib/auth");
const cloudSqlAdminClient = require("firebase-tools/lib/gcp/cloudsql/cloudsqladmin");

async function run() {
  const account = getGlobalDefaultAccount();
  await requireAuth({ user: account.user, tokens: account.tokens });
  const instance = await cloudSqlAdminClient.getInstance("angelstar-investments", "asv-tracker-sql");
  console.log(JSON.stringify(instance.ipAddresses, null, 2));
  console.log("ipv4Enabled:", instance.settings?.ipConfiguration?.ipv4Enabled);
  console.log("privateNetwork:", instance.settings?.ipConfiguration?.privateNetwork);
}

run().catch((err) => { console.error(err); process.exitCode = 1; });
