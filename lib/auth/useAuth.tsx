"use client";

// UI polish only (spinners, conditional nav) — never a security boundary. The only real
// enforcement point is middleware.ts verifying the __session cookie server-side (plan §4).
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onIdTokenChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import type { AsvCustomClaims } from "./claims";

interface AuthState {
  user: User | null;
  claims: Partial<AsvCustomClaims> | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({ user: null, claims: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, claims: null, loading: true });

  useEffect(() => {
    return onIdTokenChanged(auth, async (user) => {
      if (!user) {
        setState({ user: null, claims: null, loading: false });
        return;
      }
      const { claims } = await user.getIdTokenResult();
      setState({ user, claims: claims as Partial<AsvCustomClaims>, loading: false });
    });
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
