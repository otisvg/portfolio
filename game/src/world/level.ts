import { TILE } from "../core/constants";
import { clamp, smoothstep } from "../core/math";

export const T = {
  EMPTY: 0, DIRT: 1, STONE: 2, PLANK: 3, BOG: 4, THORN: 5, HAY: 6, FOG: 7, BRANCH: 8, WALL: 9,
  /** Ghostly ledge: only solid while you carry Wick's Lantern. */
  SPIRIT: 10,
  /** Orchard roots grown down into the Mines: cut them with a scythe. They regrow when you rest. */
  ROOT: 11,
  /** Portcullis that the Watchers slam shut. */
  GATE: 12,
  /** Cracked rock: a pick (or Mining 20) breaks through. Mends when you rest. */
  CRACK: 13,
} as const;

export type LevelId = "outskirts" | "mines";
export type Theme = "outskirts" | "mines";
export type BossKind = "wick" | "grimwater";

export type SpawnKind = "blightling" | "crow" | "husk" | "pot" | "sludgeling" | "bat" | "miner";
export interface Spawn { kind: SpawnKind; x: number; y: number }
export interface PropDef { kind: string; x: number; y: number; v: number }
export interface SignDef { x: number; y: number; text: string }
export interface ShrineDef { id: string; name: string; x: number; y: number }
export interface NpcDef { id: "brom" | "maud" | "pip" | "tam"; x: number; y: number }
export interface Region { id: string; name: string; sub: string; x0: number; x1: number; music: string }
/** A way to another level. `needs: "beacon"` stays sealed until the beacon is lit. */
export interface ExitDef { x: number; y: number; to: string; label: string; needs?: "beacon" }
/** A secret cache, refilled every time you rest. `key` is the unique item that reaches it. */
export interface CacheDef { id: string; name: string; x: number; y: number; key: "lantern" | "scythe" | "hood" | "diver" | "tide" | "pick" }
/** A lever that permanently changes the level (a bridge, a stair) once pulled from the far side. */
export interface ShortcutDef { id: string; name: string; x: number; y: number; tiles: [number, number, number, number][] }
export interface VeinDef { id: string; x: number; y: number; ore: "iron" | "silver" | "gleam" }
export interface SpotDef { id: string; x: number; y: number }
/** Where a treasure map's X is buried. */
export interface DigSpot { id: string; x: number; y: number; clue: string }
/** A ceiling eye whose cone of light sweeps the floor below. */
export interface WatcherDef { x: number; y: number; floor: number; phase: number }

export class Level {
  readonly id: LevelId;
  readonly theme: Theme;
  readonly bossKind: BossKind;
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
  board = { x: -1000, y: 0 };
  /** Boss arena bounds in px, fog gate column, boss home. */
  arena = { x0: 0, x1: 0, fogCol: 0, fogTop: 0, fogBottom: 0, bossX: 0, bossY: 0 };
  exits: ExitDef[] = [];
  caches: CacheDef[] = [];
  digSpots: DigSpot[] = [];
  watchers: WatcherDef[] = [];
  /** The Watchers' portcullis (tile column and rows). */
  gate: { col: number; top: number; bottom: number } | null = null;
  /** The beacon that opens the way down (Embers). */
  beacon: { x: number; y: number } | null = null;
  /** Boss sigil stone beside the fog gate. */
  sigilStone = { x: 0, y: 0 };
  /** Spirit ledges are solid while Wick's Lantern is carried. */
  spiritSight = false;
  shortcuts: ShortcutDef[] = [];
  veins: VeinDef[] = [];
  /** Dead lamps in the Mines that Embers relight for good. */
  deadLamps: SpotDef[] = [];
  lorePages: SpotDef[] = [];
  /** The Tide Stone and the bog it drains while the Tide Bell is worn. */
  tideStone: { x: number; y: number; x0: number; x1: number } | null = null;
  cartStation: { x: number; y: number } | null = null;
  private baseTiles: Uint8Array = new Uint8Array(0);

  constructor(id: LevelId, theme: Theme, bossKind: BossKind, w: number, h: number) {
    this.id = id; this.theme = theme; this.bossKind = bossKind;
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
  isSolid(t: number) { return t === T.DIRT || t === T.STONE || t === T.HAY || t === T.FOG || t === T.WALL || t === T.ROOT || t === T.GATE || t === T.CRACK; }
  isOneWay(t: number) { return t === T.PLANK || t === T.BRANCH || (t === T.SPIRIT && this.spiritSight); }
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
  blightAt(px: number) {
    if (this.theme === "mines") return 0.25 + 0.6 * smoothstep(clamp((px / TILE - 20) / 180, 0, 1));
    return smoothstep(clamp((px / TILE - 50 - this.recede) / 140, 0, 1));
  }

  /** Tiles the Rot has been pushed back by Hollowmere's Hope. */
  recede = 0;
  restored = -1;
  private baseProps: PropDef[] = [];
  private baseLamps: { x: number; y: number }[] = [];
  /** Lamps relit by the first Hope milestone. */
  relitLamps: { prop: PropDef; lamp: { x: number; y: number } }[] = [];

  snapshot() {
    this.baseProps = [...this.props]; this.baseLamps = [...this.lamps];
    this.baseTiles = this.tiles.slice();
  }

  /** Cut roots grow back, cracked rock mends, drained water returns, the Watchers' gate reopens. */
  regrow() {
    const b = this.baseTiles;
    for (let i = 0; i < b.length; i++) if ((b[i] === T.ROOT || b[i] === T.CRACK || b[i] === T.BOG) && this.tiles[i] !== T.PLANK) this.tiles[i] = b[i];
    this.setGate(true);
  }

  /** The tile a cell started as (before cuts, drains and shortcuts). */
  baseAt(tx: number, ty: number) { return tx < 0 || ty < 0 || tx >= this.w || ty >= this.h ? T.EMPTY : this.baseTiles[ty * this.w + tx]; }

  applyShortcut(sc: ShortcutDef) {
    for (const [x0, x1, row, t] of sc.tiles) for (let x = x0; x < x1; x++) this.set(x, row, t);
  }

  setGate(open: boolean) {
    const gt = this.gate;
    if (!gt) return;
    for (let y = gt.top; y <= gt.bottom; y++) this.set(gt.col, y, open ? T.EMPTY : T.GATE);
  }
  get gateOpen() { return !this.gate || this.get(this.gate.col, this.gate.bottom) !== T.GATE; }

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
  const L = new Level("outskirts", "outskirts", "wick", 224, 18);
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
  L.sigilStone = { x: at(186), y: gy(186) };
  // the mill cellar leads down into the Drowned Mines, once the beacon burns again
  L.beacon = { x: 215 * TILE + 4, y: gy(215) };
  L.exits.push({ x: 217 * TILE + 40, y: gy(219), to: "mines_mouth", label: "DESCEND", needs: "beacon" });
  // ---- secrets reached with gear from the Mines ----
  // the Tide Bell calls the water out of the Wheatfields bog
  L.tideStone = { x: at(90), y: gy(90), x0: 92, x1: 97 };
  L.caches.push({ id: "tide", name: "The Bell-Drained Cache", x: at(95), y: 16 * TILE, key: "tide" });
  // the Diver's Helm walks the bottom of the orchard bog
  L.caches.push({ id: "diver", name: "The Sunken Crypt Cache", x: at(146), y: 16 * TILE, key: "diver" });
  // a seam in the orchard's high ground, sealed with cracked rock
  fill(165, 171, 11, 13, T.EMPTY);
  fill(171, 172, 11, 13, T.CRACK);
  L.caches.push({ id: "seam", name: "The Old Seam Cache", x: at(167), y: 14 * TILE, key: "pick" });
  // shortcuts: bridges you kick down from the far bank
  L.shortcuts.push(
    { id: "wayside_bridge", name: "Wayside Bridge", x: at(98), y: gy(98), tiles: [[92, 97, G, T.PLANK]] },
    { id: "orchard_bridge", name: "Orchard Bridge", x: at(149), y: gy(149), tiles: [[141, 148, G, T.PLANK]] },
  );
  L.lorePages.push(
    { id: "o_pip", x: at(40), y: gy(40) }, { id: "o_notice", x: at(45) + 4, y: gy(45) },
    { id: "o_ledger3", x: at(76), y: gy(76) }, { id: "o_ledger9", x: at(128), y: gy(128) },
    { id: "o_letter", x: at(157), y: gy(157) }, { id: "o_burnt", x: at(191), y: gy(191) },
  );

  L.digSpots.push(
    { id: "well", x: at(21), y: gy(21), clue: "Where Hollowmere draws its water, dig at the well's shadow." },
    { id: "haystack", x: at(67), y: gy(67), clue: "Atop the tallest haystack in the Wheatfields." },
    { id: "scarecrow", x: at(80), y: gy(80), clue: "At the heel of the first scarecrow, the one that never moved." },
    { id: "graves", x: at(132), y: gy(132), clue: "Between two graves in the Rotting Orchard." },
    { id: "highrot", x: at(168), y: gy(168), clue: "On the high ground, beneath the swollen rot-tree." },
  );

  L.regions = [
    { id: "village", name: "HOLLOWMERE", sub: "The last warm hearth", x0: 0, x1: 47, music: "village" },
    { id: "wheat", name: "THE WHEATFIELDS", sub: "Blighted Outskirts", x0: 47, x1: 111, music: "outskirts" },
    { id: "orchard", name: "THE ROTTING ORCHARD", sub: "Blighted Outskirts", x0: 111, x1: 188, music: "outskirts" },
    { id: "mill", name: "MILLER'S FIELD", sub: "Blighted Outskirts", x0: 188, x1: 224, music: "outskirts" },
  ];
  L.snapshot();
  return L;
}
