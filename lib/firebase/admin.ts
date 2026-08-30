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
  // Data Connect calls request a token in the same tick. Without de-duping, concurrent calls
  // each drive their own firebase-tools requireAuth()/token-refresh cycle against the same
  // on-disk CLI credentials file, and racing writers there hand back an invalid token — this
  // memoizes one in-flight fetch (and reuses it until near expiry) so only one refresh ever
  // happens at a time.
  let cached: { token: { access_token: string; expires_in: number }; fetchedAt: number } | null = null;
  let inFlight: Promise<{ access_token: string; expires_in: number }> | null = null;

  async function fetchToken() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getGlobalDefaultAccount } = require("firebase-tools/lib/auth");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireAuth } = require("firebase-tools/lib/requireAuth");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const apiv2 = require("firebase-tools/lib/apiv2");
    const account = getGlobalDefaultAccount();
    if (!account) throw new Error("Not logged in — run `firebase login` first.");
    await requireAuth({ user: account.user, tokens: account.tokens });
    const access_token: string = await apiv2.getAccessToken();
    return { access_token, expires_in: 3600 };
  }

  return {
    async getAccessToken() {
      const ageMs = cached ? Date.now() - cached.fetchedAt : Infinity;
      if (cached && ageMs < 30 * 60 * 1000) return cached.token;
      if (!inFlight) {
        inFlight = fetchToken().finally(() => {
          inFlight = null;
        });
      }
      const token = await inFlight;
      cached = { token, fetchedAt: Date.now() };
      return token;
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
