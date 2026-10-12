"use client";

import Modal from "@/components/Modal";
import styles from "./Modals.module.css";
import { getCharacter } from "@/data/catalog";
import { levelFromXp } from "@/utils/logic";

/**
 * Player record: level, balance, best score and the last five missions.
 *
 * @param {{player: object, history: Array<object>, best: number, onClose: () => void}} props
 */
export default function ProfileModal({ player, history, best, onClose }) {
  const progress = levelFromXp(player.xp);
  const escapes = history.filter((r) => r.won).length;

  return (
    <Modal title="Your lab record." onClose={onClose}>
      <div className={styles.statGrid}>
        <div className={styles.stat}>
          <small>Level</small>
          <strong>{progress.level}</strong>
        </div>
        <div className={styles.stat}>
          <small>Best score</small>
          <strong>{best.toLocaleString()}</strong>
        </div>
        <div className={styles.stat}>
          <small>Cores</small>
          <strong>{player.balance.toLocaleString()}</strong>
        </div>
        <div className={styles.stat}>
          <small>Escapes</small>
          <strong>{escapes}</strong>
        </div>
      </div>

      <p className={styles.hint}>
        {progress.into} / {progress.needed} XP to level {progress.level + 1}.
      </p>

      <p className={styles.group}>Last {Math.max(history.length, 0) || "five"} missions</p>
      {history.length > 0 ? (
        <div className={styles.history}>
          {history.map((result) => (
            <div
              key={result.id}
              className={`${styles.historyRow} ${result.won ? styles.won : styles.lost}`}
            >
              <span>
                {result.won ? "Escaped" : "Contained"} &middot;{" "}
                {getCharacter(result.character).name}
              </span>
              <b>{result.score.toLocaleString()} pts</b>
              <small>{result.elapsed.toFixed(1)}s</small>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.hint}>
          No missions yet. Your story starts in Sector 07.
        </p>
      )}

      <p className={styles.hint}>
        Progress is saved in this browser only. Clearing site data resets it.
      </p>
    </Modal>
  );
}
