import { TILE } from "../core/constants";
import { clamp, smoothstep } from "../core/math";

export const T = {
  EMPTY: 0, DIRT: 1, STONE: 2, PLANK: 3, BOG: 4, THORN: 5, HAY: 6, FOG: 7, BRANCH: 8, WALL: 9,
} as const;

export type SpawnKind = "blightling" | "crow" | "husk" | "pot";
export interface Spawn { kind: SpawnKind; x: number; y: number }
export interface PropDef { kind: string; x: number; y: number; v: number }
export interface SignDef { x: number; y: number; text: string }
export interface ShrineDef { id: string; name: string; x: number; y: number }
export interface NpcDef { id: "brom" | "maud" | "pip"; x: number; y: number }
export interface Region { id: string; name: string; sub: string; x0: number; x1: number; music: string }

export class Level {
  readonly w: number;
  readonly h: number;
  tiles: Uint8Array;
  spawns: Spawn[] = [];
  props: PropDef[] = [];
  signs: SignDef[] = [];
  shrines: ShrineDef[] = [];
  npcs: NpcDef[] = [];
  regions: Region[] = [];
  lamps: { x: number; y: number }[] = [];
  /** The bounty notice board in Hollowmere. */
  board = { x: 0, y: 0 };
  /** Boss arena bounds in px, fog gate column, boss home. */
  arena = { x0: 0, x1: 0, fogCol: 0, fogTop: 0, fogBottom: 0, bossX: 0, bossY: 0 };

  constructor(w: number, h: number) {
    this.w = w; this.h = h;
    this.tiles = new Uint8Array(w * h);
  }

  get pxW() { return this.w * TILE; }
  get pxH() { return this.h * TILE; }

  get(tx: number, ty: number): number {
    if (tx < 0 || tx >= this.w) return T.WALL;
    if (ty < 0 || ty >= this.h) return T.EMPTY;
    return this.tiles[ty * this.w + tx];
  }
  set(tx: number, ty: number, t: number) {
    if (tx < 0 || tx >= this.w || ty < 0 || ty >= this.h) return;
    this.tiles[ty * this.w + tx] = t;
  }
  isSolid(t: number) { return t === T.DIRT || t === T.STONE || t === T.HAY || t === T.FOG || t === T.WALL; }
  isOneWay(t: number) { return t === T.PLANK || t === T.BRANCH; }
  solidAt(tx: number, ty: number) { return this.isSolid(this.get(tx, ty)); }

  /** Pixel y of the first standable surface at or below row `fromRow` in a column. */
  surfaceY(tx: number, fromRow = 0): number {
    for (let y = fromRow; y < this.h; y++) {
      const t = this.get(tx, y);
      if (this.isSolid(t) && t !== T.FOG) return y * TILE;
    }
    return this.pxH;
  }

  /** 0 in the village, rising to 1 at the mill — drives colour grading and tile blight. */
  blightAt(px: number) { return smoothstep(clamp((px / TILE - 50 - this.recede) / 140, 0, 1)); }

  /** Tiles the Rot has been pushed back by Hollowmere's Hope. */
  recede = 0;
  restored = -1;
  private baseProps: PropDef[] = [];
  private baseLamps: { x: number; y: number }[] = [];
  /** Lamps relit by the first Hope milestone. */
  relitLamps: { prop: PropDef; lamp: { x: number; y: number } }[] = [];

  snapshot() { this.baseProps = [...this.props]; this.baseLamps = [...this.lamps]; }

  /** Apply a number of Hope milestones. Returns true if the art needs re-rendering. */
  setRestoration(m: number, recede: number) {
    if (m === this.restored) return false;
    this.restored = m;
    this.recede = recede;
    this.props = [...this.baseProps, ...(m >= 1 ? this.relitLamps.map((r) => r.prop) : [])];
    this.lamps = [...this.baseLamps, ...(m >= 1 ? this.relitLamps.map((r) => r.lamp) : [])];
    return true;
  }

  regionAt(px: number): Region {
    const tx = px / TILE;
    return this.regions.find((r) => tx >= r.x0 && tx < r.x1) ?? this.regions[0];
  }

  setFog(on: boolean) {
    const a = this.arena;
    for (let y = a.fogTop; y <= a.fogBottom; y++) this.set(a.fogCol, y, on ? T.FOG : T.EMPTY);
  }
}

// ------------------------------------------------------------------------------------
// Level 1 — The Blighted Outskirts
// ------------------------------------------------------------------------------------
export function buildLevel1(): Level {
  const L = new Level(224, 18);
  const G = 14;

  const fill = (x0: number, x1: number, y0: number, y1: number, t: number) => {
    for (let x = x0; x < x1; x++) for (let y = y0; y <= y1; y++) L.set(x, y, t);
  };
  const ground = (x0: number, x1: number, top: number) => { fill(x0, x1, 0, L.h - 1, T.EMPTY); fill(x0, x1, top, L.h - 1, T.DIRT); };
  const bog = (x0: number, x1: number) => { fill(x0, x1, 0, L.h - 1, T.EMPTY); fill(x0, x1, G, G + 1, T.BOG); fill(x0, x1, G + 2, L.h - 1, T.DIRT); };
  const plat = (x0: number, x1: number, row: number, t: number = T.PLANK) => fill(x0, x1, row, row, t);
  const thorns = (x0: number, x1: number) => { for (let x = x0; x < x1; x++) L.set(x, L.surfaceY(x) / TILE - 1, T.THORN); };

  const at = (tx: number) => tx * TILE + 8;
  const gy = (tx: number) => L.surfaceY(tx);
  const spawn = (kind: SpawnKind, tx: number, row?: number) => L.spawns.push({ kind, x: at(tx), y: row !== undefined ? row * TILE : gy(tx) });
  const prop = (kind: string, tx: number, v = 0, dx = 0) => L.props.push({ kind, x: tx * TILE + dx, y: gy(tx), v });
  const sign = (tx: number, text: string) => { L.signs.push({ x: at(tx), y: gy(tx), text }); };
  const lamp = (tx: number) => { prop("lamp", tx); L.lamps.push({ x: at(tx), y: gy(tx) - 30 }); };

  ground(0, L.w, G);

  // ---- Hollowmere (safe village) ----
  sign(2, "HOLLOWMERE.\nPOPULATION: FEWER THAN LAST WEEK.");
  prop("house", 4, 0);
  lamp(10);
  prop("house", 12, 1);
  prop("well", 19);
  lamp(22);
  L.shrines.push({ id: "village", name: "Hollowmere Hearth", x: at(25), y: gy(25) });
  L.npcs.push({ id: "maud", x: at(28) - 2, y: gy(28) });
  prop("house", 29, 2);
  prop("smithy", 34);
  L.npcs.push({ id: "brom", x: at(37) + 4, y: gy(37) });
  lamp(41);
  L.npcs.push({ id: "pip", x: at(42), y: gy(42) });
  prop("gate", 46);

  // ---- The Wheatfields ----
  prop("fence", 48, 10); prop("wheat", 49, 11);
  sign(50, "THE OUTSKIRTS.\nTURN BACK.\n\n(Someone has scratched out 'BACK'.)");
  spawn("pot", 53); spawn("blightling", 58);
  ground(60, 64, G - 1);
  fill(64, 66, G - 2, G - 1, T.HAY);
  fill(66, 68, G - 4, G - 1, T.HAY);
  spawn("crow", 69, 7);
  bog(70, 74);
  prop("wheat", 74, 10); prop("scarecrow", 79);
  spawn("pot", 75); spawn("blightling", 77); spawn("blightling", 82); spawn("pot", 83);
  ground(84, 90, G - 2);
  spawn("husk", 88);
  sign(91, "DO NOT DRINK THE PURPLE.");
  bog(92, 97);
  plat(94, 96, 11);
  prop("wheat", 97, 12); prop("fence", 104, 5);
  spawn("pot", 99); spawn("crow", 100, 8); spawn("blightling", 103); spawn("crow", 106, 9); spawn("pot", 108);
  prop("scarecrow", 102);
  L.shrines.push({ id: "wayside", name: "Wayside Hearth", x: at(110), y: gy(110) });

  // ---- The Rotting Orchard ----
  prop("tree", 113, 0); plat(112, 115, 10, T.BRANCH);
  prop("tree", 118, 1); plat(117, 120, 9, T.BRANCH);
  spawn("blightling", 116); spawn("husk", 121);
  prop("deadtree", 122, 0);
  thorns(123, 126);
  ground(126, 130, G - 1);
  ground(130, 134, G - 2);
  prop("grave", 131, 0); prop("grave", 133, 1);
  prop("deadtree", 136, 1);
  spawn("husk", 132); spawn("crow", 136, 8); spawn("husk", 139);
  sign(140, "HERE LIES THE MILLER'S BOY.\nHE WANTED TO SEE THE SCARECROW DANCE.");
  bog(141, 148);
  plat(142, 144, 12, T.BRANCH);
  plat(145, 147, 11, T.BRANCH);
  prop("blighttree", 151, 0);
  spawn("pot", 149); spawn("blightling", 150); spawn("blightling", 153); spawn("blightling", 156); spawn("husk", 158); spawn("pot", 159);
  plat(160, 162, 12);
  ground(162, 172, G - 4);
  prop("blighttree", 165, 1);
  spawn("husk", 167); spawn("crow", 170, 5);
  prop("grave", 174, 2);
  thorns(175, 177);
  prop("blighttree", 180, 2);
  spawn("blightling", 179); spawn("blightling", 182); spawn("husk", 185); spawn("pot", 186);

  // ---- Miller's Field (boss) ----
  L.shrines.push({ id: "mill", name: "Mill Gate Hearth", x: at(188), y: gy(188) });
  sign(190, "MILLER'S FIELD.\nHE STILL KEEPS IT.");
  fill(222, 224, 0, L.h - 1, T.STONE);
  plat(198, 202, 10);
  plat(213, 217, 10);
  prop("mill", 217);
  prop("post", 208);
  L.arena = { x0: 194 * TILE, x1: 222 * TILE, fogCol: 193, fogTop: 0, fogBottom: G - 1, bossX: at(208), bossY: gy(208) };
  L.setFog(true);

  // lamps that come back when Hollowmere's Hope rises
  for (const tx of [58, 80, 100, 128]) L.relitLamps.push({ prop: { kind: "lamp", x: tx * TILE, y: gy(tx), v: 0 }, lamp: { x: at(tx), y: gy(tx) - 30 } });
  L.board = { x: at(44), y: gy(44) };

  L.regions = [
    { id: "village", name: "HOLLOWMERE", sub: "The last warm hearth", x0: 0, x1: 47, music: "village" },
    { id: "wheat", name: "THE WHEATFIELDS", sub: "Blighted Outskirts", x0: 47, x1: 111, music: "outskirts" },
    { id: "orchard", name: "THE ROTTING ORCHARD", sub: "Blighted Outskirts", x0: 111, x1: 188, music: "outskirts" },
    { id: "mill", name: "MILLER'S FIELD", sub: "Blighted Outskirts", x0: 188, x1: 224, music: "outskirts" },
  ];
  L.snapshot();
  return L;
}
