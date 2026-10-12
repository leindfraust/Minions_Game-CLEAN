"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./TouchControls.module.css";

/** Pointer travel, in px, that corresponds to full stick deflection. */
const STICK_RANGE = 42;

/**
 * On-screen controls for touch devices: a virtual joystick, Interact and
 * Ability.
 *
 * The joystick captures the pointer, so a drag that leaves the pad keeps
 * steering instead of dropping input. `touch-action: none` on the pad is what
 * stops the browser turning a drag into a scroll or a pull-to-refresh — and it
 * is scoped to this element, so ordinary menu pages still scroll normally.
 *
 * @param {{
 *   character: object,
 *   cooldown: number,
 *   onMove: (vector: {x: number, y: number}) => void,
 *   onInteract: () => void,
 *   onAbility: () => void,
 * }} props
 */
export default function TouchControls({
  character,
  cooldown,
  onMove,
  onInteract,
  onAbility,
}) {
  const [stick, setStick] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const padRef = useRef(null);
  const pointerRef = useRef(null);

  const release = useCallback(() => {
    pointerRef.current = null;
    setActive(false);
    setStick({ x: 0, y: 0 });
    onMove({ x: 0, y: 0 });
  }, [onMove]);

  /** Losing focus or visibility must drop held touch input, like keys. */
  useEffect(() => {
    const drop = () => release();
    window.addEventListener("blur", drop);
    document.addEventListener("visibilitychange", drop);
    return () => {
      window.removeEventListener("blur", drop);
      document.removeEventListener("visibilitychange", drop);
    };
  }, [release]);

  const handlePointer = useCallback(
    (event) => {
      const pad = padRef.current;
      if (!pad) return;

      if (event.type === "pointerdown") {
        pointerRef.current = event.pointerId;
        pad.setPointerCapture(event.pointerId);
        setActive(true);
      } else if (pointerRef.current !== event.pointerId) {
        // Ignore a second finger that is not the one driving the stick.
        return;
      }

      const rect = pad.getBoundingClientRect();
      let x = (event.clientX - rect.left - rect.width / 2) / STICK_RANGE;
      let y = (event.clientY - rect.top - rect.height / 2) / STICK_RANGE;

      // Clamp to the unit circle so diagonals are not faster.
      const length = Math.max(1, Math.hypot(x, y));
      x /= length;
      y /= length;

      setStick({ x, y });
      onMove({ x, y });
    },
    [onMove],
  );

  const ready = cooldown <= 0;
  const charge = ((character.cooldown - cooldown) / character.cooldown) * 100;

  return (
    <div className={styles.controls} style={{ "--mote-color": character.color }}>
      <div
        ref={padRef}
        className={`${styles.joystick} ${active ? styles.joystickActive : ""}`}
        onPointerDown={handlePointer}
        onPointerMove={handlePointer}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={release}
        role="application"
        aria-label="Movement joystick"
      >
        <span
          className={styles.knob}
          style={{ transform: `translate(${stick.x * 26}%, ${stick.y * 26}%)` }}
        />
        <span className={styles.joystickHint}>Move</span>
      </div>

      <div className={styles.actions}>
        <button className={styles.action} onClick={onInteract} aria-label="Interact">
          <b aria-hidden="true">E</b>
          <span>Interact</span>
        </button>

        <button
          className={`${styles.action} ${styles.abilityAction}`}
          onClick={onAbility}
          disabled={!ready}
          aria-label={`Use ${character.ability}`}
        >
          <b aria-hidden="true">{character.glyph}</b>
          <span>{ready ? "Ability" : `${cooldown.toFixed(0)}s`}</span>
          <i
            className={styles.abilityCharge}
            style={{ width: `${Math.max(0, Math.min(100, charge))}%` }}
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  );
}
