"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Mote from "@/components/Mote";
import AppShell from "@/components/AppShell";
import { useGameState } from "@/components/GameStateProvider";
import { useMissions } from "@/hooks/useMissions";
import { useStore } from "@/hooks/useStore";
import { lastMissionStore } from "@/services/stores";
import { getCharacter } from "@/data/catalog";
import { GAME } from "@/game/config/constants";
import styles from "./Results.module.css";

/**
 * Flavour text for the outcome, so a loss reads as encouragement rather than
 * a scolding.
 */
function describe(result) {
  if (result.won) {
    return `${result.cores} cores. One free Mote. That is a good day.`;
  }
  if (result.damage >= GAME.health) {
    return "The robots got this round. You have got the next one.";
  }
  return "Time got away from you. Your next escape is already waiting.";
}

/**
 * `/results` — mission report.
 *
 * Direct navigation and refresh are both handled: the result comes from a
 * store whose server snapshot is `null`, so when there is nothing to show the
 * screen renders an honest empty state instead of an error or a fabricated
 * score. Rewards were banked exactly once by /play when the mission ended, so
 * refreshing or revisiting this page pays nothing extra.
 */
export default function ResultsScreen() {
  const router = useRouter();
  const { equipped } = useGameState();
  const { history, best } = useMissions();

  /**
   * The mission just played, handed over in sessionStorage. This is `null` on
   * the server render, during hydration, and on a direct visit with nothing
   * stored — all three render the same empty state, so a normal arrival never
   * flashes the wrong content.
   */
  const result = useStore(lastMissionStore);

  /* ----------------------------------------------------------- empty state */

  if (!result) {
    return (
      <AppShell>
        <div className={styles.empty}>
          <span className={styles.emptyIcon} aria-hidden="true">
            &#9711;
          </span>
          <h1>No mission report yet.</h1>
          <p>
            There is no recent mission to report on in this tab. Run a mission
            and your report will land here.
          </p>
          <div className={styles.actions}>
            <Link href="/play" className={styles.primary}>
              Start a mission &rarr;
            </Link>
            <Link href="/crew" className={styles.secondary}>
              Choose Character
            </Link>
            <Link href="/" className={styles.secondary}>
              Return to Base
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  
  /* -------------------------------------------------------------- report */

  const character = getCharacter(result.character);
  const isNewBest = result.score >= best && result.score > 0;

  return (
    <AppShell>
      <section className={styles.results}>
        <p className="eyebrow">Sector 07 &middot; Mission report</p>

        <div className={`${styles.art} ${result.won ? styles.artWin : ""}`}>
          <Mote
            character={character}
            equipped={equipped}
            // The victory animation cosmetic actually plays on a win.
            pose={result.won && equipped["Victory animations"] ? "moving" : ""}
            decorative
          />
          <span className={styles.verdictBadge} aria-hidden="true">
            {result.won ? "✦" : "×"}
          </span>
        </div>

        <h1>{result.won ? "Beautiful escape." : "A little lab setback."}</h1>
        <p className={styles.lede}>{describe(result)}</p>

        <div className={styles.scorePanel}>
          <small>Final score</small>
          <span className={styles.scoreValue}>{result.score.toLocaleString()}</span>
          <span className={`${styles.personalBest} ${isNewBest ? styles.newBest : ""}`}>
            {isNewBest
              ? "✦ New personal best"
              : `Personal best · ${best.toLocaleString()}`}
          </span>
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <small>Completion time</small>
            <strong>{result.elapsed.toFixed(1)}s</strong>
          </div>
          <div className={`${styles.stat} ${result.cores >= GAME.cores ? styles.statGood : ""}`}>
            <small>Cores collected</small>
            <strong>
              {result.cores}/{GAME.cores}
            </strong>
          </div>
          <div className={`${styles.stat} ${result.damage > 0 ? styles.statBad : styles.statGood}`}>
            <small>Damage received</small>
            <strong>{result.damage}</strong>
          </div>
          <div className={styles.stat}>
            <small>Abilities used</small>
            <strong>{result.abilityUses}</strong>
          </div>
          <div className={`${styles.stat} ${styles.statGood}`}>
            <small>Experience earned</small>
            <strong>+{result.xp}</strong>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.primary} onClick={() => router.push("/play")}>
            Play Again &#8599;
          </button>
          <button className={styles.secondary} onClick={() => router.push("/crew")}>
            Change Character
          </button>
          <button className={styles.secondary} onClick={() => router.push("/")}>
            Return to Base
          </button>
        </div>

        <p className={styles.rewardNote}>
          Rewards for this mission were banked once, when it ended. Refreshing
          or revisiting this page will not award them again.
        </p>

        {history.length > 0 && (
          <>
            <p className={styles.historyHeading}>Last {history.length} missions</p>
            <div className={styles.history}>
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className={`${styles.historyRow} ${entry.id === result.id ? styles.current : ""}`}
                >
                  <span
                    className={`${styles.verdictPill} ${
                      entry.won ? styles.verdictWin : styles.verdictLoss
                    }`}
                  >
                    {entry.won ? "Escaped" : "Contained"}
                  </span>
                  <span>
                    {getCharacter(entry.character).name} &middot; {entry.cores}/
                    {GAME.cores} cores
                  </span>
                  <b>{entry.score.toLocaleString()}</b>
                  <small>{entry.elapsed.toFixed(1)}s</small>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </AppShell>
  );
}
