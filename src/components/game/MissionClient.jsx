"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import GameHud from "./GameHud";
import TouchControls from "./TouchControls";
import PauseModal from "./PauseModal";
import HowToPlayModal from "@/components/modals/HowToPlayModal";
import SettingsModal from "@/components/modals/SettingsModal";
import { useGameState } from "@/components/GameStateProvider";
import { useTouchDevice, useNeedsRotation } from "@/hooks/useOrientation";
import { useHydrated } from "@/hooks/useHydrated";
import { createBridge } from "@/game/systems/bridge";
import { GAME } from "@/game/config/constants";
import { objectiveFor } from "@/utils/logic";
import { commitMission, publishMissionResult } from "@/services/stores";
import styles from "./MissionClient.module.css";
import stageStyles from "./PhaserStage.module.css";

/**
 * The Phaser host is loaded with `{ ssr: false }` from inside this Client
 * Component — never from a Server Component, which Next.js does not allow.
 * The placeholder is sized like the real stage so the layout does not jump
 * when gameplay arrives.
 */
const PhaserStage = dynamic(() => import("./PhaserStage"), {
  ssr: false,
  loading: () => (
    <div className={stageStyles.stage}>
      <div className={stageStyles.placeholder}>
        <span className={stageStyles.spinner} aria-hidden="true" />
        <p className="eyebrow">Loading engine</p>
        <p>Preparing Sector 07&hellip;</p>
      </div>
    </div>
  ),
});

/** HUD state before the scene has reported anything. */
const INITIAL_HUD = {
  health: GAME.health,
  cores: 0,
  time: GAME.duration,
  cooldown: 0,
  abilityActive: false,
};

/**
 * `/play` — the mission.
 *
 * This is only a gate. The runner below snapshots the player's loadout when it
 * mounts, and that snapshot must come from real stored values rather than the
 * deterministic defaults hydration sees — otherwise a fresh load of /play would
 * always start as the default Mote, whatever the player chose on /crew.
 * Waiting for hydration before mounting the runner is what guarantees that.
 */
export default function MissionClient() {
  const hydrated = useHydrated();

  if (!hydrated) {
    return (
      <div className={styles.screen}>
        <div className={stageStyles.stage}>
          <div className={stageStyles.placeholder}>
            <span className={stageStyles.spinner} aria-hidden="true" />
            <p className="eyebrow">Preparing mission</p>
            <p>Reading your loadout&hellip;</p>
          </div>
        </div>
      </div>
    );
  }

  return <MissionRunner />;
}

/**
 * Owns the mission: the bridge, the HUD, pause state and the hand-off to
 * /results.
 *
 * The Phaser instance is never lifted into React state. Only this component
 * holds the bridge, and it hands it to the stage as a prop, so no other part of
 * the app can reach into the running game.
 */
function MissionRunner() {
  const router = useRouter();
  const { character, equipped, settings, updateSetting } = useGameState();
  const touchDevice = useTouchDevice();
  const needsRotation = useNeedsRotation();

  /** One bridge per mounted mission. */
  const bridge = useMemo(() => createBridge(), []);

  /**
   * Frozen copy of the loadout for the current run. Equipping a cosmetic from
   * another tab, or any re-render of the provider, must not rebuild the scene
   * mid-mission.
   */
  const [run, setRun] = useState(() => ({ id: 0, character, equipped }));

  const [hud, setHud] = useState(INITIAL_HUD);
  const [objective, setObjective] = useState(objectiveFor(0));
  const [paused, setPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState("manual");
  const [modal, setModal] = useState(null);
  const [finished, setFinished] = useState(false);

  /** Guards against a double hand-off if both end events somehow fire. */
  const finishedRef = useRef(false);
  /** Pending navigation, cleared on unmount so it cannot fire after teardown. */
  const navigationRef = useRef(null);
  /** Current pause state, for the Escape handler's stable closure. */
  const pausedRef = useRef(false);
  /** Whether a rotation prompt is up, for the game-started handler. */
  const needsRotationRef = useRef(false);

  const command = useCallback(
    (name) => bridge.emit("command", name),
    [bridge],
  );

  useEffect(() => {
    needsRotationRef.current = needsRotation;
  }, [needsRotation]);

  /* ------------------------------------------------------- scene -> React */

  useEffect(() => {
    const offs = [
      bridge.on("hud", setHud),
      bridge.on("objective", setObjective),
      bridge.on("game-paused", (value) => {
        pausedRef.current = value;
        setPaused(value);
        if (!value) setPauseReason("manual");
      }),
      bridge.on("mission-completed", handleEnd),
      bridge.on("mission-failed", handleEnd),
      /*
        The scene subscribes to commands only once it has booted, which happens
        well after this component mounts. Any pause we wanted before then was
        emitted into the void, so re-apply it here — otherwise a phone held in
        portrait would show the rotation prompt over a mission that is still
        running behind it.
      */
      bridge.on("game-started", () => {
        if (needsRotationRef.current) command("pause");
      }),
    ];

    /**
     * Bank the result once, publish it for /results, then navigate.
     * `commitMission` is itself idempotent per result id; this ref also stops a
     * second navigation if both end events were ever to fire.
     */
    function handleEnd(stats) {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setFinished(true);

      publishMissionResult(commitMission(stats));

      // A beat so the win/lose sound and the final HUD state are perceivable.
      navigationRef.current = setTimeout(() => router.push("/results"), 520);
    }

    return () => offs.forEach((off) => off());
  }, [bridge, router, command]);

  /** Drop every listener and any pending navigation when the mission unmounts. */
  useEffect(
    () => () => {
      clearTimeout(navigationRef.current);
      bridge.destroy();
    },
    [bridge],
  );

  /* ----------------------------------------------- live settings into scene */

  useEffect(() => {
    bridge.emit("settings", settings);
  }, [bridge, settings]);

  /* ------------------------------------------------------------ auto-pause */

  useEffect(() => {
    if (finished) return undefined;

    /**
     * Hiding the tab pauses the mission. Resuming is deliberately NOT
     * automatic: the player gets the pause dialog and has to choose to carry
     * on, so they are never dropped back into a chase they cannot see.
     */
    const onVisibility = () => {
      if (document.hidden) {
        setPauseReason("hidden");
        command("pause");
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [command, finished]);

  /**
   * Escape toggles pause, and React is its single owner.
   *
   * The scene used to listen for it too, but once the pause dialog is open
   * focus sits inside the dialog and the key does not reliably reach Phaser —
   * which made resuming intermittent. Handling it here works regardless of
   * where focus is. When another dialog is open (Settings, How to Play) this
   * stands aside so Escape closes that dialog instead.
   */
  useEffect(() => {
    if (finished) return undefined;

    const onKeyDown = (event) => {
      if (event.key !== "Escape" || modal) return;
      event.preventDefault();
      command(pausedRef.current ? "resume" : "pause");
      if (!pausedRef.current) setPauseReason("manual");
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [command, finished, modal]);

  /** A phone turned to portrait pauses the mission behind the rotate prompt. */
  useEffect(() => {
    if (needsRotation && !finished) command("pause");
  }, [needsRotation, command, finished]);

  /* --------------------------------------------------------------- actions */

  const resume = useCallback(() => command("resume"), [command]);

  const restart = useCallback(() => {
    finishedRef.current = false;
    setFinished(false);
    setHud(INITIAL_HUD);
    setObjective(objectiveFor(0));
    setPaused(false);
    pausedRef.current = false;
    setModal(null);
    // A new run id remounts the scene with a fresh snapshot of the loadout.
    setRun((previous) => ({ id: previous.id + 1, character, equipped }));
  }, [character, equipped]);

  const leave = useCallback(() => router.push("/"), [router]);

  const onMove = useCallback(
    (vector) => bridge.emit("move", vector),
    [bridge],
  );

  /* ----------------------------------------------------------------- render */

  return (
    <div className={`${styles.screen} ${touchDevice ? styles.touch : ""}`}>
      <GameHud
        character={run.character}
        equipped={run.equipped}
        hud={hud}
        objective={objective}
        onAbility={() => command("ability")}
        onPause={() => {
          setPauseReason("manual");
          command("pause");
        }}
      />

      <PhaserStage
        key={run.id}
        runId={run.id}
        bridge={bridge}
        character={run.character}
        equipped={run.equipped}
        settings={settings}
      />

      <div className={styles.footerBar}>
        <span>
          <kbd>W A S D</kbd> Move
        </span>
        <span>
          <kbd>E</kbd> Interact
        </span>
        <span>
          <kbd>Space</kbd> Ability
        </span>
        <span>
          <kbd>Esc</kbd> Pause
        </span>
        <span className={styles.live}>
          Sector 07 <b>&#9679; Live</b>
        </span>
      </div>

      {touchDevice && (
        <TouchControls
          character={run.character}
          cooldown={hud.cooldown}
          onMove={onMove}
          onInteract={() => command("interact")}
          onAbility={() => command("ability")}
        />
      )}

      {needsRotation && (
        <div className={styles.rotate} role="alertdialog" aria-label="Rotate your device">
          <span className={styles.rotateIcon} aria-hidden="true">
            &#8635;
          </span>
          <h2>A little room for mayhem</h2>
          <p>
            Rotate your device to landscape to explore the lab. Your mission is
            paused until you do.
          </p>
          <button onClick={leave}>Return to Base</button>
        </div>
      )}

      {paused && !needsRotation && !finished && (
        <PauseModal
          reason={pauseReason}
          onResume={resume}
          onRestart={restart}
          onLeave={leave}
          onSettings={() => setModal("settings")}
          onHowTo={() => setModal("how")}
        />
      )}

      {modal === "settings" && (
        <SettingsModal
          settings={settings}
          onChange={updateSetting}
          onClose={() => setModal(null)}
        />
      )}

      {modal === "how" && <HowToPlayModal onClose={() => setModal(null)} />}
    </div>
  );
}
