import type { PetId } from "./save";

/**
 * Boss pets, 1/500 each. A pet grows with every boss you fell while it follows you:
 * at 25 kills it starts to glow (a light of its own in the Mines), and at 100 it also
 * gathers gold and shards from twice as far away.
 */
export const PET_STAGE_KC = [0, 25, 100];

export const PETS: Record<PetId, { stages: [string, string, string]; boss: string; rate: number }> = {
  wick: { stages: ["Lil' Wick", "Ember Wick", "Harvest King Wick"], boss: "wick", rate: 500 },
  grim: { stages: ["Lil' Grim", "Deep Grim", "Foreman Grim"], boss: "grimwater", rate: 500 },
};

export const PET_PERKS = ["Follows you everywhere", "Glows: a light of its own", "Glows, and gathers loot from twice as far"];

export function petStage(kc: number) { return kc >= PET_STAGE_KC[2] ? 2 : kc >= PET_STAGE_KC[1] ? 1 : 0; }
