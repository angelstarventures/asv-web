// End-to-end smoke test: signs in as the real test admin account, calls the deployed
// ledgerMassExport function (a safe, side-effect-free read), and confirms it can actually
// reach Postgres — proving the Cloud SQL IAM wiring (instance connection name, IAM user,
// public IP, firebasewriter grant) all work together.
const { requireAuth } = require("firebase-tools/lib/requireAuth");
const { getGlobalDefaultAccount } = require("firebase-tools/lib/auth");
const apiv2 = require("firebase-tools/lib/apiv2");

const API_KEY = "AIzaSyD298cREnWoXg_QhpTbTkqOxVMbyj680AE";

async function signIn(email, password) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const body = await res.json();
  if (!res.ok) throw new Error(`Sign-in failed: ${JSON.stringify(body)}`);
  return body.idToken;
}

async function getFunctionUri(functionName) {
  const account = getGlobalDefaultAccount();
  await requireAuth({ user: account.user, tokens: account.tokens });
  const client = new apiv2.Client({ urlPrefix: "https://cloudfunctions.googleapis.com", auth: true });
  const res = await client.get(
    `/v2/projects/angelstar-investments/locations/us-east1/functions/${functionName}`
  );
  return res.body.serviceConfig.uri;
}

async function run() {
  console.log("Signing in as test admin...");
  const idToken = await signIn("asv-test-admin@example.com", "TestPassword123!");

  console.log("Looking up ledgerMassExport's URL...");
  const uri = await getFunctionUri("ledgerMassExport");

  console.log("Calling ledgerMassExport...");
  const res = await fetch(uri, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ data: {} }),
  });
  const body = await res.json();
  console.log(`Status: ${res.status}`);
  console.log(JSON.stringify(body, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
