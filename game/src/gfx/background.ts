import { H, W } from "../core/constants";
import { bayer, clamp, hash, noise1 } from "../core/math";
import { RNG } from "../core/rng";
import type { Level } from "../world/level";
import { disc, line, makeCanvas, type Ctx } from "./canvas";
import { C } from "./palette";

/**
 * Three parallax layers (far mountains, mid hills with village silhouettes, near treeline)
 * over a dithered sky, plus animated fog bands. Warm dusk skies in the village crossfade
 * to a bruised Rot sky toward the mill.
 */

const EXTRA_H = 60; // layers are taller than the screen for vertical parallax
const LH = H + EXTRA_H;

interface Layer { canvas: HTMLCanvasElement; f: number; fy: number }

export class Background {
  private skyWarm: HTMLCanvasElement;
  private skyRot: HTMLCanvasElement;
  private layers: Layer[] = [];
  private fogWarm: HTMLCanvasElement;
  private fogRot: HTMLCanvasElement;
  private stars: { x: number; y: number; p: number; b: number }[] = [];
  private moon: HTMLCanvasElement;
  private clouds: HTMLCanvasElement;

  constructor(private L: Level) {
    this.skyWarm = sky([C.sky0, C.sky1, C.sky2, C.sky3, C.sky4, C.sky5]);
    this.skyRot = sky([C.rot0, C.rot1, C.rot2, C.rot3, C.rot4, C.rot5]);
    const g = new RNG(99);
    for (let i = 0; i < 90; i++) this.stars.push({ x: g.int(0, W), y: g.int(0, 110), p: g.range(0, 6.28), b: g.next() });
    this.moon = moon();
    this.clouds = clouds();
    const lw = (f: number) => Math.ceil(W + (L.pxW - W) * f) + 8;
    this.layers.push({ canvas: this.far(lw(0.1)), f: 0.1, fy: 0.1 });
    this.layers.push({ canvas: this.mid(lw(0.28)), f: 0.28, fy: 0.25 });
    this.layers.push({ canvas: this.near(lw(0.5)), f: 0.5, fy: 0.45 });
    this.fogWarm = fogStrip("#8a6a8a", "#b98a8a");
    this.fogRot = fogStrip("#4a3a5a", "#6a5a7a");
  }

  /** Where a level x appears on a layer when the camera is centred on it. */
  private toLayer(levelX: number, f: number) { return (levelX - W / 2) * f + W / 2; }

  // ------------------------------------------------------------------ far mountains
  private far(w: number) {
    const [c, ctx] = makeCanvas(w, LH);
    for (let x = 0; x < w; x++) {
      const ridge = 118 + noise1(x / 60, 1) * 34 + noise1(x / 17, 2) * 10 - Math.abs(Math.sin(x / 140)) * 16;
      for (let y = Math.floor(ridge); y < LH; y++) {
        const depth = (y - ridge) / 50;
        let col = depth < 0.04 ? "#3a3058" : "#2a2342";
        if (depth > 0.5 && depth - 0.5 > bayer(x, y)) col = "#241e38";
        if (depth < 0.05 && hash(x, 0, 3) > 0.5) col = "#4a3a66"; // moonlit rim
        ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1);
      }
    }
    // distant castle ruin silhouette far to the east
    const rx = Math.floor(this.toLayer(this.L.pxW - 300, 0.1));
    ctx.fillStyle = "#2a2342";
    ctx.fillRect(rx, 92, 6, 30); ctx.fillRect(rx + 10, 100, 12, 22); ctx.fillRect(rx + 26, 86, 5, 36);
    for (let i = 0; i < 3; i++) ctx.fillRect(rx + 10 + i * 5, 97, 3, 3);
    return c;
  }

  // ------------------------------------------------------------------ mid hills
  private mid(w: number) {
    const [c, ctx] = makeCanvas(w, LH);
    const L = this.L;
    const g = new RNG(7);
    const ridgeAt = (x: number) => 150 + noise1(x / 90, 11) * 20 + noise1(x / 30, 12) * 6;
    for (let x = 0; x < w; x++) {
      const ridge = ridgeAt(x);
      for (let y = Math.floor(ridge); y < LH; y++) {
        const d = (y - ridge) / 60;
        let col = d < 0.03 ? "#2e2544" : "#1f1a30";
        if (d > 0.4 && d - 0.4 > bayer(x, y) * 0.8) col = "#1a1628";
        ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1);
      }
    }
    const blightAtLayer = (lx: number) => L.blightAt((lx - W / 2) / 0.28 + W / 2);
    // silhouettes: cottages with lit windows early, bare trees later
    for (let x = 10; x < w - 20; x += g.int(14, 30)) {
      const b = blightAtLayer(x);
      const y = Math.floor(ridgeAt(x + 5)) + 1;
      if (b < 0.15 && g.next() < 0.7) {
        const hw = g.int(9, 14), hh = g.int(7, 10);
        ctx.fillStyle = "#1a1528";
        ctx.fillRect(x, y - hh, hw, hh + 2);
        for (let k = 0; k < 6; k++) ctx.fillRect(x - 1 + k, y - hh - k, hw + 2 - k * 2, 1);
        if (g.next() < 0.8) { ctx.fillStyle = g.next() < 0.5 ? C.fire2 : C.fire1; ctx.fillRect(x + 3, y - hh + 3, 2, 2); }
        if (g.next() < 0.5) { ctx.fillStyle = C.fire1; ctx.fillRect(x + hw - 5, y - hh + 4, 1, 2); }
      } else {
        const th = g.int(10, 24) + Math.round(b * 10);
        ctx.fillStyle = "#1a1528";
        line(ctx, x, y + 2, x, y - th, "#1a1528", 2);
        if (b < 0.4) disc(ctx, x + 1, y - th, g.int(5, 8), g.int(4, 7), "#1d1a2e");
        else {
          for (let k = 0; k < 4; k++) line(ctx, x, y - th + k * 4, x + g.int(-7, 7), y - th + k * 4 - g.int(3, 7), "#1a1528");
          if (b > 0.6 && g.next() < 0.5) { ctx.fillStyle = C.blight3; ctx.fillRect(x + g.int(-4, 4), y - th + g.int(0, 8), 1, 1); }
        }
      }
    }
    // the mill on the horizon
    const mx = Math.floor(this.toLayer(L.arena.bossX, 0.28)) + 40;
    const my = Math.floor(ridgeAt(mx)) + 2;
    for (let yy = 0; yy < 46; yy++) { const hw = Math.round(9 - yy * 0.12); ctx.fillStyle = "#151222"; ctx.fillRect(mx - hw, my - yy, hw * 2, 1); }
    ctx.fillStyle = C.blight4; ctx.fillRect(mx - 1, my - 36, 2, 3);
    for (const a of [0.5, 2.1, 3.7, 5.2]) line(ctx, mx, my - 46, mx + Math.cos(a) * 20, my - 46 + Math.sin(a) * 20, "#151222");
    return c;
  }

  // ------------------------------------------------------------------ near treeline
  private near(w: number) {
    const [c, ctx] = makeCanvas(w, LH);
    const L = this.L;
    const g = new RNG(31);
    const blightAtLayer = (lx: number) => L.blightAt((lx - W / 2) / 0.5 + W / 2);
    const base = (x: number) => 196 + noise1(x / 50, 21) * 12;
    // canopy mass
    const [mc, mctx] = makeCanvas(w, LH);
    mctx.fillStyle = "#fff";
    for (let x = 0; x < w; x += g.int(10, 22)) {
      const b = blightAtLayer(x);
      const y = base(x);
      if (b < 0.45) {
        const r = g.int(14, 26);
        disc(mctx, x, y - r * 1.4, r, r * 0.9, "#fff");
        mctx.fillRect(x - 2, y - r, 4, r + 20);
      } else {
        const th = g.int(30, 60);
        line(mctx, x, y + 10, x + g.int(-3, 3), y - th, "#fff", 3);
        for (let k = 0; k < 5; k++) {
          const by = y - th * (0.4 + k * 0.12);
          line(mctx, x, by, x + g.int(-16, 16), by - g.int(6, 14), "#fff", k < 2 ? 2 : 1);
        }
      }
    }
    for (let x = 0; x < w; x++) for (let y = Math.floor(base(x)) - 2; y < LH; y++) mctx.fillRect(x, y, 1, 1);
    const data = mctx.getImageData(0, 0, w, LH).data;
    for (let y = 0; y < LH; y++) for (let x = 0; x < w; x++) {
      if (!data[(y * w + x) * 4 + 3]) continue;
      const above = y > 0 && data[((y - 1) * w + x) * 4 + 3];
      const b = blightAtLayer(x);
      let col = b > bayer(x, y) ? "#150f1c" : "#101420";
      if (!above) col = b > 0.5 ? "#2a1a33" : "#1c2530"; // rim
      else if (hash(x >> 1, y >> 1, 5) > 0.93 && y < base(x)) col = b > 0.5 ? "#1f1426" : "#152029";
      ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1);
    }
    // glowing rot pustules in the far treeline
    for (let i = 0; i < 70; i++) {
      const x = g.int(0, w);
      if (blightAtLayer(x) < 0.5) continue;
      const y = Math.floor(base(x)) - g.int(4, 50);
      if (!data[(y * w + x) * 4 + 3]) continue;
      ctx.fillStyle = C.blight3; ctx.fillRect(x, y, 2, 2);
      ctx.fillStyle = C.blight5; ctx.fillRect(x, y, 1, 1);
    }
    void mc;
    return c;
  }

  draw(ctx: Ctx, camX: number, camY: number, time: number) {
    const b = this.L.blightAt(camX + W / 2);
    const vy = clamp(camY / Math.max(1, this.L.pxH - H), 0, 1);
    ctx.drawImage(this.skyWarm, 0, 0);
    if (b > 0) { ctx.globalAlpha = b; ctx.drawImage(this.skyRot, 0, 0); ctx.globalAlpha = 1; }

    // stars (fewer and dimmer toward the warm horizon)
    for (const s of this.stars) {
      const tw = Math.sin(time * (1 + s.b * 2) + s.p);
      if (tw < -0.6) continue;
      ctx.fillStyle = s.b > 0.85 && tw > 0.5 ? C.white : s.b > 0.5 ? "#b8a8d8" : "#6a5a8a";
      ctx.fillRect(s.x, s.y, 1, 1);
    }
    // moon
    const mx = Math.round(292 - camX * 0.01), my = Math.round(26 + vy * 6);
    ctx.drawImage(this.moon, mx - 20, my - 20);
    if (b > 0.3) {
      ctx.globalAlpha = (b - 0.3) * 0.6;
      ctx.fillStyle = C.blight3;
      for (let a = 0; a < 64; a++) { const an = (a / 64) * Math.PI * 2; ctx.fillRect(Math.round(mx + Math.cos(an) * 19), Math.round(my + Math.sin(an) * 19), 1, 1); }
      ctx.globalAlpha = 1;
    }
    // clouds drift
    const cw = this.clouds.width;
    const cx = -((camX * 0.04 + time * 3) % cw);
    ctx.globalAlpha = 0.85 - b * 0.35;
    ctx.drawImage(this.clouds, Math.round(cx), 0);
    ctx.drawImage(this.clouds, Math.round(cx + cw), 0);
    ctx.globalAlpha = 1;

    const off = EXTRA_H * 0.5;
    for (let i = 0; i < this.layers.length; i++) {
      const l = this.layers[i];
      const y = Math.round(-off - (camY - (this.L.pxH - H)) * l.fy);
      ctx.drawImage(l.canvas, -Math.round(camX * l.f), y);
      if (i === 1) this.drawFog(ctx, camX, time, 104 - (camY - (this.L.pxH - H)) * 0.3, 0.28, 0.35, b);
    }
    this.drawFog(ctx, camX, time * 1.6, 124 - (camY - (this.L.pxH - H)) * 0.5, 0.55, 0.28 + b * 0.2, b);
  }

  private drawFog(ctx: Ctx, camX: number, time: number, y: number, f: number, a: number, b: number) {
    const fw = this.fogWarm.width;
    const x = -((camX * f + time * 6) % fw);
    ctx.globalAlpha = a * (1 - b);
    if (1 - b > 0.01) { ctx.drawImage(this.fogWarm, Math.round(x), Math.round(y)); ctx.drawImage(this.fogWarm, Math.round(x + fw), Math.round(y)); }
    ctx.globalAlpha = a * b;
    if (b > 0.01) { ctx.drawImage(this.fogRot, Math.round(x), Math.round(y)); ctx.drawImage(this.fogRot, Math.round(x + fw), Math.round(y)); }
    ctx.globalAlpha = 1;
  }
}

function sky(cols: string[]) {
  const [c, ctx] = makeCanvas(W, H);
  for (let y = 0; y < H; y++) {
    const t = Math.pow(y / 170, 1.35) * (cols.length - 1);
    for (let x = 0; x < W; x++) {
      const i = clamp(Math.floor(t + bayer(x, y) - 0.5), 0, cols.length - 1);
      ctx.fillStyle = cols[i];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

function moon() {
  const [c, ctx] = makeCanvas(40, 40);
  // halo
  for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) {
    const d = Math.hypot(x - 20, y - 20);
    if (d > 13 && d < 19 && (19 - d) / 10 > bayer(x, y) + 0.2) { ctx.fillStyle = "#6a5a7a"; ctx.fillRect(x, y, 1, 1); }
  }
  disc(ctx, 20, 20, 12, 12, C.moon);
  for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) {
    const d = Math.hypot(x - 20, y - 20);
    if (d > 12.5) continue;
    const shade = (x - 20 + (y - 20) * 0.4) / 12;
    if (shade > 0.35 + bayer(x, y) * 0.5) { ctx.fillStyle = C.moonShade; ctx.fillRect(x, y, 1, 1); }
  }
  for (const [x, y, r] of [[16, 16, 2], [23, 22, 3], [18, 25, 1], [25, 15, 1]]) disc(ctx, x, y, r, r, C.moonShade);
  return c;
}

function clouds() {
  const w = 640;
  const [c, ctx] = makeCanvas(w, 120);
  const g = new RNG(5);
  for (let i = 0; i < 9; i++) {
    const cx = g.int(0, w), cy = g.int(30, 100), len = g.int(50, 130), th = g.int(3, 7);
    for (let x = -len / 2; x < len / 2; x++) {
      const edge = 1 - Math.abs(x) / (len / 2);
      const h = Math.max(1, Math.round(th * Math.sqrt(edge)));
      for (let y = 0; y < h; y++) {
        const X = ((Math.round(cx + x) % w) + w) % w, Y = cy - y;
        if (edge * 1.2 < bayer(X, Y)) continue;
        ctx.fillStyle = y === h - 1 ? "#5a3a5a" : y === 0 ? "#2a1f3a" : "#3d2a4a";
        ctx.fillRect(X, Y, 1, 1);
      }
    }
  }
  return c;
}

function fogStrip(a: string, b: string) {
  const w = 480, h = 40;
  const [c, ctx] = makeCanvas(w, h);
  const TAU = Math.PI * 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    // periodic in x so the strip tiles seamlessly
    const u = (x / w) * TAU;
    const n = 0.5 + 0.28 * Math.sin(u * 3 + y * 0.08) + 0.18 * Math.sin(u * 7 + 1.3 - y * 0.05) + 0.12 * Math.sin(u * 13 + 4.1);
    const vy = 1 - Math.abs(y - h / 2) / (h / 2);
    const v = n * vy * 1.3;
    if (v > bayer(x, y) + 0.25) { ctx.fillStyle = v > 0.85 ? b : a; ctx.fillRect(x, y, 1, 1); }
  }
  return c;
}
