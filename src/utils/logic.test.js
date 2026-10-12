import { describe, it, expect } from "vitest";
import {
  resolveInteraction,
  calculateScore,
  calculateXp,
  cooldownRemaining,
  isAbilityReady,
  generateResult,
  filterInventory,
  levelFromXp,
  formatClock,
  objectiveFor,
  clamp,
  parseStored,
} from "./logic";
import { COSMETICS } from "@/data/catalog";
import { GAME, SCORING } from "@/game/config/constants";

describe("calculateScore", () => {
  it("pays for cores, the escape bonus and remaining time", () => {
    // 8 cores * 250 = 2000, escape 1500, 30s left * 25 = 750,
    // 1 damage -100, 2 ability uses * 25 = 50.
    expect(
      calculateScore({ won: true, cores: 8, elapsed: 60, damage: 1, abilityUses: 2 }),
    ).toBe(4200);
  });

  it("pays no escape bonus for a failed mission", () => {
    const failed = calculateScore({
      won: false,
      cores: 8,
      elapsed: 60,
      damage: 0,
      abilityUses: 0,
    });
    expect(failed).toBe(8 * SCORING.perCore);
  });

  it("never returns a negative score", () => {
    expect(
      calculateScore({ won: false, cores: 0, elapsed: 90, damage: 3, abilityUses: 0 }),
    ).toBe(0);
  });

  it("caps the ability bonus so cooldown spam cannot be farmed", () => {
    const capped = calculateScore({
      won: false,
      cores: 0,
      elapsed: 90,
      damage: 0,
      abilityUses: 100,
    });
    expect(capped).toBe(SCORING.abilityUseCap * SCORING.perAbilityUse);

    // Using it more than the cap adds nothing at all.
    const atCap = calculateScore({
      won: false,
      cores: 0,
      elapsed: 90,
      damage: 0,
      abilityUses: SCORING.abilityUseCap,
    });
    expect(capped).toBe(atCap);
  });

  it("rewards a faster escape more than a slower one", () => {
    const fast = calculateScore({ won: true, cores: 8, elapsed: 20, damage: 0, abilityUses: 0 });
    const slow = calculateScore({ won: true, cores: 8, elapsed: 80, damage: 0, abilityUses: 0 });
    expect(fast).toBeGreaterThan(slow);
  });

  it("gives no time bonus for finishing past the limit", () => {
    const onTime = calculateScore({
      won: true,
      cores: 8,
      elapsed: GAME.duration,
      damage: 0,
      abilityUses: 0,
    });
    const over = calculateScore({
      won: true,
      cores: 8,
      elapsed: GAME.duration + 30,
      damage: 0,
      abilityUses: 0,
    });
    expect(over).toBe(onTime);
  });

  it("penalises each point of damage", () => {
    const clean = calculateScore({ won: true, cores: 8, elapsed: 60, damage: 0, abilityUses: 0 });
    const hurt = calculateScore({ won: true, cores: 8, elapsed: 60, damage: 2, abilityUses: 0 });
    expect(clean - hurt).toBe(2 * SCORING.damagePenalty);
  });
});

describe("calculateXp", () => {
  it("pays more for an escape than an attempt", () => {
    expect(calculateXp({ won: true, cores: 8 })).toBe(8 * SCORING.xpPerCore + SCORING.xpEscape);
    expect(calculateXp({ won: false, cores: 8 })).toBe(8 * SCORING.xpPerCore + SCORING.xpAttempt);
  });

  it("still pays something for a failed run with no cores", () => {
    expect(calculateXp({ won: false, cores: 0 })).toBe(SCORING.xpAttempt);
  });
});

describe("cooldownRemaining", () => {
  it("counts down in seconds from the last use", () => {
    expect(cooldownRemaining(1000, 4000, 8)).toBe(5);
  });

  it("clamps to zero once the cooldown has elapsed", () => {
    expect(cooldownRemaining(1000, 12000, 8)).toBe(0);
  });

  it("never reports more than the full duration", () => {
    // `now` before `lastUsed` should not produce a cooldown longer than one.
    expect(cooldownRemaining(1000, 0, 8)).toBe(8);
  });

  it("treats a never-used ability as ready", () => {
    expect(cooldownRemaining(-Infinity, 0, 8)).toBe(0);
    expect(isAbilityReady(-Infinity, 0, 8)).toBe(true);
  });

  it("blocks the ability for exactly its cooldown window", () => {
    const cooldown = 6;
    const usedAt = 2000;
    expect(isAbilityReady(usedAt, usedAt, cooldown)).toBe(false);
    expect(isAbilityReady(usedAt, usedAt + 5999, cooldown)).toBe(false);
    expect(isAbilityReady(usedAt, usedAt + 6000, cooldown)).toBe(true);
  });

  it("does not advance while the mission clock is held still", () => {
    // The scene passes its own paused clock, so a frozen `now` freezes the
    // cooldown — this is what makes cooldowns pause with gameplay.
    const frozen = 3000;
    const first = cooldownRemaining(1000, frozen, 8);
    const second = cooldownRemaining(1000, frozen, 8);
    expect(first).toBe(second);
    expect(first).toBe(6);
  });
});

describe("generateResult", () => {
  it("produces a complete, scored, persistable record", () => {
    const result = generateResult({
      won: true,
      cores: 8,
      elapsed: 50,
      damage: 0,
      abilityUses: 2,
      character: "volt",
    });

    expect(result).toMatchObject({
      won: true,
      cores: 8,
      character: "volt",
      xp: 240,
      score: 4550,
      rewarded: false,
    });
    expect(result.id).toBeTruthy();
    expect(Number.isNaN(Date.parse(result.date))).toBe(false);
  });

  it("clamps elapsed time into the legal mission window", () => {
    expect(generateResult({ won: false, cores: 0, elapsed: 1000, damage: 0, abilityUses: 0 }).elapsed)
      .toBe(GAME.duration);
    expect(generateResult({ won: false, cores: 0, elapsed: -5, damage: 0, abilityUses: 0 }).elapsed)
      .toBe(0);
  });

  it("clamps cores to the mission maximum", () => {
    expect(generateResult({ won: true, cores: 99, elapsed: 10, damage: 0, abilityUses: 0 }).cores)
      .toBe(GAME.cores);
  });

  it("refuses negative damage and ability counts", () => {
    const result = generateResult({
      won: false,
      cores: 1,
      elapsed: 10,
      damage: -4,
      abilityUses: -2,
    });
    expect(result.damage).toBe(0);
    expect(result.abilityUses).toBe(0);
  });

  it("gives every result a distinct id", () => {
    const stats = { won: true, cores: 8, elapsed: 40, damage: 0, abilityUses: 1 };
    const ids = new Set(Array.from({ length: 25 }, () => generateResult(stats).id));
    expect(ids.size).toBe(25);
  });

  it("marks results unrewarded so the reward can be banked exactly once", () => {
    expect(generateResult({ won: true, cores: 8, elapsed: 40, damage: 0, abilityUses: 0 }).rewarded)
      .toBe(false);
  });
});

describe("filterInventory", () => {
  it("combines category and rarity filters", () => {
    expect(filterInventory(COSMETICS, "Visors", "Epic").map((i) => i.id)).toEqual(["visor"]);
  });

  it("passes everything through with both filters neutral", () => {
    expect(filterInventory(COSMETICS, "All items", "All rarities")).toHaveLength(
      COSMETICS.length,
    );
  });

  it("filters by category alone", () => {
    const visors = filterInventory(COSMETICS, "Visors", "All rarities");
    expect(visors.length).toBeGreaterThan(1);
    expect(visors.every((i) => i.category === "Visors")).toBe(true);
  });

  it("filters by rarity alone", () => {
    const legendary = filterInventory(COSMETICS, "All items", "Legendary");
    expect(legendary.length).toBeGreaterThan(0);
    expect(legendary.every((i) => i.rarity === "Legendary")).toBe(true);
  });

  it("returns an empty list for a combination nothing matches", () => {
    expect(filterInventory(COSMETICS, "Footwear", "Epic")).toEqual([]);
  });

  it("does not mutate the source catalog", () => {
    const before = COSMETICS.length;
    filterInventory(COSMETICS, "Visors", "Epic");
    expect(COSMETICS).toHaveLength(before);
  });
});

describe("levelFromXp", () => {
  it("starts every player at level 1", () => {
    expect(levelFromXp(0)).toMatchObject({ level: 1, into: 0, percent: 0 });
  });

  it("levels up every 300 XP", () => {
    expect(levelFromXp(299).level).toBe(1);
    expect(levelFromXp(300).level).toBe(2);
    expect(levelFromXp(901).level).toBe(4);
  });

  it("treats invalid XP as zero rather than producing NaN", () => {
    expect(levelFromXp(undefined).level).toBe(1);
    expect(levelFromXp(NaN).level).toBe(1);
    expect(levelFromXp(-50).level).toBe(1);
    expect(levelFromXp(-50).percent).toBe(0);
  });
});

describe("formatClock", () => {
  it("formats seconds as M:SS", () => {
    expect(formatClock(90)).toBe("1:30");
    expect(formatClock(9)).toBe("0:09");
    expect(formatClock(60)).toBe("1:00");
  });

  it("never renders a negative clock", () => {
    expect(formatClock(-5)).toBe("0:00");
  });

  it("rounds up so the clock only shows 0:00 when time is truly gone", () => {
    expect(formatClock(0.4)).toBe("0:01");
    expect(formatClock(0)).toBe("0:00");
  });
});

describe("resolveInteraction", () => {
  it("ends the mission when every core is collected and the player is in reach", () => {
    expect(resolveInteraction({ distance: 0, collected: GAME.cores })).toBe("escape");
    expect(
      resolveInteraction({ distance: GAME.interactRadius, collected: GAME.cores }),
    ).toBe("escape");
  });

  it("reports the portal as locked when cores are missing", () => {
    expect(resolveInteraction({ distance: 10, collected: 0 })).toBe("locked");
    expect(resolveInteraction({ distance: 10, collected: GAME.cores - 1 })).toBe("locked");
  });

  it("does nothing when the player is not at the portal", () => {
    expect(
      resolveInteraction({ distance: GAME.interactRadius + 1, collected: GAME.cores }),
    ).toBe("too-far");
    expect(resolveInteraction({ distance: 900, collected: 0 })).toBe("too-far");
  });

  it("still escapes with more cores than required", () => {
    expect(resolveInteraction({ distance: 5, collected: GAME.cores + 3 })).toBe("escape");
  });

  it("treats an unmeasurable distance as out of range", () => {
    expect(resolveInteraction({ distance: NaN, collected: GAME.cores })).toBe("too-far");
    expect(resolveInteraction({ distance: undefined, collected: GAME.cores })).toBe("too-far");
  });
});

describe("objectiveFor", () => {
  it("counts down the remaining cores", () => {
    expect(objectiveFor(0)).toContain(`${GAME.cores} more`);
    expect(objectiveFor(GAME.cores - 1)).toContain("1 more Energy Core.");
  });

  it("switches to the exit objective once every core is collected", () => {
    expect(objectiveFor(GAME.cores)).toMatch(/exit portal/i);
  });
});

describe("clamp", () => {
  it("bounds a value between low and high", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(50, 0, 10)).toBe(10);
  });

  it("falls back to the low bound for non-numeric input", () => {
    expect(clamp(NaN, 3, 10)).toBe(3);
    expect(clamp(undefined, 3, 10)).toBe(3);
    expect(clamp("nonsense", 3, 10)).toBe(3);
  });
});

describe("parseStored", () => {
  it("parses valid JSON", () => {
    expect(parseStored('{"xp":2}', {})).toEqual({ xp: 2 });
  });

  it.each(["{broken", "null", "undefined", "", "NaN"])(
    "falls back for malformed input %j",
    (raw) => {
      expect(parseStored(raw, { xp: 0 })).toEqual({ xp: 0 });
    },
  );

  it("falls back for a null input", () => {
    expect(parseStored(null, { xp: 0 })).toEqual({ xp: 0 });
  });

  it("rejects values that fail the validator", () => {
    expect(parseStored("[]", { xp: 0 }, (v) => Number.isFinite(v?.xp))).toEqual({ xp: 0 });
    expect(parseStored('{"xp":"lots"}', { xp: 0 }, (v) => Number.isFinite(v?.xp))).toEqual({
      xp: 0,
    });
  });

  it("accepts values that pass the validator", () => {
    expect(parseStored('{"xp":7}', { xp: 0 }, (v) => Number.isFinite(v?.xp))).toEqual({ xp: 7 });
  });
});
