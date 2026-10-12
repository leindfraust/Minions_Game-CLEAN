/**
 * Tiny observable stores over the persistence services.
 *
 * Why this exists rather than "read localStorage in an effect":
 *
 *  - `useSyncExternalStore` is React's supported way to read external mutable
 *    state. Its `getServerSnapshot` return value is used for server rendering
 *    *and* for hydration, then React re-reads the live snapshot immediately
 *    afterwards. That gives hydration-safe storage reads with no
 *    `setState`-in-effect and no server/client markup mismatch.
 *  - Snapshots are cached, because `useSyncExternalStore` requires a
 *    referentially stable value — returning a freshly parsed object from every
 *    call would re-render forever.
 *  - Subscribers are notified on write, so every component sharing a store
 *    updates together, and a `storage` event keeps other tabs in step.
 */

/**
 * @template T
 * @param {{
 *   read: () => T,
 *   write?: (value: T) => T | void,
 *   serverSnapshot: T,
 *   keys?: string[],
 * }} options
 * @param options.read          Reads and validates the current value.
 * @param options.write         Persists a value.
 * @param options.serverSnapshot Frozen default used on the server and during
 *                               hydration. Must be referentially stable.
 * @param options.keys          Storage keys that should invalidate this store
 *                              when another tab changes them. Empty means all.
 */
export function createStore({ read, write, serverSnapshot, keys = [] }) {
  /** @type {Set<() => void>} */
  const listeners = new Set();

  /** @type {T|undefined} */
  let snapshot;
  let hasSnapshot = false;
  /** @type {(() => void)|null} */
  let detachStorage = null;

  /** Drop the cached snapshot and tell everyone to re-read. */
  function invalidate() {
    hasSnapshot = false;
    listeners.forEach((listener) => listener());
  }

  /** Another tab wrote to storage. */
  function onStorage(event) {
    // A null key means storage was cleared wholesale.
    if (event.key === null || keys.length === 0 || keys.includes(event.key)) {
      invalidate();
    }
  }

  function getSnapshot() {
    if (!hasSnapshot) {
      snapshot = read();
      hasSnapshot = true;
    }
    return snapshot;
  }

  return {
    getSnapshot,

    /** Stable snapshot for the server render and for hydration. */
    getServerSnapshot: () => serverSnapshot,

    subscribe(listener) {
      listeners.add(listener);

      // Attach the cross-tab listener only while someone is subscribed.
      if (listeners.size === 1 && typeof window !== "undefined") {
        window.addEventListener("storage", onStorage);
        detachStorage = () => window.removeEventListener("storage", onStorage);
      }

      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          detachStorage?.();
          detachStorage = null;
        }
      };
    },

    /**
     * Persist a value (or the result of an updater) and notify subscribers.
     * @param {T | ((current: T) => T)} value
     */
    set(value) {
      const next = typeof value === "function" ? value(getSnapshot()) : value;
      write?.(next);
      invalidate();
      return next;
    },

    /** Re-read from storage without writing — after another service wrote. */
    refresh: invalidate,
  };
}

/**
 * A store over a CSS media query. Media state is external too, so it gets the
 * same treatment: never read during render, never set from an effect.
 *
 * @param {string} query
 * @param {boolean} [serverValue] What to assume before the browser can be asked.
 */
export function createMediaStore(query, serverValue = false) {
  /** @type {MediaQueryList|null} */
  let list = null;

  function media() {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return null;
    }
    list ??= window.matchMedia(query);
    return list;
  }

  return {
    getSnapshot: () => media()?.matches ?? serverValue,
    getServerSnapshot: () => serverValue,
    subscribe(listener) {
      const target = media();
      if (!target) return () => {};
      target.addEventListener("change", listener);
      return () => target.removeEventListener("change", listener);
    },
  };
}
