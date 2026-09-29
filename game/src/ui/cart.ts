import { audio } from "../core/audio";
import { H, W } from "../core/constants";
import { clamp, hash } from "../core/math";
import { rng } from "../core/rng";
import { line, rect, type Ctx } from "../gfx/canvas";
import { drawText } from "../gfx/font";
import { drawIcon } from "../gfx/icons";
import { C } from "../gfx/palette";
import type { Game } from "../game";
import type { OreId } from "../systems/relics";
import type { Overlay } from "./menu";
import { bar, panel } from "./widgets";

/**
 * The mine-cart run: an auto-scrolling ride from the Mine Mouth down to the Sunken Shaft
 * while the flood chases you. Jump gaps and rocks, duck under beams, grab ore on the way.
 * The layout is fixed, so best times mean something. Bump into things and the water gains;
 * miss a jump and you're swept away (you keep what you grabbed).
 */

type Feature = { x: number; kind: "gap" | "beam" | "rock"; w: number };
type Loot = { x: number; y: number; kind: "gold" | OreId; got: boolean };

const LENGTH = 3800;
const CART_X = 120;
const FEATURES: Feature[] = [
  { x: 420, kind: "rock", w: 10 }, { x: 640, kind: "gap", w: 56 }, { x: 860, kind: "beam", w: 10 },
  { x: 1040, kind: "rock", w: 10 }, { x: 1230, kind: "gap", w: 70 }, { x: 1450, kind: "beam", w: 10 },
  { x: 1600, kind: "beam", w: 10 }, { x: 1800, kind: "gap", w: 64 }, { x: 1990, kind: "rock", w: 10 },
  { x: 2150, kind: "gap", w: 84 }, { x: 2380, kind: "beam", w: 10 }, { x: 2480, kind: "rock", w: 10 },
  { x: 2700, kind: "gap", w: 90 }, { x: 2930, kind: "beam", w: 10 }, { x: 3060, kind: "beam", w: 10 },
  { x: 3240, kind: "gap", w: 76 }, { x: 3420, kind: "rock", w: 10 }, { x: 3560, kind: "gap", w: 60 },
];

/** Rail height (screen-space y of the rail) at a track distance. */
const railY = (x: number) => Math.round(150 + Math.sin(x / 260) * 14 + Math.sin(x / 97) * 5 - clamp((x - 3300) / 500, 0, 1) * 20);
const inGap = (x: number) => FEATURES.some((f) => f.kind === "gap" && x > f.x && x < f.x + f.w);

export class CartRun implements Overlay {
  dist = 0;
  speed = 170;
  y = railY(0);
  vy = 0;
  air = false;
  duck = false;
  flood = -230;
  t = 0;
  bumpT = 0;
  over: "" | "won" | "swept" = "";
  overT = 0;
  loot: Loot[] = [];
  got = { gold: 0, iron: 0, silver: 0, gleam: 0 };
  private hit = new Set<number>();
  private sparks: { x: number; y: number; vx: number; vy: number; t: number; c: string }[] = [];

  constructor(private best: number | null, private onEnd: (g: Game, won: boolean, time: number, got: Record<"gold" | OreId, number>) => void) {
    // ore arcs over the gaps (reward for clean jumps), gold on the flats
    for (const f of FEATURES) {
      if (f.kind === "gap") for (let k = 0; k < 3; k++) loot(this.loot, f.x - 20 + k * (f.w + 40) / 2, railY(f.x) - 30 - (k === 1 ? 16 : 6), k !== 1 ? "gold" : f.w > 85 ? "gleam" : f.w > 65 ? "silver" : "iron");
      else if (f.kind === "beam") loot(this.loot, f.x + 50, railY(f.x + 50) - 8, "gold");
    }
    for (let x = 250; x < LENGTH - 200; x += 170) if (!inGap(x) && !FEATURES.some((f) => Math.abs(f.x - x) < 40)) loot(this.loot, x, railY(x) - 10, "gold");
    function loot(list: Loot[], x: number, y: number, kind: Loot["kind"]) { list.push({ x, y, kind, got: false }); }
    audio.play("chain");
  }

  update(g: Game, dt: number) {
    if (!this.over) this.t += dt;
    const inp = g.input;
    for (const s of this.sparks) { s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 400 * dt; }
    this.sparks = this.sparks.filter((s) => s.t < 0.6);
    if (this.over) {
      this.overT += dt;
      if (this.overT > 1.6 && (inp.pressed("confirm") || inp.pressed("interact") || this.overT > 4)) {
        g.closeOverlay();
        this.onEnd(g, this.over === "won", this.t, this.got);
      }
      return;
    }
    this.bumpT = Math.max(0, this.bumpT - dt);
    this.speed = Math.min(225, this.speed + dt * 4);
    const v = this.speed * (this.bumpT > 0 ? 0.45 : 1);
    this.dist += v * dt;
    this.flood += 192 * dt;
    this.duck = inp.isHeld("down") && !this.air;
    const ry = railY(this.dist);
    if (!this.air) {
      if (inGap(this.dist + 6)) { this.air = true; this.vy = 0; }
      else this.y = ry;
      if (inp.pressed("jump") && !this.air) { this.air = true; this.vy = -265; audio.play("jump"); }
    }
    if (this.air) {
      this.vy += 720 * dt;
      this.y += this.vy * dt;
      if (this.vy > 0 && !inGap(this.dist + 6) && this.y >= ry) { this.y = ry; this.air = false; audio.play("land"); this.spark(C.fire2, 6); }
      if (this.y > H + 20) { this.lose(); return; }
    }
    // obstacles
    FEATURES.forEach((f, i) => {
      if (f.kind === "gap" || this.hit.has(i)) return;
      const cx0 = this.dist - 11, cx1 = this.dist + 11;
      if (cx1 < f.x || cx0 > f.x + f.w) return;
      const rail = railY(f.x);
      const bottom = this.y, top = this.y - (this.duck ? 13 : 26);
      const hitBeam = f.kind === "beam" && top < rail - 17;
      const hitRock = f.kind === "rock" && bottom > rail - 8;
      if (hitBeam || hitRock) {
        this.hit.add(i); this.bumpT = 0.7; this.speed = Math.max(150, this.speed - 25);
        audio.play("hurt"); g.shake(3, 0.2); this.spark(C.wood3, 10);
      }
    });
    for (const l of this.loot) {
      if (l.got || Math.abs(l.x - this.dist) > 12) continue;
      if (Math.abs(l.y - (this.y - 14)) < 16) { l.got = true; this.got[l.kind] += l.kind === "gold" ? rng.int(3, 7) : 1; audio.play(l.kind === "gold" ? "coin" : "reveal", 2); }
    }
    if (this.flood >= this.dist - 18) { this.lose(); return; }
    if (this.dist >= LENGTH) { this.over = "won"; audio.play("victory"); }
  }
  private lose() { this.over = "swept"; audio.play("splash"); audio.play("death"); }
  private spark(c: string, n: number) { for (let i = 0; i < n; i++) this.sparks.push({ x: CART_X + rng.range(-8, 8), y: this.y, vx: rng.range(-90, 30), vy: -rng.range(40, 140), t: 0, c }); }

  draw(g: Game, ctx: Ctx) {
    const camX = this.dist - CART_X;
    g.drawScenery(ctx, camX * 1.6, this.t);
    // track: rails, sleepers and trestles
    for (let sx = 0; sx < W; sx++) {
      const wx = sx + camX;
      if (wx < 0 || wx > LENGTH + 200 || inGap(wx)) continue;
      const ry = railY(wx);
      if (Math.floor(wx) % 14 < 4) rect(ctx, sx, ry + 1, 1, 3, C.wood1);
      rect(ctx, sx, ry, 1, 1, C.steel2); rect(ctx, sx, ry + 1, 1, 1, C.steel0);
      if (Math.floor(wx) % 60 < 3) rect(ctx, sx, ry + 4, 1, H - ry, "#1c1418");
      else if (Math.floor(wx) % 60 < 5) rect(ctx, sx, ry + 4, 1, H - ry, C.wood0);
    }
    for (const f of FEATURES) {
      const sx = Math.round(f.x - camX);
      if (sx < -40 || sx > W + 40) continue;
      const ry = railY(f.x);
      if (f.kind === "gap") {
        // broken rails dangling into the dark
        line(ctx, sx, ry, sx + 6, ry + 10, C.steel0); line(ctx, sx + f.w, ry, sx + f.w - 5, ry + 12, C.steel0);
      } else if (f.kind === "beam") {
        rect(ctx, sx - 1, 0, f.w + 2, ry - 17, C.ink); rect(ctx, sx, 0, f.w, ry - 18, C.wood1); rect(ctx, sx + 2, 0, 2, ry - 18, C.wood2);
        rect(ctx, sx - 6, ry - 22, f.w + 12, 4, C.wood2); rect(ctx, sx - 6, ry - 22, f.w + 12, 1, C.wood3);
        if (Math.floor(this.t * 6) % 2 === 0) rect(ctx, sx + 3, ry - 26, 4, 3, C.hp);
      } else {
        for (let k = 0; k < 5; k++) rect(ctx, sx + k * 2 - 1, ry - 8 + Math.abs(k - 2) * 2, 3, 8 - Math.abs(k - 2) * 2, k === 2 ? C.stone3 : C.stone2);
      }
    }
    for (const l of this.loot) {
      if (l.got) continue;
      const sx = Math.round(l.x - camX), sy = Math.round(l.y + Math.sin(this.t * 4 + l.x) * 2);
      if (sx < -12 || sx > W + 12) continue;
      drawIcon(ctx, l.kind === "gold" ? "coin" : l.kind === "iron" ? "ore" : l.kind === "silver" ? "silverore" : "gleam", sx - 6, sy - 6);
    }
    // the cart and you
    const cy = Math.round(this.y), cx = CART_X, tilt = this.air ? -1 : 0;
    const bodyTop = this.duck ? cy - 12 : cy - 24;
    if (!this.duck) { rect(ctx, cx - 3, bodyTop, 6, 6, C.skin1); rect(ctx, cx - 3, bodyTop, 6, 2, C.hair); rect(ctx, cx + 1, bodyTop + 2, 1, 1, C.ink); }
    else { rect(ctx, cx - 3, bodyTop + 2, 6, 4, C.hair); }
    const flap = Math.sin(this.t * 20) * 2;
    line(ctx, cx - 3, bodyTop + 7, cx - 12, bodyTop + 5 + flap, C.scarf1, 2);
    rect(ctx, cx - 4, bodyTop + 6, 8, 5, C.cloth1);
    rect(ctx, cx - 12, cy - 13 + tilt, 24, 10, C.ink); rect(ctx, cx - 11, cy - 12 + tilt, 22, 8, "#3a3749"); rect(ctx, cx - 11, cy - 12 + tilt, 22, 1, C.steel1);
    for (const wx of [cx - 8, cx + 5]) { rect(ctx, wx, cy - 4, 4, 4, C.ink); rect(ctx, wx + 1, cy - 3, 2, 2, C.steel1); }
    if (this.bumpT > 0 && Math.floor(this.t * 20) % 2) { ctx.globalAlpha = 0.5; rect(ctx, cx - 12, cy - 26, 24, 26, C.hp); ctx.globalAlpha = 1; }
    if (!this.air && Math.floor(this.t * 20) % 3 === 0) this.sparks.push({ x: cx - 10, y: cy, vx: -rng.range(30, 90), vy: -rng.range(10, 60), t: 0.3, c: C.fire2 });
    for (const s of this.sparks) rect(ctx, Math.round(s.x), Math.round(s.y), 1, 1, s.c);
    // the flood behind you
    const fx = Math.round(this.flood - camX);
    if (fx > -40) {
      for (let y = 0; y < H; y++) {
        const edge = fx + Math.round(Math.sin(y * 0.15 + this.t * 9) * 4 + Math.sin(y * 0.05 - this.t * 4) * 6);
        rect(ctx, 0, y, Math.max(0, edge), 1, y % 7 === 0 ? "#1a4a52" : "#11303a");
        rect(ctx, edge, y, 2, 1, hash(y, Math.floor(this.t * 10), 4) > 0.6 ? "#b8f0e0" : "#6ad0c0");
      }
    }
    // HUD
    const secs = this.t;
    panel(ctx, 6, 6, 150, 30, 0.85);
    drawText(ctx, `TIME ${secs.toFixed(1)}S`, 12, 11, C.cream);
    drawText(ctx, this.best ? `BEST ${this.best.toFixed(1)}S` : "BEST --", 150, 11, C.gold2, { align: "right" });
    bar(ctx, 12, 23, 138, 3, this.dist / LENGTH, "#6ad0c0", C.inkSoft);
    rect(ctx, 12 + Math.round(138 * clamp(this.flood / LENGTH, 0, 1)), 21, 1, 7, "#b8f0e0");
    let x = W - 10;
    for (const k of ["gleam", "silver", "iron", "gold"] as const) {
      if (!this.got[k]) continue;
      const w = drawText(ctx, `${this.got[k]}`, x, 11, C.cream, { align: "right" });
      drawIcon(ctx, k === "gold" ? "coin" : k === "iron" ? "ore" : k === "silver" ? "silverore" : "gleam", x - w - 14, 7);
      x -= w + 20;
    }
    if (this.t < 2.5) drawText(ctx, "JUMP: SPACE   DUCK: DOWN   OUTRUN THE FLOOD!", W / 2, H - 16, C.cream, { align: "center" });
    if (this.over) {
      ctx.globalAlpha = Math.min(0.7, this.overT); rect(ctx, 0, 0, W, H, C.black); ctx.globalAlpha = 1;
      const won = this.over === "won";
      drawText(ctx, won ? "THE SUNKEN SHAFT" : "SWEPT AWAY", W / 2, 80, won ? C.gold2 : "#6ad0c0", { align: "center", scale: 2 });
      drawText(ctx, won ? `${secs.toFixed(1)} SECONDS${!this.best || secs < this.best ? "  -  NEW BEST!" : ""}` : "The water carries you back to the Mine Mouth.", W / 2, 104, C.cream, { align: "center" });
      drawText(ctx, won ? "A chest waits at the end of the line." : "You keep what you grabbed.", W / 2, 116, C.dim, { align: "center" });
    }
  }
}
