/**
 * Mock persistence layer.
 *
 * Each service owns one storage key, validates what it reads, and exposes a
 * narrow API. Swapping localStorage for a real backend means reimplementing
 * these functions only — no UI or gameplay code reads storage directly.
 */

import { readKey, writeKey, clearAll } from "@/services/storage";
import { generateResult, clamp } from "@/utils/logic";
import { GAME, PROGRESSION } from "@/game/config/constants";
import {
  CHARACTERS,
  COSMETICS,
  DEFAULT_SETTINGS,
  DEFAULT_CHARACTER_ID,
} from "@/data/catalog";

const isPlainObject = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v);

/* ------------------------------------------------------------------ player */

const PLAYER_DEFAULT = Object.freeze({
  name: "Lab Rookie",
  xp: 0,
  balance: 0,
  selected: DEFAULT_CHARACTER_ID,
});

const validPlayer = (v) =>
  isPlainObject(v) &&
  Number.isFinite(v.xp) &&
  v.xp >= 0 &&
  Number.isFinite(v.balance) &&
  v.balance >= 0 &&
  CHARACTERS.some((c) => c.id === v.selected);

export const playerService = {
  /** @returns {{name: string, xp: number, balance: number, selected: string}} */
  get: () => ({ ...PLAYER_DEFAULT, ...readKey("player", PLAYER_DEFAULT, validPlayer) }),
  save: (value) => writeKey("player", value),
  /** Persist the chosen Mote, ignoring ids that are not in the catalog. */
  select(id) {
    if (!CHARACTERS.some((c) => c.id === id)) return playerService.get();
    return writeKey("player", { ...playerService.get(), selected: id });
  },
};

/* ---------------------------------------------------------------- settings */

export const settingsService = {
  /**
   * Read settings, coercing each field individually. A corrupt or partial
   * object yields defaults per-field rather than discarding everything, and
   * out-of-range volumes are clamped to 0-100.
   */
  get() {
    const stored = readKey("settings", {}, isPlainObject);
    return Object.fromEntries(
      Object.entries(DEFAULT_SETTINGS).map(([key, fallback]) => {
        const value = stored[key];
        if (typeof value !== typeof fallback) return [key, fallback];
        return [key, typeof fallback === "number" ? clamp(value, 0, 100) : value];
      }),
    );
  },
  save: (value) => writeKey("settings", value),
};

/* --------------------------------------------------------------- inventory */

/** An equipped map is valid only if every entry names an owned, unlocked item. */
const validEquipped = (v) =>
  isPlainObject(v) &&
  Object.entries(v).every(([category, id]) =>
    COSMETICS.some(
      (item) => item.category === category && item.id === id && !item.locked,
    ),
  );

export const inventoryService = {
  items: COSMETICS,
  /** @returns {Record<string, string>} category -> cosmetic id */
  get: () => readKey("equipped", {}, validEquipped),
  /**
   * Equip a cosmetic. Locked items are refused, so a crafted storage value or
   * a stale UI cannot equip something the player does not own.
   */
  equip(item) {
    if (!item || item.locked) return inventoryService.get();
    return writeKey("equipped", {
      ...inventoryService.get(),
      [item.category]: item.id,
    });
  },
  /** Remove whatever is equipped in a category. */
  unequip(category) {
    const next = { ...inventoryService.get() };
    delete next[category];
    return writeKey("equipped", next);
  },
};

/* ----------------------------------------------------------------- mission */

const validHistory = (v) =>
  Array.isArray(v) &&
  v.every(
    (r) =>
      isPlainObject(r) &&
      typeof r.id === "string" &&
      Number.isFinite(r.score) &&
      Number.isFinite(r.elapsed),
  );

export const missionService = {
  /** Most recent results, newest first. */
  history: () => readKey("results", [], validHistory),
  best: () => readKey("best", 0, (v) => Number.isFinite(v) && v >= 0),

  /**
   * Turn raw scene stats into a stored result and bank its rewards exactly
   * once.
   *
   * Reward de-duplication matters because /results is a real route: a refresh
   * or a back-navigation must not pay XP and cores again. The result is
   * written with `rewarded: true` and the id is remembered, so a replay of the
   * same result is a no-op that returns the already-stored record.
   *
   * @param {object} stats
   * @returns {object} the persisted result
   */
  finish(stats) {
    const result = generateResult(stats);
    return missionService.commit(result);
  },

  /**
   * Persist a result and award its rewards if they have not been awarded.
   * Idempotent on `result.id`.
   */
  commit(result) {
    const history = missionService.history();
    const existing = history.find((r) => r.id === result.id);
    if (existing?.rewarded) return existing;

    const banked = { ...result, rewarded: true };

    writeKey(
      "results",
      [banked, ...history.filter((r) => r.id !== result.id)].slice(
        0,
        PROGRESSION.historyLimit,
      ),
    );
    writeKey("best", Math.max(banked.score, missionService.best()));

    const player = playerService.get();
    playerService.save({
      ...player,
      xp: player.xp + banked.xp,
      balance: player.balance + banked.cores,
    });

    return banked;
  },

  /** Aggregate stats for the profile panel. */
  summary() {
    const history = missionService.history();
    return {
      runs: history.length,
      escapes: history.filter((r) => r.won).length,
      best: missionService.best(),
      totalCores: history.reduce((sum, r) => sum + (r.cores || 0), 0),
      maxCores: GAME.cores,
    };
  },

  /** Wipe all local progress. */
  reset: () => clearAll(),
};

/* --------------------------------------------------- last mission handoff */

/**
 * The bridge between /play and /results.
 *
 * The mission result is handed over through sessionStorage rather than a
 * query string: it survives a refresh of /results, does not leak a forgeable
 * score into the URL, and is scoped to the tab. /results renders an empty
 * state when this is missing, so a direct visit is always graceful.
 */
const LAST_KEY = "mote:last-result";

export const lastMissionService = {
  set(result) {
    try {
      sessionStorage.setItem(LAST_KEY, JSON.stringify(result));
    } catch {
      /* Results screen falls back to its empty state. */
    }
    return result;
  },
  get() {
    try {
      const raw = sessionStorage.getItem(LAST_KEY);
      if (!raw) return null;
      const value = JSON.parse(raw);
      return isPlainObject(value) && Number.isFinite(value.score) ? value : null;
    } catch {
      return null;
    }
  },
  clear() {
    try {
      sessionStorage.removeItem(LAST_KEY);
    } catch {
      /* Ignore. */
    }
  },
};
