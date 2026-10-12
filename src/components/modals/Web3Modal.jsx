"use client";

import Modal, { modalStyles } from "@/components/Modal";
import styles from "./Modals.module.css";
import { WALLET_STATES, WALLET_STATE_COPY, getProfile } from "@/services/wallet";

/**
 * The "Connect Wallet — Coming Soon" explainer.
 *
 * This deliberately does not simulate a connection, request an account, or
 * pretend to hold a balance. It explains what is and is not implemented and
 * previews the states a future integration would need to handle.
 *
 * @param {{onClose: () => void}} props
 */
export default function Web3Modal({ onClose }) {
  return (
    <Modal title="Wallet features are coming soon." onClose={onClose} wide>
      <div className={styles.notice}>
        <span aria-hidden="true">&#9888;</span>
        <span>
          <b>Nothing is connected and nothing will be.</b> This build has no
          wallet integration, no smart contracts, no tokens and no
          transactions. There is nothing here that can touch real funds.
        </span>
      </div>

      <p className={styles.lede}>
        Mote Mayhem is a frontend prototype. Everything you unlock is stored in
        this browser, and the whole game is playable without a wallet &mdash;
        now and after any future integration.
      </p>

      <p className={styles.group}>What is planned</p>
      <ul className={styles.list}>
        <li>Optional wallet sign-in as an alternative to a game account.</li>
        <li>Cosmetic items that can be owned and traded, never gameplay advantages.</li>
        <li>Verifiable mission scores for seasonal leaderboards.</li>
      </ul>

      <p className={styles.group}>What will never change</p>
      <ul className={styles.list}>
        <li>The game stays free to play without a wallet.</li>
        <li>Cosmetics stay cosmetic. No pay-to-win, ever.</li>
        <li>No purchase will be required to finish a mission.</li>
      </ul>

      <details className={styles.details}>
        <summary>Preview the connection states a real build would handle</summary>
        <div className={styles.states}>
          {WALLET_STATES.map((state) => {
            const profile = getProfile(state);
            return (
              <div className={styles.state} key={state}>
                <b>{state.replace("-", " ")}</b>
                <span>{profile.address || WALLET_STATE_COPY[state]}</span>
              </div>
            );
          })}
        </div>
        <p className={styles.hint}>
          Mock copy only. No provider is detected, requested or called.
        </p>
      </details>

      <div className={modalStyles.actions}>
        <button className={modalStyles.primary} onClick={onClose}>
          Back to the lab
        </button>
      </div>
    </Modal>
  );
}
