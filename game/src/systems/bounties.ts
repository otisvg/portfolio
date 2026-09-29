import { RNG, rng as defaultRng } from "../core/rng";
import { RUNE_WEIGHTS, type FaceId } from "./dice";

/**
 * Bounties: three contracts pinned to the notice board in Hollowmere. Progress is tracked
 * automatically; a finished contract pays out on the spot, and fresh notices are posted
 * whenever you rest. Every contract also raises Hollowmere's Hope, which restores the village.
 * One extra daily contract is the same for everyone that day and pays out the Daily Chest.
 */

export type BountyKind =
  | "kill" | "riposte" | "perfect" | "stomp" | "pots" | "finisher"
  | "wick" | "wickNoTonic" | "wickFast" | "rotborn"
  | "grim" | "grimNoTonic" | "dig" | "cache";

export type BountyTarget = "blightling" | "crow" | "husk" | "sludgeling" | "bat" | "miner";

export type BountyReward =
  | { type: "rune"; face: FaceId }
  | { type: "shards"; amount: number }
  | { type: "gold"; amount: number }
  | { type: "charge" }
  | { type: "chest" };

export interface Bounty {
  kind: BountyKind;
  target?: BountyTarget;
  need: number;
  have: number;
  hope: number;
  reward: BountyReward;
  done: boolean;
  /** The once-a-day contract: same for everyone, bigger reward. */
  daily?: boolean;
}

interface Template { kind: BountyKind; target?: BountyTarget; need: [number, number]; hope: number; weight: number; mines?: boolean }

const POOL: Template[] = [
  { kind: "kill", target: "blightling", need: [8, 12], hope: 4, weight: 3 },
  { kind: "kill", target: "crow", need: [4, 6], hope: 5, weight: 2 },
  { kind: "kill", target: "husk", need: [3, 5], hope: 6, weight: 3 },
  { kind: "riposte", need: [3, 4], hope: 6, weight: 2 },
  { kind: "perfect", need: [4, 6], hope: 5, weight: 2 },
  { kind: "stomp", need: [5, 8], hope: 4, weight: 2 },
  { kind: "pots", need: [6, 8], hope: 3, weight: 1 },
  { kind: "finisher", need: [4, 6], hope: 5, weight: 2 },
  { kind: "wick", need: [1, 1], hope: 8, weight: 2 },
  { kind: "wickNoTonic", need: [1, 1], hope: 12, weight: 1 },
  { kind: "wickFast", need: [1, 1], hope: 12, weight: 1 },
  { kind: "rotborn", need: [1, 1], hope: 10, weight: 1 },
  { kind: "dig", need: [1, 1], hope: 6, weight: 1 },
  // unlocked once the beacon burns and the Mines are open
  { kind: "kill", target: "sludgeling", need: [8, 12], hope: 5, weight: 2, mines: true },
  { kind: "kill", target: "bat", need: [4, 6], hope: 5, weight: 2, mines: true },
  { kind: "kill", target: "miner", need: [3, 5], hope: 7, weight: 3, mines: true },
  { kind: "grim", need: [1, 1], hope: 10, weight: 2, mines: true },
  { kind: "grimNoTonic", need: [1, 1], hope: 14, weight: 1, mines: true },
  { kind: "cache", need: [1, 1], hope: 8, weight: 1, mines: true },
];

export const WICK_FAST_SECONDS = 150;
export const BOUNTY_SLOTS = 3;

const TARGET_NAME: Record<BountyTarget, string> = {
  blightling: "Blightlings", crow: "Rotcrows", husk: "Husks", sludgeling: "Sludgelings", bat: "Cave Bats", miner: "Drowned Miners",
};

export function describe(b: Bounty): string {
  switch (b.kind) {
    case "kill": return `Slay ${b.need} ${TARGET_NAME[b.target!]}`;
    case "riposte": return `Land ${b.need} ripostes`;
    case "perfect": return `Make ${b.need} perfect dodges`;
    case "stomp": return `Stomp ${b.need} Blightlings`;
    case "pots": return `Break ${b.need} pots`;
    case "finisher": return `Roll ${b.need} finisher faces (not blank)`;
    case "wick": return "Fell Wick, the Harvest Warden";
    case "wickNoTonic": return "Fell Wick without drinking a tonic";
    case "wickFast": return `Fell Wick in under ${Math.floor(WICK_FAST_SECONDS / 60)}:${String(WICK_FAST_SECONDS % 60).padStart(2, "0")}`;
    case "rotborn": return b.need > 1 ? `Slay ${b.need} Rotborn` : "Slay a Rotborn";
    case "grim": return "Fell Grimwater, the Drowned Foreman";
    case "grimNoTonic": return "Fell Grimwater without drinking a tonic";
    case "dig": return b.need > 1 ? `Dig up ${b.need} treasures` : "Dig up a buried treasure";
    case "cache": return "Open a secret cache in the Mines";
  }
}

export function rewardText(r: BountyReward, faceName: (f: FaceId) => string): string {
  switch (r.type) {
    case "rune": return `${faceName(r.face)} rune`;
    case "shards": return r.amount === 1 ? "1 Blight Shard" : `${r.amount} Blight Shards`;
    case "gold": return `${r.amount} gold`;
    case "charge": return "Full dice charge";
    case "chest": return "The Daily Chest";
  }
}

function rollReward(t: Template, r: RNG): BountyReward {
  const big = t.hope >= 8;
  return r.weighted<BountyReward>([
    [{ type: "rune", face: r.weighted(RUNE_WEIGHTS) }, big ? 4 : 2],
    [{ type: "shards", amount: r.int(big ? 3 : 1, big ? 5 : 3) }, 3],
    [{ type: "gold", amount: r.int(big ? 90 : 35, big ? 160 : 80) }, 3],
    [{ type: "charge" }, 2],
  ]);
}

const key = (b: { kind: BountyKind; target?: BountyTarget }) => b.kind + (b.target ?? "");
const isBoss = (k: BountyKind) => k.startsWith("wick") || k.startsWith("grim");

export function newBounty(existing: Bounty[], r: RNG = defaultRng, minesOpen = false): Bounty {
  const taken = new Set(existing.filter((b) => !b.done).map(key));
  // keep the board varied: at most one kill contract and one boss contract at a time
  const bossTaken = existing.some((b) => !b.done && isBoss(b.kind));
  const killTaken = existing.some((b) => !b.done && b.kind === "kill");
  const pool = POOL.filter((t) => (minesOpen || !t.mines) && !taken.has(key(t)) && !(bossTaken && isBoss(t.kind)) && !(killTaken && t.kind === "kill"));
  const t = r.weighted(pool.map((p) => [p, p.weight] as const));
  return { kind: t.kind, target: t.target, need: r.int(t.need[0], t.need[1]), have: 0, hope: t.hope, reward: rollReward(t, r), done: false };
}

/** Replace finished contracts with fresh ones (called when you rest). */
export function refreshBounties(list: Bounty[], r: RNG = defaultRng, minesOpen = false): Bounty[] {
  const kept = list.filter((b) => !b.done);
  while (kept.length < BOUNTY_SLOTS) kept.push(newBounty(kept, r, minesOpen));
  return kept;
}

// ======================================================================= Daily & weekly
/** Local calendar day, e.g. "2026-9-29". Everyone playing on the same day gets the same daily. */
export function dayKey(d = new Date()) { return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }
/** Weeks since the epoch, rolling over on Monday (UTC). */
export function weekKey(d = new Date()) { return Math.floor((Math.floor(d.getTime() / 86400000) + 3) / 7); }

function seedOf(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** The daily contract: a doubled notice from the pool that pays out the Daily Chest. */
export function dailyBounty(day: string, minesOpen: boolean): Bounty {
  const r = new RNG(seedOf("daily" + day + (minesOpen ? "m" : "")));
  const b = newBounty([], r, minesOpen);
  const repeatable = b.kind === "kill" || b.kind === "riposte" || b.kind === "perfect" || b.kind === "stomp" || b.kind === "pots" || b.kind === "finisher";
  if (repeatable) b.need *= 2;
  else if (b.kind === "rotborn" || b.kind === "dig") b.need = 2;
  return { ...b, hope: 15, reward: { type: "chest" }, daily: true };
}

export type MoonId = "blood" | "gilded" | "hungry" | "pale" | "harvest" | "drowned";
export const MOONS: Record<MoonId, { name: string; effect: string; color: string }> = {
  blood: { name: "Blood Rotmoon", effect: "Rotborn rise three times as often (1/12).", color: "#e0405a" },
  gilded: { name: "Gilded Rotmoon", effect: "+50% gold found.", color: "#f2cf55" },
  hungry: { name: "Hungry Rotmoon", effect: "Foes hit 15% harder, but gear drops x1.5.", color: "#b04f9a" },
  pale: { name: "Pale Rotmoon", effect: "Perfect dodges are easier to land (+0.06s).", color: "#e9ddf5" },
  harvest: { name: "Harvest Rotmoon", effect: "Bosses drop one extra piece of gear.", color: "#ffa94d" },
  drowned: { name: "Drowned Rotmoon", effect: "Treasure maps drop three times as often.", color: "#6ad0c0" },
};
const MOON_IDS = Object.keys(MOONS) as MoonId[];

/** This week's Rotmoon: one modifier for everyone, all week. */
export function moonFor(week: number): MoonId {
  return MOON_IDS[seedOf("moon" + week) % MOON_IDS.length];
}

// ======================================================================= Hope
export const HOPE_MAX = 100;

export interface Milestone { hope: number; title: string; text: string }

export const MILESTONES: Milestone[] = [
  { hope: 10, title: "The Road Lamps", text: "Lamps relit along the road. +1 Hearth Dice reroll." },
  { hope: 25, title: "Brom's Apprentice", text: "Brom sells a fresh rune every time you rest." },
  { hope: 45, title: "The Wheat Recovers", text: "The Rot retreats from the fields. +10% gold found." },
  { hope: 70, title: "A Brighter Hearth", text: "The Hearth burns brighter. +1 tonic charge." },
  { hope: 100, title: "The Mill Turns", text: "The Rot retreats to the mill. You earn the Harvest Crown." },
];

export const milestonesFor = (hope: number) => MILESTONES.filter((m) => hope >= m.hope).length;

/** How many tiles the Rot has been pushed back for a number of milestones reached. */
export const recedeFor = (m: number) => (m >= 5 ? 70 : m >= 3 ? 30 : 0);
