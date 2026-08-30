// One-off: creates a Firebase Auth test admin account with custom claims set directly
// (bypassing provisionMember / Postgres, which aren't wired up yet) so the login flow can be
// verified end-to-end in a browser. Reuses the Firebase CLI's own authenticated session,
// same trick as scripts/apply-post-migrations.js.
//
// Usage: node scripts/create-test-admin.js <email> <password>

const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { requireAuth } = require("firebase-tools/lib/requireAuth");
const { getGlobalDefaultAccount } = require("firebase-tools/lib/auth");
const apiv2 = require("firebase-tools/lib/apiv2");

async function run() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    throw new Error("Usage: create-test-admin <email> <password>");
  }

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

  let user;
  try {
    user = await auth.getUserByEmail(email);
    console.log(`User ${email} already exists (${user.uid}), updating password + claims.`);
    await auth.updateUser(user.uid, { password });
  } catch {
    user = await auth.createUser({ email, password });
    console.log(`Created user ${email} (${user.uid}).`);
  }

  await auth.setCustomUserClaims(user.uid, {
    role: "admin",
    status: "active",
    memberId: "00000",
  });
  console.log("Set custom claims: role=admin, status=active, memberId=00000");
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
