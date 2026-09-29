import { RNG, rng as defaultRng } from "../core/rng";

/**
 * Slayer, OSRS-style. Old Tam hands out kill assignments across both levels. Kills on task
 * give Slayer XP (the foe's health), a finished task gives points (streak bonuses on every
 * 10th and 50th), and points buy unlocks and gear in Tam's shop. Higher Slayer levels open
 * tougher assignments. With "Bigger and Badder" unlocked, any kill on task has a 1 in 120
 * chance to summon a Superior: five times the health, and a far better drop table.
 */

export interface SlayerTask { target: string; need: number; have: number }

interface TaskDef { target: string; name: string; level: number; count: [number, number]; weight: number; unlock?: string; mines?: boolean }

export const SLAYER_TASKS: TaskDef[] = [
  { target: "blightling", name: "Blightlings", level: 1, count: [15, 25], weight: 8 },
  { target: "crow", name: "Rotcrows", level: 1, count: [10, 18], weight: 6 },
  { target: "sludgeling", name: "Sludgelings", level: 1, count: [15, 25], weight: 8, mines: true },
  { target: "husk", name: "Husks", level: 5, count: [8, 15], weight: 8 },
  { target: "bat", name: "Cave Bats", level: 5, count: [10, 18], weight: 6, mines: true },
  { target: "miner", name: "Drowned Miners", level: 15, count: [8, 14], weight: 8, mines: true },
  { target: "rotborn", name: "Rotborn", level: 20, count: [2, 4], weight: 3, unlock: "rotborn" },
  { target: "wick", name: "Wick, the Harvest Warden", level: 10, count: [3, 5], weight: 3, unlock: "boss" },
  { target: "grimwater", name: "Grimwater, the Drowned Foreman", level: 15, count: [2, 4], weight: 3, unlock: "boss", mines: true },
];

export const taskName = (target: string) => SLAYER_TASKS.find((t) => t.target === target)?.name ?? target;

export const SUPERIOR_RATE = 120;

export function newTask(level: number, unlocks: string[], blocked: string[], minesOpen: boolean, prev: string | null, r: RNG = defaultRng): SlayerTask {
  const pool = SLAYER_TASKS.filter((t) => level >= t.level && (!t.unlock || unlocks.includes(t.unlock)) && !blocked.includes(t.target) && (minesOpen || !t.mines) && t.target !== prev);
  const t = r.weighted(pool.map((p) => [p, p.weight] as const));
  const mult = unlocks.includes("longer") ? 1.5 : 1;
  return { target: t.target, need: Math.round(r.int(t.count[0], t.count[1]) * mult), have: 0 };
}

/** Points for finishing the Nth task (1-based): 10, with x5 on every 10th and x15 on every 50th. */
export const taskPoints = (n: number) => (n % 50 === 0 ? 150 : n % 10 === 0 ? 50 : 10);

export interface SlayerReward { id: string; name: string; icon: string; cost: number; desc: string; kind: "unlock" | "buy" }

export const SLAYER_SHOP: SlayerReward[] = [
  { id: "superior", name: "Bigger and Badder", icon: "skull", cost: 150, kind: "unlock", desc: "Superiors can appear while on task." },
  { id: "boss", name: "Boss Hunter", icon: "sigil", cost: 120, kind: "unlock", desc: "Tam may assign the bosses." },
  { id: "rotborn", name: "Rot Stalker", icon: "shard", cost: 100, kind: "unlock", desc: "Rotborn tasks (Slayer 20). Big XP." },
  { id: "longer", name: "Need More Darkness", icon: "moonface", cost: 80, kind: "unlock", desc: "Tasks 50% longer. More XP." },
  { id: "helm", name: "Slayer Helm", icon: "helmslay", cost: 300, kind: "buy", desc: "+15% damage, +10% XP on task." },
  { id: "skip", name: "Skip Task", icon: "feather", cost: 30, kind: "buy", desc: "Get a different task." },
  { id: "block", name: "Block Task", icon: "shield", cost: 100, kind: "buy", desc: "Never get this foe again (2 max)." },
  { id: "charge", name: "Hearth Charge", icon: "dice", cost: 25, kind: "buy", desc: "Fully charge your Hearth Dice." },
  { id: "rune", name: "Tam's Rune", icon: "star", cost: 40, kind: "buy", desc: "A random Hearth Dice rune." },
];
