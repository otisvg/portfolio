/** OldSchool-style skills with the classic experience curve (level 99 cap). */
export type Skill = "attack" | "strength" | "defence" | "hitpoints";
export const SKILLS: Skill[] = ["attack", "strength", "defence", "hitpoints"];

export const SKILL_INFO: Record<Skill, { name: string; icon: string; color: string; perk: (lvl: number) => string }> = {
  attack: { name: "Attack", icon: "sword", color: "#e0605a", perk: (l) => `+${(0.4 * (l - 1)).toFixed(1)}% crit, +${Math.min(30, l - 1)}% attack speed` },
  strength: { name: "Strength", icon: "fist", color: "#72d672", perk: (l) => `+${3 * (l - 1)}% damage` },
  defence: { name: "Defence", icon: "shield", color: "#5aa0d8", perk: (l) => `+${l - 1} armour` },
  hitpoints: { name: "Hitpoints", icon: "heart", color: "#c7373f", perk: (l) => `${l * 10} base health` },
};

const XP_TABLE: number[] = [0, 0];
{
  let pts = 0;
  for (let l = 1; l < 99; l++) {
    pts += Math.floor(l + 300 * Math.pow(2, l / 7));
    XP_TABLE[l + 1] = Math.floor(pts / 4);
  }
}

export const xpForLevel = (l: number) => XP_TABLE[Math.min(99, Math.max(1, l))];

export function levelForXp(xp: number): number {
  let l = 1;
  while (l < 99 && xp >= XP_TABLE[l + 1]) l++;
  return l;
}

/** OSRS-flavoured combat level. A brand-new character is level 3. */
export function combatLevel(lv: Record<Skill, number>) {
  return Math.floor(0.25 * (lv.defence + lv.hitpoints) + 0.325 * (lv.attack + lv.strength));
}
