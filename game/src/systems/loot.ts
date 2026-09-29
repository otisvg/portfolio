import { RNG, rng as defaultRng } from "../core/rng";
import { RUNE_WEIGHTS, type FaceId } from "./dice";
import { BASES, makeUnique, rollItem, type Item, type Slot } from "./items";

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
  | { type: "pet" }
  | { type: "rune"; face: FaceId };

/** Rarity weights: Common, Uncommon, Rare, Epic, Legendary. */
export const RARITY_WEIGHTS = {
  trash: [70, 23, 5.8, 1.0, 0.2],
  elite: [55, 31, 10.5, 2.8, 0.7],
  boss: [0, 52, 34, 11.5, 2.5],
} as const;

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
  /** 1 in N chance of a Hearth Dice rune. */
  rune?: number;
}

export const TABLES: Record<string, DropTable> = {
  blightling: { name: "Blightling", gold: [1, 4], goldChance: 1, gear: 18, rarity: "trash", shard: 120, orb: 10, rune: 150 },
  crow: { name: "Rotcrow", gold: [1, 3], goldChance: 0.9, gear: 22, rarity: "trash", orb: 12, rune: 150 },
  husk: { name: "Husk", gold: [4, 9], goldChance: 1, gear: 7, rarity: "elite", shard: 25, orb: 5, rune: 60, bias: { pitchfork: 5, straw_hat: 4 } },
  pot: { name: "Pot", gold: [1, 3], goldChance: 0.6, rarity: "trash", orb: 8 },
  /** Extra drops on top of the normal table when a foe was Rotborn. */
  rotborn: { name: "Rotborn", gold: [15, 30], goldChance: 1, gear: 1, rarity: "elite", shards: [1, 2], rune: 3 },
  wick: {
    name: "Wick, the Harvest Warden", gold: [55, 95], goldChance: 1, gear: 1, gearRolls: 1, bonusGear: 3, rarity: "boss", shards: [2, 3],
    uniques: [{ id: "wick_lantern", rate: 40 }, { id: "straw_hood", rate: 60 }, { id: "harvest_scythe", rate: 90 }],
    pet: 500, rune: 5,
  },
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

/**
 * `gearMult` comes only from Skull faces on the Hearth Dice (a risk you opt into);
 * `alwaysGold` from the Windfall triple. Both are shown to the player where they apply.
 */
export function rollDrops(tableId: string, goldFind: number, r: RNG = defaultRng, gearMult = 1, alwaysGold = false): Drop[] {
  const t = TABLES[tableId];
  const out: Drop[] = [];
  if (alwaysGold || r.chance(t.goldChance)) {
    const amount = Math.round(r.int(t.gold[0], t.gold[1]) * (1 + goldFind / 100));
    if (amount > 0) out.push({ type: "gold", amount });
  }
  if (t.gear && r.next() * t.gear < gearMult) {
    for (let i = 0; i < (t.gearRolls ?? 1); i++) out.push({ type: "item", item: rollGear(t.rarity, t.bias, r) });
  }
  if (t.bonusGear && r.oneIn(t.bonusGear)) out.push({ type: "item", item: rollGear(t.rarity, t.bias, r) });
  if (t.shard && r.oneIn(t.shard)) out.push({ type: "shard", amount: 1 });
  if (t.shards) out.push({ type: "shard", amount: r.int(t.shards[0], t.shards[1]) });
  if (t.orb && r.oneIn(t.orb)) out.push({ type: "orb" });
  for (const u of t.uniques ?? []) if (r.oneIn(u.rate)) out.push({ type: "item", item: makeUnique(u.id) });
  if (t.pet && r.oneIn(t.pet)) out.push({ type: "pet" });
  if (t.rune && r.oneIn(t.rune)) out.push({ type: "rune", face: r.weighted(RUNE_WEIGHTS) });
  return out;
}

/** Each regular foe has a 1 in N chance to rise as a Rotborn when the world resets. */
export const ROTBORN_RATE = 35;

/** "1/40" style odds for UI. */
export const fmtRate = (n: number) => `1/${n}`;
