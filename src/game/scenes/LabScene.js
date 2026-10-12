/**
 * The one playable mission: escape Sector 07.
 *
 * Mission clock design: the scene keeps its own `elapsed` accumulator advanced
 * in `update`, rather than reading wall time. Because `update` stops running
 * while paused, the mission timer and every cooldown, stun and invulnerability
 * deadline — all expressed in mission milliseconds — pause together for free.
 * Nothing needs to remember to stop a separate timer.
 */

import Phaser from "phaser";
import { GAME, ABILITIES, ROBOT_ROUTES, PALETTE } from "@/game/config/constants";
import {
  cooldownRemaining,
  isAbilityReady,
  objectiveFor,
  resolveInteraction,
} from "@/utils/logic";
import { drawFloor, buildWalls, ensureSparkTexture } from "@/game/systems/lab";
import { createEffects } from "@/game/systems/effects";
import { createAudio } from "@/game/systems/audio";
import { createPlayer, animatePlayer } from "@/game/entities/player";
import { createRobot, updateRobot, stunRobot } from "@/game/entities/robot";
import { createCores } from "@/game/entities/core";
import { createPortal } from "@/game/entities/portal";

/** How often, at most, the HUD is told about a continuous value. */
const HUD_INTERVAL_MS = 100;

export default class LabScene extends Phaser.Scene {
  /**
   * @param {{character: object, bridge: import('@/game/systems/bridge').Bridge, settings: object, equipped: Record<string,string>}} opts
   */
  constructor({ character, bridge, settings, equipped }) {
    super("lab");
    this.character = character;
    this.bridge = bridge;
    this.settings = settings;
    this.equipped = equipped || {};
  }

  /** Live settings, so a change made mid-mission takes effect immediately. */
  applySettings(settings) {
    this.settings = settings;
  }

  create() {
    /* ------------------------------------------------------- mission state */
    this.elapsed = 0; // seconds of un-paused mission time
    this.collected = 0;
    this.health = GAME.health;
    this.damage = 0;
    this.abilityUses = 0;
    this.lastAbility = -Infinity;
    this.lastHit = -Infinity;
    this.abilityActiveUntil = 0;
    this.ended = false;
    this.isPaused = false;
    this.inputVector = { x: 0, y: 0 };
    this.decoy = null;
    this.decoyUntil = 0;
    this.nextHudAt = 0;
    this.lastHud = null;

    /* ------------------------------------------------------------- systems */
    const getSettings = () => this.settings;
    this.effects = createEffects(this, getSettings);
    this.audio = createAudio(getSettings);

    this.physics.world.setBounds(28, 28, GAME.width - 56, GAME.height - 56);

    /* ----------------------------------------------------------- the level */
    ensureSparkTexture(this);
    drawFloor(this);
    this.walls = buildWalls(this);
    this.cores = createCores(this, { reducedMotion: this.settings.reducedMotion });
    this.portal = createPortal(this, { reducedMotion: this.settings.reducedMotion });

    /* ------------------------------------------------------------- players */
    this.player = createPlayer(this, {
      character: this.character,
      equipped: this.equipped,
      x: GAME.spawn.x,
      y: GAME.spawn.y,
    });
    this.physics.add.collider(this.player, this.walls);

    /* -------------------------------------------------------------- robots */
    this.robots = ROBOT_ROUTES.map((route) => {
      const robot = createRobot(this, route);
      this.physics.add.collider(robot, this.walls);
      this.physics.add.overlap(this.player, robot, () => this.takeDamage(robot));
      return robot;
    });

    /* ---------------------------------------------------------- collection */
    this.physics.add.overlap(this.player, this.cores, (_player, core) =>
      this.collectCore(core),
    );

    /* --------------------------------------------------------------- input */
    /*
      Escape is deliberately absent. Pause is owned by React (see
      MissionClient): once the pause dialog is open, focus sits inside it and
      key events do not reliably reach Phaser, so having both sides listen made
      resuming intermittent. One owner, one behaviour.
    */
    this.keys = this.input.keyboard.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,E");
    // Stop the page from scrolling when the player uses space or the arrows.
    this.input.keyboard.addCapture(["SPACE", "UP", "DOWN", "LEFT", "RIGHT"]);

    this.subscriptions = [
      this.bridge.on("command", (command) => this.handleCommand(command)),
      this.bridge.on("move", (vector) => {
        this.inputVector = vector;
      }),
      this.bridge.on("settings", (settings) => this.applySettings(settings)),
    ];

    /**
     * Losing window focus while a key is held would otherwise leave the Mote
     * walking forever, because the keyup never arrives.
     */
    this.releaseInput = () => {
      this.inputVector = { x: 0, y: 0 };
      this.input.keyboard.resetKeys();
      this.player?.body?.stop();
    };
    window.addEventListener("blur", this.releaseInput);

    this.events.once("shutdown", () => this.teardown());

    this.bridge.emit("game-started");
    this.bridge.emit("objective", objectiveFor(0));
    this.syncHud(true);
  }

  teardown() {
    this.subscriptions?.forEach((off) => off());
    this.subscriptions = null;
    window.removeEventListener("blur", this.releaseInput);
    this.audio?.destroy();
  }

  /** @param {"pause"|"resume"|"ability"|"interact"} command */
  handleCommand(command) {
    if (command === "pause") this.setPaused(true);
    else if (command === "resume") this.setPaused(false);
    else if (command === "ability") this.useAbility();
    else if (command === "interact") this.interact();
  }

  /** Mission time in milliseconds — the clock everything else is measured in. */
  get now() {
    return this.elapsed * 1000;
  }

  setPaused(value) {
    if (this.ended || this.isPaused === value) return;
    this.isPaused = value;
    // Drop held input so resuming does not fling the player.
    this.inputVector = { x: 0, y: 0 };
    if (value) {
      this.physics.pause();
      this.player.body.stop();
    } else {
      this.physics.resume();
    }
    this.bridge.emit("game-paused", value);
  }

  /* -------------------------------------------------------------- HUD sync */

  /**
   * Push HUD values to React.
   *
   * Never once per frame: continuous values are rate-limited to
   * `HUD_INTERVAL_MS` and the payload is dropped entirely when nothing the HUD
   * displays has actually changed. Discrete events pass `force` so a collected
   * core or a lost heart shows up instantly.
   *
   * @param {boolean} [force]
   */
  syncHud(force = false) {
    const now = this.now;
    if (!force && now < this.nextHudAt) return;
    this.nextHudAt = now + HUD_INTERVAL_MS;

    const next = {
      health: this.health,
      cores: this.collected,
      // Whole seconds only: the HUD shows M:SS, so finer values are noise.
      time: Math.max(0, Math.ceil(GAME.duration - this.elapsed)),
      // One decimal is all the cooldown readout renders.
      cooldown:
        Math.round(
          cooldownRemaining(this.lastAbility, now, this.character.cooldown) * 10,
        ) / 10,
      abilityActive: now < this.abilityActiveUntil,
    };

    const previous = this.lastHud;
    if (
      previous &&
      previous.health === next.health &&
      previous.cores === next.cores &&
      previous.time === next.time &&
      previous.cooldown === next.cooldown &&
      previous.abilityActive === next.abilityActive
    ) {
      return; // Nothing changed; do not touch React state.
    }

    this.lastHud = next;
    this.bridge.emit("hud", next);
  }

  /* ------------------------------------------------------------ collection */

  collectCore(core) {
    if (!core.active || this.ended || this.isPaused) return;

    core.destroy();
    this.collected += 1;
    this.effects.coreCollected(core.x, core.y);
    this.audio.core();

    if (this.collected >= GAME.cores) {
      this.portal.unlock();
      this.audio.allCores();
    }

    this.bridge.emit("objective", objectiveFor(this.collected));
    this.syncHud(true);
  }

  /* ---------------------------------------------------------------- damage */

  takeDamage(robot) {
    const now = this.now;
    if (
      this.isPaused ||
      this.ended ||
      now < robot.stunUntil || // stunned robots cannot hit
      now < robot.attackUntil || // robot is still recovering from its last hit
      now - this.lastHit < GAME.invulnerability // grace period
    ) {
      return;
    }

    this.lastHit = now;
    robot.attackUntil = now + GAME.attackRecovery;
    robot.body.stop();

    this.health -= 1;
    this.damage += 1;

    this.effects.damage(this.player.x, this.player.y);
    this.audio.damage();
    this.syncHud(true);

    if (this.health <= 0) this.finish(false);
  }

  /* -------------------------------------------------------------- abilities */

  useAbility() {
    const now = this.now;
    if (this.isPaused || this.ended) return;
    if (!isAbilityReady(this.lastAbility, now, this.character.cooldown)) return;

    const tuning = ABILITIES[this.character.id] || { durationMs: 3000 };
    this.lastAbility = now;
    this.abilityUses += 1;
    this.abilityActiveUntil = now + tuning.durationMs;
    this.audio.ability();

    const { x, y } = this.player;
    const color = this.effects.abilityRing(x, y, this.character, this.equipped);

    switch (this.character.id) {
      case "volt":
        // Disable every robot within range.
        this.robotsNear(x, y, tuning.radius).forEach((robot) => {
          stunRobot(robot, now, { stunMs: tuning.stunMs });
          this.effects.burst(robot.x, robot.y, color, 8);
        });
        break;

      case "moss":
        // Stun and physically shove robots away.
        this.robotsNear(x, y, tuning.radius).forEach((robot) => {
          stunRobot(robot, now, {
            stunMs: tuning.stunMs,
            knockback: tuning.knockback,
            fromX: x,
            fromY: y,
          });
          this.effects.burst(robot.x, robot.y, color, 8);
        });
        break;

      case "glitch": {
        // A decoy robots chase instead of the player.
        this.decoy?.destroy();
        this.decoy = this.effects.decoy(x, y, PALETTE.robotStroke);
        this.decoyUntil = now + tuning.decoyMs;
        break;
      }

      case "pip":
      default:
        // Speed boost is read directly from `abilityActiveUntil` in update().
        break;
    }

    this.bridge.emit("ability-activated", this.character.ability);
    this.syncHud(true);
  }

  /**
   * Robots within `radius` of a point.
   * @param {number} x @param {number} y @param {number} radius
   */
  robotsNear(x, y, radius) {
    return this.robots.filter(
      (robot) => Phaser.Math.Distance.Between(x, y, robot.x, robot.y) < radius,
    );
  }

  /* -------------------------------------------------------------- interact */

  interact() {
    if (this.isPaused || this.ended) return;

    const distance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      GAME.portal.x,
      GAME.portal.y,
    );

    switch (resolveInteraction({ distance, collected: this.collected })) {
      case "escape":
        this.finish(true);
        break;

      case "locked":
        this.audio.locked();
        this.bridge.emit(
          "objective",
          `Portal locked. ${objectiveFor(this.collected)}`,
        );
        break;

      default:
        this.bridge.emit(
          "objective",
          this.collected >= GAME.cores
            ? "Head to the exit portal in the northeast."
            : objectiveFor(this.collected),
        );
    }
  }

  /* ---------------------------------------------------------------- ending */

  /** @param {boolean} won */
  finish(won) {
    if (this.ended) return;
    this.ended = true;
    this.physics.pause();
    this.player.body.stop();

    if (won) this.audio.win();
    else this.audio.lose();

    this.bridge.emit(won ? "mission-completed" : "mission-failed", {
      won,
      cores: this.collected,
      elapsed: this.elapsed,
      damage: this.damage,
      abilityUses: this.abilityUses,
      character: this.character.id,
    });
  }

  /* ---------------------------------------------------------------- update */

  update(_time, delta) {
    if (!this.keys) return;

    if (this.isPaused || this.ended) return;

    // Clamp delta so a stalled tab cannot fast-forward the mission clock.
    this.elapsed += Math.min(delta, 100) / 1000;
    const now = this.now;

    if (this.elapsed >= GAME.duration) {
      this.syncHud(true);
      this.finish(false);
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) this.useAbility();
    if (Phaser.Input.Keyboard.JustDown(this.keys.E)) this.interact();

    /* ------------------------------------------------------------ movement */
    const vector = new Phaser.Math.Vector2(
      this.inputVector.x +
        (this.keys.D.isDown || this.keys.RIGHT.isDown ? 1 : 0) -
        (this.keys.A.isDown || this.keys.LEFT.isDown ? 1 : 0),
      this.inputVector.y +
        (this.keys.S.isDown || this.keys.DOWN.isDown ? 1 : 0) -
        (this.keys.W.isDown || this.keys.UP.isDown ? 1 : 0),
    );
    // Normalising keeps diagonal movement from being faster than straight.
    if (vector.length() > 1) vector.normalize();

    const boosted =
      this.character.id === "pip" && now < this.abilityActiveUntil;
    const speed =
      this.character.speed * (boosted ? ABILITIES.pip.speedMultiplier : 1);

    this.player.body.setVelocity(vector.x * speed, vector.y * speed);

    animatePlayer(this.player, {
      speed: vector.length(),
      now,
      sinceHit: now - this.lastHit,
      invulnerability: GAME.invulnerability,
      reducedMotion: this.settings.reducedMotion,
    });

    /* --------------------------------------------------------------- decoy */
    if (this.decoy && now > this.decoyUntil) {
      this.decoy.destroy();
      this.decoy = null;
    }

    /* -------------------------------------------------------------- robots */
    const target = this.decoy || this.player;
    this.robots.forEach((robot) => updateRobot(robot, target, now));

    this.syncHud();
  }
}
