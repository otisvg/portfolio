import { SAVE_KEY } from "../core/constants";
import { rollItem, type Item, type Slot } from "./items";
import { refreshBounties, type Bounty } from "./bounties";
import { DICE_CHARGE, STARTER_DIE, type FaceId } from "./dice";
import { xpForLevel, type Skill } from "./skills";

export interface SaveData {
  v: 1;
  gold: number;
  bank: number;
  shards: number;
  inv: (Item | null)[];
  eq: Record<Slot, Item | null>;
  xp: Record<Skill, number>;
  kills: Record<string, number>;
  log: Record<string, number>;
  shrines: string[];
  lastShrine: string;
  tonicMax: number;
  purse: { x: number; y: number; amount: number } | null;
  pet: boolean;
  flags: Record<string, boolean>;
  bestRarity: number;
  deaths: number;
  playTime: number;
  /** Hearth Dice: three dice of six faces each. */
  dice: FaceId[][];
  /** The current roll (buffs), empty until the first roll. */
  diceRoll: FaceId[];
  /** Foes slain toward the next roll (full at DICE_CHARGE). */
  diceCharge: number;
  /** Uninscribed rune faces owned. */
  runes: Partial<Record<FaceId, number>>;
  secondWindUsed: boolean;
  /** Notice-board contracts. */
  bounties: Bounty[];
  bountiesDone: number;
  /** Hollowmere's Hope (0..100); milestones restore the village. */
  hope: number;
  /** Brom's rune for sale (Brom's Apprentice milestone). */
  runeStock: FaceId | null;
}

export const INV_SIZE = 28;

export function newSave(): SaveData {
  const sword = rollItem("rusty_sword", 0);
  sword.dmg = [5, 8];
  const tunic = rollItem("tunic", 0);
  tunic.def = 1; tunic.hp = 5;
  return {
    v: 1, gold: 0, bank: 0, shards: 0,
    inv: new Array(INV_SIZE).fill(null),
    eq: { weapon: sword, helm: null, body: tunic, trinket: null },
    xp: { attack: 0, strength: 0, defence: 0, hitpoints: xpForLevel(10) },
    kills: {}, log: {}, shrines: ["village"], lastShrine: "village", tonicMax: 3,
    purse: null, pet: false, flags: {}, bestRarity: 0, deaths: 0, playTime: 0,
    dice: [[...STARTER_DIE], [...STARTER_DIE], [...STARTER_DIE]], diceRoll: [], diceCharge: DICE_CHARGE, runes: {}, secondWindUsed: false,
    bounties: refreshBounties([]), bountiesDone: 0, hope: 0, runeStock: null,
  };
}

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as SaveData;
    if (d.v !== 1) return null;
    const base = newSave();
    const merged = { ...base, ...d, eq: { ...base.eq, ...d.eq }, xp: { ...base.xp, ...d.xp } };
    while (merged.inv.length < INV_SIZE) merged.inv.push(null);
    return merged;
  } catch {
    return null;
  }
}

export function writeSave(d: SaveData) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(d)); } catch { /* storage unavailable */ }
}

export function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
}

export function wipeSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}
