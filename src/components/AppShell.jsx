"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";
import HowToPlayModal from "@/components/modals/HowToPlayModal";
import SettingsModal from "@/components/modals/SettingsModal";
import ProfileModal from "@/components/modals/ProfileModal";
import Web3Modal from "@/components/modals/Web3Modal";
import { useGameState } from "@/components/GameStateProvider";
import { useMissions } from "@/hooks/useMissions";
import styles from "./AppShell.module.css";

const NAV = [
  ["/", "⌂", "The Lab"],
  ["/crew", "♧", "Crew"],
  ["/inventory", "▣", "Inventory"],
];

/**
 * Chrome shared by every menu route: header, navigation, footer and the
 * globally reachable modals. The /play route deliberately does not use this —
 * gameplay owns the whole viewport.
 *
 * @param {{children: React.ReactNode, modal?: string|null, onModalChange?: (id: string|null) => void}} props
 */
export default function AppShell({ children }) {
  const pathname = usePathname();
  const { player, settings, updateSetting, resetProgress, modal, openModal, closeModal } =
    useGameState();
  const { history, best } = useMissions();

  const initials = (player.name || "Lab Rookie")
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" aria-label="Mote Mayhem home">
          <Logo />
        </Link>

        <nav className={styles.nav} aria-label="Main navigation">
          {NAV.map(([href, icon, label]) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`${styles.navLink} ${active ? styles.navActive : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span aria-hidden="true">{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        <div className={styles.headerRight}>
          <span className={styles.balance} title="Energy Core balance">
            <span aria-hidden="true">&#9672;</span>
            <b>{player.balance.toLocaleString()}</b>
            <span className="srOnly">Energy Cores</span>
          </span>

          <button
            className={styles.iconButton}
            onClick={() => updateSetting("mute", !settings.mute)}
            aria-label={settings.mute ? "Unmute audio" : "Mute audio"}
            aria-pressed={settings.mute}
          >
            <span aria-hidden="true">{settings.mute ? "♪̸" : "♫"}</span>
          </button>

          <button
            className={styles.avatar}
            onClick={() => openModal("profile")}
            aria-label="Player profile"
          >
            {initials}
            <i aria-hidden="true" />
          </button>
        </div>
      </header>

      <main className={styles.content}>{children}</main>

      <footer className={styles.footer}>
        <span>&#10022; Small creatures. Big escape energy.</span>
        <div className={styles.footerActions}>
          <button onClick={() => openModal("settings")}>&#9881; Settings</button>
          <button onClick={() => openModal("how")}>How to Play &#8599;</button>
          <span className={styles.version}>
            Frontend prototype <i>v2.0</i>
          </span>
        </div>
      </footer>

      {modal === "how" && <HowToPlayModal onClose={closeModal} />}

      {modal === "settings" && (
        <SettingsModal
          settings={settings}
          onChange={updateSetting}
          onClose={closeModal}
          onReset={resetProgress}
        />
      )}

      {modal === "profile" && (
        <ProfileModal
          player={player}
          history={history}
          best={best}
          onClose={closeModal}
        />
      )}

      {modal === "wallet" && <Web3Modal onClose={closeModal} />}
    </div>
  );
}
