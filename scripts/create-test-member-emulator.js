// Creates a MEMBER test account in the local Auth EMULATOR (mirrors
// create-test-admin-emulator.js, but role=member with a real seeded memberId so the
// scope=mine dashboard/detail views have actual allocations/valuations to render).
//
// Usage: node scripts/create-test-member-emulator.js <email> <password> <memberId> [status]
// status defaults to "active"; pass "disabled" to test proxy.ts's disabled-account block.
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";

const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

async function run() {
  const [email, password, memberId, status = "active"] = process.argv.slice(2);
  if (!email || !password || !memberId) {
    throw new Error("Usage: create-test-member-emulator <email> <password> <memberId> [status]");
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

  await auth.setCustomUserClaims(user.uid, { role: "member", status, memberId });
  console.log(`Set custom claims: role=member, status=${status}, memberId=${memberId}`);
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
