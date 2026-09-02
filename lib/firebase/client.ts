import { getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
// Same region as functions/src/index.ts's setGlobalOptions — a callable region mismatch
// resolves to a 404, not an auth error, so this must track that value exactly.
export const functions = getFunctions(firebaseApp, "us-east1");

// Local dev talks to the Auth/Functions emulators, never real user credentials on a
// workstation — minting a session cookie needs real signing credentials that plain
// `next dev` doesn't have (see lib/firebase/admin.ts and app/api/auth/session/route.ts).
// Guarded by a module flag so a second connect*Emulator call (React Fast Refresh
// re-evaluating this module) doesn't throw "already connected".
declare global {
  // eslint-disable-next-line no-var
  var __ASV_AUTH_EMULATOR_CONNECTED__: boolean | undefined;
  // eslint-disable-next-line no-var
  var __ASV_FUNCTIONS_EMULATOR_CONNECTED__: boolean | undefined;
}
if (
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true" &&
  !globalThis.__ASV_AUTH_EMULATOR_CONNECTED__
) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099");
  globalThis.__ASV_AUTH_EMULATOR_CONNECTED__ = true;
}
// Decoupled from the auth-emulator flag above: testing a new/changed Cloud Function locally
// needs the Functions emulator, but real board members' local dev routine keeps using real
// production Auth (per NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false's own comment) — this lets
// either be toggled independently. Falls back to the combined flag if unset.
const USE_FUNCTIONS_EMULATOR =
  process.env.NEXT_PUBLIC_USE_FUNCTIONS_EMULATOR ?? process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR;
if (
  typeof window !== "undefined" &&
  USE_FUNCTIONS_EMULATOR === "true" &&
  !globalThis.__ASV_FUNCTIONS_EMULATOR_CONNECTED__
) {
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  globalThis.__ASV_FUNCTIONS_EMULATOR_CONNECTED__ = true;
}

// Protects the public, unauthenticated landing-page queries (board/member profiles, company
// list) from abuse. Authenticated server-to-server Data Connect calls use Admin SDK trust
// instead, per PRD §9's "public-facing endpoints" scope — this never runs server-side.
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
  initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
}
