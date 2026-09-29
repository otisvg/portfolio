/**
 * Boss parts. Wick and Grimwater drop materials at fixed, published odds; Brom turns them
 * into fixed-stat Epic gear and permanent upgrades. Embers also light the beacon that opens
 * the way down into the Drowned Mines.
 */

export type MatId = "ember" | "straw" | "button" | "blade" | "pearl" | "chain" | "bellshard";

export const MATS: Record<MatId, { name: string; icon: string; color: string; from: string }> = {
  ember: { name: "Warden's Ember", icon: "ember", color: "#ffa94d", from: "Wick" },
  straw: { name: "Enchanted Straw", icon: "straw", color: "#e6cb72", from: "Wick" },
  button: { name: "Button Eye", icon: "button", color: "#c9b894", from: "Wick" },
  blade: { name: "Rusted Scythe Blade", icon: "rblade", color: "#c8cedc", from: "Wick" },
  pearl: { name: "Brine Pearl", icon: "pearl", color: "#9ae0f0", from: "Grimwater" },
  chain: { name: "Drowned Chain Link", icon: "chain", color: "#8a90a6", from: "Grimwater" },
  bellshard: { name: "Cracked Bell Shard", icon: "bellshard", color: "#c9962a", from: "Grimwater" },
};
export const MAT_IDS = Object.keys(MATS) as MatId[];

/** Embers needed to light the beacon at the mill cellar. */
export const BEACON_EMBERS = 3;

export interface Recipe {
  id: string;
  name: string;
  icon: string;
  desc: string;
  cost: Partial<Record<MatId, number>>;
  gold: number;
  /** An item base to craft, or a one-time permanent upgrade. */
  item?: string;
  once?: boolean;
}

export const RECIPES: Recipe[] = [
  { id: "miners_lamp", name: "Miner's Lamp", icon: "lamp", item: "miners_lamp", cost: { ember: 2, straw: 8 }, gold: 60, desc: "Helm. Lights the dark around you." },
  { id: "ember_flask", name: "Ember Flask", icon: "tonic", once: true, cost: { ember: 4, straw: 12 }, gold: 150, desc: "Permanent: +1 tonic charge." },
  { id: "scare_charm", name: "Scarecrow Charm", icon: "scarecharm", item: "scare_charm", cost: { straw: 10, button: 2 }, gold: 90, desc: "Trinket. +8% damage, +10 stamina." },
  { id: "wardens_sickle", name: "Warden's Sickle", icon: "sickle", item: "wardens_sickle", cost: { blade: 1, ember: 3 }, gold: 120, desc: "Scythe. Curved enough to cut roots." },
  { id: "pearl_ring", name: "Brine Pearl Ring", icon: "pearl", item: "pearl_ring", cost: { pearl: 2, chain: 3 }, gold: 140, desc: "Trinket. +15% stamina regen, +4 armour." },
  { id: "drowned_mail", name: "Drowned Mail", icon: "mail", item: "drowned_mail", cost: { chain: 8, bellshard: 1 }, gold: 200, desc: "Body. Heavy links from the flood." },
  { id: "bell_charm", name: "Bell-Charm Dice", icon: "dice", once: true, cost: { bellshard: 2, pearl: 2 }, gold: 250, desc: "Permanent: +1 Hearth Dice reroll." },
];

export function canCraft(mats: Partial<Record<MatId, number>>, r: Recipe) {
  return (Object.entries(r.cost) as [MatId, number][]).every(([m, n]) => (mats[m] ?? 0) >= n);
}
