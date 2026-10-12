"use client";

import { createMediaStore } from "@/services/store";
import { useStore } from "@/hooks/useStore";

/** Below this width, gameplay treats the viewport as a phone. */
const SMALL_SCREEN = 820;

/*
  Media stores are created once at module scope: one MediaQueryList per query,
  shared by every component that asks.
*/
const portraitPhoneStore = createMediaStore(
  `(orientation: portrait) and (max-width: ${SMALL_SCREEN}px)`,
  // The server cannot know the viewport, so it assumes landscape and lets the
  // client correct it on hydration.
  false,
);

const touchStore = createMediaStore("(pointer: coarse)", false);

/** True when gameplay should ask the player to rotate the device. */
export function useNeedsRotation() {
  return useStore(portraitPhoneStore);
}

/** True on touch-primary devices, which get the on-screen controls. */
export function useTouchDevice() {
  return useStore(touchStore);
}
