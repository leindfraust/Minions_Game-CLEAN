"use client";

import { useSyncExternalStore } from "react";

/** Never changes, so no subscriber is ever notified. */
const noop = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * False during server rendering and hydration, true on every render after.
 *
 * This is the effect-free version of a "mounted" flag: `useSyncExternalStore`
 * uses `getServerSnapshot` for the server render *and* for hydration, then
 * switches to the client snapshot once hydration finishes.
 *
 * Use it to gate anything that must read a real stored value rather than the
 * deterministic default that hydration sees.
 */
export function useHydrated() {
  return useSyncExternalStore(noop, onClient, onServer);
}
