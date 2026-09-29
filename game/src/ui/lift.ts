import { audio } from "../core/audio";
import { H, W } from "../core/constants";
import { clamp, hash } from "../core/math";
import { rect, type Ctx } from "../gfx/canvas";
import { drawText } from "../gfx/font";
import { C } from "../gfx/palette";
import type { Game } from "../game";
import type { Overlay } from "./menu";

/**
 * The ride down the old mine lift: rock sliding past, lamps flicking by, the flood bell
 * tolling below, and water rushing up past the cage at the bottom. The full version plays
 * the first time; after that it's a quick ride. Going up is the same, reversed.
 */
export class LiftScene implements Overlay {
  t = 0;
  private rang = false;
  private splashed = false;
  constructor(private dur: number, private down: boolean, private onDone: (g: Game) => void) { audio.play("chain"); }
  update(g: Game, dt: number) {
    this.t += dt;
    const k = this.t / this.dur;
    if (this.down && !this.rang && k > 0.45) { this.rang = true; audio.play("bell"); }
    if (this.down && !this.splashed && k > 0.8) { this.splashed = true; audio.play("splash"); }
    if (Math.floor(this.t * 4) !== Math.floor((this.t - dt) * 4)) audio.play("clink", 1.2);
    if (this.t >= this.dur || (this.t > 0.4 && (g.input.pressed("confirm") || g.input.pressed("cancel")))) {
      g.closeOverlay();
      this.onDone(g);
    }
  }
  draw(_g: Game, ctx: Ctx) {
    const k = clamp(this.t / this.dur, 0, 1);
    const speed = Math.sin(Math.min(1, k * 1.2) * Math.PI) * 0.8 + 0.2;
    const scroll = this.t * 260 * speed * (this.down ? 1 : -1);
    rect(ctx, 0, 0, W, H, "#06050b");
    // shaft walls: blocky rock with strata, crystal flecks and wall lamps sliding past
    const shaftL = W / 2 - 60, shaftR = W / 2 + 60;
    for (let y = 0; y < H; y += 2) {
      const wy = Math.floor((y + scroll) / 2) * 2;
      for (const side of [0, 1]) {
        const jag = Math.round(Math.sin(wy * 0.09 + side * 3) * 4 + Math.sin(wy * 0.023) * 6);
        const e = (side ? shaftR : shaftL) + (side ? jag : -jag);
        const x0 = side ? e : 0, x1 = side ? W : e;
        for (let x = x0; x < x1; x += 4) {
          const d = side ? x - e : e - x;
          const n = hash(x >> 2, wy >> 2, 11 + side);
          const strata = Math.sin(wy * 0.12 + x * 0.02) > 0.85;
          ctx.fillStyle = d < 3 ? "#2c2939" : strata ? "#1a1822" : n > 0.9 ? "#1e1c27" : n > 0.4 ? "#121019" : "#0d0c13";
          ctx.fillRect(x, y, 4, 2);
        }
        if (hash(wy, side, 7) > 0.985) { ctx.fillStyle = "#6ad0c0"; ctx.fillRect(side ? e + 6 : e - 8, y, 2, 2); }
        if ((wy + side * 160) % 320 < 2) {
          const lx = side ? e + 3 : e - 7;
          ctx.fillStyle = C.fire2; ctx.fillRect(lx, y - 2, 4, 4);
          ctx.fillStyle = C.fire3; ctx.fillRect(lx + 1, y - 1, 2, 2);
          ctx.globalAlpha = 0.35; ctx.fillStyle = C.fire1;
          for (let k = 0; k < 16; k++) { const a = k * 0.4; ctx.fillRect(lx + 2 + Math.round(Math.cos(a) * (6 + k % 3 * 3)), y + Math.round(Math.sin(a) * (6 + k % 3 * 3)), 1, 1); }
          ctx.globalAlpha = 1;
        }
      }
    }
    // water rushing up past the cage near the bottom of the ride
    if (this.down && k > 0.78) {
      const w = (k - 0.78) / 0.22;
      for (let i = 0; i < 40; i++) {
        const x = shaftL + ((i * 37) % 120), y = H - ((this.t * 600 + i * 53) % (H * 1.2)) * w;
        rect(ctx, x, y, 1, 6, i % 3 ? "#2e7a78" : "#b8f0e0");
      }
      ctx.globalAlpha = w * 0.5; rect(ctx, shaftL, H - w * H * 0.6, 120, H, "#1a4a52"); ctx.globalAlpha = 1;
    }
    // ropes and the cage
    const cx = W / 2, cy = H / 2 + Math.round(Math.sin(this.t * 3) * 1);
    for (const rx of [cx - 12, cx + 12]) for (let y = 0; y < cy - 22; y++) if ((y + Math.floor(scroll)) % 4 !== 0) { ctx.fillStyle = C.wood2; ctx.fillRect(rx, y, 1, 1); }
    rect(ctx, cx - 18, cy - 24, 36, 3, C.steel1);
    rect(ctx, cx - 18, cy + 10, 36, 3, C.steel0);
    for (let bx = -18; bx <= 18; bx += 6) rect(ctx, cx + bx, cy - 22, 1, 32, C.steel0);
    // you, in the cage, lantern-lit
    rect(ctx, cx - 3, cy - 8, 6, 12, C.cloth1); rect(ctx, cx - 3, cy - 14, 6, 6, C.skin1); rect(ctx, cx - 3, cy - 14, 6, 2, C.hair);
    rect(ctx, cx - 5, cy - 7, 3, 2, C.scarf1);
    // lantern light, dithered
    for (let yy = -34; yy <= 34; yy++) for (let xx = -40; xx <= 40; xx++) {
      const d = Math.hypot(xx, yy * 1.3) / 40;
      if (d > 1 || d < 0.3 || (xx + yy) & 1 || d > 0.4 + ((xx * 3 + yy * 7) & 7) / 14) continue;
      ctx.globalAlpha = 0.28 * (1 - d); ctx.fillStyle = C.fire1; ctx.fillRect(cx + xx, cy - 4 + yy, 1, 1);
    }
    ctx.globalAlpha = 1;
    // captions
    const cap = this.down ? (k < 0.4 ? "DOWN INTO THE HOLLOWMERE DEEP..." : k < 0.75 ? "FAR BELOW, A BELL IS RINGING." : "THE WATER RISES TO MEET YOU.") : "UP TOWARD THE MILL, AND THE AIR.";
    ctx.globalAlpha = clamp(Math.min(this.t * 2, (this.dur - this.t) * 2), 0, 1);
    drawText(ctx, cap, W / 2, H - 24, C.cream, { align: "center" });
    ctx.globalAlpha = 1;
    // fade in/out
    const f = Math.max(clamp(1 - this.t * 2.5, 0, 1), clamp((this.t - this.dur + 0.5) * 2, 0, 1));
    if (f > 0) { ctx.globalAlpha = f; rect(ctx, 0, 0, W, H, C.black); ctx.globalAlpha = 1; }
    if (this.t > 0.4) drawText(ctx, "J TO SKIP", W - 8, 8, C.faint, { align: "right" });
  }
}
