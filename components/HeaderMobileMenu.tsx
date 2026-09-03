"use client";

import { useState, type ReactNode } from "react";

// A hamburger toggle + dropdown panel for header nav on narrow screens. The parent header
// must be `relative` (or otherwise positioned) so the panel can anchor to it with `absolute`.
// Used instead of letting the pill nav wrap/scroll, since a logo + several pills + an account
// action competing for one row either overflows or wraps into an ugly zig-zag on a phone.
export function HeaderMobileMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200"
      >
        {open ? (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          </svg>
        )}
      </button>
      {open && (
        <div
          className="absolute inset-x-0 top-full z-50 flex flex-col gap-1 border-b border-zinc-200 bg-background px-4 py-3 shadow-lg"
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}
