import { diceBonus, type Perk } from "./dice";
import { allAffixes, baseOf, itemStats, SLOTS, type AffixType, type WeaponKind } from "./items";
import type { SaveData } from "./save";
import { levelForXp, type Skill } from "./skills";

export interface Stats {
  levels: Record<Skill, number>;
  maxHp: number;
  maxStam: number;
  armour: number;
  dr: number;
  dmg: [number, number];
  dmgMult: number;
  crit: number;
  atkSpeed: number;
  reach: number;
  kind: WeaponKind;
  leech: number;
  goldFind: number;
  moveMult: number;
  regenMult: number;
  light: number;
  /** Extra tonic charges from the Hearth Dice. */
  tonicBonus: number;
  foeDmgMult: number;
  gearMult: number;
  perks: Perk[];
}

export function computeStats(s: SaveData): Stats {
  const levels = {
    attack: levelForXp(s.xp.attack), strength: levelForXp(s.xp.strength),
    defence: levelForXp(s.xp.defence), hitpoints: levelForXp(s.xp.hitpoints),
  };
  const aff: Record<AffixType, number> = { hp: 0, stam: 0, dmg: 0, crit: 0, leech: 0, gold: 0, def: 0, speed: 0, regen: 0 };
  let gearHp = 0, gearDef = 0, light = 0;
  for (const slot of SLOTS) {
    const it = s.eq[slot];
    if (!it) continue;
    const st = itemStats(it);
    gearHp += st.hp;
    gearDef += st.def;
    light += baseOf(it).light ?? 0;
    for (const a of allAffixes(it)) aff[a.t] += a.v;
  }
  const w = s.eq.weapon;
  const wb = w ? baseOf(w) : null;
  const wd = w ? itemStats(w).dmg ?? [2, 3] : [2, 3];
  const db = diceBonus(s.diceRoll ?? []);
  aff.dmg += db.dmg; aff.def += db.armour; aff.gold += db.gold; aff.leech += db.leech;
  aff.crit += db.crit; aff.speed += db.speed; aff.stam += db.stam;
  const armour = gearDef + aff.def + (levels.defence - 1);
  return {
    levels,
    maxHp: levels.hitpoints * 10 + gearHp + aff.hp,
    maxStam: 100 + aff.stam,
    armour,
    dr: Math.min(0.6, armour / (armour + 40)),
    dmg: wd as [number, number],
    dmgMult: 1 + 0.03 * (levels.strength - 1) + aff.dmg / 100,
    crit: Math.min(0.6, 0.05 + 0.004 * (levels.attack - 1) + aff.crit / 100),
    atkSpeed: (wb?.speed ?? 1) * (1 + Math.min(30, levels.attack - 1) / 100),
    reach: wb?.reach ?? 16,
    kind: wb?.kind ?? "sword",
    leech: aff.leech,
    goldFind: aff.gold,
    moveMult: 1 + aff.speed / 100,
    regenMult: 1 + aff.regen / 100,
    light,
    tonicBonus: db.tonics,
    foeDmgMult: db.foeDmg,
    gearMult: db.gearMult,
    perks: db.perks,
  };
}
