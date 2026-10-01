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
      className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:text-foreground dark:border-zinc-700 dark:text-zinc-400"
    >
      Sign out
    </button>
  );
}
