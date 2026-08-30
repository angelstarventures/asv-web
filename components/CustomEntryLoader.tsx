"use client";

import { useEffect, useState } from "react";
import { eventTypesGetByKey, type EventTypesGetByKeyOutput } from "@/lib/functions/ledgerWrites";
import { EntryForm } from "./EntryForm";

interface Company {
  id: string;
  name: string;
  sector?: string | null;
}

// Fetches a custom EventTypeDefinition via the eventTypesGetByKey callable on mount — see the
// note on app/admin/ledger/entry/[eventType]/page.tsx for why this can't happen server-side.
export function CustomEntryLoader({ eventTypeKey, companies }: { eventTypeKey: string; companies: Company[] }) {
  const [state, setState] = useState<
    { status: "loading" } | { status: "error"; message: string } | { status: "ready"; def: EventTypesGetByKeyOutput }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    eventTypesGetByKey(eventTypeKey)
      .then((def) => {
        if (!cancelled) setState({ status: "ready", def });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ status: "error", message: err instanceof Error ? err.message : "Unknown event type." });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [eventTypeKey]);

  if (state.status === "loading") {
    return <p className="text-sm text-zinc-500 dark:text-zinc-500">Loading...</p>;
  }
  if (state.status === "error") {
    return <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>;
  }

  return (
    <>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{state.def.label}</h1>
        {state.def.description && (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">{state.def.description}</p>
        )}
      </div>
      <EntryForm
        eventType={{ key: state.def.key, label: state.def.label, isBuiltin: false, fields: state.def.fields }}
        companies={companies}
      />
    </>
  );
}
