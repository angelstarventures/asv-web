import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

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
      ...(serviceAccountJson ? { credential: cert(JSON.parse(serviceAccountJson)) } : {}),
    },
    "admin"
  );
}

export const adminAuth = getAuth(getAdminApp());
