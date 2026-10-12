/**
 * Particle bursts, ability visuals and screen shake.
 *
 * Every effect checks the player's accessibility settings first: reduced
 * motion removes particle bursts and shortens tweens, and screen shake is
 * independently switchable.
 */

import Phaser from "phaser";
import { ABILITIES, PALETTE } from "@/game/config/constants";
import { getCosmetic } from "@/data/catalog";

/**
 * @param {Phaser.Scene} scene
 * @param {() => {reducedMotion: boolean, screenShake: boolean}} getSettings
 */
export function createEffects(scene, getSettings) {
  /** Short-lived particle burst. Skipped entirely under reduced motion. */
  function burst(x, y, color, count = 14) {
    if (getSettings().reducedMotion) return;

    const emitter = scene.add.particles(x, y, "spark", {
      speed: { min: 30, max: 130 },
      lifespan: 400,
      scale: { start: 0.8, end: 0 },
      tint: color,
      emitting: false,
    });
    emitter.explode(count);
    scene.time.delayedCall(500, () => emitter.destroy());
  }

  return {
    burst,

    /** Collection feedback. */
    coreCollected(x, y) {
      burst(x, y, PALETTE.coreParticle, 16);
    },

    /** Damage feedback: a red burst plus a short, small camera shake. */
    damage(x, y) {
      const settings = getSettings();
      burst(x, y, PALETTE.damage, 12);
      if (settings.screenShake && !settings.reducedMotion) {
        scene.cameras.main.shake(130, 0.003);
      }
    },

    /**
     * Ability cast ring. Uses the equipped ability-effect cosmetic colour when
     * one is equipped — appearance only, the ability itself is unchanged.
     */
    abilityRing(x, y, character, equipped) {
      const settings = getSettings();
      const cosmetic = getCosmetic(equipped["Ability effects"]);
      const color = Phaser.Display.Color.HexStringToColor(
        cosmetic?.color || character.color,
      ).color;

      const ring = scene.add.circle(x, y, 22).setStrokeStyle(4, color);
      // Pip's boost is self-targeted, so its ring stays tight; the others
      // expand out to roughly the radius they actually affect.
      const radius = character.id === "pip" ? 50 : (ABILITIES[character.id]?.radius ?? 180);

      scene.tweens.add({
        targets: ring,
        radius,
        alpha: 0,
        duration: settings.reducedMotion ? 120 : 600,
        onComplete: () => ring.destroy(),
      });

      burst(x, y, color);
      return color;
    },

    /** Glitch's holographic decoy. */
    decoy(x, y, color) {
      const ghost = scene.add.container(x, y, [
        scene.add.circle(0, 0, 22, color, 0.45),
        scene.add
          .text(0, 0, "✧", { fontSize: "24px", color: "#ffffff" })
          .setOrigin(0.5),
      ]);
      ghost.setDepth(9);

      if (!getSettings().reducedMotion) {
        scene.tweens.add({
          targets: ghost,
          alpha: { from: 0.9, to: 0.45 },
          duration: 320,
          yoyo: true,
          repeat: -1,
        });
      }
      return ghost;
    },
  };
}
