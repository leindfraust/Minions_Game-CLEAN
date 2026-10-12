import { describe, it, expect } from "vitest";
import { GAME, WALLS, CORES, ROBOT_ROUTES, ABILITIES } from "./constants";
import { CHARACTERS } from "@/data/catalog";

/** Physics body radius used for the player and the robots. */
const ACTOR_RADIUS = 18;

/** World bounds, as the scene sets them. */
const BOUNDS = {
  left: 28,
  top: 28,
  right: GAME.width - 28,
  bottom: GAME.height - 28,
};

/** Does a circle at (x, y) overlap a [cx, cy, w, h] wall? */
function overlapsWall(x, y, radius, [cx, cy, w, h]) {
  const nearestX = Math.max(cx - w / 2, Math.min(x, cx + w / 2));
  const nearestY = Math.max(cy - h / 2, Math.min(y, cy + h / 2));
  return Math.hypot(x - nearestX, y - nearestY) < radius;
}

/**
 * Flood-fill the lab on a coarse grid to find everywhere the player can stand,
 * then assert the objective is actually completable. This is the test that
 * would catch a level edit that walls a core off or seals the exit.
 */
function reachableCells(step = 8) {
  const passable = (x, y) =>
    x >= BOUNDS.left + ACTOR_RADIUS &&
    x <= BOUNDS.right - ACTOR_RADIUS &&
    y >= BOUNDS.top + ACTOR_RADIUS &&
    y <= BOUNDS.bottom - ACTOR_RADIUS &&
    !WALLS.some((wall) => overlapsWall(x, y, ACTOR_RADIUS, wall));

  const key = (x, y) => `${x},${y}`;
  const snap = (v) => Math.round(v / step) * step;

  const start = [snap(GAME.spawn.x), snap(GAME.spawn.y)];
  expect(passable(...start)).toBe(true);

  const seen = new Set([key(...start)]);
  const queue = [start];

  while (queue.length > 0) {
    const [x, y] = queue.pop();
    for (const [dx, dy] of [
      [step, 0],
      [-step, 0],
      [0, step],
      [0, -step],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      const id = key(nx, ny);
      if (seen.has(id) || !passable(nx, ny)) continue;
      seen.add(id);
      queue.push([nx, ny]);
    }
  }

  return { seen, step, snap };
}

describe("level geometry", () => {
  it("places exactly the required number of cores", () => {
    expect(CORES).toHaveLength(GAME.cores);
  });

  it("keeps every core inside the world bounds", () => {
    CORES.forEach(([x, y], index) => {
      expect(x, `core ${index} x`).toBeGreaterThan(BOUNDS.left);
      expect(x, `core ${index} x`).toBeLessThan(BOUNDS.right);
      expect(y, `core ${index} y`).toBeGreaterThan(BOUNDS.top);
      expect(y, `core ${index} y`).toBeLessThan(BOUNDS.bottom);
    });
  });

  it("never places a core inside a wall", () => {
    CORES.forEach(([x, y], index) => {
      const blocked = WALLS.find((wall) => overlapsWall(x, y, ACTOR_RADIUS, wall));
      expect(blocked, `core ${index} at ${x},${y} is inside a wall`).toBeUndefined();
    });
  });

  it("does not spawn the player inside a wall", () => {
    const blocked = WALLS.find((wall) =>
      overlapsWall(GAME.spawn.x, GAME.spawn.y, ACTOR_RADIUS, wall),
    );
    expect(blocked).toBeUndefined();
  });

  it("does not bury the exit portal in a wall", () => {
    const blocked = WALLS.find((wall) =>
      overlapsWall(GAME.portal.x, GAME.portal.y, ACTOR_RADIUS, wall),
    );
    expect(blocked).toBeUndefined();
  });

  it("gives no two cores the same position", () => {
    const unique = new Set(CORES.map(([x, y]) => `${x},${y}`));
    expect(unique.size).toBe(CORES.length);
  });

  it("leaves every core reachable from the spawn point", () => {
    const { seen, step, snap } = reachableCells();

    CORES.forEach(([x, y], index) => {
      // A core counts as reachable if any grid cell near it was flood-filled.
      const nearby = [
        [snap(x), snap(y)],
        [snap(x) + step, snap(y)],
        [snap(x) - step, snap(y)],
        [snap(x), snap(y) + step],
        [snap(x), snap(y) - step],
      ];
      const found = nearby.some(([cx, cy]) => seen.has(`${cx},${cy}`));
      expect(found, `core ${index} at ${x},${y} is unreachable`).toBe(true);
    });
  });

  it("leaves the exit portal reachable from the spawn point", () => {
    const { seen, step, snap } = reachableCells();
    const nearby = [
      [snap(GAME.portal.x), snap(GAME.portal.y)],
      [snap(GAME.portal.x) - step, snap(GAME.portal.y)],
      [snap(GAME.portal.x), snap(GAME.portal.y) + step],
    ];
    expect(nearby.some(([x, y]) => seen.has(`${x},${y}`))).toBe(true);
  });

  it("keeps every robot patrol waypoint out of the walls", () => {
    ROBOT_ROUTES.flat().forEach(([x, y], index) => {
      const blocked = WALLS.find((wall) => overlapsWall(x, y, ACTOR_RADIUS, wall));
      expect(blocked, `waypoint ${index} at ${x},${y} is inside a wall`).toBeUndefined();
    });
  });

  it("never starts a patrol within detection range of the player spawn", () => {
    // Otherwise a robot begins chasing before the player has moved, which is
    // both unfair and impossible to react to.
    ROBOT_ROUTES.flat().forEach(([x, y], index) => {
      const distance = Math.hypot(x - GAME.spawn.x, y - GAME.spawn.y);
      expect(
        distance,
        `waypoint ${index} at ${x},${y} is ${distance.toFixed(0)}px from spawn, ` +
          `inside the ${GAME.detection}px detection radius`,
      ).toBeGreaterThan(GAME.detection);
    });
  });

  it("gives each robot two distinct waypoints", () => {
    ROBOT_ROUTES.forEach((route, index) => {
      expect(route, `route ${index}`).toHaveLength(2);
      expect(route[0]).not.toEqual(route[1]);
    });
  });
});

describe("tuning sanity", () => {
  it("gives robots hysteresis so chase state cannot flicker", () => {
    // Acquiring closer than it releases is what stops a robot oscillating
    // between patrol and chase at exactly the detection radius.
    expect(GAME.loseInterest).toBeGreaterThan(GAME.detection);
  });

  it("keeps the player faster than a chasing robot", () => {
    CHARACTERS.forEach((character) => {
      expect(character.speed, character.id).toBeGreaterThan(GAME.robotSpeed);
    });
  });

  it("gives every character ability tuning", () => {
    CHARACTERS.forEach((character) => {
      expect(ABILITIES[character.id], character.id).toBeDefined();
      expect(ABILITIES[character.id].durationMs).toBeGreaterThan(0);
    });
  });

  it("keeps every cooldown longer than its ability duration", () => {
    // Otherwise an ability could be permanently active.
    CHARACTERS.forEach((character) => {
      const tuning = ABILITIES[character.id];
      expect(character.cooldown * 1000, character.id).toBeGreaterThan(tuning.durationMs);
    });
  });

  it("gives a meaningful invulnerability window after damage", () => {
    expect(GAME.invulnerability).toBeGreaterThanOrEqual(1000);
    // Long enough to escape, short enough not to trivialise the robots.
    expect(GAME.invulnerability).toBeLessThan(2000);
  });

  it("staggers a robot for longer than the player's invulnerability", () => {
    /*
      If a robot recovered first, a player caught against a wall would be
      chain-hit from full health to zero with no chance to break away.
    */
    expect(GAME.attackRecovery).toBeGreaterThanOrEqual(GAME.invulnerability);
  });

  it("leaves a meaningful share of the lab unwatched", () => {
    // Sanity check on level-one difficulty: robots should not blanket the map.
    const usable = (GAME.width - 76) * (GAME.height - 76);
    const covered = Math.PI * GAME.detection ** 2 * ROBOT_ROUTES.length;
    expect(covered / usable).toBeLessThan(0.5);
  });

  it("makes the interact radius generous enough to use the portal", () => {
    expect(GAME.interactRadius).toBeGreaterThan(ACTOR_RADIUS * 2);
  });
});
