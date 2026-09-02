"use client";

import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { clearSession } from "@/lib/auth/session-client";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    // Order matters: clear the server session cookie first so a slow client-side signOut
    // can't leave a stale authenticated cookie behind if the network call fails.
    await clearSession();
    await signOut(auth);
    router.push("/");
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm font-medium text-zinc-600 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
    >
      Sign out
    </button>
  );
}
