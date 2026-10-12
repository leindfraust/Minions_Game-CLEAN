/** `/inventory` — cosmetic inventory. Server Component wrapper for metadata. */

import InventoryScreen from "@/components/screens/InventoryScreen";

export const metadata = {
  title: "Inventory",
  description:
    "Visors, body colours, back accessories, footwear, ability effects and victory animations. Cosmetic only — no power boosts.",
};

export default function InventoryPage() {
  return <InventoryScreen />;
}
