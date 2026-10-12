/**
 * Safe localStorage helpers.
 *
 * Every read is validated against a schema predicate and falls back to a
 * default; every write is wrapped. Storage being unavailable (private mode,
 * blocked cookies, quota exceeded, SSR) degrades to in-memory behaviour and
 * never prevents playing.
 */

import { parseStored } from "@/utils/logic";

const PREFIX = "mote:";

/** In-memory fallback so a session still behaves when storage is blocked. */
const memory = new Map();

/** @returns {boolean} true when a real Storage object is reachable. */
function available() {
  try {
    return typeof localStorage !== "undefined" && localStorage !== null;
  } catch {
    return false;
  }
}

/**
 * Read and validate a persisted value.
 * @param {string} key
 * @param {*} fallback
 * @param {(value: *) => boolean} [validate]
 */
export function readKey(key, fallback, validate) {
  const full = PREFIX + key;
  try {
    const raw = available() ? localStorage.getItem(full) : memory.get(full);
    return parseStored(raw ?? null, fallback, validate);
  } catch {
    return fallback;
  }
}

/**
 * Persist a value. Returns the value so callers can write and assign in one
 * step, and still get the right value back when storage is unavailable.
 * @template T
 * @param {string} key
 * @param {T} value
 * @returns {T}
 */
export function writeKey(key, value) {
  const full = PREFIX + key;
  const raw = JSON.stringify(value);
  try {
    if (available()) localStorage.setItem(full, raw);
    else memory.set(full, raw);
  } catch {
    // Keep the value for this session even if it cannot be persisted.
    try {
      memory.set(full, raw);
    } catch {
      /* Nothing else to try; play continues without persistence. */
    }
  }
  return value;
}

/**
 * Remove a persisted value.
 * @param {string} key
 */
export function removeKey(key) {
  const full = PREFIX + key;
  try {
    if (available()) localStorage.removeItem(full);
  } catch {
    /* Ignore: nothing to remove. */
  }
  memory.delete(full);
}

/**
 * Clear every key this app owns, leaving other sites' and other apps' keys on
 * the same origin alone.
 *
 * Uses the standard `length`/`key(i)` Storage API rather than `Object.keys`,
 * which is not part of the Storage interface and is not implemented by every
 * Storage-like object. Keys are collected before removing any, because
 * removing during iteration shifts the indices.
 */
export function clearAll() {
  try {
    if (available()) {
      const keys = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && key.startsWith(PREFIX)) keys.push(key);
      }
      keys.forEach((key) => localStorage.removeItem(key));
    }
  } catch {
    /* Ignore: a failed reset must not throw at the player. */
  }
  memory.clear();
}

/** Test seam: drop the in-memory fallback between tests. */
export function __resetMemory() {
  memory.clear();
}
