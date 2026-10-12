"use client";

import { useCallback } from "react";
import { equippedStore, equipCosmetic, unequipCategory } from "@/services/stores";
import { useStore } from "@/hooks/useStore";

/** Equipped cosmetics, keyed by category. */
export function useEquipped() {
  const equipped = useStore(equippedStore);

  // Both go through the service, which refuses locked items.
  const equip = useCallback((item) => equipCosmetic(item), []);
  const unequip = useCallback((category) => unequipCategory(category), []);

  return { equipped, equip, unequip };
}
