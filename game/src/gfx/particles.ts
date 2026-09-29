import { rng } from "../core/rng";
import type { Ctx } from "./canvas";
import type { Lighting } from "./lighting";
import { C } from "./palette";

export interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; max: number;
  color: string; color2?: string;
  size: number; g: number; drag: number;
  light?: number; lightColor?: string;
  wobble?: number; seed: number;
  front?: boolean;
}

type Opts = Partial<Omit<Particle, "x" | "y">>;

export class Particles {
  list: Particle[] = [];

  spawn(x: number, y: number, o: Opts = {}) {
    if (this.list.length > 900) this.list.shift();
    const max = o.max ?? o.life ?? 0.6;
    this.list.push({
      x, y, vx: o.vx ?? 0, vy: o.vy ?? 0, life: max, max, color: o.color ?? C.white, color2: o.color2,
      size: o.size ?? 1, g: o.g ?? 0, drag: o.drag ?? 0, light: o.light, lightColor: o.lightColor,
      wobble: o.wobble, seed: rng.next() * 10, front: o.front,
    });
  }

  burst(x: number, y: number, n: number, o: Opts & { speed?: number; spread?: number; dir?: number; colors?: string[] } = {}) {
    const sp = o.speed ?? 60, spread = o.spread ?? Math.PI * 2, dir = o.dir ?? -Math.PI / 2;
    for (let i = 0; i < n; i++) {
      const a = dir + (rng.next() - 0.5) * spread;
      const s = sp * (0.35 + rng.next() * 0.65);
      this.spawn(x, y, {
        ...o, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        color: o.colors ? rng.pick(o.colors) : o.color, max: (o.max ?? 0.5) * (0.6 + rng.next() * 0.6),
      });
    }
  }

  update(dt: number) {
    for (const p of this.list) {
      p.life -= dt;
      p.vy += p.g * dt;
      if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; }
      p.x += p.vx * dt + (p.wobble ? Math.sin(p.life * 4 + p.seed) * p.wobble * dt : 0);
      p.y += p.vy * dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
  }

  /** Register light from glowing particles. Call before the lighting pass. */
  lights(lighting: Lighting, camX: number, camY: number) {
    for (const p of this.list) {
      if (!p.light) continue;
      const t = p.life / p.max;
      lighting.add(p.x - camX, p.y - camY, p.light, p.lightColor ?? p.color, Math.min(1, t * 1.5) * 0.8);
    }
  }

  /** "back" draws unlit particles (under the lighting); "glow" draws emissive ones on top. */
  draw(ctx: Ctx, camX: number, camY: number, pass: "back" | "glow") {
    for (const p of this.list) {
      const glow = !!p.light || !!p.front;
      if ((pass === "glow") !== glow) continue;
      const t = p.life / p.max;
      const x = Math.round(p.x - camX), y = Math.round(p.y - camY);
      if (x < -8 || y < -8 || x > 400 || y > 230) continue;
      ctx.fillStyle = p.color2 && t < 0.5 ? p.color2 : p.color;
      const s = p.size > 1 && t < 0.4 ? p.size - 1 : p.size;
      ctx.fillRect(x, y, s, s);
    }
  }

  // ---------- presets ----------
  dust(x: number, y: number, n = 4, dir = 0) {
    for (let i = 0; i < n; i++)
      this.spawn(x + rng.range(-3, 3), y - rng.range(0, 2), { vx: rng.range(-25, 25) + dir * 20, vy: rng.range(-18, -4), max: rng.range(0.25, 0.5), color: "#6a5a6a", color2: "#3d3448", drag: 4 });
  }
  hit(x: number, y: number, dir: number, color: string = C.fire3, n = 7) {
    this.burst(x, y, n, { dir: dir > 0 ? 0 : Math.PI, spread: 1.6, speed: 140, max: 0.22, colors: [color, C.white, C.fire2], drag: 6 });
  }
  splat(x: number, y: number, colors: string[], n = 14) {
    this.burst(x, y, n, { speed: 110, max: 0.7, colors, g: 380, size: 2, drag: 1 });
  }
}
