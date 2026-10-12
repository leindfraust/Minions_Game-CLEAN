/**
 * Energy Cores: the eight collectibles that unlock the exit.
 * Static physics bodies with a circular hitbox slightly larger than the art,
 * so collection feels generous rather than pixel-precise.
 */

import { CORES, PALETTE } from "@/game/config/constants";

/**
 * Create the core group and their glow halos.
 * @param {Phaser.Scene} scene
 * @param {{reducedMotion: boolean}} opts
 */
export function createCores(scene, { reducedMotion }) {
  // Soft glow rings, drawn under the cores.
  CORES.forEach(([x, y]) => {
    scene.add.circle(x, y, 28, PALETTE.coreParticle, 0.035);
    scene.add.circle(x, y, 21, PALETTE.coreParticle, 0.06);
  });

  const group = scene.physics.add.staticGroup();

  CORES.forEach(([x, y]) => {
    const core = scene.add
      .star(x, y, 4, 9, 18, PALETTE.core)
      .setStrokeStyle(2, PALETTE.coreStroke);

    scene.physics.add.existing(core, true);
    core.body.setCircle(19, -1, -1);
    group.add(core);

    if (!reducedMotion) {
      scene.tweens.add({
        targets: core,
        angle: 90,
        scale: 0.8,
        duration: 1300,
        yoyo: true,
        repeat: -1,
      });
    }
  });

  return group;
}
