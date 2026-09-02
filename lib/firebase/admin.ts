import { getApps, initializeApp, cert, type App, type Credential } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// verifySessionCookie/verifyIdToken only need Google's public JWKS + projectId, not an
// authenticated credential, which is why the Milestone 1 login flow already worked under
// plain `next dev` with no credential configured. Calling Google APIs as this app (e.g. the
// Data Connect Admin SDK in lib/dataconnect/client.ts) does need one, which `next dev` on a
// workstation has no ADC for. Bootstraps from the developer's own `firebase login` session —
// the exact same bridge functions/src/lib/dataconnect-admin.ts already uses for local Cloud
// SQL access — rather than a checked-in service-account key. Dynamically required so
// firebase-tools (a devDependency) is never loaded outside this local-only branch.
function localFirebaseCliCredential(): Credential {
  // Server Components fan out with Promise.all (e.g. the dashboard's MineView), so several
  // Data Connect calls request a token in the same tick. `apiv2.getAccessToken()` already
  // checks validity and refreshes internally (see firebase-tools/lib/apiv2.js) — it must be
  // called fresh every time, never cached here on top of that. What still needs de-duping is
  // concurrent *in-flight* calls: without it, several requests in the same tick each drive
  // their own requireAuth()/refresh cycle against the same on-disk CLI credentials file, and
  // racing writers there hand back an invalid token — this only memoizes the current fetch.
  //
  // firebase-admin's own FirebaseApp caches whatever `expires_in` this returns and won't call
  // getAccessToken() again until that expires (app/firebase-app.js) — apiv2.getAccessToken()
  // doesn't expose the real expiry, so report a short one (5 min) rather than the token's
  // actual ~1hr lifetime, forcing frequent re-validation through firebase-tools' own
  // haveValidTokens() check instead of trusting a token minted long ago in this dev session.
  let inFlight: Promise<{ access_token: string; expires_in: number }> | null = null;

  async function fetchToken() {
    // A literal require("firebase-tools/...") is still picked up by Webpack/Turbopack's
    // static bundle analysis and included in the production server output even though this
    // branch never runs there (FIREBASE_ADMIN_AUTH_MODE is only ever "local" in .env.local) —
    // confirmed by a 600MB deployed function bundle and a broken content-hashed external-
    // module reference at runtime in production. Routing through eval("require") hides the
    // module specifier from static analysis entirely, so no bundler ever attempts to include
    // firebase-tools (a devDependency) in what actually ships.
    const dynamicRequire = eval("require") as NodeJS.Require;
    const { getGlobalDefaultAccount } = dynamicRequire("firebase-tools/lib/auth");
    const { requireAuth } = dynamicRequire("firebase-tools/lib/requireAuth");
    const apiv2 = dynamicRequire("firebase-tools/lib/apiv2");
    const account = getGlobalDefaultAccount();
    if (!account) throw new Error("Not logged in — run `firebase login` first.");
    await requireAuth({ user: account.user, tokens: account.tokens });
    const access_token: string = await apiv2.getAccessToken();
    return { access_token, expires_in: 300 };
  }

  return {
    async getAccessToken() {
      if (!inFlight) {
        inFlight = fetchToken().finally(() => {
          inFlight = null;
        });
      }
      return inFlight;
    },
  };
}

// Server-only. Never import this file from a Client Component.
// Credentials come from GOOGLE_APPLICATION_CREDENTIALS / ADC in Cloud Functions and the
// Firebase-Hosting-managed SSR runtime — never from a checked-in service-account file.
function getAdminApp(): App {
  const existing = getApps().find((a) => a.name === "admin");
  if (existing) return existing;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  return initializeApp(
    {
      // Explicit projectId so verifyIdToken/verifySessionCookie can check the token audience
      // even without ADC available (e.g. plain `next dev` on a workstation) — without it,
      // the Admin SDK can't determine which project's public keys/audience to check against.
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      ...(serviceAccountJson
        ? { credential: cert(JSON.parse(serviceAccountJson)) }
        : process.env.FIREBASE_ADMIN_AUTH_MODE === "local"
          ? { credential: localFirebaseCliCredential() }
          : {}),
    },
    "admin"
  );
}

export const adminApp = getAdminApp();
export const adminAuth = getAuth(adminApp);
