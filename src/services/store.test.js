import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createStore, createMediaStore } from "./store";

afterEach(() => vi.unstubAllGlobals());

describe("createStore snapshots", () => {
  it("returns a referentially stable snapshot", () => {
    // useSyncExternalStore re-renders forever if this is not stable.
    const store = createStore({
      read: () => ({ value: 1 }),
      serverSnapshot: Object.freeze({ value: 0 }),
    });

    expect(store.getSnapshot()).toBe(store.getSnapshot());
  });

  it("reads from the source only once until invalidated", () => {
    const read = vi.fn(() => ({ value: 1 }));
    const store = createStore({ read, serverSnapshot: Object.freeze({}) });

    store.getSnapshot();
    store.getSnapshot();
    store.getSnapshot();

    expect(read).toHaveBeenCalledTimes(1);
  });

  it("returns a stable server snapshot", () => {
    const server = Object.freeze({ value: 0 });
    const store = createStore({ read: () => ({ value: 1 }), serverSnapshot: server });

    expect(store.getServerSnapshot()).toBe(server);
    expect(store.getServerSnapshot()).toBe(store.getServerSnapshot());
  });

  it("gives a different snapshot after a write", () => {
    let backing = { value: 1 };
    const store = createStore({
      read: () => backing,
      write: (next) => {
        backing = next;
      },
      serverSnapshot: Object.freeze({ value: 0 }),
    });

    const before = store.getSnapshot();
    store.set({ value: 2 });

    expect(store.getSnapshot()).not.toBe(before);
    expect(store.getSnapshot()).toEqual({ value: 2 });
  });
});

describe("createStore writes", () => {
  it("persists through the write function", () => {
    const write = vi.fn();
    const store = createStore({
      read: () => ({ value: 1 }),
      write,
      serverSnapshot: Object.freeze({}),
    });

    store.set({ value: 9 });

    expect(write).toHaveBeenCalledWith({ value: 9 });
  });

  it("supports an updater function", () => {
    let backing = { count: 1 };
    const store = createStore({
      read: () => backing,
      write: (next) => {
        backing = next;
      },
      serverSnapshot: Object.freeze({ count: 0 }),
    });

    store.set((current) => ({ count: current.count + 5 }));

    expect(store.getSnapshot()).toEqual({ count: 6 });
  });

  it("works without a write function, for read-only stores", () => {
    const store = createStore({ read: () => 1, serverSnapshot: 0 });
    expect(() => store.set(2)).not.toThrow();
  });
});

describe("createStore subscriptions", () => {
  it("notifies subscribers on write", () => {
    const store = createStore({
      read: () => ({ value: 1 }),
      write: () => {},
      serverSnapshot: Object.freeze({}),
    });
    const listener = vi.fn();
    store.subscribe(listener);

    store.set({ value: 2 });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("notifies every subscriber", () => {
    const store = createStore({ read: () => 1, write: () => {}, serverSnapshot: 0 });
    const a = vi.fn();
    const b = vi.fn();
    store.subscribe(a);
    store.subscribe(b);

    store.set(2);

    expect(a).toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
  });

  it("stops notifying after unsubscribe", () => {
    const store = createStore({ read: () => 1, write: () => {}, serverSnapshot: 0 });
    const listener = vi.fn();
    const off = store.subscribe(listener);

    off();
    store.set(2);

    expect(listener).not.toHaveBeenCalled();
  });

  it("notifies on refresh without writing", () => {
    const write = vi.fn();
    const store = createStore({ read: () => 1, write, serverSnapshot: 0 });
    const listener = vi.fn();
    store.subscribe(listener);

    store.refresh();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(write).not.toHaveBeenCalled();
  });

  it("re-reads the source after refresh", () => {
    let value = 1;
    const store = createStore({ read: () => value, serverSnapshot: 0 });

    expect(store.getSnapshot()).toBe(1);
    value = 2;
    // Still cached.
    expect(store.getSnapshot()).toBe(1);

    store.refresh();
    expect(store.getSnapshot()).toBe(2);
  });
});

describe("createStore cross-tab sync", () => {
  /** Capture the window listener the store attaches. */
  function trackWindow() {
    const handlers = {};
    vi.stubGlobal("window", {
      addEventListener: (type, fn) => {
        handlers[type] = fn;
      },
      removeEventListener: (type) => {
        delete handlers[type];
      },
    });
    return handlers;
  }

  it("invalidates when a watched key changes in another tab", () => {
    const handlers = trackWindow();
    let value = 1;
    const store = createStore({
      read: () => value,
      serverSnapshot: 0,
      keys: ["mote:player"],
    });
    const listener = vi.fn();
    store.subscribe(listener);
    store.getSnapshot();

    value = 2;
    handlers.storage({ key: "mote:player" });

    expect(listener).toHaveBeenCalled();
    expect(store.getSnapshot()).toBe(2);
  });

  it("ignores changes to keys it does not watch", () => {
    const handlers = trackWindow();
    const store = createStore({
      read: () => 1,
      serverSnapshot: 0,
      keys: ["mote:player"],
    });
    const listener = vi.fn();
    store.subscribe(listener);

    handlers.storage({ key: "some-other-app" });

    expect(listener).not.toHaveBeenCalled();
  });

  it("invalidates on a wholesale storage clear", () => {
    const handlers = trackWindow();
    const store = createStore({
      read: () => 1,
      serverSnapshot: 0,
      keys: ["mote:player"],
    });
    const listener = vi.fn();
    store.subscribe(listener);

    // A null key means storage was cleared.
    handlers.storage({ key: null });

    expect(listener).toHaveBeenCalled();
  });

  it("detaches the window listener once the last subscriber leaves", () => {
    const handlers = trackWindow();
    const store = createStore({ read: () => 1, serverSnapshot: 0 });

    const offA = store.subscribe(vi.fn());
    const offB = store.subscribe(vi.fn());
    expect(handlers.storage).toBeDefined();

    offA();
    expect(handlers.storage).toBeDefined();

    offB();
    expect(handlers.storage).toBeUndefined();
  });
});

describe("createMediaStore", () => {
  let listeners;

  beforeEach(() => {
    listeners = [];
    vi.stubGlobal("window", {
      matchMedia: (query) => ({
        matches: query.includes("coarse"),
        addEventListener: (_type, fn) => listeners.push(fn),
        removeEventListener: (_type, fn) => {
          listeners = listeners.filter((l) => l !== fn);
        },
      }),
    });
  });

  it("reports the current match", () => {
    expect(createMediaStore("(pointer: coarse)").getSnapshot()).toBe(true);
    expect(createMediaStore("(orientation: portrait)").getSnapshot()).toBe(false);
  });

  it("returns the server value before the browser can be asked", () => {
    expect(createMediaStore("(pointer: coarse)", false).getServerSnapshot()).toBe(false);
    expect(createMediaStore("(pointer: coarse)", true).getServerSnapshot()).toBe(true);
  });

  it("subscribes to and unsubscribes from media changes", () => {
    const store = createMediaStore("(pointer: coarse)");
    const off = store.subscribe(vi.fn());
    expect(listeners).toHaveLength(1);

    off();
    expect(listeners).toHaveLength(0);
  });

  it("degrades to the server value when matchMedia is unavailable", () => {
    vi.stubGlobal("window", {});
    const store = createMediaStore("(pointer: coarse)", false);

    expect(store.getSnapshot()).toBe(false);
    // Subscribing must still return a working unsubscribe.
    expect(() => store.subscribe(vi.fn())()).not.toThrow();
  });
});
