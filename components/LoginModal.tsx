"use client";

import { useState } from "react";
import { LoginForm } from "@/components/LoginForm";

// Popup member sign-in for the landing page — same LoginForm the full /login page uses
// (still reachable directly, e.g. as a redirect target for protected routes).
export function LoginModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-foreground px-6 py-3 text-base font-semibold text-background"
      >
        Member sign in
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-sm rounded-lg border border-zinc-200 bg-card p-6 shadow-xl dark:border-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="float-right text-sm text-zinc-500 hover:text-foreground"
            >
              ✕
            </button>
            <LoginForm />
          </div>
        </div>
      )}
    </>
  );
}
