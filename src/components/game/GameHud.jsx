"use client";

import { memo } from "react";
import Mote from "@/components/Mote";
import { GAME } from "@/game/config/constants";
import { formatClock } from "@/utils/logic";
import styles from "./GameHud.module.css";

/** Seconds remaining at which the clock starts warning. */
const LOW_TIME = 20;

/**
 * Mission HUD.
 *
 * Memoised and driven entirely by the `hud` prop, which the scene only emits
 * when a displayed value actually changes (see `LabScene.syncHud`). Nothing
 * here runs per animation frame.
 *
 * @param {{
 *   character: object,
 *   equipped: Record<string, string>,
 *   hud: {health: number, cores: number, time: number, cooldown: number, abilityActive: boolean},
 *   objective: string,
 *   onAbility: () => void,
 *   onPause: () => void,
 * }} props
 */
function GameHud({ character, equipped, hud, objective, onAbility, onPause }) {
  const ready = hud.cooldown <= 0;
  const chargePercent = ((character.cooldown - hud.cooldown) / character.cooldown) * 100;
  const lowTime = hud.time <= LOW_TIME;

  return (
    <>
      <div className={styles.hud} style={{ "--mote-color": character.color }}>
        <div className={styles.person}>
          <span className={styles.portrait}>
            <Mote character={character} equipped={equipped} decorative />
          </span>
          <div>
            <div className={styles.personName}>{character.name}</div>
            <div className={styles.hearts} role="img" aria-label={`${hud.health} of ${GAME.health} health remaining`}>
              {Array.from({ length: GAME.health }, (_, i) => (
                <span
                  key={i}
                  className={i < hud.health ? styles.heartFull : styles.heartEmpty}
                  aria-hidden="true"
                >
                  {i < hud.health ? "♥" : "♡"}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className={`${styles.stat} ${styles.cores}`}>
          <small>Energy cores</small>
          <strong>
            <span aria-hidden="true">&#9672;</span> {hud.cores}
            <span> / {GAME.cores}</span>
          </strong>
        </div>

        <div className={`${styles.stat} ${styles.time} ${lowTime ? styles.danger : ""}`}>
          <small>Time remaining</small>
          {/* Politely announced so a screen reader is not flooded each second. */}
          <strong aria-live="off">
            <span aria-hidden="true">&#9711;</span> {formatClock(hud.time)}
          </strong>
        </div>

        <button
          className={`${styles.ability} ${hud.abilityActive ? styles.abilityActive : ""}`}
          onClick={onAbility}
          disabled={!ready}
          aria-label={`Use ${character.ability}${ready ? "" : `, recharging, ${hud.cooldown.toFixed(1)} seconds left`}`}
        >
          <span className={styles.abilityName}>
            {character.glyph} {character.ability}
          </span>
          <small>{ready ? "Space · Ready" : `${hud.cooldown.toFixed(1)}s`}</small>
          <i
            className={styles.cooldownFill}
            style={{ width: `${Math.max(0, Math.min(100, chargePercent))}%` }}
            aria-hidden="true"
          />
        </button>

        <button className={styles.pauseButton} onClick={onPause} aria-label="Pause mission">
          <span aria-hidden="true">&#8214;</span>
        </button>
      </div>

      {/* The objective is the one place a screen reader should hear updates. */}
      <p className={styles.objective} aria-live="polite">
        <span className="status-dot" />
        {objective}
      </p>
    </>
  );
}

export default memo(GameHud);
