import { H, W } from "../core/constants";
import { bayer } from "../core/math";
import { makeCanvas, type Ctx } from "./canvas";

/**
 * Pixel lighting: a darkness layer with stepped, dithered light "holes" punched out,
 * plus an additive coloured glow pass. Lights are quantised into bands so they read
 * as pixel art rather than smooth gradients.
 */
const RADII = [6, 8, 12, 16, 22, 30, 40, 54, 72, 96, 128];

export class Lighting {
  private canvas: HTMLCanvasElement;
  private ctx: Ctx;
  private masks = new Map<number, HTMLCanvasElement>();
  private tints = new Map<string, HTMLCanvasElement>();
  private lights: { x: number; y: number; r: number; color: string; a: number }[] = [];

  constructor() {
    [this.canvas, this.ctx] = makeCanvas(W, H);
  }

  private mask(r: number) {
    let m = this.masks.get(r);
    if (m) return m;
    const s = r * 2;
    const [c, ctx] = makeCanvas(s, s);
    const img = ctx.createImageData(s, s);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const d = Math.hypot(x + 0.5 - r, y + 0.5 - r) / r;
      if (d >= 1) continue;
      const i = 1 - d;
      const q = Math.min(4, Math.floor(i * i * 5 + bayer(x, y) * 0.9)) / 4;
      const k = (y * s + x) * 4;
      img.data[k] = img.data[k + 1] = img.data[k + 2] = 255;
      img.data[k + 3] = Math.round(q * 255);
    }
    ctx.putImageData(img, 0, 0);
    this.masks.set(r, (m = c));
    return m;
  }

  private tint(r: number, color: string) {
    const key = r + color;
    let t = this.tints.get(key);
    if (t) return t;
    const [c, ctx] = makeCanvas(r * 2, r * 2);
    ctx.drawImage(this.mask(r), 0, 0);
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, r * 2, r * 2);
    this.tints.set(key, (t = c));
    return t;
  }

  static snap(r: number) {
    let best = RADII[0];
    for (const v of RADII) if (Math.abs(v - r) < Math.abs(best - r)) best = v;
    return best;
  }

  /** Add a light in screen coordinates. */
  add(x: number, y: number, r: number, color: string, a = 1) {
    if (x < -r || y < -r || x > W + r || y > H + r) return;
    this.lights.push({ x: Math.round(x), y: Math.round(y), r: Lighting.snap(r), color, a });
  }

  render(dst: Ctx, darkness: number, darkColor: string, glow = 0.32) {
    const ctx = this.ctx;
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = darkColor;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "destination-out";
    for (const l of this.lights) {
      ctx.globalAlpha = Math.min(1, l.a);
      ctx.drawImage(this.mask(l.r), l.x - l.r, l.y - l.r);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    dst.globalAlpha = darkness;
    dst.drawImage(this.canvas, 0, 0);
    dst.globalAlpha = 1;
    dst.globalCompositeOperation = "lighter";
    for (const l of this.lights) {
      dst.globalAlpha = Math.min(1, l.a) * glow;
      dst.drawImage(this.tint(l.r, l.color), l.x - l.r, l.y - l.r);
    }
    dst.globalCompositeOperation = "source-over";
    dst.globalAlpha = 1;
    this.lights.length = 0;
  }
}

/** Dithered vignette, pre-rendered. */
export function makeVignette(color: string) {
  const [c, ctx] = makeCanvas(W, H);
  ctx.fillStyle = color;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = (x - W / 2) / (W / 2), dy = (y - H / 2) / (H / 2);
    const d = Math.sqrt(dx * dx * 0.8 + dy * dy * 1.1);
    const v = (d - 0.72) * 1.6;
    if (v > bayer(x, y)) ctx.fillRect(x, y, 1, 1);
  }
  return c;
}
