import type { Item } from "./items";

/**
 * Gear sets. The Warden's set drops in the Outskirts and the Foreman's set in the Mines,
 * at fixed, published odds. Wear 2 or 4 pieces of one set for its bonuses, or two of each
 * for the hybrid bonus.
 */

export type SetId = "warden" | "foreman";

export const SETS: Record<SetId, { name: string; color: string; pieces: string[]; two: string; four: string }> = {
  warden: {
    name: "The Warden's Harvest", color: "#e6cb72",
    pieces: ["warden_brim", "warden_coat", "warden_hook", "warden_button"],
    two: "Finisher die blanks become x1.5",
    four: "Kills heal 3 and restore 8 stamina; heavy finishers cleave nearby foes",
  },
  foreman: {
    name: "The Foreman's Watch", color: "#6ad0c0",
    pieces: ["foreman_helmet", "foreman_oilskin", "foreman_mattock", "foreman_whistle"],
    two: "+4 armour; hits can't spill your tonic",
    four: "Perfect dodges deal +50% posture; flood water can't slow you",
  },
};
export const SET_IDS = Object.keys(SETS) as SetId[];
export const HYBRID_TEXT = "Two of each: +6% crit and +15 max stamina";

export function setOf(baseId: string): SetId | null {
  for (const id of SET_IDS) if (SETS[id].pieces.includes(baseId)) return id;
  return null;
}

export function setCounts(eq: (Item | null)[]) {
  const n: Record<SetId, number> = { warden: 0, foreman: 0 };
  for (const it of eq) { const s = it ? setOf(it.base) : null; if (s) n[s]++; }
  return n;
}

export type SetPerk = "warden2" | "warden4" | "foreman2" | "foreman4" | "hybrid";

export function setPerks(eq: (Item | null)[]): SetPerk[] {
  const n = setCounts(eq), out: SetPerk[] = [];
  if (n.warden >= 2) out.push("warden2");
  if (n.warden >= 4) out.push("warden4");
  if (n.foreman >= 2) out.push("foreman2");
  if (n.foreman >= 4) out.push("foreman4");
  if (n.warden >= 2 && n.foreman >= 2) out.push("hybrid");
  return out;
}
