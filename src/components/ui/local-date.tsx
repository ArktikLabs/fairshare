"use client";

import { useSyncExternalStore } from "react";
import { formatDate } from "@/lib/utils";

const noop = () => () => {};

/** False during server render and hydration, true afterwards. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}

/**
 * A timestamp's date in the browser's time zone, rendered hydration-safe:
 * the server and the hydrating client both print it in UTC, then the client
 * switches to local time. (Plain formatDate() in a client component gives the
 * server's zone on the server and the browser's zone on the client, which
 * differ around midnight and break hydration, React #418.)
 */
export function LocalDate({ value }: { value: Date | string }) {
  const hydrated = useHydrated();
  const iso = typeof value === "string" ? value : value.toISOString();
  return <time dateTime={iso}>{formatDate(iso, hydrated ? null : "UTC")}</time>;
}
