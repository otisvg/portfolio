import { audio } from "../core/audio";
import { approach, clamp, overlap, type Rect } from "../core/math";
import { rng } from "../core/rng";
import { line, rect, type Ctx } from "../gfx/canvas";
import { drawGhost, drawIcon } from "../gfx/icons";
import { C, RARITY } from "../gfx/palette";
import { shadow, SpriteBuf } from "../gfx/sprite";
import type { Game } from "../game";
import { milestonesFor } from "../systems/bounties";
import type { FaceId } from "../systems/dice";
import { baseOf, type Item } from "../systems/items";
import { drawDie } from "../ui/dice";
import type { NpcDef, ShrineDef, SignDef } from "../world/level";
import { moveBody, type Body } from "../world/physics";

// ======================================================================= Pickups
export type PickupKind = "gold" | "item" | "shard" | "orb" | "rune";

export class Pickup implements Body {
  x: number; y: number; w = 8; h = 8; vx: number; vy: number; onGround = false;
  t = 0; dead = false; blocked = 0;
  face: FaceId | null = null;
  constructor(public kind: PickupKind, cx: number, cy: number, public amount = 1, public item: Item | null = null) {
    this.x = cx - 4; this.y = cy - 4;
    const burst = kind === "item" ? 1.3 : 1;
    this.vx = rng.range(-70, 70) * burst;
    this.vy = -rng.range(140, 230) * burst;
  }
  get cx() { return this.x + 4; }
  update(g: Game, dt: number) {
    this.t += dt;
    this.blocked = Math.max(0, this.blocked - dt);
    const p = g.player;
    const magnet = (this.kind !== "item") && this.t > 0.45 && p.alive;
    const dx = p.cx - this.cx, dy = p.y + 10 - (this.y + 4);
    if (magnet && Math.hypot(dx, dy) < 34) {
      this.vx = approach(this.vx, Math.sign(dx) * 190, 900 * dt);
      this.vy = approach(this.vy, Math.sign(dy) * 190, 900 * dt);
      this.x += this.vx * dt; this.y += this.vy * dt;
    } else {
      this.vy = Math.min(this.vy + 700 * dt, 300);
      const was = this.vy;
      const r = moveBody(this, g.level, dt);
      if (r.landed && was > 80) { this.vy = -was * 0.35; this.onGround = false; }
      if (this.onGround) this.vx = approach(this.vx, 0, 300 * dt);
      if (r.hitWallX) this.vx = -this.vx * 0.5;
    }
    if (this.t > 0.35 && p.alive && overlap(this, p.hurtbox())) g.collect(this);
  }
  draw(ctx: Ctx, camX: number, camY: number, time: number) {
    const x = Math.round(this.x - camX), y = Math.round(this.y - camY);
    if (this.kind === "gold") {
      const f = Math.floor(time * 10 + this.x) % 4;
      const w = [6, 4, 2, 4][f];
      const cx = x + 4 - Math.floor(w / 2);
      ctx.fillStyle = C.ink; ctx.fillRect(cx - 1, y + 1, w + 2, 6); ctx.fillRect(cx, y, w, 8);
      ctx.fillStyle = C.gold1; ctx.fillRect(cx, y + 1, w, 6);
      ctx.fillStyle = C.gold2; ctx.fillRect(cx, y + 1, Math.max(1, w - 1), 5);
      if (w > 2) { ctx.fillStyle = C.gold3; ctx.fillRect(cx + 1, y + 2, 1, 2); }
    } else if (this.kind === "orb") {
      const pulse = Math.sin(time * 6 + this.x) > 0 ? 1 : 0;
      ctx.fillStyle = C.ink; ctx.fillRect(x + 1, y + 1, 7, 7);
      ctx.fillStyle = C.hp; ctx.fillRect(x + 2, y + 2, 5, 5);
      ctx.fillStyle = C.scarf2; ctx.fillRect(x + 2, y + 2, 2 + pulse, 2);
    } else if (this.kind === "rune" && this.face) {
      const b = Math.round(Math.sin(time * 3 + this.x) * 1.5);
      drawDie(ctx, x - 3, y - 4 + b, 14, this.face);
    } else if (this.kind === "shard") {
      const b = Math.round(Math.sin(time * 3 + this.x) * 1);
      ctx.fillStyle = C.ink; ctx.fillRect(x + 2, y - 2 + b, 5, 10);
      ctx.fillStyle = C.blight3; ctx.fillRect(x + 3, y - 1 + b, 3, 8);
      ctx.fillStyle = C.blight5; ctx.fillRect(x + 3, y + b, 1, 4);
    } else if (this.item) {
      const r = this.item.rarity;
      const col = RARITY[r].color;
      const b = this.onGround ? Math.round(Math.sin(time * 3 + this.x) * 1.5) : 0;
      if (r >= 2) {
        // loot beam
        const bh = r >= 4 ? 70 : r === 3 ? 52 : 36;
        for (let yy = 0; yy < bh; yy++) {
          const a = 1 - yy / bh;
          if (a * 0.9 < ((yy * 7 + Math.floor(time * 20)) % 5) / 5) continue;
          ctx.fillStyle = yy % 3 === 0 ? C.white : col;
          ctx.globalAlpha = 0.8 * a;
          ctx.fillRect(x + 3, y - yy, 2, 1);
        }
        ctx.globalAlpha = 1;
      }
      const ic = baseOf(this.item).icon;
      for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) drawGhost(ctx, ic, x - 2 + ox, y - 2 + b + oy, col);
      drawIcon(ctx, ic, x - 2, y - 2 + b);
      if (r >= 3 && Math.floor(time * 6 + this.x) % 8 === 0) { ctx.fillStyle = C.white; ctx.fillRect(x + 8, y - 3 + b, 1, 1); }
    }
  }
}

// ======================================================================= Lost purse
export class Purse {
  t = 0;
  constructor(public x: number, public y: number, public amount: number) { }
  hitbox(): Rect { return { x: this.x - 6, y: this.y - 12, w: 12, h: 12 }; }
  draw(ctx: Ctx, camX: number, camY: number, time: number) {
    const x = Math.round(this.x - camX), y = Math.round(this.y - camY);
    const b = Math.round(Math.sin(time * 2.4) * 1.5);
    for (let i = 0; i < 3; i++) {
      const a = time * 1.6 + (i * Math.PI * 2) / 3;
      ctx.fillStyle = C.gold3;
      ctx.fillRect(Math.round(x + Math.cos(a) * 9), Math.round(y - 8 + Math.sin(a) * 4) + b, 1, 1);
    }
    drawIcon(ctx, "purse", x - 6, y - 14 + b);
  }
}

// ======================================================================= Hearthstone shrine
export class Shrine {
  t = rng.range(0, 5);
  constructor(public def: ShrineDef) { }
  get x() { return this.def.x; }
  get y() { return this.def.y; }
  draw(ctx: Ctx, camX: number, camY: number, lit: boolean, time: number) {
    const x = Math.round(this.x - camX), y = Math.round(this.y - camY);
    // plinth
    rect(ctx, x - 10, y - 4, 20, 4, C.stone1); rect(ctx, x - 10, y - 4, 20, 1, C.stone2);
    // standing stone
    for (let yy = 0; yy < 22; yy++) {
      const hw = yy < 3 ? 4 + yy : 7;
      for (let xx = -hw; xx < hw; xx++) {
        const col = xx < -hw + 2 ? C.stone3 : xx > hw - 3 ? C.stone0 : (xx + yy) % 5 === 0 ? C.stone1 : C.stone2;
        ctx.fillStyle = col; ctx.fillRect(x + xx, y - 26 + yy, 1, 1);
      }
    }
    // runes
    const rune = lit ? (Math.sin(time * 2) > 0 ? C.fire2 : C.fire1) : "#4a4460";
    for (const [rx, ry] of [[-2, -21], [1, -21], [-1, -17], [0, -13], [-2, -10], [1, -9]]) { ctx.fillStyle = rune; ctx.fillRect(x + rx, y + ry, 1, 2); }
    ctx.fillStyle = rune; ctx.fillRect(x - 2, y - 15, 4, 1);
    // fire bowl
    rect(ctx, x - 7, y - 30, 14, 3, C.steel0); rect(ctx, x - 6, y - 27, 12, 1, C.steel0); rect(ctx, x - 7, y - 30, 14, 1, C.steel1);
    if (lit) {
      for (let k = 0; k < 9; k++) {
        const fx = x - 4 + k;
        const h = Math.max(1, Math.round(6 + Math.sin(time * 9 + k * 1.7) * 2.5 + Math.sin(time * 5.3 + k) * 1.5 - Math.abs(k - 4) * 0.8));
        for (let yy = 0; yy < h; yy++) {
          const tt = yy / h;
          ctx.fillStyle = tt < 0.3 ? C.fire3 : tt < 0.6 ? C.fire2 : tt < 0.85 ? C.fire1 : C.fire0;
          ctx.fillRect(fx, y - 31 - yy, 1, 1);
        }
      }
    } else {
      ctx.fillStyle = "#3a3448"; ctx.fillRect(x - 4, y - 31, 8, 1);
      if (Math.floor(time * 2) % 2 === 0) { ctx.fillStyle = C.dim; ctx.fillRect(x + Math.round(Math.sin(time) * 2), y - 34, 1, 1); }
    }
  }
}

// ======================================================================= Signpost
export class Sign {
  constructor(public def: SignDef) { }
  get x() { return this.def.x; }
  get y() { return this.def.y; }
  draw(ctx: Ctx, camX: number, camY: number) {
    const x = Math.round(this.x - camX), y = Math.round(this.y - camY);
    rect(ctx, x - 1, y - 16, 3, 16, C.wood1); rect(ctx, x, y - 16, 1, 16, C.wood2);
    rect(ctx, x - 9, y - 20, 19, 10, C.ink);
    rect(ctx, x - 8, y - 19, 17, 8, C.wood2); rect(ctx, x - 8, y - 19, 17, 1, C.wood3);
    for (const ly of [-17, -15, -13]) rect(ctx, x - 6, y + ly, 8 + ((ly * 7) % 5), 1, C.wood0);
  }
}

// ======================================================================= Bounty board
/** The notice board by the village gate. Fresh notices glow while contracts are open. */
export function drawBoard(ctx: Ctx, wx: number, wy: number, camX: number, camY: number, open: boolean) {
  const x = Math.round(wx - camX), y = Math.round(wy - camY);
  if (x < -40 || x > 430) return;
  rect(ctx, x - 13, y - 26, 3, 26, C.wood1); rect(ctx, x + 10, y - 26, 3, 26, C.wood1);
  rect(ctx, x - 16, y - 30, 32, 3, C.wood2); rect(ctx, x - 16, y - 30, 32, 1, C.wood3);
  rect(ctx, x - 13, y - 27, 26, 17, C.ink);
  rect(ctx, x - 12, y - 26, 24, 15, C.wood1);
  const papers: [number, number, string][] = [[-10, -24, C.paper], [-2, -25, C.cream], [5, -23, C.paper]];
  papers.forEach(([px, py, col], i) => {
    rect(ctx, x + px, y + py, 6, 8, col);
    rect(ctx, x + px + 1, y + py + 2, 4, 1, C.wood1); rect(ctx, x + px + 1, y + py + 4, 3, 1, C.wood1);
    rect(ctx, x + px + 2, y + py, 2, 1, i === 1 ? C.hp : C.steel1);
  });
  if (open && Math.floor(performance.now() / 500) % 2 === 0) { rect(ctx, x - 1, y - 36, 2, 4, C.gold2); rect(ctx, x - 1, y - 31, 2, 1, C.gold2); }
}

// ======================================================================= NPCs
const npcBuf = new SpriteBuf(60, 50);

export class NPC {
  t = rng.range(0, 10);
  facing = 1;
  hammerT = 0;
  constructor(public def: NpcDef) { }
  get x() { return this.def.x; }
  get y() { return this.def.y; }
  get id() { return this.def.id; }
  get name() { return { brom: "Brom the Smith", maud: "Elder Maud", pip: "Pip" }[this.id]; }

  update(g: Game, dt: number) {
    this.t += dt;
    const p = g.player;
    if (Math.abs(p.cx - this.x) < 60) this.facing = p.cx < this.x ? -1 : 1;
    if (this.id === "brom") {
      const near = Math.abs(p.cx - this.x) < 50;
      this.facing = near ? this.facing : -1;
      if (!near) {
        const prev = this.hammerT;
        this.hammerT = (this.hammerT + dt) % 1.1;
        if (prev < 0.5 && this.hammerT >= 0.5) {
          const dist = Math.abs(p.cx - this.x);
          if (dist < 220) audio.play("clink", clamp(1 - dist / 220, 0, 1) * 3);
          g.particles.burst(this.x - 13, this.y - 12, 6, { speed: 70, colors: [C.fire3, C.fire2, C.fire1], g: 300, max: 0.4, light: 5, lightColor: C.fire1 });
        }
      } else this.hammerT = 0;
    }
  }

  draw(ctx: Ctx, camX: number, camY: number) {
    const sx = Math.round(this.x - camX), sy = Math.round(this.y - camY);
    shadow(ctx, sx, sy + 1, 12);
    const c = npcBuf.begin();
    if (this.id === "brom") this.drawBrom(c);
    else if (this.id === "maud") this.drawMaud(c);
    else this.drawPip(c);
    npcBuf.end(ctx, sx, sy, { flip: this.facing < 0 });
  }

  /** Draw a scaled portrait for dialogue boxes. */
  portrait(ctx: Ctx, x: number, y: number) {
    y += { brom: 2, maud: 4, pip: -7 }[this.id];
    const c = npcBuf.begin();
    if (this.id === "brom") this.drawBrom(c, true);
    else if (this.id === "maud") this.drawMaud(c);
    else this.drawPip(c);
    npcBuf.end(ctx, x, y, { flip: false });
  }

  private drawBrom(c: Ctx, still = false) {
    const swing = !still && this.hammerT > 0 ? this.hammerT : 0;
    const bob = Math.sin(this.t * 2) > 0.5 ? 1 : 0;
    // legs
    rect(c, -4, -7, 3, 7, "#2a2433"); rect(c, 1, -7, 3, 7, "#2a2433");
    rect(c, -5, -1, 4, 1, C.boots); rect(c, 1, -1, 4, 1, C.boots);
    // body + apron
    rect(c, -6, -19 + bob, 12, 13, C.skin1);
    rect(c, -5, -18 + bob, 10, 12, "#6a3a2a");
    rect(c, -4, -17 + bob, 8, 12, C.wood2); rect(c, -4, -17 + bob, 8, 1, C.wood3);
    rect(c, -6, -19 + bob, 2, 3, "#6a3a2a"); rect(c, 4, -19 + bob, 2, 3, "#6a3a2a");
    // head: bald with a big beard
    rect(c, -3, -26 + bob, 7, 7, C.skin1); rect(c, -3, -26 + bob, 7, 1, C.skin2);
    rect(c, 2, -24 + bob, 1, 1, C.ink);
    rect(c, -3, -21 + bob, 8, 5, "#8a4a2a"); rect(c, -2, -17 + bob, 6, 2, "#8a4a2a"); rect(c, 0, -22 + bob, 3, 1, "#8a4a2a");
    rect(c, -4, -24 + bob, 1, 2, "#8a4a2a");
    // arm with hammer
    const up = swing > 0 && swing < 0.5;
    const ang = up ? -2.4 + swing * 1.2 : swing >= 0.5 && swing < 0.62 ? 0.4 : -0.3;
    const hx = 5 + Math.round(Math.cos(ang) * 5), hy = -17 + bob + Math.round(Math.sin(ang) * 5);
    line(c, 5, -18 + bob, hx, hy, C.skin1, 2);
    const tx = hx + Math.round(Math.cos(ang) * 7), ty = hy + Math.round(Math.sin(ang) * 7);
    line(c, hx, hy, tx, ty, C.wood2);
    rect(c, tx - 2, ty - 2, 4, 4, C.steel1); rect(c, tx - 2, ty - 2, 4, 1, C.steel2);
  }

  private drawMaud(c: Ctx) {
    const bob = Math.sin(this.t * 1.4) > 0.6 ? 1 : 0;
    // skirt
    for (let yy = 0; yy < 10; yy++) rect(c, -5 - Math.floor(yy / 4), -10 + yy, 10 + Math.floor(yy / 4) * 2, 1, yy % 4 === 3 ? "#3a2f4a" : "#4a3f5a");
    // shawl (hunched)
    for (let yy = 0; yy < 8; yy++) rect(c, -4 + (yy < 3 ? 1 : 0), -18 + yy + bob, 9, 1, yy % 3 === 0 ? "#6a4a5a" : "#5a3a4a");
    // head forward
    rect(c, 0, -23 + bob, 6, 6, C.skin1); rect(c, 3, -21 + bob, 3, 3, C.skin2);
    rect(c, 0, -24 + bob, 5, 3, "#d8d0c8"); rect(c, -1, -22 + bob, 2, 3, "#d8d0c8");
    rect(c, 4, -21 + bob, 1, 1, C.ink);
    // cane
    line(c, 7, -12 + bob, 9, 0, C.wood1);
    rect(c, 5, -13 + bob, 3, 2, C.skin1);
    rect(c, 7, -13 + bob, 3, 1, C.wood2);
  }

  private drawPip(c: Ctx) {
    const hop = Math.max(0, Math.sin(this.t * 5)) > 0.8 ? 2 : 0;
    rect(c, -2, -5 - hop, 2, 5, "#2a2433"); rect(c, 1, -5 - hop, 2, 5, "#2a2433");
    rect(c, -3, -11 - hop, 7, 6, "#4a7a8f"); rect(c, -3, -7 - hop, 7, 1, C.wood1);
    rect(c, -2, -16 - hop, 6, 5, C.skin1); rect(c, 1, -15 - hop, 3, 3, C.skin2);
    rect(c, 2, -14 - hop, 1, 1, C.ink);
    rect(c, -3, -17 - hop, 7, 2, C.scarf1); rect(c, 3, -16 - hop, 3, 1, C.scarf1);
    line(c, 4, -9 - hop, 8, -15 - hop, C.wood3);
  }

  /** What they say, based on progress. */
  lines(g: Game): string[] {
    const s = g.save, kc = s.kills.wick ?? 0;
    const met = s.flags["met_" + this.id];
    s.flags["met_" + this.id] = true;
    if (this.id === "maud") {
      if (!met) return [
        "Oh! A traveller. Come in from the dark, dear, and warm your hands at the Hearth.",
        "That stone has kept Hollowmere safe for three hundred winters. Rest beside it and it will mend you and refill your tonic flask.",
        "It keeps the old bone dice, too. Fight for the Hearth and it will roll them for you. Fortune favours the stubborn.",
        "It keeps your coin safe, too. Coin you carry, you can lose. Fall out there and your purse stays where you fell.",
        "Fall again before you fetch it... and the Rot keeps it.",
        "One more thing. When you rest, the Rot stirs anew. Whatever you cut down out there will crawl back up.",
        "Old Wick has walked since the last harvest moon. He guarded our wheat for forty years. Now he guards it from us.",
      ];
      if (s.pet && rng.chance(0.4)) return ["Is that... a little Wick? Well. Don't let it near the bread."];
      const ms = milestonesFor(s.hope);
      if (ms > 0 && rng.chance(0.5)) return [[
        "Someone's been lighting the road lamps again. I cried a little. Don't tell Brom.",
        "Brom's apprentice came home. Skinny lad. He can carve a rune better than his master, mind.",
        "Did you see the wheat? Gold again, right up to the orchard. You did that, dear.",
        "The Hearth hasn't burned this bright since I was a girl.",
        "The mill's turning. I can hear it from my chair. Hollowmere remembers you.",
      ][Math.min(ms, 5) - 1]];
      if (s.bountiesDone === 0 && rng.chance(0.5)) return ["If you're looking for work, the notice board by the gate never runs short of it. Every job done gives this village a little hope."];
      if (kc > 0) return [rng.pick([
        "You laid him down, and yet come morning the post isn't empty. The Rot remembers its shapes.",
        "Each time you fell him, the fields breathe a little easier. Keep at it, dear.",
        `Wick has fallen ${kc} ${kc === 1 ? "time" : "times"} now. I've stopped counting. You shouldn't.`,
      ])];
      return [rng.pick([
        "Rest often, dear. The Hearth asks nothing in return. Well. Almost nothing.",
        "Brom can make that steel of yours sing, if you bring him shards of the Rot.",
        "Wick wasn't cruel. Only dutiful. The Rot found the duty and kept it.",
        "Dying isn't the end out there. It's just very, very inconvenient.",
      ])];
    }
    if (this.id === "brom") {
      if (!met) return ["Name's Brom. I make things sharp and people grateful.", "Buy, sell, or let me put an edge on that. Bring Blight Shards and I'll temper the Rot right out of your gear."];
      if (kc > 0 && rng.chance(0.4)) return ["Heard the old scarecrow screaming from here. Nice work. Bring me what's left of him."];
      return [rng.pick([
        "Steel won't fix itself. Well. It will, for coin.",
        "Mind the pitchforks out there. I made most of 'em.",
        "Shards of the Rot. Nasty stuff. Makes a lovely temper, though.",
      ])];
    }
    if (!met) return ["Are you going out THERE? Cool!!", "Tip: the little goo ones? Jump on their heads! They go SPLUT."];
    if (s.pet && rng.chance(0.5)) return ["IS THAT A TINY SCARECROW. I'm naming him Stuart."];
    if (kc > 0 && rng.chance(0.4)) return ["You beat WICK?! Can I have his hat? Please? ...No? Okay."];
    return [rng.pick([
      "Mum says don't go past the gate. Mum also says the scarecrow is 'just resting'.",
      "If you roll right when they swing, you go straight THROUGH. I practise on the chickens.",
      "Hold jump longer to go higher. And you can jump AGAIN in the air! Don't ask me how.",
      "Those husks with forks flash before they stab. Watch for the shiny bit!",
    ])];
  }
}

// ======================================================================= Pet: Lil' Wick
const petBuf = new SpriteBuf(24, 22);

export class Pet {
  x: number; y: number; vy = 0; facing = 1; t = 0; hop = 0;
  constructor(x: number, y: number) { this.x = x; this.y = y; }
  update(g: Game, dt: number) {
    this.t += dt;
    const p = g.player;
    const tx = p.cx - p.facing * 16;
    const dx = tx - this.x;
    if (Math.abs(dx) > 2) this.facing = Math.sign(dx);
    this.x += clamp(dx * 4, -130, 130) * dt;
    const gy = p.bottom;
    if (Math.abs(dx) > 4 && this.hop <= 0) { this.hop = 0.28; }
    this.hop = Math.max(0, this.hop - dt);
    const h = this.hop > 0 ? Math.sin((this.hop / 0.28) * Math.PI) * 5 : 0;
    this.y = approach(this.y, gy - h, 400 * dt);
    if (Math.abs(p.cx - this.x) > 200) { this.x = p.cx; this.y = p.bottom; }
  }
  draw(ctx: Ctx, camX: number, camY: number) {
    const c = petBuf.begin();
    line(c, 0, -1, 0, -6, C.wood1);
    rect(c, -3, -9, 7, 4, C.cloth1); rect(c, -5, -9, 2, 1, C.straw2); rect(c, 4, -9, 2, 1, C.straw2);
    rect(c, -2, -14, 5, 5, "#9a8055");
    c.fillStyle = C.fire2; c.fillRect(-1, -12, 1, 1); c.fillRect(1, -12, 1, 1);
    rect(c, -4, -15, 9, 1, "#4a3528"); rect(c, -2, -18, 5, 3, "#5a4030");
    petBuf.end(ctx, this.x - camX, this.y - camY, { flip: this.facing < 0 });
  }
}
