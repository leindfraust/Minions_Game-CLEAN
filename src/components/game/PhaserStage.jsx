"use client";

import { useEffect, useRef, useState } from "react";
import { GAME } from "@/game/config/constants";
import styles from "./PhaserStage.module.css";

/**
 * Owns the Phaser game instance. Client-only by construction.
 *
 * This module is never imported at the top level of any Server Component: it is
 * reached exclusively through `next/dynamic(..., { ssr: false })` inside
 * `MissionClient`, a Client Component. Phaser itself is imported lazily inside
 * the effect below, so the module graph the server renders never contains it
 * and `window` is never touched during server rendering.
 *
 * Duplicate-canvas safety, which is the whole difficulty here:
 *
 *  - `cancelled` guards the async import. React Strict Mode mounts, unmounts
 *    and remounts in development, and navigation can unmount mid-import. If the
 *    import resolves after teardown we must not build a game nobody will
 *    destroy.
 *  - `gameRef` makes creation idempotent, so a second effect pass cannot attach
 *    a second game to the same container.
 *  - The container is emptied before creating and after destroying, which
 *    cleans up any canvas a hot reload left behind.
 *
 * @param {{
 *   bridge: import('@/game/systems/bridge').Bridge,
 *   character: object,
 *   settings: object,
 *   equipped: Record<string, string>,
 *   runId: number,
 * }} props
 */
export default function PhaserStage({ bridge, character, settings, equipped, runId }) {
  /**
   * Phaser's mount point. React must never render children into this node:
   * Phaser appends and removes the canvas itself, and if React also owned
   * children here, clearing the node would desync React's virtual DOM and the
   * next unmount would throw `removeChild: node is not a child of this node`.
   * The loading and error placeholders are rendered as siblings instead.
   */
  const hostRef = useRef(null);
  const gameRef = useRef(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);

  /*
    Settings are read once per mission at create time and pushed through the
    bridge afterwards, so the boot effect must not re-run when they change.
    The ref is synced in its own effect rather than during render — writing a
    ref while rendering is not safe, and this effect is declared first so the
    ref is already current by the time the boot effect below runs.
  */
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!host) return undefined;

    async function boot() {
      try {
        // Both imports are client-only; they resolve in the browser alone.
        const [{ default: Phaser }, { default: LabScene }] = await Promise.all([
          import("phaser"),
          import("@/game/scenes/LabScene"),
        ]);

        // Unmounted (or Strict Mode's throwaway pass) while importing.
        if (cancelled) return;
        // Already booted by a previous pass: never create a second canvas.
        if (gameRef.current) return;

        // Remove anything a hot reload may have left in the container.
        host.replaceChildren();

        const game = new Phaser.Game({
          type: Phaser.AUTO,
          parent: host,
          // Fixed internal resolution; Scale.FIT maps it to the viewport.
          width: GAME.width,
          height: GAME.height,
          backgroundColor: "#101d2b",
          physics: { default: "arcade", arcade: { debug: false } },
          scale: {
            // FIT letterboxes to preserve the aspect ratio at any size.
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
          },
          render: { antialias: true, powerPreference: "high-performance" },
          input: { activePointers: 3 },
          // Phaser's own focus/blur pause would fight our explicit pause flow.
          autoFocus: false,
          banner: false,
          scene: new LabScene({
            character,
            bridge,
            settings: settingsRef.current,
            equipped,
          }),
        });

        gameRef.current = game;
        setStatus("ready");
      } catch (cause) {
        if (cancelled) return;
        setError(cause);
        setStatus("error");
      }
    }

    boot();

    return () => {
      cancelled = true;
      const game = gameRef.current;
      gameRef.current = null;
      if (game) {
        // `true` removes the canvas from the DOM as well as destroying scenes.
        game.destroy(true);
      }
      // Belt and braces: the container must be empty for the next mount.
      host.replaceChildren();
    };
    // `runId` changes to force a fresh mission on restart.
  }, [bridge, character, equipped, runId]);

  return (
    <div className={styles.stage} data-status={status}>
      {/* Owned exclusively by Phaser — never give this node React children. */}
      <div className={styles.canvasHost} ref={hostRef} />

      {status === "loading" && (
        <div className={styles.placeholder}>
          <span className={styles.spinner} aria-hidden="true" />
          <p className="eyebrow">Opening Sector 07</p>
          <p>Waking up the lab&hellip;</p>
        </div>
      )}

      {status === "error" && (
        <div className={`${styles.placeholder} ${styles.error}`}>
          <h2>The lab did not open.</h2>
          <p>
            The game engine failed to load. This usually means WebGL and canvas
            are both unavailable in this browser.
          </p>
          <p className="muted">{error?.message}</p>
        </div>
      )}
    </div>
  );
}
