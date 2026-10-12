/**
 * The player Mote: an original silhouette drawn with Phaser graphics, so the
 * game needs no external image service and no sprite atlas.
 *
 * Each Mote gets a distinct body shape, and equipped cosmetics change the
 * drawing — visibly, but never its speed, size or hitbox.
 */

import Phaser from "phaser";
import { PALETTE } from "@/game/config/constants";
import { getCosmetic } from "@/data/catalog";

/**
 * Resolve the body colour, honouring an equipped body-colour cosmetic.
 * @param {object} character
 * @param {Record<string, string>} equipped
 */
function bodyColor(character, equipped) {
  const cosmetic = getCosmetic(equipped["Body colors"]);
  const hex = cosmetic?.color || character.color;
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

/**
 * Draw a Mote into a graphics object.
 * @param {Phaser.GameObjects.Graphics} g
 * @param {object} character
 * @param {Record<string, string>} equipped
 */
function drawMote(g, character, equipped) {
  const color = bodyColor(character, equipped);
  g.clear();

  // Distinct silhouette per Mote.
  g.fillStyle(color);
  if (character.id === "pip") {
    g.fillTriangle(0, -23, -19, 19, 19, 19);
  } else if (character.id === "glitch") {
    g.fillPoints(
      [
        { x: 0, y: -25 },
        { x: 23, y: 0 },
        { x: 0, y: 24 },
        { x: -23, y: 0 },
      ],
      true,
    );
  } else {
    g.fillRoundedRect(-20, -23, 40, 45, character.id === "moss" ? 9 : 18);
  }

  // Digital visor and eyes.
  g.fillStyle(PALETTE.visor);
  g.fillRoundedRect(-18, -13, 36, 20, 8);
  g.fillStyle(PALETTE.eye);
  g.fillRect(-10, -7, 5, 7);
  g.fillRect(6, -7, 5, 7);

  // Unusual little limbs.
  g.fillStyle(PALETTE.boot);
  g.fillRoundedRect(-19, 17, 13, 10, 4);
  g.fillRoundedRect(6, 17, 13, 10, 4);

  // Equipped cosmetics read on the canvas, not just in menus.
  const visor = getCosmetic(equipped.Visors);
  if (visor) {
    g.lineStyle(3, Phaser.Display.Color.HexStringToColor(visor.color).color);
    g.lineBetween(-14, -11, 14, -11);
  }

  const back = getCosmetic(equipped["Back accessories"]);
  if (back) {
    g.lineStyle(3, Phaser.Display.Color.HexStringToColor(back.color).color);
    g.lineBetween(17, -15, 23, -30);
  }

  const boots = getCosmetic(equipped.Footwear);
  if (boots) {
    g.fillStyle(Phaser.Display.Color.HexStringToColor(boots.color).color);
    g.fillRoundedRect(-20, 24, 14, 5, 2);
    g.fillRoundedRect(6, 24, 14, 5, 2);
  }
}

/**
 * Create the player container with an arcade physics body.
 * @param {Phaser.Scene} scene
 * @param {{character: object, equipped: Record<string,string>, x: number, y: number}} opts
 */
export function createPlayer(scene, { character, equipped, x, y }) {
  const art = scene.add.graphics();
  drawMote(art, character, equipped);

  const container = scene.add.container(x, y, [art]).setDepth(10);
  scene.physics.add.existing(container);
  container.body.setCircle(18, -18, -18).setCollideWorldBounds(true);

  /** Art node is kept separately so idle/walk animation never moves the body. */
  container.art = art;
  return container;
}

/**
 * Idle and movement animation, plus damage flicker.
 * Purely cosmetic: it offsets the art child, never the physics body.
 *
 * @param {Phaser.GameObjects.Container} player
 * @param {{speed: number, now: number, sinceHit: number, invulnerability: number, reducedMotion: boolean}} state
 */
export function animatePlayer(player, state) {
  const { speed, now, sinceHit, invulnerability, reducedMotion } = state;

  if (!reducedMotion) {
    const moving = speed > 0;
    // Faster, taller bob while walking; a slow breath while idle.
    player.art.y = Math.sin(now / (moving ? 70 : 250)) * (moving ? 2.5 : 1);
    player.art.rotation = Math.sin(now / 90) * (moving ? 0.06 : 0.015);
  } else {
    player.art.y = 0;
    player.art.rotation = 0;
  }

  // Blink during invulnerability so the player can read the grace period.
  player.alpha =
    sinceHit < invulnerability ? (Math.sin(now / 55) > 0 ? 0.35 : 1) : 1;
}
