// Inspects a deployed function's config to find its runtime service account.
// Usage: node scripts/check-function-sa.js --project <id> --region <region> --function <name>
// All flags default to ASV's current values.
const { requireAuth } = require("firebase-tools/lib/requireAuth");
const { getGlobalDefaultAccount } = require("firebase-tools/lib/auth");
const apiv2 = require("firebase-tools/lib/apiv2");

const ASV_DEFAULTS = {
  projectId: "angelstar-investments",
  region: "us-east1",
  functionName: "provisionMember",
};

function parseArgs(argv) {
  const get = (flag) => {
    const idx = argv.indexOf(flag);
    return idx >= 0 ? argv[idx + 1] : undefined;
  };
  return {
    projectId: get("--project") ?? ASV_DEFAULTS.projectId,
    region: get("--region") ?? ASV_DEFAULTS.region,
    functionName: get("--function") ?? ASV_DEFAULTS.functionName,
  };
}

async function run() {
  const { projectId, region, functionName } = parseArgs(process.argv.slice(2));

  console.log(`Checking SA for ${projectId}/${region}/${functionName}`);

  const account = getGlobalDefaultAccount();
  await requireAuth({ user: account.user, tokens: account.tokens });

  const client = new apiv2.Client({ urlPrefix: "https://cloudfunctions.googleapis.com", auth: true });
  const res = await client.get(
    `/v2/projects/${projectId}/locations/${region}/functions/${functionName}`
  );
  console.log(JSON.stringify(res.body.serviceConfig, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
