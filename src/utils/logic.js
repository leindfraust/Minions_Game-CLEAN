/**
 * Pure gameplay logic. No browser APIs, no React, no Phaser — so it runs
 * identically in the scene, in the UI and in unit tests.
 */

import { GAME, SCORING, PROGRESSION } from "@/game/config/constants";

/**
 * Parse a JSON string from storage, validating the result before trusting it.
 * Returns `fallback` for malformed JSON, `null`, or values that fail
 * `validate`, so corrupt storage can never crash a caller.
 *
 * @param {string|null} raw
 * @param {*} fallback
 * @param {(value: *) => boolean} [validate]
 */
export function parseStored(raw, fallback, validate = () => true) {
  try {
    const value = JSON.parse(raw);
    return value !== null && validate(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Seconds left on a cooldown, clamped to [0, duration].
 * Time is passed in explicitly so the caller controls the clock — the scene
 * passes its own pause-aware mission clock rather than wall time.
 *
 * @param {number} lastUsed  Mission time the ability was last used, in ms.
 * @param {number} now       Current mission time, in ms.
 * @param {number} duration  Cooldown length, in seconds.
 */
export function cooldownRemaining(lastUsed, now, duration) {
  return Math.max(0, Math.min(duration, duration - (now - lastUsed) / 1000));
}

/**
 * Whether an ability may fire right now.
 * @param {number} lastUsed
 * @param {number} now
 * @param {number} duration
 */
export function isAbilityReady(lastUsed, now, duration) {
  return cooldownRemaining(lastUsed, now, duration) === 0;
}

/**
 * Score a mission attempt.
 *
 * Cores always pay. Escaping adds a flat bonus plus a bonus for every second
 * left on the clock. Damage subtracts. Ability use pays a small amount up to
 * a cap, so spamming a cooldown cannot be farmed for points. Never negative.
 *
 * @param {{won: boolean, cores: number, elapsed: number, damage: number, abilityUses: number}} stats
 * @returns {number}
 */
export function calculateScore({ won, cores, elapsed, damage, abilityUses }) {
  const timeLeft = Math.max(0, GAME.duration - elapsed);
  const escape = won
    ? SCORING.escapeBonus + Math.round(timeLeft * SCORING.perSecondRemaining)
    : 0;

  return Math.max(
    0,
    cores * SCORING.perCore +
      escape -
      damage * SCORING.damagePenalty +
      Math.min(abilityUses, SCORING.abilityUseCap) * SCORING.perAbilityUse,
  );
}

/**
 * Experience earned for an attempt. A failed run still pays a little, so
 * practice is never wasted.
 * @param {{won: boolean, cores: number}} stats
 */
export function calculateXp({ won, cores }) {
  return (
    cores * SCORING.xpPerCore + (won ? SCORING.xpEscape : SCORING.xpAttempt)
  );
}

/**
 * Player level and progress toward the next level.
 * @param {number} xp
 */
export function levelFromXp(xp) {
  const safeXp = Number.isFinite(xp) && xp > 0 ? xp : 0;
  const into = safeXp % PROGRESSION.xpPerLevel;
  return {
    level: 1 + Math.floor(safeXp / PROGRESSION.xpPerLevel),
    into,
    needed: PROGRESSION.xpPerLevel,
    percent: (into / PROGRESSION.xpPerLevel) * 100,
  };
}

/**
 * Build a complete, persistable mission result from raw scene stats.
 * Clamps `elapsed` into the legal mission window and stamps an id and date so
 * results can be de-duplicated and sorted downstream.
 *
 * @param {{won: boolean, cores: number, elapsed: number, damage: number, abilityUses: number, character?: string}} stats
 */
export function generateResult(stats) {
  const result = {
    id: globalThis.crypto?.randomUUID?.() || `r-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    date: new Date().toISOString(),
    ...stats,
    cores: clamp(stats.cores, 0, GAME.cores),
    damage: Math.max(0, stats.damage ?? 0),
    abilityUses: Math.max(0, stats.abilityUses ?? 0),
    elapsed: clamp(stats.elapsed, 0, GAME.duration),
  };

  return {
    ...result,
    score: calculateScore(result),
    xp: calculateXp(result),
    /** Set once rewards have been banked, so they cannot be banked twice. */
    rewarded: false,
  };
}

/**
 * Clamp a number, treating non-finite input as the low bound.
 * @param {number} value
 * @param {number} low
 * @param {number} high
 */
export function clamp(value, low, high) {
  if (!Number.isFinite(value)) return low;
  return Math.max(low, Math.min(high, value));
}

/**
 * Filter the cosmetic catalog by category and rarity.
 * "All items" and "All rarities" act as pass-through values.
 *
 * @param {Array<{category: string, rarity: string}>} items
 * @param {string} category
 * @param {string} rarity
 */
export function filterInventory(items, category, rarity) {
  return items.filter(
    (item) =>
      (category === "All items" || item.category === category) &&
      (rarity === "All rarities" || item.rarity === rarity),
  );
}

/**
 * Format seconds as `M:SS` for the HUD and result screens.
 * @param {number} seconds
 */
export function formatClock(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/**
 * Decide what pressing the interact key should do.
 *
 * Pulled out of the scene so the win condition is testable without standing up
 * Phaser: it is the single rule that ends a mission successfully.
 *
 * @param {{distance: number, collected: number}} state
 *   `distance` is how far the player is from the portal, in pixels.
 * @returns {"escape" | "locked" | "too-far"}
 *   `escape` ends the mission as a win, `locked` means the portal is in reach
 *   but the cores are not all collected, `too-far` means out of range.
 */
export function resolveInteraction({ distance, collected }) {
  if (!Number.isFinite(distance) || distance > GAME.interactRadius) return "too-far";
  return collected >= GAME.cores ? "escape" : "locked";
}

/**
 * The objective line shown in the HUD, derived from mission progress so the
 * HUD and the scene can never disagree about what the player should do next.
 * @param {number} collected
 */
export function objectiveFor(collected) {
  if (collected >= GAME.cores) return "All cores secured. Reach the exit portal!";
  const left = GAME.cores - collected;
  return `Collect ${left} more Energy Core${left === 1 ? "" : "s"}.`;
}
