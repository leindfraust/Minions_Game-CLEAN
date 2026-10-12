"use client";

import Link from "next/link";
import Mote from "@/components/Mote";
import AppShell from "@/components/AppShell";
import { useGameState } from "@/components/GameStateProvider";
import { useMissions } from "@/hooks/useMissions";
import { CHARACTERS } from "@/data/catalog";
import { GAME } from "@/game/config/constants";
import styles from "./MainMenu.module.css";

/** Hero-art placement classes, in crew order. */
const ART_SLOTS = [styles.moteVolt, styles.motePip, styles.moteGlitch, styles.moteMoss];

/**
 * `/` — the main menu.
 *
 * Every control here is live: Play Now and Choose Crew navigate, Inventory
 * navigates, How to Play and Settings open real dialogs, and the wallet button
 * opens an explainer that makes clear nothing is connected.
 */
export default function MainMenuScreen() {
  const { player, progress, selectCharacter, openModal } = useGameState();
  const { best } = useMissions();

  return (
    <AppShell>
      <div className={styles.topline}>
        <span>
          <span className="status-dot" /> All systems mostly normal
        </span>
        <span>Lab terminal / 001</span>
      </div>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.chapter}>
            <span>The great little escape</span>
            <i>01</i>
          </div>

          <h1 className={styles.title}>
            Small crew.
            <br />
            Big <em>mayhem.</em>
          </h1>

          <p>
            The lab is locked. The robots are watching. {GAME.cores} energy
            cores stand between you and freedom.{" "}
            <strong>Go make a beautiful mess.</strong>
          </p>

          <div className={styles.actions}>
            <Link href="/play" className={`${styles.primary}`}>
              <span aria-hidden="true">&#9654;</span> Play Now{" "}
              <span aria-hidden="true">&#8599;</span>
            </Link>
            <button className={styles.secondary} onClick={() => openModal("how")}>
              <span aria-hidden="true">&#9432;</span> How to Play
            </button>
          </div>

          <div className={styles.menuLinks}>
            <Link href="/crew" className={styles.menuLink}>
              <span aria-hidden="true">&#9767;</span> Choose Crew
            </Link>
            <Link href="/inventory" className={styles.menuLink}>
              <span aria-hidden="true">&#9635;</span> Inventory
            </Link>
            <button className={styles.menuLink} onClick={() => openModal("settings")}>
              <span aria-hidden="true">&#9881;</span> Settings
            </button>
          </div>

          <div className={styles.meta}>
            <span>&#9711; {GAME.duration}-second missions</span>
            <i />
            <span>&#8984; Solo adventure</span>
            <i />
            <span className="mint">Free to play</span>
          </div>
        </div>

        <div className={styles.art}>
          <div className={styles.artGrid} />
          <div className={`${styles.orbital} ${styles.orbitOne}`} />
          <div className={`${styles.orbital} ${styles.orbitTwo}`} />
          <span className={styles.artLabel}>Specimens: unreasonably curious</span>

          <div className={styles.door}>
            <div />
            <span>Sector 07</span>
          </div>

          <div className={styles.platform} />

          {CHARACTERS.map((character, index) => (
            <div
              key={character.id}
              className={`${styles.crewMote} ${ART_SLOTS[index]}`}
            >
              <Mote character={character} decorative />
            </div>
          ))}

          <span className={`${styles.floatingCore} ${styles.coreOne}`} aria-hidden="true">
            &#9672;
          </span>
          <span className={`${styles.floatingCore} ${styles.coreTwo}`} aria-hidden="true">
            &#9672;
          </span>
          <span className={`${styles.floatingCore} ${styles.coreThree}`} aria-hidden="true">
            &#10022;
          </span>

          <div className={styles.specimenTag}>
            <span className="status-dot" /> Containment status <b>&hellip;complicated</b>
          </div>
        </div>
      </section>

      <section className={styles.strip}>
        <div className={styles.stripIcon} aria-hidden="true">
          &#8961;
        </div>
        <div className={styles.stripTitle}>
          <small>Your next mission</small>
          <h3>Break out of Sector 07</h3>
        </div>
        <div className={styles.stripDetail}>
          <span aria-hidden="true">&#9672;</span>
          <div>
            <b>{GAME.cores} Energy Cores</b>
            <small>Collect them all</small>
          </div>
        </div>
        <div className={styles.stripDetail}>
          <span aria-hidden="true">&#9678;</span>
          <div>
            <b>One way out</b>
            <small>Unlock the exit portal</small>
          </div>
        </div>
        <span className={styles.difficulty}>
          <i />
          <i />
          <i className={styles.dim} /> Rookie friendly
        </span>
        <Link
          href="/play"
          className={styles.stripAction}
          aria-label="Start the Sector 07 mission"
         
        >
          <span aria-hidden="true">&#8599;</span>
        </Link>
      </section>

      <section>
        <div className={styles.sectionHeading}>
          <div>
            <p className="eyebrow">Meet your troublemakers</p>
            <h2>A little weird. A lot of potential.</h2>
          </div>
          <Link href="/crew" className={styles.textLink}>
            Choose Crew <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>

        <div className={styles.crewGrid}>
          {CHARACTERS.map((character, index) => {
            const selected = player.selected === character.id;
            return (
              <button
                key={character.id}
                className={`${styles.miniCard} ${selected ? styles.miniCardSelected : ""}`}
                style={{ "--mote-color": character.color }}
                onClick={() => selectCharacter(character.id)}
                aria-pressed={selected}
              >
                <div className={styles.miniArt}>
                  <span className={styles.cardNumber} aria-hidden="true">
                    0{index + 1}
                  </span>
                  {selected && <span className={styles.selectedBadge}>&#10003; Your Mote</span>}
                  <Mote character={character} decorative />
                </div>
                <div className={styles.miniInfo}>
                  <div>
                    <h3>{character.name}</h3>
                    <small>{character.role}</small>
                  </div>
                  <span className={styles.abilityGlyph} aria-hidden="true">
                    {character.glyph}
                  </span>
                </div>
                <p>{character.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className={styles.panels}>
        <div className={styles.panel}>
          <span className={styles.rankIcon} aria-hidden="true">
            &#10039;
          </span>
          <div className={styles.panelBody}>
            <small>Looking good, {player.name}</small>
            <h3>
              Level {progress.level} <span>&middot; A work in progress. A great one.</span>
            </h3>
            <div className={styles.xpTrack}>
              <i style={{ width: `${progress.percent}%` }} />
            </div>
            <small>
              {progress.into} / {progress.needed} XP to next level
            </small>
          </div>
          <div className={styles.bestPanel}>
            <small>Best score</small>
            <span className={styles.bestScore}>{best.toLocaleString()}</span>
          </div>
        </div>

        <div className={`${styles.panel} ${styles.walletPanel}`}>
          <span className={styles.walletIcon} aria-hidden="true">
            &#11041;
          </span>
          <div className={styles.panelBody}>
            <h3>Your crew. Your collection.</h3>
            <p>A new dimension of ownership is on the horizon.</p>
            <button className={styles.walletButton} onClick={() => openModal("wallet")}>
              Connect Wallet <span className={styles.soonTag}>Coming soon</span>
            </button>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
