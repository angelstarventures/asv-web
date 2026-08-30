"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

export const SCENARIOS = ["optimistic", "balanced", "conservative"] as const;
export type Scenario = (typeof SCENARIOS)[number];

export const SCOPES = ["mine", "asv"] as const;
export type Scope = (typeof SCOPES)[number];

// State lives in the URL (?scope=&scenario=) so the toggle is shareable/bookmarkable and
// survives the back button without a client store (plan §4, dashboard page).
export function useScenario(defaultScenario: Scenario = "balanced") {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const scenario = useMemo<Scenario>(() => {
    const value = searchParams.get("scenario");
    return (SCENARIOS as readonly string[]).includes(value ?? "")
      ? (value as Scenario)
      : defaultScenario;
  }, [searchParams, defaultScenario]);

  const scope = useMemo<Scope>(() => {
    const value = searchParams.get("scope");
    return (SCOPES as readonly string[]).includes(value ?? "") ? (value as Scope) : "mine";
  }, [searchParams]);

  const setParams = useCallback(
    (next: Partial<{ scenario: Scenario; scope: Scope }>) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.scenario) params.set("scenario", next.scenario);
      if (next.scope) params.set("scope", next.scope);
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  return { scenario, scope, setScenario: (s: Scenario) => setParams({ scenario: s }), setScope: (s: Scope) => setParams({ scope: s }) };
}
