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

/** Animated bog surface, drawn every frame for visible bog tiles. */
export function drawBog(ctx: Ctx, L: Level, camX: number, camY: number, W: number, time: number) {
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
