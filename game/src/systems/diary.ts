import type { SaveData } from "./save";

/**
 * Achievement Diary, OSRS-style: each area has Easy, Medium and Hard tiers of tasks.
 * Finishing a tier grants a permanent reward. Progress is read straight from the save.
 */

export type DiaryArea = "hollowmere" | "mines";

export interface DiaryTask { text: string; done: (s: SaveData) => boolean }
export interface DiaryTier { name: string; reward: string; tasks: DiaryTask[] }

const n = (s: SaveData, k: string) => s.c?.[k] ?? 0;
const kc = (s: SaveData, k: string) => s.kills[k] ?? 0;
const f = (s: SaveData, k: string) => !!s.flags[k];

export const DIARY: Record<DiaryArea, { name: string; tiers: DiaryTier[] }> = {
  hollowmere: {
    name: "HOLLOWMERE",
    tiers: [
      {
        name: "EASY", reward: "150 gold and a random rune",
        tasks: [
          { text: "Kindle all three Hearthstones in the Outskirts", done: (s) => ["village", "wayside", "mill"].every((id) => s.shrines.includes(id)) },
          { text: "Complete a bounty from the notice board", done: (s) => s.bountiesDone >= 1 },
          { text: "Have Brom temper an item", done: (s) => f(s, "tempered") },
          { text: "Stomp 10 Blightlings", done: (s) => n(s, "stomp") >= 10 },
        ],
      },
      {
        name: "MEDIUM", reward: "Treasure maps drop twice as often",
        tasks: [
          { text: "Fell Wick, the Harvest Warden", done: (s) => kc(s, "wick") >= 1 },
          { text: "Land 10 ripostes", done: (s) => n(s, "riposte") >= 10 },
          { text: "Dig up a treasure in the Outskirts", done: (s) => f(s, "dug_outskirts") },
          { text: "Roll a triple on the Hearth Dice", done: (s) => f(s, "triple") },
        ],
      },
      {
        name: "HARD", reward: "+1 tonic charge",
        tasks: [
          { text: "Fell Wick without taking a hit", done: (s) => f(s, "flawless_wick") },
          { text: "Fell Wick with all three sigils", done: (s) => f(s, "sigils3_wick") },
          { text: "Raise Hollowmere's Hope to 45", done: (s) => s.hope >= 45 },
          { text: "Slay 5 Rotborn", done: (s) => kc(s, "rotborn") >= 5 },
        ],
      },
    ],
  },
  mines: {
    name: "THE DROWNED MINES",
    tiers: [
      {
        name: "EASY", reward: "200 gold and a random rune",
        tasks: [
          { text: "Light the beacon and descend into the Mines", done: (s) => f(s, "minesOpen") },
          { text: "Kindle all three Hearthstones in the Mines", done: (s) => ["mines_mouth", "mines_deep", "mines_pool"].every((id) => s.shrines.includes(id)) },
          { text: "Slay 25 foes in the Mines", done: (s) => n(s, "minesKills") >= 25 },
          { text: "Hear Old Tam's story", done: (s) => f(s, "met_tam") },
        ],
      },
      {
        name: "MEDIUM", reward: "Your light reaches 25% further",
        tasks: [
          { text: "Fell Grimwater, the Drowned Foreman", done: (s) => kc(s, "grimwater") >= 1 },
          { text: "Open a secret cache", done: (s) => ["lantern", "scythe", "hood"].some((c) => f(s, "cache_" + c)) },
          { text: "Craft something at Brom's forge", done: (s) => f(s, "crafted") },
          { text: "Dig up a treasure in the Mines", done: (s) => f(s, "dug_mines") },
        ],
      },
      {
        name: "HARD", reward: "+1 Hearth Dice reroll",
        tasks: [
          { text: "Open all three secret caches", done: (s) => ["lantern", "scythe", "hood"].every((c) => f(s, "cache_" + c)) },
          { text: "Fell Grimwater with all three sigils", done: (s) => f(s, "sigils3_grimwater") },
          { text: "Fell Grimwater without drinking a tonic", done: (s) => f(s, "notonic_grimwater") },
          { text: "Complete 3 daily bounties", done: (s) => (s.dailiesDone ?? 0) >= 3 },
        ],
      },
    ],
  },
};
export const DIARY_AREAS = Object.keys(DIARY) as DiaryArea[];

export const tierKey = (area: DiaryArea, tier: number) => `${area}:${tier}`;
export const tierComplete = (s: SaveData, area: DiaryArea, tier: number) => DIARY[area].tiers[tier].tasks.every((t) => t.done(s));
export const tierClaimed = (s: SaveData, area: DiaryArea, tier: number) => (s.diaryClaimed ?? []).includes(tierKey(area, tier));

/** Permanent diary rewards, applied once the tier is claimed. */
export function diaryPerks(s: SaveData) {
  const c = (a: DiaryArea, t: number) => tierClaimed(s, a, t);
  return {
    mapMult: c("hollowmere", 1) ? 2 : 1,
    tonics: c("hollowmere", 2) ? 1 : 0,
    lightMult: c("mines", 1) ? 1.25 : 1,
    rerolls: c("mines", 2) ? 1 : 0,
  };
}
