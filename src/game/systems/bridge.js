/**
 * Scoped React <-> Phaser event bridge.
 *
 * One bridge is created per mission by the client component that owns both the
 * HUD and the Phaser host, and handed to the scene as a constructor argument.
 * Nothing is registered on `window` and the Phaser game instance is never
 * exposed to React, so the two halves stay independently testable and a
 * remount cannot leak listeners into the next mission.
 *
 * Events emitted by the scene:
 *   `hud`               {health, cores, time, cooldown, abilityActive}
 *   `objective`         string
 *   `game-started`      undefined
 *   `game-paused`       boolean
 *   `ability-activated` string (ability name)
 *   `mission-completed` stats
 *   `mission-failed`    stats
 *
 * Commands emitted by React:
 *   `command`  "pause" | "resume" | "ability" | "interact" | "restart"
 *   `move`     {x, y} normalised movement vector from the virtual joystick
 */

/**
 * @typedef {Object} Bridge
 * @property {(name: string, handler: (detail: *) => void) => () => void} on
 * @property {(name: string, detail?: *) => void} emit
 * @property {() => void} destroy
 */

/** @returns {Bridge} */
export function createBridge() {
  const target = new EventTarget();
  /** @type {Set<() => void>} */
  const unsubscribers = new Set();

  return {
    on(name, handler) {
      const callback = (event) => handler(event.detail);
      target.addEventListener(name, callback);
      const off = () => {
        target.removeEventListener(name, callback);
        unsubscribers.delete(off);
      };
      unsubscribers.add(off);
      return off;
    },

    emit(name, detail) {
      target.dispatchEvent(new CustomEvent(name, { detail }));
    },

    /** Drop every listener at once, for unmount. */
    destroy() {
      [...unsubscribers].forEach((off) => off());
    },
  };
}
