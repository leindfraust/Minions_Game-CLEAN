"use client";

import { missionStore } from "@/services/stores";
import { useStore } from "@/hooks/useStore";

/**
 * Mission history and best score.
 * Returns an empty history and a zero best during server render and hydration.
 */
export function useMissions() {
  return useStore(missionStore);
}
