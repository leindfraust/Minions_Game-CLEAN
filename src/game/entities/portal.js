/**
 * The exit portal.
 *
 * Two clearly different visual states: locked (dim violet, "EXIT LOCKED") and
 * open (bright cyan, pulsing, "E · ESCAPE"), so the player never has to guess
 * whether the objective is complete.
 */

import { GAME, PALETTE } from "@/game/config/constants";

export function createPortal(scene, { reducedMotion }) {
  const { x, y } = GAME.portal;

  const halo = scene.add
    .circle(0, 0, 36, 0x8976db, 0.12)
    .setStrokeStyle(2, PALETTE.portalLocked);
  const gate = scene.add
    .ellipse(0, 0, 35, 53, 0x20243b)
    .setStrokeStyle(4, PALETTE.portalLocked);

  const container = scene.add.container(x, y, [halo, gate]);

  const label = scene.add
    .text(x, y + 49, "EXIT LOCKED", {
      fontFamily: "monospace",
      fontSize: "11px",
      color: "#9588b0",
    })
    .setOrigin(0.5);

  /** Switch to the unlocked look. Safe to call more than once. */
  container.unlock = () => {
    if (container.unlocked) return;
    container.unlocked = true;

    halo.setStrokeStyle(3, PALETTE.portalOpen);
    halo.setFillStyle(PALETTE.portalOpen, 0.14);
    gate.setStrokeStyle(4, PALETTE.portalOpen);
    label.setText("E · ESCAPE").setColor("#91ffcc");

    if (!reducedMotion) {
      scene.tweens.add({
        targets: halo,
        scale: 1.18,
        alpha: 0.75,
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  };

  container.unlocked = false;
  return container;
}
