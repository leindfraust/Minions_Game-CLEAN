"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { usePlayer } from "@/hooks/usePlayer";
import { useSettings } from "@/hooks/useSettings";
import { useEquipped } from "@/hooks/useEquipped";
import { resetEverything } from "@/services/stores";

const GameStateContext = createContext(null);

/**
 * Shares player, settings and cosmetic state across routes.
 *
 * Mounted from the root layout so navigation does not throw state away, while
 * the route pages themselves stay Server Components. Every value comes from a
 * store read through `useSyncExternalStore`, so there is no storage read during
 * render and no hydration mismatch to guard against.
 */
export function GameStateProvider({ children }) {
  const { player, character, progress, select } = usePlayer();
  const { settings, update: updateSetting } = useSettings();
  const { equipped, equip, unequip } = useEquipped();

  /**
   * Which shared modal is open, if any. Lives here rather than in AppShell so
   * any screen can open How to Play, Settings or the Web3 explainer without
   * every route owning its own copy of those dialogs.
   */
  const [modal, setModal] = useState(null);
  const openModal = useCallback((id) => setModal(id), []);
  const closeModal = useCallback(() => setModal(null), []);

  const resetProgress = useCallback(() => resetEverything(), []);

  const value = useMemo(
    () => ({
      player,
      character,
      progress,
      selectCharacter: select,
      settings,
      updateSetting,
      equipped,
      equip,
      unequip,
      resetProgress,
      modal,
      openModal,
      closeModal,
    }),
    [
      player,
      character,
      progress,
      select,
      settings,
      updateSetting,
      equipped,
      equip,
      unequip,
      resetProgress,
      modal,
      openModal,
      closeModal,
    ],
  );

  return (
    <GameStateContext.Provider value={value}>{children}</GameStateContext.Provider>
  );
}

/** Access shared game state. Must be used inside `GameStateProvider`. */
export function useGameState() {
  const context = useContext(GameStateContext);
  if (!context) {
    throw new Error("useGameState must be used inside GameStateProvider");
  }
  return context;
}
