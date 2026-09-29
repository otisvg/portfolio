import { TILE } from "../core/constants";
import { Level, T, type SpawnKind } from "./level";

// ------------------------------------------------------------------------------------
// Level 2 — The Drowned Mines
// Carved out of solid rock: flooded galleries, orchard roots, watchful eyes, and at the
// bottom of the shaft, the Foreman who rang the flood bell and never stopped.
// ------------------------------------------------------------------------------------
export function buildLevel2(): Level {
  const L = new Level("mines", "mines", "grimwater", 216, 20);
  const G = 16;

  const fill = (x0: number, x1: number, y0: number, y1: number, t: number) => {
    for (let x = x0; x < x1; x++) for (let y = y0; y <= y1; y++) L.set(x, y, t);
  };
  const carve = (x0: number, x1: number, y0: number, y1: number) => fill(x0, x1, y0, y1, T.EMPTY);
  const pool = (x0: number, x1: number) => { fill(x0, x1, G, G + 1, T.BOG); };
  const plat = (x0: number, x1: number, row: number, t: number = T.PLANK) => fill(x0, x1, row, row, t);
  const at = (tx: number) => tx * TILE + 8;
  /** The first floor at or below a row (default: the first open row above the floor). */
  const gy = (tx: number, from = 3) => {
    let y = from;
    while (y < L.h && L.isSolid(L.get(tx, y))) y++;
    return L.surfaceY(tx, y);
  };
  const spawn = (kind: SpawnKind, tx: number, row?: number) => L.spawns.push({ kind, x: at(tx), y: row !== undefined ? row * TILE : gy(tx) });
  const prop = (kind: string, tx: number, v = 0, dx = 0, y?: number) => L.props.push({ kind, x: tx * TILE + dx, y: y ?? gy(tx), v });
  const sign = (tx: number, text: string) => L.signs.push({ x: at(tx), y: gy(tx), text });
  const spikes = (x0: number, x1: number) => { for (let x = x0; x < x1; x++) L.set(x, gy(x) / TILE - 1, T.THORN); };
  /** A lantern hanging on a chain from the ceiling row above. */
  const hang = (tx: number, ceilRow: number, len: number) => {
    const y = (ceilRow + 1) * TILE;
    prop("lamphang", tx, len, 0, y);
    L.lamps.push({ x: tx * TILE + 8, y: y + len + 5 });
  };

  // solid rock, then carve the tunnels
  fill(0, L.w, 0, L.h - 1, T.DIRT);
  fill(0, 2, 0, L.h - 1, T.STONE);

  // ---- The Mine Mouth (0-40) ----
  carve(2, 40, 5, G - 1);
  carve(2, 5, 0, 4); // the lift shaft up to Miller's Field
  L.exits.push({ x: at(3), y: gy(3), to: "mill", label: "RIDE THE LIFT" });
  prop("lift", 2);
  L.shrines.push({ id: "mines_mouth", name: "Mine Mouth Hearth", x: at(7), y: gy(7) });
  L.npcs.push({ id: "tam", x: at(10), y: gy(10) });
  sign(13, "THE HOLLOWMERE DEEP.\nCLOSED BY ORDER OF THE FOREMAN.\n\n(Scrawled beneath: HE NEVER LEFT.)");
  hang(6, 4, 14); hang(17, 4, 22);
  prop("beam", 12); prop("beam", 25); prop("beam", 37);
  prop("bones", 15);
  spawn("sludgeling", 18); spawn("pot", 20);
  pool(23, 27);
  plat(24, 26, 13);
  fill(29, 35, G - 2, G - 1, T.DIRT);
  prop("cart", 30);
  spawn("bat", 32, 9);
  prop("crystal", 34, 0);
  spawn("miner", 38);

  // ---- The Flooded Galleries (40-110) ----
  carve(40, 110, 3, G - 1);
  pool(43, 51);
  plat(43, 46, 14); plat(48, 51, 14);
  prop("beam", 42);
  spawn("sludgeling", 53);
  sign(55, "THE WATER CAME UP IN ONE NIGHT.\nTHE BELL RANG UNTIL MORNING.");
  // Wick's Lantern shows ledges that were always there
  carve(56, 74, 1, 2);
  plat(57, 60, 13, T.SPIRIT); plat(60, 63, 10, T.SPIRIT); plat(63, 66, 7, T.SPIRIT);
  fill(66, 73, 5, 6, T.DIRT);
  sign(59, "SOMETHING GLIMMERS HIGH ABOVE.\nONLY A WARDEN'S LIGHT COULD SHOW THE WAY UP.");
  L.caches.push({ id: "lantern", name: "The Lamplighter's Cache", x: at(70), y: 5 * TILE, key: "lantern" });
  prop("crystal", 67, 1, 0, 5 * TILE);
  spawn("bat", 62, 8); spawn("sludgeling", 68, G);
  hang(64, 0, 40);
  pool(76, 80);
  plat(77, 79, 13);
  spawn("miner", 83);
  prop("rails", 84, 9);
  prop("cart", 86); prop("cart", 90, 1);
  spawn("sludgeling", 88); spawn("sludgeling", 92);
  prop("beam", 93);
  fill(95, 99, G - 2, G - 1, T.DIRT);
  fill(99, 103, G - 4, G - 1, T.DIRT);
  spikes(96, 98);
  hang(101, 2, 18);
  spawn("bat", 97, 7);
  prop("crystal", 104, 2);
  spawn("pot", 105); spawn("miner", 107); spawn("pot", 108);

  // ---- The Rooted Deep (110-170) ----
  carve(110, 170, 4, G - 1);
  L.shrines.push({ id: "mines_deep", name: "Rooted Deep Hearth", x: at(112), y: gy(112) });
  sign(115, "ROOTS OF THE ORCHARD.\nTHEY CAME DOWN HERE LOOKING FOR WATER.");
  prop("roots", 111, 0, 0, 5 * TILE); prop("roots", 118, 1, 0, 5 * TILE);
  // a root-sealed chamber: only a curved blade cuts through
  plat(117, 121, 13);
  fill(121, 130, 10, 11, T.DIRT);
  fill(121, 122, 12, G - 1, T.ROOT);
  fill(129, 130, 12, G - 1, T.DIRT);
  L.caches.push({ id: "scythe", name: "The Root-Bound Cache", x: at(126), y: G * TILE, key: "scythe" });
  prop("roots", 124, 2, 0, 12 * TILE);
  spawn("miner", 133); spawn("sludgeling", 136); spawn("sludgeling", 139);
  spikes(140, 142);
  spawn("bat", 142, 8);
  hang(135, 3, 20);
  // the Watchers' gallery above the main tunnel
  sign(143, "THE WATCHERS NEVER BLINK.\nBUT THEY DO LOOK AWAY.");
  plat(144, 147, 12);
  fill(147, 165, 4, 4, T.DIRT);
  fill(147, 165, 9, 10, T.DIRT);
  fill(164, 165, 5, 8, T.DIRT);
  L.gate = { col: 159, top: 5, bottom: 8 };
  L.watchers.push({ x: at(151), y: 5 * TILE, floor: 9 * TILE, phase: 0 }, { x: at(156), y: 5 * TILE, floor: 9 * TILE, phase: 2.2 });
  L.caches.push({ id: "hood", name: "The Watched Cache", x: at(162), y: 9 * TILE, key: "hood" });
  spawn("miner", 152, G); spawn("sludgeling", 157, G);
  spawn("miner", 166); spawn("sludgeling", 168); spawn("pot", 169);

  // ---- The Sunken Shaft (170-232) ----
  carve(170, 214, 3, G - 1);
  fill(214, L.w, 0, L.h - 1, T.STONE);
  L.shrines.push({ id: "mines_pool", name: "Sunken Shaft Hearth", x: at(175), y: gy(175) });
  sign(178, "THE SUNKEN SHAFT.\nWHEN THE BELL RINGS, CLIMB.");
  L.sigilStone = { x: at(180), y: gy(180) };
  hang(172, 2, 16);
  prop("bell", 199, 0, 0, 3 * TILE);
  plat(186, 191, 12); plat(207, 212, 12); plat(196, 202, 9);
  prop("beam", 185, 1); prop("beam", 209, 1);
  L.arena = { x0: 184 * TILE, x1: 214 * TILE, fogCol: 183, fogTop: 3, fogBottom: G - 1, bossX: at(205), bossY: G * TILE };
  L.setFog(true);

  // shortcuts, veins, dead lamps, lore
  L.shortcuts.push(
    { id: "channel_bridge", name: "Sluice Bridge", x: at(53), y: gy(53), tiles: [[43, 51, G, T.PLANK]] },
    { id: "root_stair", name: "Root Stair", x: at(128), y: 10 * TILE, tiles: [[130, 132, 13, T.PLANK]] },
  );
  const vein = (id: string, tx: number, ore: "iron" | "silver" | "gleam", y?: number) => L.veins.push({ id, x: at(tx), y: y ?? gy(tx), ore });
  vein("v1", 16, "iron"); vein("v2", 37, "iron"); vein("v3", 58, "iron", G * TILE); vein("v4", 85, "iron"); vein("v5", 106, "iron"); vein("v6", 134, "iron");
  vein("v7", 94, "silver"); vein("v8", 124, "silver", 10 * TILE); vein("v9", 141, "silver", G * TILE); vein("v10", 167, "silver");
  vein("v11", 67, "gleam", 5 * TILE); vein("v12", 161, "gleam", 9 * TILE);
  for (const [id, tx] of [["l1", 20], ["l2", 54], ["l3", 89], ["l4", 117], ["l5", 150], ["l6", 177]] as [string, number][]) L.deadLamps.push({ id, x: at(tx), y: id === "l5" ? G * TILE : gy(tx) });
  L.lorePages.push(
    { id: "m_roster", x: at(12), y: gy(12) }, { id: "m_lamplog", x: at(72), y: 5 * TILE },
    { id: "m_day1", x: at(100), y: gy(100) }, { id: "m_day9", x: at(124), y: G * TILE },
    { id: "m_last", x: at(163), y: 9 * TILE }, { id: "m_pip", x: at(172), y: gy(172) },
  );
  L.cartStation = { x: at(32), y: gy(32) };

  L.digSpots.push(
    { id: "lift", x: at(15), y: gy(15), clue: "Where the lift's light first fails, beside the old bones." },
    { id: "carts", x: at(88), y: gy(88), clue: "Between the abandoned ore carts." },
    { id: "gallery", x: at(101), y: gy(101), clue: "On the rock shelf beneath the hanging lamp." },
    { id: "deep", x: at(137), y: gy(137), clue: "In the Rooted Deep, where two sludges keep watch." },
    { id: "shaft", x: at(172), y: gy(172), clue: "Just before the Sunken Shaft Hearth." },
  );

  L.regions = [
    { id: "mouth", name: "THE MINE MOUTH", sub: "The Drowned Mines", x0: 0, x1: 40, music: "mines" },
    { id: "galleries", name: "THE FLOODED GALLERIES", sub: "The Drowned Mines", x0: 40, x1: 110, music: "mines" },
    { id: "deep", name: "THE ROOTED DEEP", sub: "The Drowned Mines", x0: 110, x1: 170, music: "mines" },
    { id: "shaft", name: "THE SUNKEN SHAFT", sub: "The Drowned Mines", x0: 170, x1: 216, music: "mines" },
  ];
  L.snapshot();
  return L;
}
