import { H, W } from "../core/constants";
import { bayer, clamp, hash, noise1 } from "../core/math";
import { RNG } from "../core/rng";
import type { Level } from "../world/level";
import { line, makeCanvas, type Ctx } from "./canvas";
import { C } from "./palette";

/**
 * The Drowned Mines' three parallax layers: a far cavern wall veined with drowned crystal
 * and threads of falling water, mid-distance pillars and old mine scaffolds with a few
 * lamps still burning, and a near curtain of stalactites. The dark deepens toward the shaft.
 */

const EXTRA_H = 60;
const LH = H + EXTRA_H;

interface Layer { canvas: HTMLCanvasElement; f: number; fy: number }

export class CaveBackground {
  private sky: HTMLCanvasElement;
  private layers: Layer[] = [];
  private falls: { x: number; f: number; h: number; y: number }[] = [];
  private motes: { x: number; y: number; p: number }[] = [];

  constructor(private L: Level) {
    this.sky = backdrop();
    const lw = (f: number) => Math.ceil(W + (L.pxW - W) * f) + 8;
    this.layers.push({ canvas: this.far(lw(0.1)), f: 0.1, fy: 0.1 });
    this.layers.push({ canvas: this.mid(lw(0.28)), f: 0.28, fy: 0.25 });
    this.layers.push({ canvas: this.near(lw(0.5)), f: 0.5, fy: 0.45 });
    const g = new RNG(404);
    for (let i = 0; i < 9; i++) this.falls.push({ x: g.int(0, lw(0.1)), f: 0.1, h: g.int(60, 150), y: g.int(20, 60) });
    for (let i = 0; i < 60; i++) this.motes.push({ x: g.int(0, W), y: g.int(0, H), p: g.range(0, 6.28) });
  }

  private far(w: number) {
    const [c, ctx] = makeCanvas(w, LH);
    const g = new RNG(21);
    for (let x = 0; x < w; x++) {
      // the far wall: a ragged roof and a ragged floor with a void between
      const roof = 40 + noise1(x / 40, 3) * 26 + noise1(x / 11, 4) * 6;
      const floor = 190 + noise1(x / 50, 5) * 20 + noise1(x / 13, 6) * 5;
      for (let y = 0; y < LH; y++) {
        let col: string | null = null;
        if (y < roof) col = (roof - y) / 30 > bayer(x, y) ? "#0d0c14" : "#16141f";
        else if (y > floor) col = (y - floor) / 40 > bayer(x, y) ? "#0d0c14" : "#16141f";
        else {
          const v = hash(x >> 2, y >> 2, 7);
          col = v > 0.93 ? "#15131d" : "#100f18";
        }
        if (y > roof - 2 && y < roof && hash(x, 0, 8) > 0.3) col = "#232031";
        ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1);
      }
    }
    // crystal veins glowing in the far wall
    for (let i = 0; i < w / 14; i++) {
      let x = g.int(0, w), y = g.int(50, 200);
      const len = g.int(4, 14);
      for (let k = 0; k < len; k++) {
        ctx.fillStyle = k % 3 === 0 ? "#6ad0c0" : "#2e7a78";
        ctx.fillRect(x, y, 1, 1);
        x += g.int(-1, 1); y += g.chance(0.6) ? 1 : 0;
      }
    }
    return c;
  }

  private mid(w: number) {
    const [c, ctx] = makeCanvas(w, LH);
    const g = new RNG(22);
    const dark = "#0a0910", rim = "#1d1a28";
    // rock pillars from roof to floor
    for (let x = g.int(0, 40); x < w; x += g.int(50, 110)) {
      const pw = g.int(10, 22);
      for (let y = 0; y < LH; y++) {
        const wob = Math.round(noise1(y / 20, x) * 4 + (y > 100 && y < 150 ? -3 : 0));
        ctx.fillStyle = dark; ctx.fillRect(x + wob, y, pw, 1);
        ctx.fillStyle = rim; ctx.fillRect(x + wob, y, 1, 1);
      }
    }
    // old scaffolds and a few lamps left burning
    for (let x = g.int(20, 60); x < w; x += g.int(70, 140)) {
      const top = g.int(90, 130), bot = 230, sw = g.int(24, 40);
      for (const px of [x, x + sw]) line(ctx, px, top, px, bot, "#15121c", 2);
      for (let y = top; y < bot; y += 18) { line(ctx, x, y, x + sw, y, "#15121c"); line(ctx, x, y, x + sw, y + 18, "#110e18"); }
      if (g.chance(0.6)) { ctx.fillStyle = C.fire1; ctx.fillRect(x + sw / 2, top - 4, 2, 2); ctx.fillStyle = C.fire3; ctx.fillRect(x + sw / 2, top - 4, 1, 1); }
    }
    // the flooded floor far below catches some light
    for (let x = 0; x < w; x++) {
      const y = 214 + Math.round(noise1(x / 30, 9) * 3);
      ctx.fillStyle = "#11303a"; ctx.fillRect(x, y, 1, LH - y);
      if (hash(x, 0, 10) > 0.8) { ctx.fillStyle = "#1a4a52"; ctx.fillRect(x, y, 1, 1); }
    }
    return c;
  }

  private near(w: number) {
    const [c, ctx] = makeCanvas(w, LH);
    const g = new RNG(23);
    const col = "#07060c", rim = "#15131d";
    // stalactite curtain from the roof
    for (let x = 0; x < w; x++) {
      const base = 18 + Math.round(noise1(x / 25, 31) * 10);
      ctx.fillStyle = col; ctx.fillRect(x, 0, 1, base);
    }
    for (let i = 0; i < w / 7; i++) {
      const x = g.int(0, w), len = g.int(8, 46), hw = g.int(2, 5);
      const base = 18 + Math.round(noise1(x / 25, 31) * 10);
      for (let k = 0; k < len; k++) {
        const ww = Math.max(0, Math.round(hw * (1 - k / len)));
        ctx.fillStyle = col; ctx.fillRect(x - ww, base + k, ww * 2 + 1, 1);
        ctx.fillStyle = rim; ctx.fillRect(x - ww, base + k, 1, 1);
      }
      if (g.chance(0.2)) { ctx.fillStyle = "#2e7a78"; ctx.fillRect(x, base + len, 1, 1); }
    }
    // rubble mounds along the bottom
    for (let x = 0; x < w; x++) {
      const y = 236 + Math.round(noise1(x / 18, 33) * 10 + noise1(x / 6, 34) * 3);
      ctx.fillStyle = col; ctx.fillRect(x, y, 1, LH - y);
      ctx.fillStyle = rim; ctx.fillRect(x, y, 1, 1);
    }
    return c;
  }

  draw(ctx: Ctx, camX: number, camY: number, time: number) {
    const L = this.L;
    ctx.drawImage(this.sky, 0, 0);
    const off = EXTRA_H * 0.5;
    const vy = camY - (L.pxH - H);
    for (let i = 0; i < this.layers.length; i++) {
      const l = this.layers[i];
      const y = Math.round(-off - vy * l.fy);
      ctx.drawImage(l.canvas, -Math.round(camX * l.f), y);
      if (i === 0) {
        // thin falls of water in the far wall
        for (const f of this.falls) {
          const x = Math.round(f.x - camX * f.f);
          if (x < -2 || x > W + 2) continue;
          for (let yy = 0; yy < f.h; yy++) {
            const yyy = Math.round(y + f.y + yy + off);
            if ((yy + Math.floor(time * 40)) % 5 === 0) continue;
            ctx.fillStyle = yy % 7 === 0 ? "#6ad0c0" : "#1a4a52";
            ctx.fillRect(x, yyy, 1, 1);
          }
        }
      }
    }
    // drifting motes of drowned light
    for (const m of this.motes) {
      const x = ((m.x - camX * 0.35 + Math.sin(time * 0.3 + m.p) * 10) % W + W) % W;
      const yy = ((m.y - time * 3 - camY * 0.2) % H + H) % H;
      const a = 0.5 + 0.5 * Math.sin(time * 2 + m.p);
      if (a < 0.4) continue;
      ctx.globalAlpha = a * 0.6;
      ctx.fillStyle = m.p > 4 ? "#b8f0e0" : "#6ad0c0";
      ctx.fillRect(Math.round(x), Math.round(yy), 1, 1);
    }
    ctx.globalAlpha = 1;
  }
}

function backdrop() {
  const [c, ctx] = makeCanvas(W, H);
  const cols = ["#06050b", "#09080f", "#0c0b14", "#0f0e18", "#0c1418"];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = (y / H) * (cols.length - 1);
    const i = clamp(Math.floor(t + bayer(x, y) - 0.5), 0, cols.length - 1);
    ctx.fillStyle = cols[i]; ctx.fillRect(x, y, 1, 1);
  }
  return c;
}
