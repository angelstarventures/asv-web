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
    serviceAccountJson
      ? { credential: cert(JSON.parse(serviceAccountJson)) }
      : {},
    "admin"
  );
}

export const adminAuth = getAuth(getAdminApp());
