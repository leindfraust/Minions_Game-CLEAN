"use client";

import { useState } from "react";
import Modal, { modalStyles } from "@/components/Modal";
import styles from "./Modals.module.css";

const VOLUMES = [
  ["master", "Master volume"],
  ["music", "Music volume"],
  ["sfx", "Sound effects"],
];

const TOGGLES = [
  ["mute", "Mute all sound"],
  ["reducedMotion", "Reduced motion"],
  ["screenShake", "Screen shake"],
];

/**
 * Settings. Every change persists immediately, so there is no save button to
 * forget. Mid-mission changes reach the running scene through the bridge.
 *
 * @param {{settings: object, onChange: (key: string, value: *) => void, onClose: () => void, onReset?: () => void}} props
 */
export default function SettingsModal({ settings, onChange, onClose, onReset }) {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <Modal title="Tune your mayhem." onClose={onClose}>
      <p className={styles.lede}>Settings save automatically to this device.</p>

      <p className={styles.group}>Audio</p>
      {VOLUMES.map(([key, label]) => (
        <label className={`${styles.row} ${styles.slider}`} key={key}>
          <span>{label}</span>
          <span className={styles.rowValue}>{settings[key]}%</span>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={settings[key]}
            disabled={settings.mute}
            onChange={(event) => onChange(key, Number(event.target.value))}
          />
        </label>
      ))}

      <p className={styles.hint}>
        Sound effects are synthesized in the browser, so there are no audio
        files to download and nothing to fail. Music volume is reserved for a
        future soundtrack and currently controls nothing.
      </p>

      <p className={styles.group}>Accessibility</p>
      {TOGGLES.map(([key, label]) => (
        <label className={styles.row} key={key}>
          <span>{label}</span>
          <input
            type="checkbox"
            checked={Boolean(settings[key])}
            onChange={(event) => onChange(key, event.target.checked)}
          />
        </label>
      ))}

      <p className={styles.hint}>
        Reduced motion removes menu animations, particle bursts and canvas
        shake. Your system preference is respected even with this off.
      </p>

      {onReset && (
        <>
          <p className={styles.group}>Local data</p>
          {confirmReset ? (
            <div className={modalStyles.actions}>
              <button
                className={styles.danger}
                onClick={() => {
                  onReset();
                  setConfirmReset(false);
                }}
              >
                Yes, erase my progress
              </button>
              <button onClick={() => setConfirmReset(false)}>Keep it</button>
            </div>
          ) : (
            <button className={styles.danger} onClick={() => setConfirmReset(true)}>
              Reset local progress
            </button>
          )}
          <p className={styles.hint}>
            Clears your level, Energy Core balance, best score, mission history
            and equipped cosmetics from this browser.
          </p>
        </>
      )}
    </Modal>
  );
}
