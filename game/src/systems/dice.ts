import { RNG, rng as defaultRng } from "../core/rng";
import type { WeaponKind } from "./items";

/**
 * Hearth Dice — three six-sided dice rolled when you rest with them charged.
 * The rolled faces are your buffs until the next roll (they survive death).
 * Matching faces combine: a pair counts as 2.5 faces, a triple as 4.5 faces plus a named perk.
 * Faces are customised by inscribing runes, which drop rarely at published odds.
 */

export type FaceId = "blank" | "sword" | "shield" | "coin" | "heart" | "skull" | "fang" | "star" | "feather" | "moon";

export interface FaceDef {
  name: string;
  icon: string | null;
  color: string;
  /** Short effect text for one face. */
  text: string;
  rare?: boolean;
}

export const FACES: Record<FaceId, FaceDef> = {
  blank: { name: "Blank", icon: null, color: "#8a8298", text: "Nothing" },
  sword: { name: "Sword", icon: "sword", color: "#e0605a", text: "+15% damage" },
  shield: { name: "Shield", icon: "shield", color: "#5aa0d8", text: "+3 armour" },
  coin: { name: "Coin", icon: "coin", color: "#f2cf55", text: "+25% gold found" },
  heart: { name: "Heart", icon: "heart", color: "#c7373f", text: "+1 tonic charge" },
  skull: { name: "Skull", icon: "skull", color: "#d8c8a8", text: "Foes hit 20% harder, gear drops x1.5" },
  fang: { name: "Fang", icon: "fang", color: "#e08ad0", text: "+2 health on hit", rare: true },
  star: { name: "Star", icon: "star", color: "#fff2a8", text: "+6% crit chance", rare: true },
  feather: { name: "Feather", icon: "feather", color: "#9ad8ff", text: "+8% move speed", rare: true },
  moon: { name: "Moon", icon: "moonface", color: "#c8b8d8", text: "+20 max stamina", rare: true },
};

export const STARTER_DIE: FaceId[] = ["sword", "shield", "coin", "heart", "blank", "blank"];
export const DICE_CHARGE = 12;
export const DICE_REROLLS = 2;

export type Perk = "bloodlust" | "bulwark" | "windfall" | "secondWind" | "deathWish" | "nothing";

export const PERKS: Record<Perk, { name: string; text: string }> = {
  bloodlust: { name: "Bloodlust", text: "Every kill heals 4 health" },
  bulwark: { name: "Bulwark", text: "Hits no longer knock you off balance" },
  windfall: { name: "Windfall", text: "Every foe drops gold" },
  secondWind: { name: "Second Wind", text: "Survive one lethal hit at 1 health" },
  deathWish: { name: "Death Wish", text: "Foes hit 60% harder, gear drops x3" },
  nothing: { name: "Nothing At All", text: "The Hearth takes pity: 60 gold to your bank" },
};

const TRIPLE_PERK: Partial<Record<FaceId, Perk>> = {
  sword: "bloodlust", shield: "bulwark", coin: "windfall", heart: "secondWind", skull: "deathWish", blank: "nothing",
};

export interface DiceBonus {
  dmg: number; armour: number; gold: number; tonics: number;
  leech: number; crit: number; speed: number; stam: number;
  foeDmg: number; gearMult: number;
  perks: Perk[];
  combos: string[];
}

/** Effective face count after pair / triple bonuses. */
const worth = (n: number) => (n >= 3 ? 4.5 : n === 2 ? 2.5 : n);

export function diceBonus(roll: FaceId[]): DiceBonus {
  const b: DiceBonus = { dmg: 0, armour: 0, gold: 0, tonics: 0, leech: 0, crit: 0, speed: 0, stam: 0, foeDmg: 1, gearMult: 1, perks: [], combos: [] };
  const counts = new Map<FaceId, number>();
  for (const f of roll) counts.set(f, (counts.get(f) ?? 0) + 1);
  for (const [f, n] of counts) {
    const w = worth(n);
    if (n === 2) b.combos.push(`Pair of ${FACES[f].name}s`);
    if (n >= 3) {
      const perk = TRIPLE_PERK[f];
      b.combos.push(perk ? PERKS[perk].name : `Three ${FACES[f].name}s`);
      if (perk) b.perks.push(perk);
    }
    switch (f) {
      case "sword": b.dmg += 15 * w; break;
      case "shield": b.armour += Math.round(3 * w); break;
      case "coin": b.gold += 25 * w; break;
      case "heart": b.tonics += Math.floor(w); break;
      case "fang": b.leech += Math.round(2 * w); break;
      case "star": b.crit += Math.round(6 * w); break;
      case "feather": b.speed += Math.round(8 * w); break;
      case "moon": b.stam += Math.round(20 * w); break;
      case "skull":
        // skulls don't get combo scaling; three of them is Death Wish instead
        if (n >= 3) { b.foeDmg = 1.6; b.gearMult = 3; }
        else { b.foeDmg = 1 + 0.2 * n; b.gearMult = 1 + 0.5 * n; }
        break;
      case "blank": break;
    }
  }
  b.dmg = Math.round(b.dmg); b.gold = Math.round(b.gold);
  return b;
}

/** Plain-language lines for the current roll, for menus. */
export function bonusLines(b: DiceBonus): string[] {
  const out: string[] = [];
  if (b.dmg) out.push(`+${b.dmg}% damage`);
  if (b.armour) out.push(`+${b.armour} armour`);
  if (b.gold) out.push(`+${b.gold}% gold found`);
  if (b.tonics) out.push(`+${b.tonics} tonic charge${b.tonics > 1 ? "s" : ""}`);
  if (b.leech) out.push(`+${b.leech} health on hit`);
  if (b.crit) out.push(`+${b.crit}% crit chance`);
  if (b.speed) out.push(`+${b.speed}% move speed`);
  if (b.stam) out.push(`+${b.stam} max stamina`);
  if (b.foeDmg > 1) out.push(`Foes hit ${Math.round((b.foeDmg - 1) * 100)}% harder`);
  if (b.gearMult > 1) out.push(`Gear drops x${b.gearMult}`);
  for (const p of b.perks) out.push(`${PERKS[p].name}: ${PERKS[p].text}`);
  return out;
}

export function rollDie(die: FaceId[], r: RNG = defaultRng): FaceId {
  return die[Math.floor(r.next() * die.length)];
}

/** Rune drop weights (which face a rune carries). */
export const RUNE_WEIGHTS: [FaceId, number][] = [
  ["sword", 5], ["shield", 5], ["coin", 5], ["heart", 4], ["skull", 3],
  ["fang", 2], ["star", 2], ["feather", 2], ["moon", 2],
];

// ======================================================================= finisher die
export type FinFace = "blank" | "x15" | "x2" | "rend" | "cleave" | "twin" | "skewer" | "reap";

export const FIN: Record<FinFace, { label: string; color: string; text: string }> = {
  blank: { label: "-", color: "#8a8298", text: "Nothing" },
  x15: { label: "x1.5", color: "#f1e3c2", text: "x1.5 damage" },
  x2: { label: "x2", color: "#f2cf55", text: "x2 damage" },
  rend: { label: "REND", color: "#e0605a", text: "Target bleeds for 75% more over 2s" },
  cleave: { label: "CLEAVE", color: "#ffa94d", text: "Also hits foes nearby for 60%" },
  twin: { label: "TWIN", color: "#9ab8ff", text: "Strikes again for 70%" },
  skewer: { label: "SKEWER", color: "#c8cedc", text: "x1.5 damage and a huge knockback" },
  reap: { label: "REAP", color: "#72d672", text: "Heals you for 30% of the damage" },
};

export const FINISHER: Record<WeaponKind, FinFace[]> = {
  sword: ["blank", "blank", "x15", "x15", "x2", "rend"],
  axe: ["blank", "blank", "x15", "x2", "cleave", "cleave"],
  dagger: ["blank", "x15", "x15", "twin", "twin", "rend"],
  spear: ["blank", "blank", "x15", "x2", "skewer", "skewer"],
  scythe: ["blank", "blank", "x15", "x2", "reap", "reap"],
};

export function rollFinisher(kind: WeaponKind, r: RNG = defaultRng): FinFace {
  const f = FINISHER[kind];
  return f[Math.floor(r.next() * f.length)];
}
