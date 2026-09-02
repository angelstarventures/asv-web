const { FBToolsAuthClient } = require("firebase-tools/lib/gcp/cloudsql/fbToolsAuthClient");
const { requireAuth } = require("firebase-tools/lib/requireAuth");
const { getGlobalDefaultAccount } = require("firebase-tools/lib/auth");

async function run() {
  const account = getGlobalDefaultAccount();
  await requireAuth({ user: account.user, tokens: account.tokens });

  const auth = new FBToolsAuthClient();
  const accessToken = await auth.getAccessToken();

  const body = {
    resourceNames: ["projects/angelstar-investments"],
    filter: `resource.type="cloud_run_revision" AND resource.labels.service_name="aiportfolioquery" AND timestamp>="${new Date(Date.now() - 20 * 60 * 1000).toISOString()}" AND textPayload:"aiPortfolioQuery"`,
    orderBy: "timestamp desc",
    pageSize: 100,
  };

  const res = await fetch("https://logging.googleapis.com/v2/entries:list", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken.token || accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error("ERR", res.status, JSON.stringify(data));
    return;
  }
  for (const entry of (data.entries || []).reverse()) {
    console.log(`[${entry.severity}] ${entry.timestamp} ${entry.textPayload}`);
  }
}

run().catch((err) => { console.error(err); process.exitCode = 1; });
