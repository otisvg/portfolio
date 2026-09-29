import { RNG, rng as defaultRng } from "../core/rng";
import { RUNE_WEIGHTS, type FaceId } from "./dice";

/**
 * Bounties: three contracts pinned to the notice board in Hollowmere. Progress is tracked
 * automatically; a finished contract pays out on the spot, and fresh notices are posted
 * whenever you rest. Every contract also raises Hollowmere's Hope, which restores the village.
 */

export type BountyKind =
  | "kill" | "riposte" | "perfect" | "stomp" | "pots" | "finisher"
  | "wick" | "wickNoTonic" | "wickFast" | "rotborn";

export type BountyTarget = "blightling" | "crow" | "husk";

export type BountyReward =
  | { type: "rune"; face: FaceId }
  | { type: "shards"; amount: number }
  | { type: "gold"; amount: number }
  | { type: "charge" };

export interface Bounty {
  kind: BountyKind;
  target?: BountyTarget;
  need: number;
  have: number;
  hope: number;
  reward: BountyReward;
  done: boolean;
}

interface Template { kind: BountyKind; target?: BountyTarget; need: [number, number]; hope: number; weight: number }

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
];

export const WICK_FAST_SECONDS = 150;
export const BOUNTY_SLOTS = 3;

const TARGET_NAME: Record<BountyTarget, string> = { blightling: "Blightlings", crow: "Rotcrows", husk: "Husks" };

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
    case "rotborn": return "Slay a Rotborn";
  }
}

export function rewardText(r: BountyReward, faceName: (f: FaceId) => string): string {
  switch (r.type) {
    case "rune": return `${faceName(r.face)} rune`;
    case "shards": return r.amount === 1 ? "1 Blight Shard" : `${r.amount} Blight Shards`;
    case "gold": return `${r.amount} gold`;
    case "charge": return "Full dice charge";
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

export function newBounty(existing: Bounty[], r: RNG = defaultRng): Bounty {
  const taken = new Set(existing.filter((b) => !b.done).map(key));
  // keep the board varied: at most one kill contract and one Wick contract at a time
  const wickTaken = existing.some((b) => !b.done && b.kind.startsWith("wick"));
  const killTaken = existing.some((b) => !b.done && b.kind === "kill");
  const pool = POOL.filter((t) => !taken.has(key(t)) && !(wickTaken && t.kind.startsWith("wick")) && !(killTaken && t.kind === "kill"));
  const t = r.weighted(pool.map((p) => [p, p.weight] as const));
  return { kind: t.kind, target: t.target, need: r.int(t.need[0], t.need[1]), have: 0, hope: t.hope, reward: rollReward(t, r), done: false };
}

/** Replace finished contracts with fresh ones (called when you rest). */
export function refreshBounties(list: Bounty[], r: RNG = defaultRng): Bounty[] {
  const kept = list.filter((b) => !b.done);
  while (kept.length < BOUNTY_SLOTS) kept.push(newBounty(kept, r));
  return kept;
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
