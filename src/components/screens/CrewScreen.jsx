"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Mote from "@/components/Mote";
import AppShell from "@/components/AppShell";
import { useGameState } from "@/components/GameStateProvider";
import { CHARACTERS } from "@/data/catalog";
import { GAME } from "@/game/config/constants";
import styles from "./Crew.module.css";

/** Display-only stat scale, so the bars have a consistent maximum. */
const MAX_SPEED = 260;

/**
 * `/crew` — character selection.
 *
 * The chosen Mote persists immediately, so /play and the HUD pick it up with
 * no hand-off. The preview panel can play the idle, movement and ability
 * animations on demand.
 */
export default function CrewScreen() {
  const router = useRouter();
  const { player, character, selectCharacter, equipped } = useGameState();

  /** "" | "moving" | "casting" */
  const [pose, setPose] = useState("");
  const castTimer = useRef(null);

  // A cast animation that is still pending when the component unmounts would
  // otherwise set state on a dead component.
  useEffect(() => () => clearTimeout(castTimer.current), []);

  const playCast = useCallback(() => {
    clearTimeout(castTimer.current);
    // Restart the animation even if it is already running.
    setPose("");
    requestAnimationFrame(() => setPose("casting"));
    castTimer.current = setTimeout(() => setPose(""), 950);
  }, []);

  return (
    <AppShell>
      <div className={styles.heading}>
        <p className="eyebrow">Four personalities. Zero good alibis.</p>
        <h1>
          Choose your <em>chaos.</em>
        </h1>
        <p>Same mission. Four very different ways to make a mess.</p>
      </div>

      <div className={styles.layout}>
        <div className={styles.grid}>
          {CHARACTERS.map((c) => {
            const selected = player.selected === c.id;
            return (
              <button
                key={c.id}
                className={`${styles.card} ${selected ? styles.cardSelected : ""}`}
                style={{ "--mote-color": c.color }}
                onClick={() => selectCharacter(c.id)}
                aria-pressed={selected}
              >
                <div className={styles.cardTop}>
                  <h2>
                    {c.name}
                    <small>{c.role}</small>
                  </h2>
                  <span className={styles.selectState}>
                    {selected ? "● Selected" : "○ Select"}
                  </span>
                </div>

                <div className={styles.portrait}>
                  <Mote character={c} equipped={selected ? equipped : {}} decorative />
                </div>

                <p className={styles.personality}>{c.personality}</p>

                <div className={styles.stats}>
                  <div className={styles.stat}>
                    <span>Speed</span>
                    <span className={styles.statBar}>
                      <i style={{ width: `${(c.speed / MAX_SPEED) * 100}%` }} />
                    </span>
                    <span className={styles.statValue}>{c.speed}</span>
                  </div>
                  <div className={styles.stat}>
                    <span>Power</span>
                    <span className={styles.statBar}>
                      <i style={{ width: `${(c.power / 5) * 100}%` }} />
                    </span>
                    <span className={styles.statValue}>{c.power}/5</span>
                  </div>
                  <div className={styles.stat}>
                    <span>Recharge</span>
                    <span className={styles.statBar}>
                      {/* Shorter cooldown reads as a fuller bar. */}
                      <i style={{ width: `${(1 - (c.cooldown - 6) / 6) * 100}%` }} />
                    </span>
                    <span className={styles.statValue}>{c.cooldown}s</span>
                  </div>
                </div>

                <div className={styles.ability}>
                  <span className={styles.abilityName}>
                    {c.ability}
                    <span className={styles.cooldown}>{c.cooldown}s cooldown</span>
                  </span>
                  <p>{c.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        <aside
          className={styles.preview}
          style={{ "--mote-color": character.color }}
          aria-label="Selected Mote preview"
        >
          <p className="eyebrow">Ready for a little trouble?</p>

          <div className={styles.previewStage}>
            <span
              className={`${styles.previewRing} ${pose === "casting" ? styles.previewRingActive : ""}`}
              aria-hidden="true"
            />
            <Mote character={character} equipped={equipped} pose={pose} />
          </div>

          <h2 className={styles.previewName}>{character.name}</h2>
          <span className={styles.previewRole}>{character.role}</span>
          <p className={styles.previewNote}>{character.personality}</p>

          <div className={styles.previewActions}>
            <button
              onClick={() => setPose((p) => (p === "moving" ? "" : "moving"))}
              aria-pressed={pose === "moving"}
            >
              {pose === "moving" ? "Idle" : "Move"}
            </button>
            <button onClick={playCast}>Try ability {character.glyph}</button>
          </div>

          <p className={styles.previewNote}>
            <b>{character.ability}</b> &mdash; {character.description}
          </p>

          <button className={styles.startButton} onClick={() => router.push("/play")}>
            Start Mission &rarr;
          </button>
          <span className={styles.startMeta}>
            {GAME.duration} seconds &middot; {GAME.cores} cores &middot; 1 escape
          </span>
        </aside>
      </div>
    </AppShell>
  );
}
