import { audio } from "../core/audio";
import { clamp } from "../core/math";
import { rng } from "../core/rng";
import { disc, line, rect, type Ctx } from "../gfx/canvas";
import { C, RARITY } from "../gfx/palette";
import type { Game } from "../game";
import type { Drop } from "../systems/loot";
import type { VeinDef, WatcherDef } from "../world/level";
import { ORES } from "../systems/relics";

// ======================================================================= Loot chest
export type ChestKind = "boss" | "treasure" | "cache" | "daily";

/**
 * Loot you open instead of loot that sprays everywhere. Boss kills, dug-up treasure,
 * secret caches and the Daily Chest all land as a chest; opening it reveals the drops one
 * at a time, rarest last.
 */
export class LootChest {
  t = 0;
  opened = false;
  openT = 0;
  constructor(public x: number, public y: number, public kind: ChestKind, public table: string, public drops: Drop[] | null = null, public cacheId = "") { }
  get label() { return this.kind === "boss" ? "OPEN THE SPOILS" : this.kind === "treasure" ? "OPEN THE TREASURE" : this.kind === "daily" ? "OPEN THE DAILY CHEST" : "OPEN THE CACHE"; }
  /** Best rarity inside (for the glow), once rolled. */
  get glow() {
    let best = -1;
    for (const d of this.drops ?? []) if (d.type === "item") best = Math.max(best, d.item.rarity);
    return best;
  }
  update(dt: number) { this.t += dt; if (this.opened) this.openT += dt; }
  draw(ctx: Ctx, camX: number, camY: number, time: number) {
    const drop = clamp(this.t / 0.35, 0, 1);
    const x = Math.round(this.x - camX), y = Math.round(this.y - camY - (1 - drop) * 30);
    if (x < -40 || x > 430) return;
    const big = this.kind === "boss" || this.kind === "daily";
    const w = big ? 22 : 16, h = big ? 14 : 11;
    const x0 = x - w / 2;
    const wood = this.kind === "cache" ? "#3a4a4a" : C.wood2, woodD = this.kind === "cache" ? "#243030" : C.wood0, trim = this.kind === "daily" ? C.gold2 : this.kind === "treasure" ? C.gold1 : C.steel1;
    // shadow
    ctx.globalAlpha = 0.35; rect(ctx, x0 - 1, y - 1, w + 2, 2, C.black); ctx.globalAlpha = 1;
    rect(ctx, x0 - 1, y - h - 1, w + 2, h + 1, C.ink);
    rect(ctx, x0, y - h, w, h, wood);
    rect(ctx, x0, y - 2, w, 2, woodD);
    for (let k = 3; k < w; k += 5) rect(ctx, x0 + k, y - h + 5, 1, h - 5, woodD);
    // lid
    const lift = this.opened ? Math.min(6, Math.round(this.openT * 30)) : 0;
    rect(ctx, x0 - 1, y - h - 5 - lift, w + 2, 6, C.ink);
    rect(ctx, x0, y - h - 4 - lift, w, 4, wood);
    rect(ctx, x0, y - h - 4 - lift, w, 1, C.wood3);
    rect(ctx, x0 + 2, y - h - 4 - lift, 2, 4, trim); rect(ctx, x0 + w - 4, y - h - 4 - lift, 2, 4, trim);
    rect(ctx, x0 + 2, y - h, 2, h, trim); rect(ctx, x0 + w - 4, y - h, 2, h, trim);
    rect(ctx, x - 2, y - h - 1, 4, 4, this.opened ? C.ink : C.gold2);
    if (!this.opened) {
      // a shimmer that tells you something good is inside
      const g = this.glow;
      const col = g >= 0 ? RARITY[g].color : C.gold2;
      if (Math.floor(time * 3 + this.x) % 4 === 0) { rect(ctx, x0 + w - 2, y - h - 6, 1, 3, C.white); rect(ctx, x0 + w - 3, y - h - 5, 3, 1, C.white); }
      if (g >= 3) for (let yy = 0; yy < 40; yy++) {
        if (((yy * 7 + Math.floor(time * 20)) % 5) / 5 > 1 - yy / 40) continue;
        ctx.globalAlpha = 0.5 * (1 - yy / 40); rect(ctx, x - 1, y - h - 6 - yy, 2, 1, yy % 3 ? col : C.white);
      }
      ctx.globalAlpha = 1;
    } else if (this.openT < 1) {
      ctx.globalAlpha = 1 - this.openT;
      rect(ctx, x0 + 2, y - h - 3, w - 4, 2, C.fire3);
      ctx.globalAlpha = 1;
    }
  }
  lights(g: Game, camX: number, camY: number) {
    if (this.opened) return;
    const gl = this.glow;
    g.lighting.add(this.x - camX, this.y - 10 - camY, gl >= 3 ? 34 : 22, gl >= 0 ? RARITY[gl].color : C.gold2, 0.8);
  }
}

// ======================================================================= Watcher
/**
 * A pale eye set in the ceiling. Its cone of light sweeps the gallery floor; step into it
 * and the gate at the end of the gallery slams shut until you rest. The Strawman's Hood
 * makes you look like any other scarecrow, and the Watchers look straight past you.
 */
export class Watcher {
  t: number;
  alert = 0;
  glanced = false;
  constructor(public def: WatcherDef) { this.t = def.phase; }
  get x() { return this.def.x; }
  /** Horizontal centre of the light cone on the floor. */
  get aim() { return this.x + Math.sin(this.t * 0.9) * 34; }
  update(g: Game, dt: number) {
    this.t += dt;
    this.alert = Math.max(0, this.alert - dt);
    const p = g.player;
    if (!p.alive || !g.level.gateOpen) return;
    const d = this.def;
    if (p.bottom < d.y || p.y > d.floor + 2) return;
    // cone: narrow at the eye, 26px wide at the floor
    const k = clamp((p.bottom - d.y) / (d.floor - d.y), 0, 1);
    const cx = this.x + (this.aim - this.x) * k;
    const half = 3 + 13 * k;
    if (Math.abs(p.cx - cx) > half + 3) return;
    if (g.hooded()) {
      if (!this.glanced) {
        this.glanced = true;
        audio.play("watcher");
        if (!g.save.flags.hoodWatch) { g.save.flags.hoodWatch = true; g.chat.push("The Watcher's gaze slides over you. It sees only straw.", C.straw3); }
      }
      return;
    }
    this.alert = 2;
    g.watcherSaw(this);
  }
  draw(ctx: Ctx, camX: number, camY: number, time: number) {
    const d = this.def;
    const ex = Math.round(this.x - camX), ey = Math.round(d.y - camY);
    if (ex < -60 || ex > 450) return;
    // light cone (dithered)
    const fy = Math.round(d.floor - camY), aim = this.aim - camX;
    const col = this.alert > 0 ? "#e0405a" : "#e9ddf5";
    for (let y = ey + 3; y < fy; y++) {
      const k = (y - ey) / (fy - ey);
      const cx = ex + (aim - ex) * k, half = 3 + 13 * k;
      for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
        if ((x + y + Math.floor(time * 8)) % 3) continue;
        ctx.globalAlpha = 0.14 + 0.1 * (1 - k); ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1);
      }
    }
    ctx.globalAlpha = 1;
    // the eye
    disc(ctx, ex, ey + 1, 5, 4, C.ink);
    disc(ctx, ex, ey + 1, 4, 3, this.alert > 0 ? "#5a1a2a" : "#b9a8d0");
    const look = clamp((aim - ex) / 30, -1, 1);
    rect(ctx, ex - 1 + Math.round(look * 2), ey, 2, 2, this.alert > 0 ? "#ff6a6a" : C.ink);
    rect(ctx, ex - 5, ey - 3, 11, 1, "#3a3050"); // lid
    for (const k of [-4, 0, 4]) line(ctx, ex + k, ey - 3, ex + k, ey - 6, "#2a2438");
  }
  lights(g: Game, camX: number, camY: number) {
    g.lighting.add(this.x - camX, this.def.y - camY, 14, this.alert > 0 ? "#e0405a" : "#b9a8d0", 0.8);
    g.lighting.add(this.aim - camX, this.def.floor - 6 - camY, 18, this.alert > 0 ? "#e0405a" : "#b9a8d0", 0.5);
  }
}

// ======================================================================= Beacon, sigil stone, dig site
/** The iron brazier by the mill cellar. It takes three Warden's Embers to relight. */
export function drawBeacon(ctx: Ctx, wx: number, wy: number, camX: number, camY: number, lit: boolean, time: number) {
  const x = Math.round(wx - camX), y = Math.round(wy - camY);
  if (x < -30 || x > 420) return;
  rect(ctx, x - 1, y - 22, 3, 22, C.steel0); rect(ctx, x, y - 22, 1, 22, C.steel1);
  rect(ctx, x - 6, y - 1, 13, 1, C.steel0);
  rect(ctx, x - 7, y - 27, 15, 5, C.ink);
  rect(ctx, x - 6, y - 26, 13, 3, C.steel0); rect(ctx, x - 6, y - 26, 13, 1, C.steel1);
  for (const k of [-6, 0, 6]) rect(ctx, x + k, y - 29, 1, 3, C.steel0);
  if (lit) {
    for (let k = 0; k < 11; k++) {
      const fx = x - 5 + k;
      const h = Math.max(1, Math.round(8 + Math.sin(time * 9 + k * 1.7) * 3 - Math.abs(k - 5) * 1.1));
      for (let yy = 0; yy < h; yy++) {
        const tt = yy / h;
        ctx.fillStyle = tt < 0.3 ? C.fire3 : tt < 0.6 ? C.fire2 : tt < 0.85 ? C.fire1 : C.fire0;
        ctx.fillRect(fx, y - 27 - yy, 1, 1);
      }
    }
  } else if (Math.floor(time * 1.5) % 3 === 0) { ctx.fillStyle = C.fire0; ctx.fillRect(x, y - 27, 1, 1); }
}

/** The sigil stone before a boss's fog gate. Its three runes glow for each active sigil. */
export function drawSigilStone(ctx: Ctx, wx: number, wy: number, camX: number, camY: number, active: boolean[], unlocked: boolean, time: number) {
  const x = Math.round(wx - camX), y = Math.round(wy - camY);
  if (x < -30 || x > 420) return;
  for (let yy = 0; yy < 18; yy++) {
    const hw = yy < 4 ? 2 + yy : 6;
    rect(ctx, x - hw, y - 18 + yy, hw * 2, 1, yy % 5 === 0 ? C.stone1 : C.stone2);
    rect(ctx, x - hw, y - 18 + yy, 1, 1, C.stone3);
  }
  rect(ctx, x - 8, y - 2, 16, 2, C.stone0);
  const cols = ["#9ad8ff", "#c9b894", "#e0605a"];
  active.forEach((on, i) => {
    const rx = x - 4 + i * 4, ry = y - 12 + (i === 1 ? -2 : 0);
    const c = !unlocked ? "#2a2438" : on ? (Math.sin(time * 4 + i) > -0.3 ? cols[i] : C.white) : "#4a4460";
    rect(ctx, rx - 1, ry, 2, 4, c);
  });
}

/** A faint glint where a treasure map's X lies (only shown while you carry that map). */
export function drawDigSite(ctx: Ctx, wx: number, wy: number, camX: number, camY: number, time: number) {
  const x = Math.round(wx - camX), y = Math.round(wy - camY);
  if (x < -20 || x > 404) return;
  const a = 0.5 + 0.5 * Math.sin(time * 3);
  ctx.globalAlpha = 0.4 + a * 0.5;
  ctx.fillStyle = C.gold2;
  for (let k = -3; k <= 3; k++) { ctx.fillRect(x + k, y - 2 + k * 0, 1, 1); }
  for (let k = -2; k <= 2; k++) { ctx.fillRect(x + k, y - 2 - k, 1, 1); ctx.fillRect(x + k, y - 2 + k, 1, 1); }
  if (Math.floor(time * 4 + x) % 6 === 0) { ctx.fillStyle = C.white; ctx.fillRect(x + rng.int(-4, 4), y - rng.int(3, 8), 1, 1); }
  ctx.globalAlpha = 1;
}

// ======================================================================= Ore vein
/** A rock outcrop threaded with ore. Holds a few ore, then crumbles until it regrows (60s). */
export class Vein {
  left: number;
  respawn = 0;
  shake = 0;
  constructor(public def: VeinDef) { this.left = rng.int(2, 4); }
  get x() { return this.def.x; }
  get y() { return this.def.y; }
  get depleted() { return this.left <= 0; }
  update(dt: number) {
    this.shake = Math.max(0, this.shake - dt);
    if (this.left <= 0) { this.respawn -= dt; if (this.respawn <= 0) this.left = rng.int(2, 4); }
  }
  deplete() { this.left--; if (this.left <= 0) this.respawn = 60; }
  draw(ctx: Ctx, camX: number, camY: number, time: number) {
    const x = Math.round(this.x - camX + (this.shake > 0 ? Math.sin(time * 80) : 0)), y = Math.round(this.y - camY);
    if (x < -30 || x > 420) return;
    const O = ORES[this.def.ore];
    const shape = [4, 7, 9, 10, 10, 11, 11, 11, 10];
    for (let k = 0; k < shape.length; k++) {
      const hw = shape[k], yy = y - shape.length + k;
      rect(ctx, x - hw, yy, hw * 2, 1, k === 0 ? C.stone3 : k < 3 ? C.stone2 : C.stone1);
      rect(ctx, x - hw, yy, 1, 1, C.stone0); rect(ctx, x + hw - 1, yy, 1, 1, C.stone0);
    }
    rect(ctx, x - 11, y - 1, 22, 1, C.stone0);
    if (!this.depleted) {
      for (const [ox, oy] of [[-6, -5], [-2, -7], [3, -4], [6, -6], [0, -3], [-4, -2]]) {
        rect(ctx, x + ox, y + oy, 2, 1, O.color);
        if (Math.floor(time * 3 + ox) % 7 === 0) rect(ctx, x + ox, y + oy - 1, 1, 1, C.white);
      }
    } else for (const [ox, oy] of [[-5, -4], [2, -6], [4, -3]]) rect(ctx, x + ox, y + oy, 1, 1, C.stone0);
  }
  lights(g: Game, camX: number, camY: number) {
    if (!this.depleted && this.def.ore !== "iron") g.lighting.add(this.x - camX, this.y - 6 - camY, 16, ORES[this.def.ore].color, 0.5);
  }
}

/** A dead iron lamp in the Mines, or one you've relit with a Warden's Ember. */
export function drawDeadLamp(ctx: Ctx, wx: number, wy: number, camX: number, camY: number, lit: boolean, time: number) {
  const x = Math.round(wx - camX), y = Math.round(wy - camY);
  if (x < -30 || x > 420) return;
  rect(ctx, x - 4, y - 2, 9, 2, C.steel0);
  rect(ctx, x, y - 30, 2, 28, C.steel0); rect(ctx, x + 1, y - 30, 1, 28, C.steel1);
  rect(ctx, x - 4, y - 40, 10, 2, C.steel0);
  rect(ctx, x - 3, y - 38, 8, 8, C.ink);
  rect(ctx, x - 4, y - 30, 10, 1, C.steel0);
  if (lit) {
    const f = Math.sin(time * 9 + wx) > 0;
    rect(ctx, x - 2, y - 37, 6, 6, f ? C.fire2 : C.fire1); rect(ctx, x, y - 36, 2, 4, C.fire3);
  } else rect(ctx, x - 2, y - 37, 6, 6, "#1c1a24");
}

/** A loose page, fluttering. */
export function drawLorePage(ctx: Ctx, wx: number, wy: number, camX: number, camY: number, time: number) {
  const x = Math.round(wx - camX), y = Math.round(wy - camY - 6 + Math.sin(time * 2.5 + wx) * 1.5);
  if (x < -20 || x > 404) return;
  const tilt = Math.sin(time * 1.7 + wx) > 0 ? 1 : 0;
  rect(ctx, x - 4, y - 5 + tilt, 8, 10, C.ink);
  rect(ctx, x - 3, y - 4 + tilt, 6, 8, C.paper);
  for (const ly of [-2, 0, 2]) rect(ctx, x - 2, y + ly + tilt, 4, 1, C.dirt3);
  if (Math.floor(time * 3 + wx) % 5 === 0) rect(ctx, x + 4, y - 7, 1, 1, C.white);
}

/** A shortcut lever: up until pulled. */
export function drawLever(ctx: Ctx, wx: number, wy: number, camX: number, camY: number, pulled: boolean) {
  const x = Math.round(wx - camX), y = Math.round(wy - camY);
  if (x < -20 || x > 404) return;
  rect(ctx, x - 5, y - 4, 10, 4, C.stone1); rect(ctx, x - 5, y - 4, 10, 1, C.stone2);
  const ang = pulled ? 0.6 : -0.6;
  line(ctx, x, y - 4, x + Math.round(Math.sin(ang) * 10), y - 4 - Math.round(Math.cos(ang) * 10), C.wood2, 2);
  rect(ctx, x + Math.round(Math.sin(ang) * 10) - 1, y - 5 - Math.round(Math.cos(ang) * 10), 3, 3, pulled ? C.steel1 : C.hp);
}

/** An old standing stone carved with waves: the Tide Bell answers it. */
export function drawTideStone(ctx: Ctx, wx: number, wy: number, camX: number, camY: number, active: boolean, time: number) {
  const x = Math.round(wx - camX), y = Math.round(wy - camY);
  if (x < -20 || x > 404) return;
  for (let yy = 0; yy < 20; yy++) { const hw = yy < 3 ? 2 + yy : 5; rect(ctx, x - hw, y - 20 + yy, hw * 2, 1, yy % 4 === 0 ? C.stone1 : C.stone2); }
  const col = active ? (Math.sin(time * 4) > 0 ? "#6ad0c0" : "#b8f0e0") : "#2e4a50";
  for (let k = 0; k < 3; k++) for (let i = -3; i <= 3; i++) rect(ctx, x + i, y - 15 + k * 5 + (Math.abs(i) % 2), 1, 1, col);
}
