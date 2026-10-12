/**
 * Single source of truth for gameplay tuning.
 *
 * Everything the mission balances on — sizes, speeds, timers, detection
 * ranges, scoring weights — lives here so designers can retune the game
 * without touching scene code, and so unit tests can assert against the
 * same numbers the runtime uses.
 */

/** Core mission rules. */
export const GAME = {
  /** Internal render resolution. The canvas is scaled to fit, never distorted. */
  width: 1120,
  height: 680,
  /** Mission time limit, in seconds. */
  duration: 90,
  /** Energy Cores required to unlock the exit portal. */
  cores: 8,
  /** Player health points. */
  health: 3,
  /** Invulnerability window after taking damage, in milliseconds. */
  invulnerability: 1100,
  /**
   * Robot sight radius, in pixels.
   *
   * Four robots at 175px covered 61% of the lab at all times, which made the
   * first level punishing rather than tense: there was rarely anywhere to
   * stand that was not already watched. 150px brings that to about 45% and
   * leaves real gaps to move through.
   */
  detection: 150,
  /** Radius at which a chasing robot gives up and returns to patrol. */
  loseInterest: 260,
  /** Robot patrol/chase movement speed, in pixels per second. */
  robotSpeed: 103,
  /** Patrol speed is a fraction of chase speed. */
  patrolSpeedFactor: 0.65,
  /**
   * How long a robot pauses after landing a hit, in milliseconds.
   *
   * Deliberately longer than `invulnerability`. When it was shorter the robot
   * resumed chasing before the player's grace period ended, so a player caught
   * against a wall was chain-hit from three health to zero in about two
   * seconds with no window to escape. Staggering the attacker for slightly
   * longer than the grace period guarantees that window.
   */
  attackRecovery: 1200,
  /** Distance within which `E` can operate the exit portal. */
  interactRadius: 72,
  /** Player spawn point. */
  spawn: { x: 95, y: 110 },
  /** Exit portal position. */
  portal: { x: 1015, y: 100 },
};

/** Scoring weights, kept beside the rules they reward. */
export const SCORING = {
  perCore: 250,
  escapeBonus: 1500,
  perSecondRemaining: 25,
  damagePenalty: 100,
  perAbilityUse: 25,
  /** Ability uses beyond this stop earning points, to stop cooldown farming. */
  abilityUseCap: 10,
  xpPerCore: 15,
  xpEscape: 120,
  xpAttempt: 20,
};

/** Progression thresholds. */
export const PROGRESSION = {
  xpPerLevel: 300,
  /** Most recent mission results kept in local storage. */
  historyLimit: 5,
};

/** Ability tuning, keyed by character id. */
export const ABILITIES = {
  volt: { durationMs: 3000, radius: 190, stunMs: 3000 },
  pip: { durationMs: 3000, speedMultiplier: 1.65 },
  glitch: { durationMs: 4000, decoyMs: 4000 },
  moss: { durationMs: 3000, radius: 190, stunMs: 2000, knockback: 380 },
};

/**
 * Static collision geometry: [centerX, centerY, width, height].
 * These divide the lab into connected rooms while leaving every corridor
 * wide enough for the player and robots to pass.
 */
export const WALLS = [
  [280, 170, 210, 40],
  [660, 160, 200, 40],
  [480, 335, 40, 180],
  [835, 355, 185, 40],
  [230, 490, 190, 40],
  [725, 545, 40, 150],
];

/**
 * Energy Core positions. All eight sit in open floor space, reachable
 * without passing through a wall. Verified by `reachability.test.js`.
 */
export const CORES = [
  [220, 110],
  [480, 100],
  [770, 95],
  [995, 270],
  [630, 325],
  [160, 375],
  [425, 580],
  [965, 565],
];

/**
 * Robot patrol routes: each robot walks between two waypoints.
 *
 * No waypoint may sit within `detection` of the player spawn, or a robot would
 * start chasing before the player has had a chance to move. Enforced by
 * `reachability.test.js`.
 */
export const ROBOT_ROUTES = [
  [
    [360, 240],
    [230, 260],
  ],
  [
    [620, 230],
    [800, 270],
  ],
  [
    [890, 470],
    [1020, 390],
  ],
  [
    [500, 530],
    [600, 420],
  ],
];

/** Decorative-only machinery clusters, drawn but not collidable. */
export const PROPS = [
  [90, 555],
  [985, 210],
  [570, 105],
];

/** Palette shared by the Phaser scene and the CSS design tokens. */
export const PALETTE = {
  floor: 0x101d2b,
  grid: 0x223449,
  wallFill: 0x293f50,
  wallStroke: 0x496374,
  wallInner: 0x172734,
  frame: 0x304353,
  frameGlow: 0x75ddd1,
  core: 0xb8ffe2,
  coreStroke: 0x5ee0c1,
  coreParticle: 0x80f5c6,
  robotBody: 0x455366,
  robotStroke: 0x8593a1,
  robotPatrol: 0xf7ba7c,
  robotChase: 0xff665f,
  robotWheel: 0x1c2839,
  portalLocked: 0x75678a,
  portalOpen: 0x79f7cf,
  damage: 0xff8e87,
  visor: 0x111e30,
  eye: 0xa7fbff,
  boot: 0x394e60,
};
