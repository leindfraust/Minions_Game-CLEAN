/**
 * Static game content: the playable Motes, the cosmetic catalog and the
 * default settings shape. This is mock data today; the same shapes can be
 * served from a backend later without touching UI code.
 */

/**
 * @typedef {Object} Character
 * @property {string} id
 * @property {string} name
 * @property {string} role
 * @property {string} color        Hex accent colour used by UI and Phaser.
 * @property {string} personality  Flavour text for cards and previews.
 * @property {string} ability      Ability display name.
 * @property {string} description  What the ability does, in plain language.
 * @property {number} cooldown     Ability cooldown in seconds.
 * @property {number} speed        Movement speed in pixels per second.
 * @property {number} power        Display-only stat, 1-5.
 * @property {string} glyph        Decorative ability symbol.
 */

/** @type {Character[]} */
export const CHARACTERS = [
  {
    id: "volt",
    name: "Volt",
    role: "Engineer",
    color: "#60c9f4",
    personality: "Clever. A little nervous. Always wired.",
    ability: "EMP Pulse",
    description: "Short-circuit nearby security robots for 3 seconds.",
    cooldown: 8,
    speed: 205,
    power: 3,
    glyph: "ϟ",
  },
  {
    id: "pip",
    name: "Pip",
    role: "Scout",
    color: "#ff947a",
    personality: "Big curiosity. Absolutely no brakes.",
    ability: "Overdrive",
    description: "Move 65% faster for 3 seconds. Catch you later!",
    cooldown: 6,
    speed: 235,
    power: 2,
    glyph: "»",
  },
  {
    id: "glitch",
    name: "Glitch",
    role: "Trickster",
    color: "#b49bfa",
    personality: "A little chaos goes a long way.",
    ability: "Echo Decoy",
    description: "Leave a hologram that distracts robots for 4 seconds.",
    cooldown: 10,
    speed: 215,
    power: 3,
    glyph: "✧",
  },
  {
    id: "moss",
    name: "Moss",
    role: "Brute",
    color: "#b2d989",
    personality: "Soft heart. Very heavy footsteps.",
    ability: "Ground Slam",
    description: "Push nearby robots away and stun them for 2 seconds.",
    cooldown: 9,
    speed: 185,
    power: 5,
    glyph: "✺",
  },
];

/** The default Mote, used before a player has chosen one. */
export const DEFAULT_CHARACTER_ID = "volt";

/**
 * Resolve a character id to a character, falling back to the default so a
 * stale or corrupt stored id can never break a render.
 * @param {string} [id]
 * @returns {Character}
 */
export function getCharacter(id) {
  return (
    CHARACTERS.find((c) => c.id === id) ||
    CHARACTERS.find((c) => c.id === DEFAULT_CHARACTER_ID) ||
    CHARACTERS[0]
  );
}

/** Cosmetic categories. "All items" is a filter pseudo-category. */
export const CATEGORIES = [
  "All items",
  "Visors",
  "Body colors",
  "Back accessories",
  "Footwear",
  "Ability effects",
  "Victory animations",
];

/** Rarity tiers, ordered from common to rare. */
export const RARITIES = ["All rarities", "Common", "Rare", "Epic", "Legendary"];

/** Icon per cosmetic category, used on inventory cards. */
export const CATEGORY_ICONS = {
  Visors: "▰",
  "Body colors": "◉",
  "Back accessories": "⚑",
  Footwear: "┒",
  "Ability effects": "✧",
  "Victory animations": "♫",
};

/**
 * Cosmetic catalog. Cosmetics are appearance-only by design: nothing here
 * touches speed, health, cooldowns or scoring.
 * Tuple order: id, name, category, rarity, swatch, locked, futureNft.
 */
export const COSMETICS = [
  ["prism", "Prism visor", "Visors", "Rare", "#a39aff", false, true],
  ["visor", "Sunset display", "Visors", "Epic", "#ff9e7e", true, true],
  ["mint", "Mint condition", "Body colors", "Common", "#76e5ba", false, false],
  ["coral", "Coral flush", "Body colors", "Rare", "#ff9d8e", false, false],
  ["antenna", "Signal seeker", "Back accessories", "Rare", "#ffd17d", false, true],
  ["pack", "Quantum pack", "Back accessories", "Legendary", "#ffd17d", true, true],
  ["boots", "Moon boots", "Footwear", "Common", "#7cd7ed", false, false],
  ["pulse", "Neon afterglow", "Ability effects", "Epic", "#e090f8", false, true],
  ["dance", "Happy little dance", "Victory animations", "Rare", "#ffac87", false, false],
  ["encore", "Standing ovation", "Victory animations", "Legendary", "#ffe08a", true, true],
].map(([id, name, category, rarity, color, locked, nft]) => ({
  id,
  name,
  category,
  rarity,
  color,
  locked,
  nft,
}));

/**
 * Look up a cosmetic by id.
 * @param {string} id
 */
export function getCosmetic(id) {
  return COSMETICS.find((item) => item.id === id);
}

/** Settings defaults. Volume values are percentages, 0-100. */
export const DEFAULT_SETTINGS = {
  master: 70,
  music: 40,
  sfx: 65,
  mute: false,
  reducedMotion: false,
  screenShake: true,
};

/** Loading-screen tips. */
export const TIPS = [
  "Robots have short attention spans. Break away to lose them.",
  "Eight cores. One exit. A very questionable safety policy.",
  "Your ability recharges. Use it before things get messy.",
  "The portal is in the upper-right corner of the lab.",
  "Cosmetics are style only. No shortcuts in this lab.",
];
