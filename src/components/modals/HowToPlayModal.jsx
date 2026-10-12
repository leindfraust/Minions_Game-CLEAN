"use client";

import Modal, { modalStyles } from "@/components/Modal";
import styles from "./Modals.module.css";
import { CHARACTERS } from "@/data/catalog";
import { GAME } from "@/game/config/constants";

/**
 * How to Play. Shared by the menu, the crew screen and the pause screen.
 * @param {{onClose: () => void, onStart?: () => void}} props
 */
export default function HowToPlayModal({ onClose, onStart }) {
  return (
    <Modal title="A crash course in chaos." onClose={onClose} wide>
      <p className={styles.lede}>
        Escape Sector 07 before the {GAME.duration}-second timer runs out.
      </p>

      <div className={styles.steps}>
        <div className={styles.step}>
          <b>01 &middot; Gather the glow</b>
          <p>
            Walk over all {GAME.cores} Energy Cores scattered through the lab.
            They are spread across every room, so plan a route.
          </p>
        </div>
        <div className={styles.step}>
          <b>02 &middot; Stay in one piece</b>
          <p>
            Security robots patrol fixed routes, notice you within about{" "}
            {GAME.detection} pixels, and chase until you break line of sight.
            You have {GAME.health} health points and roughly one second of
            protection after each hit.
          </p>
        </div>
        <div className={styles.step}>
          <b>03 &middot; Make your exit</b>
          <p>
            Once every core is collected the portal in the northeast unlocks.
            Stand in it and press <kbd>E</kbd>. Lose all health or run out of
            time and the mission fails.
          </p>
        </div>
      </div>

      <p className={styles.group}>Desktop controls</p>
      <div className={styles.controls}>
        <span>
          <kbd>W A S D</kbd> / <kbd>&uarr;&darr;&larr;&rarr;</kbd> Move
        </span>
        <span>
          <kbd>Space</kbd> Ability
        </span>
        <span>
          <kbd>E</kbd> Interact
        </span>
        <span>
          <kbd>Esc</kbd> Pause
        </span>
      </div>

      <p className={styles.group}>Touch controls</p>
      <p className={styles.hint}>
        Rotate to landscape, then drag the left joystick to move and tap the
        Interact, Ability and pause buttons on the right.
      </p>

      <p className={styles.group}>Your crew</p>
      <div className={styles.abilities}>
        {CHARACTERS.map((character) => (
          <div
            key={character.id}
            className={styles.ability}
            style={{ "--mote-color": character.color }}
          >
            <b>
              {character.name}
              <small>{character.role}</small>
            </b>
            <span>
              <b style={{ fontFamily: "var(--font-body)" }}>{character.ability}</b>{" "}
              &mdash; {character.description}
              <small>{character.cooldown}s cooldown</small>
            </span>
          </div>
        ))}
      </div>

      <div className={modalStyles.actions}>
        {onStart && (
          <button className={modalStyles.primary} onClick={onStart}>
            Got it. Let&rsquo;s escape &rarr;
          </button>
        )}
        <button onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}
