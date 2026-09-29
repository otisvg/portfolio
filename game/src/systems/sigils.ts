/**
 * Boss sigils: opt-in difficulty for bosses you've already beaten, set at the sigil stone
 * beside each fog gate. Every active sigil adds a bonus gear roll and a shard; all three
 * together roll the boss's unique table twice. Fixed rewards, published in game.
 */

export type SigilId = "haste" | "ash" | "ruin";

export const SIGILS: Record<SigilId, { name: string; effect: string; color: string }> = {
  haste: { name: "Sigil of Haste", effect: "The boss moves and attacks 20% faster.", color: "#9ad8ff" },
  ash: { name: "Sigil of Ash", effect: "The boss has 40% more health.", color: "#c9b894" },
  ruin: { name: "Sigil of Ruin", effect: "The boss hits 30% harder.", color: "#e0605a" },
};
export const SIGIL_IDS = Object.keys(SIGILS) as SigilId[];

export const SIGIL_REWARD = "Each sigil: +1 gear roll and +1 shard. All three: unique drops roll twice.";

export interface SigilMods { speed: number; hp: number; dmg: number; count: number }

export function sigilMods(active: Partial<Record<SigilId, boolean>>): SigilMods {
  const count = SIGIL_IDS.filter((s) => active[s]).length;
  return {
    speed: active.haste ? 1.2 : 1,
    hp: active.ash ? 1.4 : 1,
    dmg: active.ruin ? 1.3 : 1,
    count,
  };
}
