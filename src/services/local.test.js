import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  playerService,
  settingsService,
  inventoryService,
  missionService,
  lastMissionService,
} from "./local";
import { __resetMemory } from "./storage";
import { COSMETICS, DEFAULT_SETTINGS } from "@/data/catalog";
import { PROGRESSION } from "@/game/config/constants";
import { generateResult } from "@/utils/logic";

/** A working in-memory stand-in for localStorage. */
function fakeStorage(seed = {}) {
  const data = { ...seed };
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value);
    },
    removeItem: (key) => {
      delete data[key];
    },
    clear: () => {
      Object.keys(data).forEach((k) => delete data[k]);
    },
    get length() {
      return Object.keys(data).length;
    },
    key: (i) => Object.keys(data)[i] ?? null,
  };
}

beforeEach(() => {
  __resetMemory();
  vi.stubGlobal("localStorage", fakeStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/* ------------------------------------------------------------------ player */

describe("playerService", () => {
  it("starts a new player at zero with the default Mote", () => {
    expect(playerService.get()).toMatchObject({
      xp: 0,
      balance: 0,
      selected: "volt",
    });
  });

  it("round-trips a saved player", () => {
    playerService.save({ name: "Lab Rookie", xp: 450, balance: 12, selected: "pip" });
    expect(playerService.get()).toMatchObject({ xp: 450, balance: 12, selected: "pip" });
  });

  it("only selects Motes that exist in the catalog", () => {
    playerService.select("moss");
    expect(playerService.get().selected).toBe("moss");

    playerService.select("not-a-mote");
    expect(playerService.get().selected).toBe("moss");
  });

  it.each([
    ["corrupt JSON", "{bad"],
    ["an array", "[]"],
    ["a negative xp", '{"xp":-5,"balance":0,"selected":"volt"}'],
    ["a non-numeric xp", '{"xp":"heaps","balance":0,"selected":"volt"}'],
    ["an unknown character", '{"xp":0,"balance":0,"selected":"gru"}'],
    ["a missing balance", '{"xp":10,"selected":"volt"}'],
    ["a JSON primitive", '"just a string"'],
  ])("falls back to defaults for %s", (_label, raw) => {
    vi.stubGlobal("localStorage", fakeStorage({ "mote:player": raw }));
    expect(playerService.get()).toMatchObject({ xp: 0, balance: 0, selected: "volt" });
  });
});

/* ---------------------------------------------------------------- settings */

describe("settingsService", () => {
  it("returns defaults for a fresh player", () => {
    expect(settingsService.get()).toEqual(DEFAULT_SETTINGS);
  });

  it("clamps out-of-range volumes into 0-100", () => {
    vi.stubGlobal(
      "localStorage",
      fakeStorage({ "mote:settings": '{"master":999,"music":-40,"sfx":50}' }),
    );
    const settings = settingsService.get();
    expect(settings.master).toBe(100);
    expect(settings.music).toBe(0);
    expect(settings.sfx).toBe(50);
  });

  it("rejects a value of the wrong type but keeps valid siblings", () => {
    vi.stubGlobal(
      "localStorage",
      fakeStorage({ "mote:settings": '{"mute":"yes please","sfx":33}' }),
    );
    const settings = settingsService.get();
    // "yes please" is not a boolean, so the default wins.
    expect(settings.mute).toBe(false);
    // A valid sibling in the same corrupt object survives.
    expect(settings.sfx).toBe(33);
  });

  it("falls back entirely for a non-object", () => {
    vi.stubGlobal("localStorage", fakeStorage({ "mote:settings": "[1,2,3]" }));
    expect(settingsService.get()).toEqual(DEFAULT_SETTINGS);
  });

  it("never returns unknown keys from storage", () => {
    vi.stubGlobal(
      "localStorage",
      fakeStorage({ "mote:settings": '{"master":50,"godMode":true}' }),
    );
    expect(settingsService.get()).not.toHaveProperty("godMode");
  });

  it("round-trips every setting", () => {
    const wanted = { ...DEFAULT_SETTINGS, master: 10, mute: true, reducedMotion: true };
    settingsService.save(wanted);
    expect(settingsService.get()).toEqual(wanted);
  });
});

/* --------------------------------------------------------------- inventory */

describe("inventoryService", () => {
  const unlocked = COSMETICS.find((i) => !i.locked);
  const locked = COSMETICS.find((i) => i.locked);

  it("starts with nothing equipped", () => {
    expect(inventoryService.get()).toEqual({});
  });

  it("equips an owned cosmetic", () => {
    inventoryService.equip(unlocked);
    expect(inventoryService.get()[unlocked.category]).toBe(unlocked.id);
  });

  it("refuses to equip a locked cosmetic", () => {
    expect(inventoryService.equip(locked)).toEqual({});
    expect(inventoryService.get()).toEqual({});
  });

  it("replaces the item in a category rather than stacking", () => {
    const visors = COSMETICS.filter((i) => i.category === "Visors" && !i.locked);
    inventoryService.equip(visors[0]);
    const second = COSMETICS.find(
      (i) => i.category === "Visors" && !i.locked && i.id !== visors[0].id,
    );
    if (second) {
      inventoryService.equip(second);
      expect(inventoryService.get().Visors).toBe(second.id);
    }
    expect(Object.keys(inventoryService.get())).toHaveLength(1);
  });

  it("keeps items from different categories side by side", () => {
    const boots = COSMETICS.find((i) => i.category === "Footwear" && !i.locked);
    const visor = COSMETICS.find((i) => i.category === "Visors" && !i.locked);
    inventoryService.equip(boots);
    inventoryService.equip(visor);
    expect(inventoryService.get()).toEqual({
      Footwear: boots.id,
      Visors: visor.id,
    });
  });

  it("unequips a category", () => {
    inventoryService.equip(unlocked);
    inventoryService.unequip(unlocked.category);
    expect(inventoryService.get()).toEqual({});
  });

  it("ignores a nullish item without throwing", () => {
    expect(() => inventoryService.equip(null)).not.toThrow();
    expect(() => inventoryService.equip(undefined)).not.toThrow();
  });

  it("discards stored loadouts naming items that do not exist", () => {
    vi.stubGlobal(
      "localStorage",
      fakeStorage({ "mote:equipped": '{"Visors":"nonexistent"}' }),
    );
    expect(inventoryService.get()).toEqual({});
  });

  it("discards a stored loadout that equips a locked item", () => {
    vi.stubGlobal(
      "localStorage",
      fakeStorage({ "mote:equipped": JSON.stringify({ [locked.category]: locked.id }) }),
    );
    // A crafted storage value must not grant a locked cosmetic.
    expect(inventoryService.get()).toEqual({});
  });

  it("discards a loadout that puts an item in the wrong category", () => {
    const visor = COSMETICS.find((i) => i.category === "Visors" && !i.locked);
    vi.stubGlobal(
      "localStorage",
      fakeStorage({ "mote:equipped": JSON.stringify({ Footwear: visor.id }) }),
    );
    expect(inventoryService.get()).toEqual({});
  });
});

/* ----------------------------------------------------------------- mission */

describe("missionService", () => {
  const win = { won: true, cores: 8, elapsed: 40, damage: 0, abilityUses: 1 };

  it("records a finished mission", () => {
    const result = missionService.finish(win);
    expect(missionService.history()).toHaveLength(1);
    expect(missionService.history()[0].id).toBe(result.id);
  });

  it("keeps only the five most recent results", () => {
    for (let i = 0; i < 7; i += 1) {
      missionService.finish({ ...win, elapsed: 40 + i });
    }
    expect(missionService.history()).toHaveLength(PROGRESSION.historyLimit);
  });

  it("keeps the newest result first", () => {
    const first = missionService.finish({ ...win, elapsed: 41 });
    const second = missionService.finish({ ...win, elapsed: 42 });
    const history = missionService.history();
    expect(history[0].id).toBe(second.id);
    expect(history[1].id).toBe(first.id);
  });

  it("tracks the best score and never lowers it", () => {
    missionService.finish({ ...win, elapsed: 40 });
    const high = missionService.best();
    expect(high).toBeGreaterThan(0);

    // A much worse run must not replace the best.
    missionService.finish({ won: false, cores: 0, elapsed: 90, damage: 3, abilityUses: 0 });
    expect(missionService.best()).toBe(high);
  });

  it("banks xp and cores into the player profile", () => {
    const result = missionService.finish(win);
    const player = playerService.get();
    expect(player.xp).toBe(result.xp);
    expect(player.balance).toBe(result.cores);
  });

  it("accumulates rewards across separate missions", () => {
    const a = missionService.finish(win);
    const b = missionService.finish({ ...win, elapsed: 45 });
    const player = playerService.get();
    expect(player.xp).toBe(a.xp + b.xp);
    expect(player.balance).toBe(a.cores + b.cores);
  });

  it("summarises progress", () => {
    missionService.finish(win);
    missionService.finish({ ...win, won: false });
    const summary = missionService.summary();
    expect(summary).toMatchObject({ runs: 2, escapes: 1 });
  });

  it("survives corrupt history and best-score storage", () => {
    vi.stubGlobal(
      "localStorage",
      fakeStorage({ "mote:results": "{not-an-array", "mote:best": '"high"' }),
    );
    expect(missionService.history()).toEqual([]);
    expect(missionService.best()).toBe(0);
  });

  it("discards a history array containing malformed entries", () => {
    vi.stubGlobal(
      "localStorage",
      fakeStorage({ "mote:results": '[{"id":"ok","score":10,"elapsed":5},{"nope":true}]' }),
    );
    expect(missionService.history()).toEqual([]);
  });

  it("rejects a negative stored best score", () => {
    vi.stubGlobal("localStorage", fakeStorage({ "mote:best": "-500" }));
    expect(missionService.best()).toBe(0);
  });

  it("clears every key on reset", () => {
    missionService.finish(win);
    expect(playerService.get().xp).toBeGreaterThan(0);

    missionService.reset();

    expect(missionService.history()).toEqual([]);
    expect(missionService.best()).toBe(0);
    expect(playerService.get().xp).toBe(0);
    expect(playerService.get().balance).toBe(0);
  });
});

/* ------------------------------------------------- reward de-duplication */

describe("reward de-duplication", () => {
  const win = { won: true, cores: 8, elapsed: 40, damage: 0, abilityUses: 1 };

  it("marks a banked result as rewarded", () => {
    expect(missionService.finish(win).rewarded).toBe(true);
  });

  it("does not pay twice when the same result is committed again", () => {
    const result = missionService.finish(win);
    const afterFirst = playerService.get();

    // This is what a refresh of /results, or a replayed navigation, would do.
    const again = missionService.commit(result);

    expect(again.id).toBe(result.id);
    expect(playerService.get().xp).toBe(afterFirst.xp);
    expect(playerService.get().balance).toBe(afterFirst.balance);
  });

  it("does not duplicate the history entry when re-committed", () => {
    const result = missionService.finish(win);
    missionService.commit(result);
    missionService.commit(result);

    expect(missionService.history()).toHaveLength(1);
    expect(missionService.history().filter((r) => r.id === result.id)).toHaveLength(1);
  });

  it("is idempotent across many repeats", () => {
    const result = missionService.finish(win);
    const expectedXp = playerService.get().xp;

    for (let i = 0; i < 12; i += 1) missionService.commit(result);

    expect(playerService.get().xp).toBe(expectedXp);
    expect(missionService.history()).toHaveLength(1);
  });

  it("still rewards a genuinely new mission after a repeat", () => {
    const first = missionService.finish(win);
    missionService.commit(first);

    const second = missionService.finish({ ...win, elapsed: 50 });

    expect(playerService.get().xp).toBe(first.xp + second.xp);
    expect(missionService.history()).toHaveLength(2);
  });

  it("banks a result that was generated but never committed", () => {
    // generateResult alone must not pay anything.
    const pending = generateResult(win);
    expect(playerService.get().xp).toBe(0);

    missionService.commit(pending);
    expect(playerService.get().xp).toBe(pending.xp);
  });
});

/* --------------------------------------------------------- blocked storage */

describe("storage failures never block play", () => {
  it("returns defaults when reads throw", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    });

    expect(playerService.get().xp).toBe(0);
    expect(settingsService.get()).toEqual(DEFAULT_SETTINGS);
    expect(missionService.history()).toEqual([]);
    expect(inventoryService.get()).toEqual({});
  });

  it("does not throw when writes fail", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota exceeded");
      },
      removeItem: () => {},
    });

    expect(() => playerService.save(playerService.get())).not.toThrow();
    expect(() => settingsService.save(DEFAULT_SETTINGS)).not.toThrow();
    expect(() =>
      missionService.finish({ won: true, cores: 8, elapsed: 40, damage: 0, abilityUses: 0 }),
    ).not.toThrow();
  });

  it("still returns a usable result object when nothing can be persisted", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota exceeded");
      },
      removeItem: () => {},
    });

    const result = missionService.finish({
      won: true,
      cores: 8,
      elapsed: 40,
      damage: 0,
      abilityUses: 0,
    });

    // The mission still scores, so /results can render the report.
    expect(result.score).toBeGreaterThan(0);
    expect(result.rewarded).toBe(true);
  });

  it("survives localStorage being absent entirely", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(() => playerService.get()).not.toThrow();
    expect(playerService.get().selected).toBe("volt");
    expect(() => playerService.save({ xp: 1, balance: 1, selected: "pip" })).not.toThrow();
  });
});

/* ----------------------------------------------------- last mission handoff */

describe("lastMissionService", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", fakeStorage());
  });

  it("hands a result from /play to /results", () => {
    const result = generateResult({
      won: true,
      cores: 8,
      elapsed: 40,
      damage: 0,
      abilityUses: 1,
    });
    lastMissionService.set(result);
    expect(lastMissionService.get().id).toBe(result.id);
  });

  it("returns null when there is nothing stored, for a direct visit", () => {
    expect(lastMissionService.get()).toBeNull();
  });

  it("returns null for corrupt or incomplete data", () => {
    vi.stubGlobal("sessionStorage", fakeStorage({ "mote:last-result": "{broken" }));
    expect(lastMissionService.get()).toBeNull();

    vi.stubGlobal("sessionStorage", fakeStorage({ "mote:last-result": '{"noScore":true}' }));
    expect(lastMissionService.get()).toBeNull();
  });

  it("clears the handoff", () => {
    lastMissionService.set(generateResult({ won: false, cores: 1, elapsed: 9, damage: 1, abilityUses: 0 }));
    lastMissionService.clear();
    expect(lastMissionService.get()).toBeNull();
  });

  it("does not throw when sessionStorage is blocked", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    });
    expect(() => lastMissionService.set({ score: 1 })).not.toThrow();
    expect(lastMissionService.get()).toBeNull();
  });
});
