"use client";

import Modal, { modalStyles } from "@/components/Modal";
import styles from "@/components/modals/Modals.module.css";

/**
 * Pause dialog.
 *
 * Resuming is always an explicit action. That matters for the auto-pause that
 * fires when the tab is hidden: the player comes back to a stopped game and a
 * button, never to a mission that carried on without them.
 *
 * @param {{
 *   reason: "manual" | "hidden" | "rotate",
 *   onResume: () => void,
 *   onRestart: () => void,
 *   onLeave: () => void,
 *   onSettings: () => void,
 *   onHowTo: () => void,
 * }} props
 */
export default function PauseModal({
  reason,
  onResume,
  onRestart,
  onLeave,
  onSettings,
  onHowTo,
}) {
  const copy = {
    manual: {
      title: "Chaos on hold.",
      eyebrow: "Take a breather",
      body: "Your Mote promises to behave. Probably.",
    },
    hidden: {
      title: "Welcome back.",
      eyebrow: "Mission auto-paused",
      body: "You switched away, so we stopped the clock. Nothing moved while you were gone.",
    },
  }[reason] || {
    title: "Chaos on hold.",
    eyebrow: "Take a breather",
    body: "Your Mote promises to behave. Probably.",
  };

  return (
    /*
      Escape is deliberately not handled here. The running scene already treats
      Escape as its pause toggle, so letting the dialog close on it too would
      handle the key twice and the two toggles would cancel each other out.
      Escape still resumes — by way of the scene.
    */
    <Modal title={copy.title} onClose={onResume} closeOnEscape={false}>
      <p className="eyebrow">{copy.eyebrow}</p>
      <p className={styles.lede}>{copy.body}</p>
      <p className={styles.hint}>
        The mission timer and every ability cooldown are paused too.
      </p>

      <div className={modalStyles.actions}>
        <button className={modalStyles.primary} onClick={onResume} autoFocus>
          Resume Mission &rarr;
        </button>
        <button onClick={onRestart}>Restart Mission</button>
        <button onClick={onLeave}>Return to Base</button>
      </div>

      <div className={modalStyles.actions}>
        <button onClick={onSettings}>&#9881; Settings</button>
        <button onClick={onHowTo}>How to Play</button>
      </div>
    </Modal>
  );
}
