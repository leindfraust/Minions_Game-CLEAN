"use client";

import { useCallback } from "react";
import { playerStore } from "@/services/stores";
import { useStore } from "@/hooks/useStore";
import { getCharacter, CHARACTERS } from "@/data/catalog";
import { levelFromXp } from "@/utils/logic";

/** The player profile, their selected Mote and derived level progress. */
export function usePlayer() {
  const player = useStore(playerStore);

  /** Persist a Mote selection, ignoring ids that are not in the catalog. */
  const select = useCallback((id) => {
    if (!CHARACTERS.some((c) => c.id === id)) return;
    playerStore.set((current) => ({ ...current, selected: id }));
  }, []);

  return {
    player,
    character: getCharacter(player.selected),
    progress: levelFromXp(player.xp),
    select,
  };
}
