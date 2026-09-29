import { TILE } from "../core/constants";
import { bayer, clamp, hash, rgb } from "../core/math";
import { T, type Level } from "../world/level";
import { makeCanvas, type Ctx } from "./canvas";
import { C } from "./palette";

/** Direct pixel buffer for fast procedural painting. */
class PixBuf {
  data: ImageData;
  constructor(readonly w: number, readonly h: number) { this.data = new ImageData(w, h); }
  set(x: number, y: number, hex: string, a = 255) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const [r, g, b] = rgb(hex);
    const i = (y * this.w + x) * 4, d = this.data.data;
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a;
  }
  toCanvas() { const [c, ctx] = makeCanvas(this.w, this.h); ctx.putImageData(this.data, 0, 0); return c; }
}

const DEAD_GRASS = ["#2a2233", "#3a2f45", "#4f4258", "#6a5a6f", "#8a7a8f"];
const GRASS = [C.grass0, C.grass1, C.grass2, C.grass3, C.grass4];
const DIRT = [C.dirt0, C.dirt1, C.dirt2, C.dirt3];
const ROT_DIRT = [C.blight0, "#2a1a30", C.blight1, "#4a2d52"];
const STRAW = [C.straw0, C.straw1, C.straw2, C.straw3];
const DEAD_STRAW = ["#3f3542", "#5a4f5e", "#7a6e7a", "#948a92"];

export interface TileLayers { tiles: HTMLCanvasElement; fg: HTMLCanvasElement }

export function renderTiles(L: Level): TileLayers {
  if (L.theme === "mines") return renderMineTiles(L);
  const W = L.pxW, H = L.pxH;
  const buf = new PixBuf(W, H);
  const fg = new PixBuf(W, H);

  const solidVis = (tx: number, ty: number) => {
    const t = L.get(tx, ty);
    return t === T.DIRT || t === T.STONE || t === T.HAY || t === T.WALL || t === T.BOG;
  };

  // pick from a palette with blight dithering
  const pal = (healthy: string[], rot: string[], i: number, x: number, y: number, b: number) => {
    i = clamp(Math.round(i), 0, healthy.length - 1);
    return b > bayer(x, y) ? rot[Math.min(i, rot.length - 1)] : healthy[i];
  };

  for (let ty = 0; ty < L.h; ty++) {
    for (let tx = 0; tx < L.w; tx++) {
      const t = L.get(tx, ty);
      const x0 = tx * TILE, y0 = ty * TILE;
      const expTop = !solidVis(tx, ty - 1);
      const expL = !solidVis(tx - 1, ty), expR = !solidVis(tx + 1, ty);

      if (t === T.DIRT) {
        // how far below the surface this tile sits (for depth darkening)
        let depthTiles = 0;
        for (let k = ty - 1; k >= 0 && solidVis(tx, k); k--) depthTiles++;
        for (let y = 0; y < TILE; y++) {
          for (let x = 0; x < TILE; x++) {
            const wx = x0 + x, wy = y0 + y;
            const b = L.blightAt(wx) * 0.85;
            const depth = depthTiles * TILE + y;
            let c: string;
            if (expTop) {
              const gd = 3 + Math.floor(hash(wx, 0, 11) * 3);
              if (y < gd) {
                const gi = y === 0 ? 3 : y === 1 ? (hash(wx, wy, 2) > 0.7 ? 3 : 2) : y < gd - 1 ? 2 - (bayer(wx, wy) > 0.5 ? 1 : 0) : 1;
                c = pal(GRASS, DEAD_GRASS, gi, wx, wy, b);
                if (b > 0.5 && hash(wx >> 1, wy, 31) > 0.93) c = C.sick1;
                buf.set(wx, wy, c);
                continue;
              }
              if (y === gd) { buf.set(wx, wy, pal(GRASS, DEAD_GRASS, 0, wx, wy, b)); continue; }
            }
            const n = hash(wx >> 1, wy, 7);
            let di = n > 0.86 ? 2 : n < 0.25 ? 0 : 1;
            const deep = clamp((depth - 8) / 26, 0, 1);
            if (deep > bayer(wx + 1, wy)) di = Math.max(0, di - 1);
            if (deep > 0.6 && deep - 0.6 > bayer(wx, wy + 2) * 0.5) di = 0;
            if (hash(wx >> 1, wy >> 1, 3) > 0.975 && depth > 6 && depth < 30) di = 3; // pebbles
            c = pal(DIRT, ROT_DIRT, di, wx, wy, b);
            if ((expL && x === 0) || (expR && x === TILE - 1)) c = pal(DIRT, ROT_DIRT, 0, wx, wy, b);
            buf.set(wx, wy, c);
          }
        }
        if (expTop) {
          // grass blades and flora poking above the surface
          for (let x = 0; x < TILE; x++) {
            const wx = x0 + x;
            const b = L.blightAt(wx) * 0.85;
            const hv = hash(wx, 1, 5);
            if (hv > 0.5) {
              const hgt = 1 + Math.floor(hash(wx, 2, 6) * 3);
              for (let k = 1; k <= hgt; k++) buf.set(wx, y0 - k, pal(GRASS, DEAD_GRASS, k === hgt ? 3 : 2, wx, y0 - k, b));
              if (hv > 0.985 && b < 0.4) buf.set(wx, y0 - hgt - 1, hash(wx, 9, 1) > 0.5 ? C.cream : C.scarf2);
            }
            // foreground tufts in front of characters
            if (hash(wx, 3, 9) > 0.86) {
              const hgt = 2 + Math.floor(hash(wx, 4, 9) * 4);
              for (let k = 0; k < hgt; k++) fg.set(wx, y0 + 2 - k, pal(GRASS, DEAD_GRASS, k > hgt - 2 ? 2 : 1, wx, y0 - k, b));
            }
          }
          // occasional mushrooms in the rot
          if (hash(tx, ty, 77) > 0.8 && L.blightAt(x0) > 0.35) {
            const mx = x0 + 3 + Math.floor(hash(tx, 1, 78) * 10);
            buf.set(mx, y0 - 1, C.paper); buf.set(mx, y0 - 2, C.paper);
            for (let k = -1; k <= 1; k++) buf.set(mx + k, y0 - 3, C.blight4);
            buf.set(mx, y0 - 4, C.blight4); buf.set(mx - 1, y0 - 3, C.blight5);
          }
        }
      } else if (t === T.STONE) {
        for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
          const wx = x0 + x, wy = y0 + y;
          const ry = Math.floor(wy / 4), off = (ry & 1) * 4;
          const mortar = wy % 4 === 3 || (wx + off) % 8 === 7;
          let c = mortar ? C.stone0 : hash(Math.floor((wx + off) / 8), ry, 4) > 0.5 ? C.stone1 : "#332f40";
          if (!mortar && wy % 4 === 0) c = C.stone2;
          if (!mortar && hash(wx, wy, 5) > 0.97) c = C.stone3;
          if (hash(wx >> 1, wy >> 1, 8) > 0.9 && !mortar) c = C.blight1;
          buf.set(wx, wy, c);
        }
      } else if (t === T.HAY) {
        for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
          const wx = x0 + x, wy = y0 + y;
          const b = L.blightAt(wx);
          const streak = hash(Math.floor(wx / 3) + (wy % 2) * 7, wy, 12);
          let i = streak > 0.7 ? 3 : streak > 0.3 ? 2 : 1;
          if (x === 0 || x === 15 || y === 15) i = 0;
          if (y === 0 && expTop) i = 3;
          let c = pal(STRAW, DEAD_STRAW, i, wx, wy, b * 0.9);
          if (x === 4 || x === 11) c = y % 3 === 0 ? C.wood1 : C.wood0;
          buf.set(wx, wy, c);
        }
        if (expTop) for (let x = 0; x < TILE; x += 2) if (hash(x0 + x, y0, 13) > 0.5) buf.set(x0 + x, y0 - 1, STRAW[3]);
      } else if (t === T.PLANK) {
        for (let y = 0; y < 6; y++) for (let x = 0; x < TILE; x++) {
          const wx = x0 + x, wy = y0 + y;
          let c: string = y === 0 ? C.wood4 : y === 5 ? C.wood0 : y === 4 ? C.wood1 : hash(wx >> 2, wy, 14) > 0.6 ? C.wood3 : C.wood2;
          if ((wx % 8 === 0) && y > 0 && y < 5) c = C.wood0;
          if ((wx % 8 === 2 || wx % 8 === 6) && y === 2 && hash(wx, 0, 15) > 0.5) c = C.steel1;
          buf.set(wx, wy, c);
        }
        for (let x = 0; x < TILE; x++) if (hash(x0 + x, y0, 16) > 0.3) buf.set(x0 + x, y0 + 6, C.ink);
      } else if (t === T.BRANCH) {
        for (let x = 0; x < TILE; x++) {
          const wx = x0 + x;
          const top = 1 + Math.round(Math.sin(wx * 0.35) * 0.8 + hash(wx >> 2, 0, 17) * 0.8);
          const bot = 5 + Math.round(hash(wx >> 3, 1, 18) * 1.5);
          for (let y = top; y <= bot; y++) {
            let c: string = y === top ? C.wood3 : y === bot ? C.wood0 : hash(wx, y0 + y, 19) > 0.75 ? C.wood1 : C.wood2;
            if (y === top && hash(wx, 5, 20) > 0.7) c = C.grass2;
            buf.set(wx, y0 + y, c);
          }
          if (hash(wx, 7, 22) > 0.8) { // twigs & leaves
            buf.set(wx, y0 + top - 1, C.wood1);
            buf.set(wx + 1, y0 + top - 2, L.blightAt(wx) > 0.5 ? C.blight3 : C.grass2);
          }
        }
      } else if (t === T.THORN) {
        const bctx = { set: (x: number, y: number, c: string) => buf.set(x, y, c) };
        for (let k = 0; k < 6; k++) {
          const sx = x0 + 1 + k * 3 + Math.floor(hash(tx, k, 23) * 2);
          const ex = sx + Math.round((hash(tx, k, 24) - 0.5) * 8);
          const top = y0 + 16 - (6 + Math.floor(hash(tx, k, 25) * 8));
          const len = y0 + 16 - top;
          for (let i = 0; i <= len; i++) {
            const y = y0 + 16 - i;
            const x = Math.round(sx + ((ex - sx) * i) / len + Math.sin(i * 0.8 + k) * 0.8);
            bctx.set(x, y, i < 3 ? C.ink : i % 3 === 0 ? C.blight1 : "#241628");
            if (i % 3 === 1 && i < len - 1) bctx.set(x + (i % 2 ? 1 : -1), y, C.blight2);
            if (i === len) { bctx.set(x, y - 1, C.blight4); bctx.set(x, y - 2, C.blight5); }
          }
        }
      }
    }
  }
  return { tiles: buf.toCanvas(), fg: fg.toCanvas() };
}

// ------------------------------------------------------------------ The Drowned Mines
const ROCK = ["#0f0e16", "#17151f", "#211e2b", "#2c2939", "#3b374b", "#514b64"];
const ROT_ROCK = ["#120c18", "#1c1224", "#28182f", "#35203f", "#4a2d52", "#6a4270"];
const MOSS = ["#173034", "#1f4446", "#2d5e5a", "#4a8a78", "#7ab89a"];

/**
 * Solid rock carved into tunnels: every tile knows how far it is from open air, so rims
 * catch the lamplight and the deep rock falls away to black. Wet moss on the floors,
 * stalactites and drips under the ceilings, flecks of ore and drowned crystal.
 */
function renderMineTiles(L: Level): TileLayers {
  const W = L.pxW, H = L.pxH;
  const buf = new PixBuf(W, H);
  const fg = new PixBuf(W, H);
  const rockLike = (t: number) => t === T.DIRT || t === T.WALL;
  const solidVis = (tx: number, ty: number) => {
    const t = L.get(tx, ty);
    return t === T.DIRT || t === T.STONE || t === T.WALL || t === T.BOG || (ty >= L.h);
  };
  // tile distance to open air (BFS)
  const dist = new Int16Array(L.w * L.h).fill(99);
  const q: number[] = [];
  for (let ty = 0; ty < L.h; ty++) for (let tx = 0; tx < L.w; tx++) if (!solidVis(tx, ty)) { dist[ty * L.w + tx] = 0; q.push(ty * L.w + tx); }
  for (let qi = 0; qi < q.length; qi++) {
    const i = q[qi], tx = i % L.w, ty = (i / L.w) | 0, d = dist[i] + 1;
    for (const [nx, ny] of [[tx + 1, ty], [tx - 1, ty], [tx, ty + 1], [tx, ty - 1]]) {
      if (nx < 0 || ny < 0 || nx >= L.w || ny >= L.h) continue;
      const j = ny * L.w + nx;
      if (dist[j] > d) { dist[j] = d; q.push(j); }
    }
  }
  const D = (tx: number, ty: number) => (tx < 0 || ty < 0 || tx >= L.w || ty >= L.h ? 99 : dist[ty * L.w + tx]);
  const pal = (i: number, x: number, y: number, b: number) => {
    i = clamp(Math.round(i), 0, ROCK.length - 1);
    return b > bayer(x, y) ? ROT_ROCK[i] : ROCK[i];
  };

  for (let ty = 0; ty < L.h; ty++) {
    for (let tx = 0; tx < L.w; tx++) {
      const t = L.get(tx, ty);
      const x0 = tx * TILE, y0 = ty * TILE;
      if (rockLike(t)) {
        const d = D(tx, ty);
        const openT = !solidVis(tx, ty - 1), openB = !solidVis(tx, ty + 1) && ty + 1 < L.h;
        const openL = !solidVis(tx - 1, ty), openR = !solidVis(tx + 1, ty);
        for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
          const wx = x0 + x, wy = y0 + y;
          const b = (L.blightAt(wx) - 0.25) * 0.9;
          // pixel distance to the nearest open face
          let e = (d - 1) * TILE + 16;
          if (d === 1) {
            if (openT) e = Math.min(e, y);
            if (openB) e = Math.min(e, TILE - 1 - y);
            if (openL) e = Math.min(e, x);
            if (openR) e = Math.min(e, TILE - 1 - x);
            // corners of diagonal openings
            if (!openT && !openL && !solidVis(tx - 1, ty - 1)) e = Math.min(e, Math.max(x, y));
            if (!openT && !openR && !solidVis(tx + 1, ty - 1)) e = Math.min(e, Math.max(TILE - 1 - x, y));
          }
          // strata and cracks
          const strata = Math.sin(wy * 0.55 + Math.sin(wx * 0.05) * 3 + hash(wx >> 3, 0, 5) * 2);
          let i = e < 2 ? 5 : e < 5 ? 4 : e < 12 ? 3 : e < 24 ? 2 : e < 40 ? 1 : 0;
          if (e >= 5 && strata > 0.82) i = Math.max(0, i - 1);
          if (e >= 3 && e < 30 && hash(wx >> 1, wy >> 1, 17) > 0.97) i = Math.min(5, i + 1);
          if (e > 12 && e < 24 && (e - 12) / 12 > bayer(wx, wy)) i = Math.max(0, i - 1);
          let c = pal(i, wx, wy, b);
          if (e >= 3 && e < 20 && hash(wx >> 1, wy >> 1, 41) > 0.992) c = hash(wx, wy, 42) > 0.5 ? "#c9962a" : "#6ad0c0"; // ore & crystal flecks
          // wet moss on floors
          if (openT && y < 4) {
            const md = y + (hash(wx, 0, 11) > 0.6 ? 1 : 0);
            if (md < 3) c = MOSS[md === 0 ? 3 : md === 1 ? 2 : 1];
            if (y === 0 && hash(wx, 1, 12) > 0.8) c = MOSS[4];
            if (b > 0.45 && y < 2 && b - 0.45 > bayer(wx, wy)) c = y === 0 ? "#7a3b7a" : "#523060";
          }
          // the underside of ceilings is wet and dark
          if (openB && TILE - 1 - y < 2 && !(openT && y < 4)) c = TILE - 1 - y === 0 ? "#0b0a12" : ROCK[2];
          buf.set(wx, wy, c);
        }
        if (openT) {
          // pale cave grass and mushrooms poking up; some tufts in front of characters
          for (let x = 0; x < TILE; x++) {
            const wx = x0 + x;
            const hv = hash(wx, 1, 5);
            if (hv > 0.62) { const hgt = 1 + Math.floor(hash(wx, 2, 6) * 2); for (let k = 1; k <= hgt; k++) buf.set(wx, y0 - k, MOSS[k === hgt ? 3 : 2]); }
            if (hash(wx, 3, 9) > 0.9) { const hgt = 2 + Math.floor(hash(wx, 4, 9) * 3); for (let k = 0; k < hgt; k++) fg.set(wx, y0 + 2 - k, MOSS[k > hgt - 2 ? 3 : 2]); }
          }
          if (hash(tx, ty, 77) > 0.82) {
            const mx = x0 + 3 + Math.floor(hash(tx, 1, 78) * 10);
            const cap = L.blightAt(x0) > 0.6 ? C.blight4 : "#6ad0c0";
            buf.set(mx, y0 - 1, C.paper); buf.set(mx, y0 - 2, C.paper);
            for (let k = -1; k <= 1; k++) buf.set(mx + k, y0 - 3, cap);
            buf.set(mx, y0 - 4, cap);
          }
        }
        if (openB) {
          // stalactites
          for (let x = 1; x < TILE - 1; x += 1) {
            const wx = x0 + x;
            if (hash(wx >> 1, ty, 61) < 0.8) continue;
            const len = 2 + Math.floor(hash(wx >> 1, ty, 62) * 7);
            for (let k = 0; k < len; k++) {
              const w = k < len * 0.4 ? 1 : 0;
              buf.set(wx, y0 + TILE + k, k === len - 1 ? ROCK[4] : ROCK[3]);
              if (w && (wx & 1)) buf.set(wx + 1, y0 + TILE + k, ROCK[2]);
            }
            if (hash(wx, ty, 63) > 0.6) buf.set(wx, y0 + TILE + len, "#6ad0c0");
          }
        }
      } else if (t === T.STONE) {
        for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
          const wx = x0 + x, wy = y0 + y;
          const ry = Math.floor(wy / 5), off = (ry & 1) * 5;
          const mortar = wy % 5 === 4 || (wx + off) % 10 === 9;
          let c = mortar ? ROCK[0] : hash(Math.floor((wx + off) / 10), ry, 4) > 0.5 ? ROCK[2] : ROCK[3];
          if (!mortar && wy % 5 === 0) c = ROCK[4];
          if (hash(wx >> 1, wy >> 1, 8) > 0.93 && !mortar) c = "#1a4a52";
          buf.set(wx, wy, c);
        }
      } else if (t === T.PLANK) {
        // scaffold boards on iron brackets
        for (let y = 0; y < 5; y++) for (let x = 0; x < TILE; x++) {
          const wx = x0 + x, wy = y0 + y;
          let c: string = y === 0 ? C.wood3 : y === 4 ? C.wood0 : hash(wx >> 2, wy, 14) > 0.6 ? C.wood2 : C.wood1;
          if (wx % 8 === 0 && y > 0 && y < 4) c = C.wood0;
          buf.set(wx, wy, c);
        }
        if ((tx & 1) === 0) { for (let k = 5; k < 9; k++) buf.set(x0 + 3, y0 + k, C.steel0); buf.set(x0 + 4, y0 + 8, C.steel0); }
      } else if (t === T.THORN) {
        // drowned crystal spikes
        for (let k = 0; k < 5; k++) {
          const sx = x0 + 1 + k * 3 + Math.floor(hash(tx, k, 23) * 2);
          const hgt = 5 + Math.floor(hash(tx, k, 25) * 8);
          for (let i = 0; i < hgt; i++) {
            const y = y0 + 15 - i;
            const w = i < hgt * 0.5 ? 1 : 0;
            const tip = i >= hgt - 2;
            buf.set(sx, y, tip ? "#e9ddf5" : i % 3 === 0 ? "#2e7a78" : "#4aa89a");
            if (w) buf.set(sx + 1, y, "#1a4a52");
          }
        }
      }
    }
  }
  return { tiles: buf.toCanvas(), fg: fg.toCanvas() };
}

/** Spirit ledges, orchard roots and the Watchers' gate change at runtime, so they're drawn live. */
export function drawDynamicTiles(ctx: Ctx, L: Level, camX: number, camY: number, time: number) {
  const tx0 = Math.max(0, Math.floor(camX / TILE)), tx1 = Math.min(L.w - 1, Math.floor((camX + 384) / TILE));
  for (let tx = tx0; tx <= tx1; tx++) for (let ty = 0; ty < L.h; ty++) {
    const t = L.get(tx, ty);
    if (t !== T.SPIRIT && t !== T.ROOT && t !== T.GATE) continue;
    const x0 = tx * TILE - camX, y0 = ty * TILE - camY;
    if (t === T.SPIRIT) {
      if (L.spiritSight) {
        for (let x = 0; x < TILE; x++) {
          const wx = tx * TILE + x;
          const w = Math.sin(time * 3 + wx * 0.3);
          ctx.fillStyle = w > 0.6 ? C.white : "#e9ddf5"; ctx.fillRect(x0 + x, y0, 1, 1);
          ctx.globalAlpha = 0.7; ctx.fillStyle = "#b9a8d0"; ctx.fillRect(x0 + x, y0 + 1, 1, 2);
          ctx.globalAlpha = 0.35; ctx.fillStyle = "#7a6a98"; ctx.fillRect(x0 + x, y0 + 3, 1, 2 + (hash(wx, 0, 3) > 0.5 ? 2 : 0));
          ctx.globalAlpha = 1;
        }
      } else {
        // a glimmer, now and then, of something that isn't quite there
        const k = (time * 0.7 + tx * 0.13) % 3;
        if (k < 0.25) {
          ctx.globalAlpha = 0.25 * (1 - k / 0.25);
          for (let x = 0; x < TILE; x += 2) { ctx.fillStyle = "#e9ddf5"; ctx.fillRect(x0 + x, y0, 1, 1); }
          ctx.globalAlpha = 1;
        }
      }
    } else if (t === T.ROOT) {
      for (let x = 0; x < TILE; x++) for (let y = 0; y < TILE; y++) {
        const wx = tx * TILE + x, wy = ty * TILE + y;
        const strand = Math.floor((x + Math.sin(wy * 0.35 + x) * 2.2 + 16) / 3.2);
        const n = hash(strand, wy >> 2, 51);
        let c = n > 0.66 ? "#6a3a4a" : n > 0.33 ? "#4a2a3a" : "#351c2a";
        if ((x + Math.round(Math.sin(wy * 0.35 + x) * 2.2)) % 3 === 0) c = "#1c1018";
        if (hash(wx, wy, 52) > 0.985) c = C.blight4;
        ctx.fillStyle = c; ctx.fillRect(x0 + x, y0 + y, 1, 1);
      }
    } else {
      ctx.fillStyle = C.ink; ctx.fillRect(x0 + 2, y0, 12, TILE);
      for (let x = 3; x < 14; x += 3) { ctx.fillStyle = C.steel0; ctx.fillRect(x0 + x, y0, 2, TILE); ctx.fillStyle = C.steel1; ctx.fillRect(x0 + x, y0, 1, TILE); }
      ctx.fillStyle = C.steel1; ctx.fillRect(x0 + 2, y0 + 6, 12, 2);
      if (ty === (L.gate?.bottom ?? -1)) for (let x = 3; x < 14; x += 3) { ctx.fillStyle = C.steel2; ctx.fillRect(x0 + x, y0 + 14, 1, 2); }
    }
  }
}

const WATER = { deep: "#0b1a22", body: "#11303a", mid: "#1a4a52", surf: "#2e7a78", hi: "#6ad0c0", foam: "#b8f0e0" };

/** Animated bog surface (or flood water, in the Mines), drawn every frame for visible tiles. */
export function drawBog(ctx: Ctx, L: Level, camX: number, camY: number, W: number, time: number) {
  if (L.theme === "mines") { drawWater(ctx, L, camX, camY, W, time); return; }
  const tx0 = Math.max(0, Math.floor(camX / TILE)), tx1 = Math.min(L.w - 1, Math.floor((camX + W) / TILE));
  for (let tx = tx0; tx <= tx1; tx++) {
    for (let ty = 0; ty < L.h; ty++) {
      if (L.get(tx, ty) !== T.BOG) continue;
      const surface = L.get(tx, ty - 1) !== T.BOG;
      const x0 = tx * TILE - camX, y0 = ty * TILE - camY;
      ctx.fillStyle = surface ? C.blight1 : C.blight0;
      ctx.fillRect(x0, y0 + (surface ? 3 : 0), TILE, TILE - (surface ? 3 : 0));
      if (!surface) continue;
      for (let x = 0; x < TILE; x++) {
        const wx = tx * TILE + x;
        const wave = Math.round(Math.sin(time * 2.2 + wx * 0.28) * 1.2 + Math.sin(time * 1.3 + wx * 0.11));
        const sy = y0 + 3 + wave;
        ctx.fillStyle = C.blight4; ctx.fillRect(x0 + x, sy, 1, 1);
        ctx.fillStyle = C.blight3; ctx.fillRect(x0 + x, sy + 1, 1, 2);
        ctx.fillStyle = C.blight2; ctx.fillRect(x0 + x, sy + 3, 1, 12 - (sy - y0));
        if (hash(wx, Math.floor(time * 3), 40) > 0.97) { ctx.fillStyle = C.blight5; ctx.fillRect(x0 + x, sy, 1, 1); }
      }
      // slow sheen
      const sheen = ((time * 18 + tx * 37) % 40) - 12;
      if (sheen >= 0 && sheen < TILE) { ctx.fillStyle = C.blight5; ctx.fillRect(x0 + sheen, y0 + 6, 3, 1); }
    }
  }
}

function drawWater(ctx: Ctx, L: Level, camX: number, camY: number, W: number, time: number) {
  const tx0 = Math.max(0, Math.floor(camX / TILE)), tx1 = Math.min(L.w - 1, Math.floor((camX + W) / TILE));
  for (let tx = tx0; tx <= tx1; tx++) {
    for (let ty = 0; ty < L.h; ty++) {
      if (L.get(tx, ty) !== T.BOG) continue;
      const surface = L.get(tx, ty - 1) !== T.BOG;
      const x0 = tx * TILE - camX, y0 = ty * TILE - camY;
      ctx.fillStyle = surface ? WATER.body : WATER.deep;
      ctx.fillRect(x0, y0 + (surface ? 3 : 0), TILE, TILE - (surface ? 3 : 0));
      if (!surface) continue;
      for (let x = 0; x < TILE; x++) {
        const wx = tx * TILE + x;
        const wave = Math.round(Math.sin(time * 1.8 + wx * 0.22) * 1 + Math.sin(time * 1.1 + wx * 0.07) * 0.8);
        const sy = y0 + 3 + wave;
        ctx.fillStyle = WATER.hi; ctx.fillRect(x0 + x, sy, 1, 1);
        ctx.fillStyle = WATER.surf; ctx.fillRect(x0 + x, sy + 1, 1, 1);
        ctx.fillStyle = WATER.mid; ctx.fillRect(x0 + x, sy + 2, 1, 4);
        if (hash(wx, Math.floor(time * 3), 40) > 0.97) { ctx.fillStyle = WATER.foam; ctx.fillRect(x0 + x, sy, 1, 1); }
        // drowned things glint below
        if (hash(wx, ty, 41) > 0.985 && Math.sin(time * 2 + wx) > 0) { ctx.fillStyle = "#c9962a"; ctx.fillRect(x0 + x, y0 + 11, 1, 1); }
      }
      const sheen = ((time * 14 + tx * 37) % 44) - 14;
      if (sheen >= 0 && sheen < TILE) { ctx.fillStyle = WATER.foam; ctx.fillRect(x0 + sheen, y0 + 7, 3, 1); }
    }
  }
}

/** Shimmering fog wall at the boss arena entrance. */
export function drawFog(ctx: Ctx, L: Level, camX: number, camY: number, time: number) {
  const a = L.arena;
  if (L.get(a.fogCol, a.fogBottom) !== T.FOG) return;
  const x0 = a.fogCol * TILE - camX;
  if (x0 < -32 || x0 > 420) return;
  const yTop = Math.max(0, a.fogTop * TILE - camY), yBot = (a.fogBottom + 1) * TILE - camY;
  for (let y = Math.floor(yTop); y < yBot; y++) {
    for (let x = -2; x < TILE + 2; x++) {
      const wy = y + camY;
      const edge = Math.min(x + 2, TILE + 1 - x) / 6;
      const n = Math.sin(wy * 0.09 + time * 1.7 + x * 0.3) * 0.5 + Math.sin(wy * 0.23 - time * 2.9) * 0.3 + 0.5;
      const v = clamp(n * edge, 0, 1);
      if (v > bayer(x + Math.floor(time * 20), wy)) {
        ctx.fillStyle = v > 0.75 ? "#e9ddf5" : v > 0.45 ? "#b9a8d0" : "#7a6a98";
        ctx.fillRect(x0 + x, y, 1, 1);
      }
    }
  }
}
