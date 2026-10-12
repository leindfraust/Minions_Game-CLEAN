"use client";

import { useCallback, useEffect } from "react";
import { settingsStore } from "@/services/stores";
import { useStore } from "@/hooks/useStore";

/**
 * Player settings, persisted and mirrored onto the document root so CSS can
 * react to "reduced motion" without threading a prop through every component.
 */
export function useSettings() {
  const settings = useStore(settingsStore);

  // Writing to the DOM from an effect is exactly what effects are for:
  // synchronising React state out to an external system.
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = settings.reducedMotion
      ? "true"
      : "false";
  }, [settings.reducedMotion]);

  /** Change one setting and persist it. */
  const update = useCallback(
    (key, value) => settingsStore.set((current) => ({ ...current, [key]: value })),
    [],
  );

  return { settings, update };
}
