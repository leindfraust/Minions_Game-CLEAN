"use client";

import { useSyncExternalStore } from "react";

/**
 * Read an observable store.
 *
 * The server snapshot is used for server rendering and for hydration, so the
 * first client render matches the server exactly; React then re-reads the live
 * snapshot. No effect, no `setState`, no hydration mismatch.
 *
 * @template T
 * @param {{getSnapshot: () => T, getServerSnapshot: () => T, subscribe: (l: () => void) => () => void}} store
 * @returns {T}
 */
export function useStore(store) {
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
}
