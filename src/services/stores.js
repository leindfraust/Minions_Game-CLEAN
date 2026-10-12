/**
 * The application's stores. One module so every component shares the same
 * instances, and so a write through one hook is seen by every other reader.
 */

import { createStore } from "@/services/store";
import {
  playerService,
  settingsService,
  inventoryService,
  missionService,
  lastMissionService,
} from "@/services/local";
import { DEFAULT_SETTINGS, DEFAULT_CHARACTER_ID } from "@/data/catalog";

/*
  Server snapshots are frozen module constants: `useSyncExternalStore` compares
  them by reference, so they must be the same object on every call.
*/

const SERVER_PLAYER = Object.freeze({
  name: "Lab Rookie",
  xp: 0,
  balance: 0,
  selected: DEFAULT_CHARACTER_ID,
});

const SERVER_SETTINGS = Object.freeze({ ...DEFAULT_SETTINGS });
const SERVER_EQUIPPED = Object.freeze({});
const SERVER_MISSIONS = Object.freeze({ history: Object.freeze([]), best: 0 });

export const playerStore = createStore({
  read: () => playerService.get(),
  write: (value) => playerService.save(value),
  serverSnapshot: SERVER_PLAYER,
  keys: ["mote:player"],
});

export const settingsStore = createStore({
  read: () => settingsService.get(),
  write: (value) => settingsService.save(value),
  serverSnapshot: SERVER_SETTINGS,
  keys: ["mote:settings"],
});

export const equippedStore = createStore({
  read: () => inventoryService.get(),
  // Writes go through inventoryService so locked items stay refused.
  serverSnapshot: SERVER_EQUIPPED,
  keys: ["mote:equipped"],
});

export const missionStore = createStore({
  read: () => ({
    history: missionService.history(),
    best: missionService.best(),
  }),
  serverSnapshot: SERVER_MISSIONS,
  keys: ["mote:results", "mote:best"],
});

/**
 * Equip a cosmetic and refresh the store from what was actually persisted, so
 * a refused locked item does not appear equipped in the UI.
 */
export function equipCosmetic(item) {
  inventoryService.equip(item);
  equippedStore.refresh();
}

export function unequipCategory(category) {
  inventoryService.unequip(category);
  equippedStore.refresh();
}

/** Bank a finished mission and refresh every store it touches. */
export function commitMission(stats) {
  const result = missionService.finish(stats);
  missionStore.refresh();
  playerStore.refresh();
  return result;
}

/** Wipe local progress and refresh everything. */
export function resetEverything() {
  missionService.reset();
  [playerStore, settingsStore, equippedStore, missionStore].forEach((store) =>
    store.refresh(),
  );
}

/**
 * The /play -> /results hand-off.
 *
 * sessionStorage rather than a query string: it survives a refresh of
 * /results, keeps a forgeable score out of the URL, and is scoped to the tab.
 * The server snapshot is `null`, which is exactly what /results renders as its
 * empty state, so a direct visit degrades gracefully with no flash.
 */
export const lastMissionStore = createStore({
  read: () => lastMissionService.get(),
  write: (value) => lastMissionService.set(value),
  serverSnapshot: null,
  keys: ["mote:last-result"],
});

/** Record the finished mission and publish it to /results. */
export function publishMissionResult(result) {
  lastMissionService.set(result);
  lastMissionStore.refresh();
  return result;
}
