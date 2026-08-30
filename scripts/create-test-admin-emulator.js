// Creates a test admin user in the local Auth EMULATOR (not real Firebase Auth) — no
// credentials needed at all when FIREBASE_AUTH_EMULATOR_HOST is set. Useful for exercising
// the login flow locally without real signing credentials (see .env.local's comment).
//
// Usage: node scripts/create-test-admin-emulator.js <email> <password>
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";

const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

async function run() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    throw new Error("Usage: create-test-admin-emulator <email> <password>");
  }

  const app = initializeApp({ projectId: "angelstar-investments" });
  const auth = getAuth(app);

  let user;
  try {
    user = await auth.getUserByEmail(email);
    await auth.updateUser(user.uid, { password });
    console.log(`Updated existing emulator user ${email} (${user.uid}).`);
  } catch {
    user = await auth.createUser({ email, password });
    console.log(`Created emulator user ${email} (${user.uid}).`);
  }

  await auth.setCustomUserClaims(user.uid, { role: "admin", status: "active", memberId: "00000" });
  console.log("Set custom claims: role=admin, status=active, memberId=00000");
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
