import { RNG, rng as defaultRng } from "../core/rng";
import { RARITY } from "../gfx/palette";

export type Slot = "weapon" | "helm" | "body" | "trinket";
export const SLOTS: Slot[] = ["weapon", "helm", "body", "trinket"];
export type WeaponKind = "sword" | "axe" | "dagger" | "spear" | "scythe";
export type AffixType = "hp" | "stam" | "dmg" | "crit" | "leech" | "gold" | "def" | "speed" | "regen";

export interface Affix { t: AffixType; v: number }

export interface ItemBase {
  id: string;
  name: string;
  slot: Slot;
  icon: string;
  kind?: WeaponKind;
  dmg?: [number, number];
  speed?: number;
  reach?: number;
  def?: number;
  hp?: number;
  implicit?: Affix[];
  lore: string;
  /** Weight in the random gear pool; 0 = never drops randomly. */
  weight: number;
  unique?: boolean;
  /** Visual variant used when worn. */
  look?: string;
  light?: number;
}

export interface Item {
  uid: string;
  base: string;
  rarity: number; // 0..4 random, 5 = unique
  name: string;
  dmg?: [number, number];
  def: number;
  hp: number;
  affixes: Affix[];
  plus: number;
}

export const BASES: Record<string, ItemBase> = {
  rusty_sword: { id: "rusty_sword", name: "Rusty Shortsword", slot: "weapon", icon: "sword", kind: "sword", dmg: [5, 8], speed: 1, reach: 20, weight: 3, lore: "Found in a ditch. It has seen better centuries." },
  village_blade: { id: "village_blade", name: "Village Blade", slot: "weapon", icon: "blade", kind: "sword", dmg: [7, 10], speed: 1, reach: 21, weight: 4, lore: "Brom forged a dozen of these. Eleven are out in the Rot." },
  wood_axe: { id: "wood_axe", name: "Woodcutter's Axe", slot: "weapon", icon: "axe", kind: "axe", dmg: [10, 15], speed: 0.8, reach: 22, weight: 3, lore: "Heavy. Honest. Leaves a mark." },
  gut_knife: { id: "gut_knife", name: "Gutting Knife", slot: "weapon", icon: "dagger", kind: "dagger", dmg: [4, 6], speed: 1.35, reach: 16, weight: 3, implicit: [{ t: "crit", v: 6 }], lore: "Meant for fish. Works on worse." },
  pitchfork: { id: "pitchfork", name: "Pitchfork", slot: "weapon", icon: "fork", kind: "spear", dmg: [8, 12], speed: 0.9, reach: 30, weight: 2, lore: "Pried from a husk's hands. It did not want to let go." },

  straw_hat: { id: "straw_hat", name: "Straw Hat", slot: "helm", icon: "strawhat", def: 1, hp: 6, weight: 3, look: "straw", lore: "Keeps the sun off. There is no sun." },
  leather_cap: { id: "leather_cap", name: "Leather Cap", slot: "helm", icon: "cap", def: 2, hp: 0, weight: 3, look: "cap", lore: "Smells of the tannery, which is an improvement." },
  kettle_helm: { id: "kettle_helm", name: "Kettle Helm", slot: "helm", icon: "helm", def: 4, hp: 0, weight: 2, look: "kettle", lore: "Formerly a kettle. Still, occasionally, whistles." },

  tunic: { id: "tunic", name: "Patched Tunic", slot: "body", icon: "tunic", def: 1, hp: 5, weight: 3, look: "tunic", lore: "Mended so often it is mostly mending." },
  gambeson: { id: "gambeson", name: "Padded Gambeson", slot: "body", icon: "gambeson", def: 3, hp: 10, weight: 3, look: "gambeson", lore: "Quilted wool. Stops a blade. Stops a draught, too." },
  rust_mail: { id: "rust_mail", name: "Rusted Mail", slot: "body", icon: "mail", def: 5, hp: 4, weight: 2, look: "mail", lore: "Every ring a small, orange disappointment." },

  copper_ring: { id: "copper_ring", name: "Copper Ring", slot: "trinket", icon: "ring", weight: 3, lore: "Turns your finger green. Turns luck, too." },
  bone_charm: { id: "bone_charm", name: "Bone Charm", slot: "trinket", icon: "charm", hp: 8, weight: 3, lore: "A tiny skull on a string. Not a rat's. Probably." },
  clover: { id: "clover", name: "Four-Leaf Clover", slot: "trinket", icon: "clover", weight: 2, implicit: [{ t: "gold", v: 10 }], lore: "It grew in the Rot, which makes it luckier, or worse." },

  // --- Wick uniques ---
  wick_lantern: { id: "wick_lantern", name: "Wick's Lantern", slot: "trinket", icon: "lantern", hp: 12, weight: 0, unique: true, light: 1, implicit: [{ t: "gold", v: 20 }, { t: "regen", v: 10 }], lore: "It still burns. Nobody ever saw it lit." },
  straw_hood: { id: "straw_hood", name: "Strawman's Hood", slot: "helm", icon: "hood", def: 5, hp: 10, weight: 0, unique: true, look: "hood", implicit: [{ t: "stam", v: 18 }], lore: "Itchy. Watchful. Faintly warm." },
  harvest_crown: { id: "harvest_crown", name: "Harvest Crown", slot: "helm", icon: "strawhat", def: 3, hp: 15, weight: 0, unique: true, look: "crown", implicit: [{ t: "dmg", v: 10 }, { t: "gold", v: 10 }], lore: "Woven from the first healthy wheat in years. Hollowmere remembers." },
  harvest_scythe: { id: "harvest_scythe", name: "Harvest Scythe", slot: "weapon", icon: "scythe", kind: "scythe", dmg: [14, 21], speed: 0.85, reach: 34, weight: 0, unique: true, implicit: [{ t: "leech", v: 2 }], lore: "The last harvest of Miller's Field. It was not wheat." },

  // --- Grimwater uniques ---
  foreman_pick: { id: "foreman_pick", name: "Foreman's Pick", slot: "weapon", icon: "pick", kind: "axe", dmg: [17, 25], speed: 0.78, reach: 25, weight: 0, unique: true, implicit: [{ t: "crit", v: 8 }], lore: "He struck the seam that let the water in. He kept striking." },
  divers_helm: { id: "divers_helm", name: "Diver's Helm", slot: "helm", icon: "diver", def: 7, hp: 12, weight: 0, unique: true, look: "diver", light: 1, implicit: [{ t: "regen", v: 15 }], lore: "You can hear the sea in it. There is no sea." },
  tide_bell: { id: "tide_bell", name: "Tide Bell", slot: "trinket", icon: "bell", hp: 10, weight: 0, unique: true, implicit: [{ t: "stam", v: 20 }, { t: "def", v: 3 }], lore: "Ring it and the water listens. Briefly." },
  // --- treasure ---
  compass: { id: "compass", name: "Cartographer's Compass", slot: "trinket", icon: "compass", hp: 6, weight: 0, unique: true, implicit: [{ t: "gold", v: 15 }, { t: "speed", v: 5 }], lore: "The needle points at whatever you want most. Usually gold." },

  // --- crafted by Brom from boss parts (always Epic) ---
  miners_lamp: { id: "miners_lamp", name: "Miner's Lamp", slot: "helm", icon: "lamp", def: 3, hp: 6, weight: 0, look: "lamp", light: 1, lore: "An ember of the Warden, caged in brass. It hates the dark." },
  scare_charm: { id: "scare_charm", name: "Scarecrow Charm", slot: "trinket", icon: "scarecharm", hp: 12, weight: 0, implicit: [{ t: "dmg", v: 8 }, { t: "stam", v: 10 }], lore: "Two button eyes that never close. Crows give you a wide berth." },
  wardens_sickle: { id: "wardens_sickle", name: "Warden's Sickle", slot: "weapon", icon: "sickle", kind: "scythe", dmg: [11, 17], speed: 0.95, reach: 30, weight: 0, implicit: [{ t: "crit", v: 5 }], lore: "Reforged from the Warden's blade. Still curved enough to cut roots." },
  pearl_ring: { id: "pearl_ring", name: "Brine Pearl Ring", slot: "trinket", icon: "pearl", hp: 10, weight: 0, implicit: [{ t: "regen", v: 15 }, { t: "def", v: 4 }], lore: "Cold to the touch. Warm to the lungs." },
  drowned_mail: { id: "drowned_mail", name: "Drowned Mail", slot: "body", icon: "mail", def: 9, hp: 14, weight: 0, look: "mail", implicit: [{ t: "hp", v: 10 }], lore: "Chain links from the flood, riveted tight. It drips, sometimes." },
};

/** Fixed-stat Epic items made at Brom's forge from boss parts. */
export function makeCrafted(baseId: string): Item {
  const it = makeUnique(baseId);
  it.rarity = 3;
  return it;
}

export const AFFIXES: Record<AffixType, { label: (v: number) => string; range: [number, number]; prefix: string; suffix: string; w: Partial<Record<Slot, number>> }> = {
  hp: { label: (v) => `+${v} Max Health`, range: [4, 12], prefix: "Hale", suffix: "of Vigour", w: { helm: 3, body: 4, trinket: 3, weapon: 1 } },
  stam: { label: (v) => `+${v} Max Stamina`, range: [5, 14], prefix: "Tireless", suffix: "of Endurance", w: { helm: 2, body: 3, trinket: 3, weapon: 1 } },
  dmg: { label: (v) => `+${v}% Damage`, range: [4, 10], prefix: "Cruel", suffix: "of Ruin", w: { weapon: 5, trinket: 2, helm: 1 } },
  crit: { label: (v) => `+${v}% Crit Chance`, range: [2, 6], prefix: "Keen", suffix: "of Precision", w: { weapon: 4, trinket: 2, helm: 1 } },  leech: { label: (v) => `+${v} Health on Hit`, range: [1, 3], prefix: "Leeching", suffix: "of the Leech", w: { weapon: 3, trinket: 1 } },
  gold: { label: (v) => `+${v}% Gold Find`, range: [5, 15], prefix: "Gilded", suffix: "of Greed", w: { trinket: 4, helm: 2, body: 1 } },
  def: { label: (v) => `+${v} Armour`, range: [1, 4], prefix: "Warded", suffix: "of the Bulwark", w: { helm: 3, body: 4, trinket: 1 } },
  speed: { label: (v) => `+${v}% Move Speed`, range: [3, 7], prefix: "Swift", suffix: "of Haste", w: { body: 2, trinket: 2, helm: 1 } },
  regen: { label: (v) => `+${v}% Stamina Regen`, range: [6, 15], prefix: "Steady", suffix: "of Breath", w: { body: 2, trinket: 3, helm: 2, weapon: 1 } },
};

const RARITY_STAT = [1, 1.12, 1.25, 1.42, 1.65, 1];
const RARITY_AFFIX = [1, 1, 1.15, 1.3, 1.5, 1];
const AFFIX_COUNT = [0, 1, 2, 3, 3, 0];
const LEGEND_NAMES: Record<Slot, string[]> = {
  weapon: ["Hollowmere's Oath", "The Last Harvest", "Maud's Hearthbrand", "Crowbane"],
  helm: ["Crown of Brambles", "The Watchful Brim", "Lamplighter's Cowl"],
  body: ["Coat of the Long Night", "Miller's Mercy", "The Hearthward"],
  trinket: ["Tear of the Moon", "The Ember Knot", "Pip's Lucky Button"],
};

let uidCounter = 0;
const uid = () => Date.now().toString(36) + (uidCounter++).toString(36) + Math.floor(Math.random() * 1e6).toString(36);

export function rollItem(baseId: string, rarity: number, r: RNG = defaultRng): Item {
  const b = BASES[baseId];
  const q = r.range(0.9, 1.1);
  const m = RARITY_STAT[rarity] * q;
  const it: Item = {
    uid: uid(), base: baseId, rarity, name: b.name,
    def: Math.round((b.def ?? 0) * m), hp: Math.round((b.hp ?? 0) * m), affixes: [], plus: 0,
  };
  if (b.dmg) {
    const lo = Math.max(1, Math.round(b.dmg[0] * m));
    it.dmg = [lo, Math.max(lo + 1, Math.round(b.dmg[1] * m))];
  }
  let count = AFFIX_COUNT[rarity];
  if (b.slot === "trinket" && !b.implicit && !b.hp) count += 1; // bare trinkets always roll something
  const pool = (Object.keys(AFFIXES) as AffixType[])
    .filter((t) => (AFFIXES[t].w[b.slot] ?? 0) > 0)
    .map((t) => [t, AFFIXES[t].w[b.slot]!] as const);
  for (let i = 0; i < count && pool.length; i++) {
    const t = r.weighted(pool);
    pool.splice(pool.findIndex((p) => p[0] === t), 1);
    const [lo, hi] = AFFIXES[t].range;
    it.affixes.push({ t, v: Math.max(1, Math.round(r.range(lo, hi) * RARITY_AFFIX[rarity])) });
  }
  it.name = nameFor(b, it, r);
  return it;
}

function nameFor(b: ItemBase, it: Item, r: RNG) {
  if (it.rarity === 4) return r.pick(LEGEND_NAMES[b.slot]);
  const [a1, a2] = it.affixes;
  if (it.rarity === 3 && a1 && a2) return `${AFFIXES[a1.t].prefix} ${b.name} ${AFFIXES[a2.t].suffix}`;
  if (it.rarity >= 1 && a1) return `${AFFIXES[a1.t].prefix} ${b.name}`;
  return b.name;
}

export function makeUnique(baseId: string): Item {
  const b = BASES[baseId];
  return {
    uid: uid(), base: baseId, rarity: 5, name: b.name, dmg: b.dmg ? [...b.dmg] : undefined,
    def: b.def ?? 0, hp: b.hp ?? 0, affixes: [], plus: 0,
  };
}

export const baseOf = (it: Item) => BASES[it.base];
export const rarityColor = (it: Item) => RARITY[it.rarity].color;
export const displayName = (it: Item) => (it.plus ? `+${it.plus} ` : "") + it.name;

/** All affixes including the base's implicit ones. */
export function allAffixes(it: Item): Affix[] {
  return [...(baseOf(it).implicit ?? []), ...it.affixes];
}

/** Forge upgrades add +10% to base stats per level. */
export const plusMult = (it: Item) => 1 + 0.1 * it.plus;

export function itemStats(it: Item) {
  const m = plusMult(it);
  return {
    dmg: it.dmg ? ([Math.round(it.dmg[0] * m), Math.round(it.dmg[1] * m)] as [number, number]) : undefined,
    def: Math.round(it.def * m),
    hp: Math.round(it.hp * m),
  };
}

/** Rough power score for upgrade arrows. */
export function score(it: Item): number {
  const b = baseOf(it), s = itemStats(it);
  let v = 0;
  if (s.dmg) v += ((s.dmg[0] + s.dmg[1]) / 2) * (b.speed ?? 1) * 4;
  v += s.def * 4 + s.hp * 0.8;
  for (const a of allAffixes(it)) {
    v += ({ hp: 0.8, stam: 0.5, dmg: 2.2, crit: 2.5, leech: 5, gold: 0.6, def: 4, speed: 1.5, regen: 0.6 } as Record<AffixType, number>)[a.t] * a.v;
  }
  return v;
}

export function sellValue(it: Item): number {
  const base = [4, 12, 35, 90, 260, 150][it.rarity];
  return Math.round(base * (1 + 0.35 * it.plus));
}

export const FORGE_MAX = 5;
export function forgeCost(it: Item): { gold: number; shards: number } {
  const n = it.plus + 1;
  const rm = [1, 1.2, 1.5, 1.9, 2.5, 2.2][it.rarity];
  return { gold: Math.round(20 * n * n * rm), shards: n };
}
