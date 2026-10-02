// Sets custom claims for venturedesk53@gmail.com
// Usage: node scripts/set-claims.js
process.env.FIREBASE_AUTH_EMULATOR_HOST = ""; // ensure real Firebase Auth, not emulator

const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { requireAuth } = require("firebase-tools/lib/requireAuth");
const { getGlobalDefaultAccount } = require("firebase-tools/lib/auth");
const apiv2 = require("firebase-tools/lib/apiv2");

async function run() {
  const account = getGlobalDefaultAccount();
  if (!account) throw new Error("Not logged in — run `firebase login` first.");
  await requireAuth({ user: account.user, tokens: account.tokens });

  const credential = {
    getAccessToken: async () => {
      const token = await apiv2.getAccessToken();
      return { access_token: token, expires_in: 3600 };
    },
  };

  const app = initializeApp({ credential, projectId: "angelstar-investments" });
  const auth = getAuth(app);

  const user = await auth.getUserByEmail("venturedesk53@gmail.com");
  console.log(`Found user: ${user.uid}`);
  await auth.setCustomUserClaims(user.uid, {
    role: "dev_site_admin",
    status: "active",
    memberId: "00112",
  });
  console.log("✅ Custom claims set: role=dev_site_admin, status=active, memberId=00112");
}

run().catch((err) => { console.error(err); process.exitCode = 1; });