// One-off: inspects a deployed function's config to find its runtime service account.
const { requireAuth } = require("firebase-tools/lib/requireAuth");
const { getGlobalDefaultAccount } = require("firebase-tools/lib/auth");
const apiv2 = require("firebase-tools/lib/apiv2");

async function run() {
  const account = getGlobalDefaultAccount();
  await requireAuth({ user: account.user, tokens: account.tokens });

  const client = new apiv2.Client({ urlPrefix: "https://cloudfunctions.googleapis.com", auth: true });
  const res = await client.get(
    "/v2/projects/angelstar-investments/locations/us-east1/functions/provisionMember"
  );
  console.log(JSON.stringify(res.body.serviceConfig, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
