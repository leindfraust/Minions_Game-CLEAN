/**
 * Draws the laboratory: floor, grid, outer frame, room dividers, and
 * decorative machinery. All Phaser graphics, no external assets.
 *
 * Collision geometry and decoration are built separately on purpose — the
 * decorative pass can be as detailed as it likes without any risk of adding
 * an invisible wall the player can walk into.
 */

import { GAME, WALLS, PROPS, PALETTE } from "@/game/config/constants";

/** Floor, grid and the outer containment frame. */
export function drawFloor(scene) {
  const g = scene.add.graphics();

  g.fillStyle(PALETTE.floor);
  g.fillRect(0, 0, GAME.width, GAME.height);

  // Faint floor grid gives the top-down view a sense of scale.
  g.lineStyle(1, PALETTE.grid, 0.6);
  for (let x = 0; x < GAME.width; x += 40) g.lineBetween(x, 0, x, GAME.height);
  for (let y = 0; y < GAME.height; y += 40) g.lineBetween(0, y, GAME.width, y);

  g.lineStyle(16, PALETTE.frame);
  g.strokeRoundedRect(18, 18, GAME.width - 36, GAME.height - 36, 18);
  g.lineStyle(2, PALETTE.frameGlow, 0.5);
  g.strokeRoundedRect(30, 30, GAME.width - 60, GAME.height - 60, 8);

  scene.add.text(65, 55, "SECTOR 07  /  CONTAINMENT LAB", {
    fontFamily: "monospace",
    fontSize: "13px",
    color: "#67808f",
  });
  scene.add.text(65, GAME.height - 60, "CAUTION: SMALL CREATURES. BIG IDEAS.", {
    fontFamily: "monospace",
    fontSize: "11px",
    color: "#506579",
  });

  return g;
}

/**
 * Build the collidable room dividers and their decoration.
 * @returns {Phaser.Physics.Arcade.StaticGroup}
 */
export function buildWalls(scene) {
  const walls = scene.physics.add.staticGroup();
  const detail = scene.add.graphics();

  WALLS.forEach(([x, y, w, h], index) => {
    const block = scene.add
      .rectangle(x, y, w, h, PALETTE.wallFill)
      .setStrokeStyle(3, PALETTE.wallStroke);
    scene.physics.add.existing(block, true);
    walls.add(block);

    // Machinery detail on top of each divider.
    detail.fillStyle(PALETTE.wallInner);
    detail.fillRoundedRect(x - w / 2 + 6, y - h / 2 + 6, w - 12, h - 12, 4);
    detail.lineStyle(3, index % 2 ? 0xa48bda : 0x67d5c4, 0.8);
    detail.lineBetween(x - w / 2 + 11, y - h / 2 + 9, x + w / 2 - 11, y - h / 2 + 9);

    detail.fillStyle(0x8db4bb, 0.5);
    for (let j = 0; j < Math.floor(w / 24); j++) {
      detail.fillRect(x - w / 2 + 12 + j * 22, y + h / 2 - 12, 10, 3);
    }

    detail.fillStyle(0xb1f2ce);
    detail.fillCircle(x + w / 2 - 12, y - h / 2 + 15, 2);
    detail.lineStyle(1, 0x3a5360);
    detail.strokeRoundedRect(x - w / 2 - 7, y - h / 2 - 7, w + 14, h + 14, 7);
  });

  // Free-standing lab equipment. Decorative only.
  PROPS.forEach(([x, y]) => {
    detail.fillStyle(0x263e4a);
    detail.fillRoundedRect(x - 22, y - 25, 44, 50, 8);
    detail.fillStyle(0x6adebc, 0.2);
    detail.fillRoundedRect(x - 15, y - 18, 30, 35, 6);
    detail.lineStyle(2, 0x75c9bb, 0.65);
    detail.strokeRoundedRect(x - 15, y - 18, 30, 35, 6);
    detail.fillStyle(0xa4edc7);
    detail.fillRect(x - 8, y + 20, 16, 3);
  });

  // Room outlines, to read the level as connected spaces rather than a field.
  detail.lineStyle(2, 0x73b7ab, 0.15);
  detail.strokeRoundedRect(65, 65, 460, 135, 15);
  detail.lineStyle(1, 0xa694d0, 0.15);
  detail.strokeRoundedRect(865, 435, 190, 175, 12);

  scene.add.text(865, GAME.height - 65, "03 / REACTOR STORAGE", {
    fontFamily: "monospace",
    fontSize: "10px",
    color: "#627689",
  });

  for (let i = 0; i < 8; i++) {
    detail.lineStyle(4, 0xc0b177, 0.32);
    detail.lineBetween(910 + i * 12, 48, 918 + i * 12, 58);
  }

  return walls;
}

/** Generate the one-pixel particle texture used by every burst effect. */
export function ensureSparkTexture(scene) {
  if (scene.textures.exists("spark")) return;
  const t = scene.make.graphics({ x: 0, y: 0 }, false);
  t.fillStyle(0xffffff);
  t.fillCircle(4, 4, 4);
  t.generateTexture("spark", 8, 8);
  t.destroy();
}
