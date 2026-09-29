import { buildLevel1, type Level, type LevelId } from "./level";
import { buildLevel2 } from "./mines";

export const LEVEL_INFO: Record<LevelId, { n: number; name: string; short: string }> = {
  outskirts: { n: 1, name: "The Blighted Outskirts", short: "OUTSKIRTS" },
  mines: { n: 2, name: "The Drowned Mines", short: "DROWNED MINES" },
};
export const LEVEL_IDS: LevelId[] = ["outskirts", "mines"];

const built = new Map<LevelId, Level>();

/** Level data is built once and kept; the (slower) art is cached separately by the game. */
export function getLevel(id: LevelId): Level {
  let L = built.get(id);
  if (!L) { L = id === "mines" ? buildLevel2() : buildLevel1(); built.set(id, L); }
  return L;
}

/** Which level a Hearthstone belongs to. */
export function levelOfShrine(shrineId: string): LevelId {
  for (const id of LEVEL_IDS) if (getLevel(id).shrines.some((s) => s.id === shrineId)) return id;
  return "outskirts";
}
