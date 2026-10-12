"use client";

import { useMemo, useState } from "react";
import Mote from "@/components/Mote";
import AppShell from "@/components/AppShell";
import { useGameState } from "@/components/GameStateProvider";
import {
  CATEGORIES,
  RARITIES,
  CATEGORY_ICONS,
  COSMETICS,
} from "@/data/catalog";
import { filterInventory } from "@/utils/logic";
import styles from "./Inventory.module.css";

/** Rarity -> CSS class, for the tier colour. */
const RARITY_CLASS = {
  Common: styles.common,
  Rare: styles.rare,
  Epic: styles.epic,
  Legendary: styles.legendary,
};

/**
 * `/inventory` — cosmetic inventory and fitting room.
 *
 * Equipping is immediate and visible: the preview updates, the card marks
 * itself equipped, and because the scene reads the same equipped map, the
 * change also shows up on the Mote you play as. Cosmetics never alter speed,
 * health, cooldowns or scoring.
 */
export default function InventoryScreen() {
  const { character, equipped, equip, unequip } = useGameState();

  const [category, setCategory] = useState("All items");
  const [rarity, setRarity] = useState("All rarities");
  const [selectedId, setSelectedId] = useState(COSMETICS[0].id);

  const visible = useMemo(
    () => filterInventory(COSMETICS, category, rarity),
    [category, rarity],
  );

  // Keep a valid selection even when filters hide the selected item.
  const selected =
    visible.find((item) => item.id === selectedId) || visible[0] || COSMETICS[0];

  const isEquipped = equipped[selected.category] === selected.id;
  const canEquip = !selected.locked && !isEquipped;

  /** What the fitting room shows: current outfit plus the item being viewed. */
  const previewEquipped = { ...equipped, [selected.category]: selected.id };

  return (
    <AppShell>
      <div className={styles.heading}>
        <p className="eyebrow">More style. Same mayhem.</p>
        <h1>
          The <em>good stuff.</em>
        </h1>
        <p>Cosmetics only. Looking this good doesn&rsquo;t need a power boost.</p>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.filters} role="group" aria-label="Filter by category">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={`${styles.filter} ${category === c ? styles.filterActive : ""}`}
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
            >
              {c}
            </button>
          ))}
        </div>

        <div className={styles.rarityWrap}>
          <label htmlFor="rarity-filter">Rarity</label>
          <select
            id="rarity-filter"
            value={rarity}
            onChange={(event) => setRarity(event.target.value)}
          >
            {RARITIES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <span className={styles.count}>
            {visible.length} / {COSMETICS.length} items
          </span>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.grid}>
          {visible.map((item) => {
            const equippedHere = equipped[item.category] === item.id;
            return (
              <button
                key={item.id}
                className={`${styles.card} ${
                  selected.id === item.id ? styles.cardSelected : ""
                } ${item.locked ? styles.cardLocked : ""}`}
                style={{ "--item-color": item.color }}
                onClick={() => setSelectedId(item.id)}
                aria-pressed={selected.id === item.id}
              >
                <div className={styles.tags}>
                  <span className={`${styles.rarity} ${RARITY_CLASS[item.rarity]}`}>
                    {item.rarity}
                  </span>
                  <span
                    className={`${styles.state} ${equippedHere ? styles.stateEquipped : ""}`}
                  >
                    {item.locked
                      ? "Locked"
                      : equippedHere
                        ? "✓ Equipped"
                        : "Owned"}
                  </span>
                </div>

                {item.locked && (
                  <span className={styles.lockBadge} aria-hidden="true">
                    &#128274;
                  </span>
                )}

                <span className={styles.icon} aria-hidden="true">
                  {CATEGORY_ICONS[item.category]}
                </span>

                <h3>{item.name}</h3>
                <p>{item.category}</p>

                {item.nft && <span className={styles.nftTag}>Future NFT &middot; Coming soon</span>}
              </button>
            );
          })}

          {visible.length === 0 && (
            <p className={styles.empty}>
              Nothing matches those filters yet. Try another category or rarity.
            </p>
          )}
        </div>

        <aside
          className={styles.preview}
          style={{ "--item-color": selected.color }}
          aria-label="Fitting room"
        >
          <p className="eyebrow">Fitting room</p>

          <div className={styles.previewStage}>
            <Mote
              character={character}
              equipped={previewEquipped}
              // Preview the animation the cosmetic actually affects.
              pose={
                selected.category === "Victory animations"
                  ? "moving"
                  : selected.category === "Ability effects"
                    ? "casting"
                    : ""
              }
              decorative
            />
          </div>

          <h2>{selected.name}</h2>
          <span className={styles.previewMeta}>
            {selected.rarity} &middot; {selected.category}
          </span>

          <button
            className={styles.equipButton}
            disabled={!canEquip}
            onClick={() => equip(selected)}
          >
            {selected.locked
              ? "Locked · Future reward"
              : isEquipped
                ? "✓ Equipped"
                : "Equip cosmetic"}
          </button>

          {isEquipped && (
            <button
              className={styles.unequipButton}
              onClick={() => unequip(selected.category)}
            >
              Remove from loadout
            </button>
          )}

          <p className={styles.note}>
            {selected.locked
              ? "An upcoming collection item. Locked items cannot be equipped."
              : "Equipped cosmetics show up on your Mote in the mission too."}
          </p>

          <div className={styles.fairness}>
            <span aria-hidden="true">&#9878;</span>
            <span>
              Cosmetics are appearance only. Nothing in this inventory changes
              speed, health, cooldowns or score.
            </span>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
