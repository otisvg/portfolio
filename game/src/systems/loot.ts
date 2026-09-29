import { RNG, rng as defaultRng } from "../core/rng";
import type { MatId } from "./crafting";
import { RUNE_WEIGHTS, type FaceId } from "./dice";
import { BASES, makeSetPiece, makeUnique, rollItem, type Item, type Slot } from "./items";
import type { OreId } from "./relics";
import { SETS, type SetId } from "./sets";
import type { PetId } from "./save";

/**
 * Drop tables. Every roll is independent and uses fixed, published odds — no pity timers,
 * no hidden luck. Gold Find only scales gold amounts, never rarity, so the loot curve
 * can't run away. Rates are shown to the player in the Collection Log.
 */

export type Drop =
  | { type: "gold"; amount: number }
  | { type: "item"; item: Item }
  | { type: "shard"; amount: number }
  | { type: "orb" }
  | { type: "pet"; pet: PetId }
  | { type: "rune"; face: FaceId }
  | { type: "mat"; id: MatId; amount: number }
  | { type: "map" }
  | { type: "ore"; id: OreId; amount: number };

/** Rarity weights: Common, Uncommon, Rare, Epic, Legendary. */
export const RARITY_WEIGHTS = {
  trash: [70, 23, 5.8, 1.0, 0.2],
  elite: [55, 31, 10.5, 2.8, 0.7],
  boss: [0, 52, 34, 11.5, 2.5],
} as const;

export interface MatDrop { id: MatId; amount: [number, number]; rate: number }

export interface DropTable {
  name: string;
  gold: [number, number];
  goldChance: number;
  /** 1 in N chance of a gear drop. */
  gear?: number;
  gearRolls?: number;
  bonusGear?: number;
  rarity: keyof typeof RARITY_WEIGHTS;
  shard?: number;
  shards?: [number, number];
  orb?: number;
  bias?: Record<string, number>;
  uniques?: { id: string; rate: number }[];
  pet?: number;
  petId?: PetId;
  /** 1 in N chance of a Hearth Dice rune. */
  rune?: number;
  /** 1 in N chance of a treasure map. */
  map?: number;
  mats?: MatDrop[];
  /** 1 in N chance of a random piece of a gear set. */
  set?: { id: SetId; rate: number };
  ore?: { id: OreId; amount: [number, number]; rate: number }[];
}

export const TABLES: Record<string, DropTable> = {
  blightling: { name: "Blightling", gold: [1, 4], goldChance: 1, gear: 18, rarity: "trash", shard: 120, orb: 10, rune: 150, map: 90 },
  crow: { name: "Rotcrow", gold: [1, 3], goldChance: 0.9, gear: 22, rarity: "trash", orb: 12, rune: 150, map: 90 },
  husk: { name: "Husk", gold: [4, 9], goldChance: 1, gear: 7, rarity: "elite", shard: 25, orb: 5, rune: 60, map: 30, bias: { pitchfork: 5, straw_hat: 4 }, set: { id: "warden", rate: 100 } },
  pot: { name: "Pot", gold: [1, 3], goldChance: 0.6, rarity: "trash", orb: 8 },
  sludgeling: { name: "Sludgeling", gold: [2, 5], goldChance: 1, gear: 16, rarity: "trash", shard: 100, orb: 10, rune: 140, map: 80 },
  bat: { name: "Cave Bat", gold: [1, 4], goldChance: 0.9, gear: 20, rarity: "trash", orb: 12, rune: 140, map: 80 },
  miner: { name: "Drowned Miner", gold: [6, 12], goldChance: 1, gear: 6, rarity: "elite", shard: 20, orb: 5, rune: 50, map: 25, bias: { wood_axe: 4, kettle_helm: 4, rust_mail: 3 }, set: { id: "foreman", rate: 90 }, ore: [{ id: "iron", amount: [1, 2], rate: 4 }] },
  /** Extra drops on top of the normal table when a foe was Rotborn. */
  rotborn: { name: "Rotborn", gold: [15, 30], goldChance: 1, gear: 1, rarity: "elite", shards: [1, 2], rune: 3 },
  wick: {
    name: "Wick, the Harvest Warden", gold: [55, 95], goldChance: 1, gear: 1, gearRolls: 1, bonusGear: 3, rarity: "boss", shards: [2, 3],
    uniques: [{ id: "wick_lantern", rate: 40 }, { id: "straw_hood", rate: 60 }, { id: "harvest_scythe", rate: 90 }],
    pet: 500, petId: "wick", rune: 5, map: 6, set: { id: "warden", rate: 12 },
    mats: [{ id: "ember", amount: [1, 2], rate: 1 }, { id: "straw", amount: [3, 6], rate: 1 }, { id: "button", amount: [1, 1], rate: 6 }, { id: "blade", amount: [1, 1], rate: 20 }],
  },
  grimwater: {
    name: "Grimwater, the Drowned Foreman", gold: [85, 140], goldChance: 1, gear: 1, gearRolls: 1, bonusGear: 3, rarity: "boss", shards: [3, 4],
    uniques: [{ id: "tide_bell", rate: 40 }, { id: "divers_helm", rate: 60 }, { id: "foreman_pick", rate: 90 }],
    pet: 500, petId: "grim", rune: 4, map: 6, set: { id: "foreman", rate: 10 }, ore: [{ id: "silver", amount: [2, 4], rate: 1 }, { id: "gleam", amount: [1, 1], rate: 4 }],
    mats: [{ id: "chain", amount: [2, 4], rate: 1 }, { id: "pearl", amount: [1, 1], rate: 2 }, { id: "bellshard", amount: [1, 1], rate: 12 }],
  },
  /** Dug up with a treasure map. */
  treasure: { name: "Buried Treasure", gold: [60, 140], goldChance: 1, gear: 1, bonusGear: 3, rarity: "elite", shards: [1, 3], rune: 4, uniques: [{ id: "compass", rate: 25 }] },
  /** The secret caches in the Mines (refilled on rest). */
  cache: { name: "Secret Cache", gold: [30, 80], goldChance: 1, gear: 1, rarity: "elite", shards: [1, 2], rune: 3, map: 5 },
  /** Superior Slayer foes (only while on task, once unlocked). */
  superior_o: { name: "Superior (Outskirts)", gold: [30, 60], goldChance: 1, gear: 1, rarity: "elite", shards: [2, 4], rune: 2, map: 6, set: { id: "warden", rate: 8 } },
  superior_m: { name: "Superior (Mines)", gold: [35, 70], goldChance: 1, gear: 1, rarity: "elite", shards: [2, 4], rune: 2, map: 6, set: { id: "foreman", rate: 8 }, ore: [{ id: "gleam", amount: [1, 2], rate: 2 }] },
  /** The end of a mine-cart run. */
  cart: { name: "Cart Run Chest", gold: [40, 90], goldChance: 1, gear: 2, rarity: "elite", shards: [1, 2], rune: 5, ore: [{ id: "silver", amount: [1, 3], rate: 1 }, { id: "gleam", amount: [1, 1], rate: 3 }] },
  /** Secret caches in the Outskirts, reached with gear from the Mines. */
  deepcache: { name: "Sunken Cache", gold: [50, 110], goldChance: 1, gear: 1, rarity: "elite", shards: [2, 3], rune: 3, map: 5, set: { id: "warden", rate: 10 } },
  /** The daily bounty's chest. */
  daily: { name: "Daily Chest", gold: [80, 160], goldChance: 1, gear: 1, gearRolls: 2, rarity: "elite", shards: [2, 4], rune: 2, map: 3 },
};

const SLOT_WEIGHTS: [Slot, number][] = [["weapon", 30], ["helm", 22], ["body", 22], ["trinket", 26]];

export function rollGear(rarityKey: keyof typeof RARITY_WEIGHTS, bias: Record<string, number> = {}, r: RNG = defaultRng): Item {
  const w = RARITY_WEIGHTS[rarityKey];
  const rarity = r.weighted(w.map((v, i) => [i, v] as const));
  const slot = r.weighted(SLOT_WEIGHTS);
  const pool = Object.values(BASES)
    .filter((b) => b.slot === slot && b.weight > 0)
    .map((b) => [b.id, b.weight * (bias[b.id] ?? 1)] as const);
  return rollItem(r.weighted(pool), rarity, r);
}

export interface DropMods {
  goldFind?: number;
  /** Skull faces on the Hearth Dice and the Hungry Rotmoon (risks you opt into or are told about). */
  gearMult?: number;
  /** The Windfall triple. */
  alwaysGold?: boolean;
  /** Diary and Rotmoon multiplier on treasure-map odds. */
  mapMult?: number;
  /** Extra guaranteed gear rolls (boss sigils, Harvest Rotmoon). */
  extraGear?: number;
  extraShards?: number;
  /** Unique table rolled this many times (all three sigils = 2). */
  uniqueRolls?: number;
}

export function rollDrops(tableId: string, r: RNG = defaultRng, m: DropMods = {}): Drop[] {
  const t = TABLES[tableId];
  const out: Drop[] = [];
  const gearMult = m.gearMult ?? 1;
  if (m.alwaysGold || r.chance(t.goldChance)) {
    const amount = Math.round(r.int(t.gold[0], t.gold[1]) * (1 + (m.goldFind ?? 0) / 100));
    if (amount > 0) out.push({ type: "gold", amount });
  }
  if (t.gear && r.next() * t.gear < gearMult) {
    for (let i = 0; i < (t.gearRolls ?? 1); i++) out.push({ type: "item", item: rollGear(t.rarity, t.bias, r) });
  }
  if (t.bonusGear && r.oneIn(t.bonusGear)) out.push({ type: "item", item: rollGear(t.rarity, t.bias, r) });
  for (let i = 0; i < (m.extraGear ?? 0); i++) out.push({ type: "item", item: rollGear(t.rarity, t.bias, r) });
  if (t.shard && r.oneIn(t.shard)) out.push({ type: "shard", amount: 1 });
  if (t.shards || m.extraShards) out.push({ type: "shard", amount: (t.shards ? r.int(t.shards[0], t.shards[1]) : 0) + (m.extraShards ?? 0) });
  if (t.orb && r.oneIn(t.orb)) out.push({ type: "orb" });
  for (let k = 0; k < (m.uniqueRolls ?? 1); k++) for (const u of t.uniques ?? []) if (r.oneIn(u.rate)) out.push({ type: "item", item: makeUnique(u.id) });
  if (t.pet && t.petId && r.oneIn(t.pet)) out.push({ type: "pet", pet: t.petId });
  if (t.rune && r.oneIn(t.rune)) out.push({ type: "rune", face: r.weighted(RUNE_WEIGHTS) });
  if (t.map && r.next() * t.map < (m.mapMult ?? 1)) out.push({ type: "map" });
  for (const md of t.mats ?? []) if (r.oneIn(md.rate)) out.push({ type: "mat", id: md.id, amount: r.int(md.amount[0], md.amount[1]) });
  for (const od of t.ore ?? []) if (r.oneIn(od.rate)) out.push({ type: "ore", id: od.id, amount: r.int(od.amount[0], od.amount[1]) });
  if (t.set && r.oneIn(t.set.rate)) out.push({ type: "item", item: makeSetPiece(r.pick(SETS[t.set.id].pieces)) });
  return out;
}

/** Each regular foe has a 1 in N chance to rise as a Rotborn when the world resets. */
export const ROTBORN_RATE = 35;
/** During a Blood Rotmoon. */
export const ROTBORN_RATE_BLOOD = 12;

/** "1/40" style odds for UI. */
export const fmtRate = (n: number) => `1/${n}`;
