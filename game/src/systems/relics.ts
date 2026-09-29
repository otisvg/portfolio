import type { MatId } from "./crafting";

/**
 * Mining and relic smithing. Ore veins in the Mines are struck until they give; each swing
 * rolls a success chance from your Mining level. Brom forges ore into Relics, permanent
 * passives worn in two relic slots (three at Smithing 30), each upgradable to tier III.
 * Smelting spare ore into Blight Shards is the steady way to train Smithing.
 */

export type OreId = "iron" | "silver" | "gleam";

export const ORES: Record<OreId, { name: string; icon: string; level: number; xp: number; base: number; color: string }> = {
  iron: { name: "Rot Iron", icon: "ore", level: 1, xp: 18, base: 0.35, color: "#c9773f" },
  silver: { name: "Drowned Silver", icon: "silverore", level: 10, xp: 40, base: 0.25, color: "#b8f0e0" },
  gleam: { name: "Gleamstone", icon: "gleam", level: 20, xp: 80, base: 0.18, color: "#6ad0c0" },
};
export const ORE_IDS = Object.keys(ORES) as OreId[];

/** Chance that one swing at a vein yields ore. */
export function mineChance(ore: OreId, level: number) {
  const o = ORES[ore];
  if (level < o.level) return 0;
  return Math.min(0.9, o.base + (level - o.level) * 0.025);
}

/** 1 in N per ore mined: a rune-etched gem (a random rune). */
export const GEM_RATE = 80;

export type RelicId = "ember" | "lodestone" | "lamplighter" | "tide" | "bellwright" | "gleam" | "prospector" | "slayer";

export interface RelicDef {
  name: string;
  level: number;
  /** Cost of tier I; tiers II and III cost double and triple, and need +10 and +20 Smithing. */
  ore: Partial<Record<OreId, number>>;
  mats?: Partial<Record<MatId, number>>;
  gold: number;
  xp: number;
  color: string;
  effect: (tier: number) => string;
}

export const RELICS: Record<RelicId, RelicDef> = {
  ember: { name: "Ember Relic", level: 1, ore: { iron: 6 }, mats: { ember: 1 }, gold: 80, xp: 120, color: "#ffa94d", effect: (t) => `Finishers set foes alight: +${[40, 60, 80][t - 1]}% damage as burn` },
  lodestone: { name: "Lodestone Relic", level: 5, ore: { iron: 8 }, gold: 60, xp: 150, color: "#c8cedc", effect: (t) => `Gold, shards and runes fly to you from ${[2, 3, 4][t - 1]}x as far` },
  lamplighter: { name: "Lamplighter's Relic", level: 10, ore: { iron: 4, silver: 3 }, gold: 120, xp: 260, color: "#ffcf7a", effect: (t) => `+1 light. Foes in your light take +${[8, 12, 16][t - 1]}% damage` },
  tide: { name: "Tide Relic", level: 15, ore: { silver: 5 }, mats: { pearl: 1 }, gold: 150, xp: 380, color: "#6ad0c0", effect: (t) => `Perfect dodges release a wave: ${[20, 30, 40][t - 1]} damage and knockback` },
  bellwright: { name: "Bellwright's Relic", level: 20, ore: { silver: 4 }, mats: { bellshard: 1 }, gold: 180, xp: 520, color: "#c9962a", effect: (t) => `A bell blocks one hit every ${[24, 18, 12][t - 1]}s` },
  gleam: { name: "Gleam Relic", level: 25, ore: { gleam: 3, silver: 2 }, gold: 220, xp: 700, color: "#9ad8ff", effect: (t) => `Critical hits refund ${[8, 12, 16][t - 1]} stamina` },
  prospector: { name: "Prospector's Relic", level: 30, ore: { gleam: 4 }, gold: 200, xp: 900, color: "#e6cb72", effect: (t) => `${[25, 40, 55][t - 1]}% chance of extra ore; rune gems 3x as common` },
  slayer: { name: "Slayer's Relic", level: 35, ore: { gleam: 4 }, mats: { button: 2 }, gold: 260, xp: 1100, color: "#b9a8d0", effect: (t) => `On task: +${[10, 15, 20][t - 1]}% damage and +${[10, 15, 20][t - 1]}% Slayer XP` },
};
export const RELIC_IDS = Object.keys(RELICS) as RelicId[];
export const RELIC_MAX_TIER = 3;

export const relicLevel = (id: RelicId, tier: number) => RELICS[id].level + (tier - 1) * 10;
export const relicSlots = (smithing: number) => (smithing >= 30 ? 3 : 2);

/** Ore needed to smelt one Blight Shard (and the Smithing XP it gives). */
export const SMELT: Record<OreId, { n: number; xp: number }> = { iron: { n: 5, xp: 40 }, silver: { n: 2, xp: 60 }, gleam: { n: 1, xp: 70 } };
