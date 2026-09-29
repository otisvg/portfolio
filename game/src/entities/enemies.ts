import { audio } from "../core/audio";
import { approach, clamp, sign, type Rect } from "../core/math";
import { rng } from "../core/rng";
import { disc, line, rect, type Ctx } from "../gfx/canvas";
import { C } from "../gfx/palette";
import { shadow, SpriteBuf } from "../gfx/sprite";
import type { Game } from "../game";
import { groundBelow, moveBody, T, touchesTile, type Body } from "../world/physics";

export interface AttackBox extends Rect { dmg: number; id: number }

const ROT_OUTLINE = "#c85ab8";

export abstract class Enemy implements Body {
  x: number; y: number; w: number; h: number;
  vx = 0; vy = 0; onGround = false;
  facing = -1;
  hp: number; maxHp: number;
  dead = false; remove = false; deathT = 0;
  flash = 0; lastHitId = -1;
  st = 0; t = rng.range(0, 10);
  stompable = false; contactDmg = 0; contactId = 0;
  /** Holds one of the limited "may attack now" slots (see Game.requestAttack). */
  token = false;
  /** Rare empowered variant: triple health, harder hits, much better loot. */
  rotborn = false;
  dmgMult = 1;
  announced = false;

  makeRotborn() {
    this.rotborn = true;
    this.hp = this.maxHp = this.maxHp * 3;
    this.dmgMult = 1.3;
  }
  /** Superior Slayer variant: five times the health, hits 40% harder, a gleaming outline. */
  superior = false;
  makeSuperior() {
    this.superior = true;
    this.hp = this.maxHp = this.maxHp * 5;
    this.dmgMult = 1.4;
  }
  get outlineColor() { return this.superior ? (Math.floor(this.t * 6) % 2 ? "#f5f0c0" : "#c9962a") : this.rotborn ? ROT_OUTLINE : undefined; }
  abstract readonly table: string;
  abstract readonly label: string;
  isBoss = false;

  constructor(cx: number, groundY: number, w: number, h: number, hp: number) {
    this.w = w; this.h = h;
    this.x = cx - w / 2; this.y = groundY - h;
    this.hp = this.maxHp = hp;
  }
  get cx() { return this.x + this.w / 2; }
  get bottom() { return this.y + this.h; }
  hurtbox(): Rect { return this; }
  attackBoxes(): AttackBox[] { return []; }
  /** Body contact only hurts while the enemy is mid-attack, never from idle bumping. */
  contactActive() { return false; }

  /** `quiet` hits (bleeding) deal damage without knockback or interrupting the foe. */
  takeHit(g: Game, dmg: number, _crit: boolean, dir: number, quiet = false, heavy = false) {
    this.hp -= dmg;
    this.flash = quiet ? 0.06 : 0.14;
    if (!quiet) this.onHurt(g, dmg, dir, heavy);
    if (this.hp <= 0 && !this.dead) {
      this.dead = true; this.deathT = 0;
      this.onDeath(g);
      g.onEnemyKilled(this);
    }
  }
  protected onHurt(_g: Game, _dmg: number, dir: number, _heavy = false) { this.vx = dir * 90; }
  /** Damage multiplier while the foe is open to punishment. */
  vulnMult() { return 1; }
  protected onDeath(_g: Game) { }

  protected physics(g: Game, dt: number, grav = 900) {
    this.vy = Math.min(this.vy + grav * dt, 360);
    moveBody(this, g.level, dt);
    // the Rot's creatures wade on the bog instead of sinking
    if (touchesTile(g.level, this.x, this.y, this.w, this.h, T.BOG, 1)) {
      const surf = Math.floor((this.bottom) / 16) * 16 + 2;
      if (this.bottom > surf) { this.y = surf - this.h; this.vy = 0; this.onGround = true; }
    }
  }

  bleedT = 0; bleedTick = 0; bleedDmg = 0;
  /** Rend: damage over time, refreshed (not stacked) by repeat procs. */
  bleed(dmg: number, dur = 2) { this.bleedDmg = Math.max(this.bleedDmg, dmg); this.bleedT = dur; this.bleedTick = 0.4; }

  update(g: Game, dt: number) {
    this.t += dt; this.st += dt;
    this.flash = Math.max(0, this.flash - dt);
    if (this.dead) { this.deathT += dt; this.updateDead(g, dt); return; }
    if (this.superior && rng.chance(dt * 16)) g.particles.spawn(this.x + rng.range(0, this.w), this.bottom - rng.range(0, this.h), { vy: -rng.range(15, 35), max: 0.6, color: C.gold3, color2: C.gold1, light: 5, lightColor: C.gold2 });
    if (this.rotborn && rng.chance(dt * 14)) {
      g.particles.spawn(this.x + rng.range(0, this.w), this.bottom - rng.range(0, this.h), { vy: -rng.range(15, 35), max: rng.range(0.4, 0.8), color: C.blight5, color2: C.blight3, light: 5, lightColor: C.blight4, wobble: 10 });
    }
    if (this.bleedT > 0) {
      this.bleedT -= dt; this.bleedTick -= dt;
      if (this.bleedTick <= 0) {
        this.bleedTick = 0.4;
        this.takeHit(g, this.bleedDmg, false, 0, true);
        g.addFloat(`${this.bleedDmg}`, this.cx, this.y - 2, "#e0605a");
        g.particles.burst(this.cx, this.y + this.h / 2, 4, { speed: 40, colors: ["#c7373f", "#6e1a24"], g: 300, max: 0.5 });
      }
      if (this.bleedT <= 0) this.bleedDmg = 0;
      if (this.dead) return;
    }
    this.think(g, dt);
  }
  protected updateDead(g: Game, dt: number) {
    this.physics(g, dt);
    this.vx = approach(this.vx, 0, 300 * dt);
    if (this.deathT > 0.6) this.remove = true;
  }
  protected abstract think(g: Game, dt: number): void;
  abstract draw(g: Game, ctx: Ctx, camX: number, camY: number): void;
  lights(_g: Game, _camX: number, _camY: number) { }

  protected toPlayer(g: Game) {
    const p = g.player;
    return { dx: p.cx - this.cx, dy: p.bottom - this.bottom, dist: Math.hypot(p.cx - this.cx, p.bottom - this.bottom) };
  }
}

// ======================================================================= Blightling
const blobBuf = new SpriteBuf(40, 32);

/** Body colours: dark, mid, light, shine, spots, brow. */
type BlobPal = [string, string, string, string, string, string];
const BLIGHT_PAL: BlobPal = [C.blight2, C.blight3, C.blight4, C.blight5, C.sick1, C.blight1];

export class Blightling extends Enemy {
  readonly table: string = "blightling";
  readonly label: string = "Blightling";
  protected pal: BlobPal = BLIGHT_PAL;
  hopT = rng.range(0.4, 1.4);
  squashT = 0;
  constructor(cx: number, gy: number) {
    super(cx, gy, 14, 10, 24);
    this.stompable = true; this.contactDmg = 10;
  }
  mode: "idle" | "approach" | "tell" | "lunge" | "recover" = "idle";
  protected think(g: Game, dt: number) {
    const was = this.onGround;
    this.physics(g, dt);
    if (!was && this.onGround) { this.squashT = 0.14; this.vx = 0; }
    this.squashT = Math.max(0, this.squashT - dt);
    const { dx, dy } = this.toPlayer(g);
    const aggro = Math.abs(dx) < 120 && Math.abs(dy) < 60 && g.player.alive;
    const bogAhead = (dir: number) => touchesTile(g.level, this.cx + dir * 30 - 4, this.y, 8, this.h + 4, T.BOG, 0);
    switch (this.mode) {
      case "idle":
        if (!this.onGround) break;
        this.vx = approach(this.vx, 0, 400 * dt);
        this.hopT -= dt;
        if (aggro) { this.mode = "approach"; this.hopT = rng.range(0.2, 0.5); break; }
        if (this.hopT <= 0) {
          const dir = rng.sign();
          this.facing = dir; this.vy = -110; this.vx = bogAhead(dir) ? 0 : dir * 25;
          this.hopT = rng.range(1.2, 2.4);
        }
        break;
      case "approach": {
        if (!aggro) { this.mode = "idle"; break; }
        if (!this.onGround) break;
        this.vx = approach(this.vx, 0, 400 * dt);
        this.hopT -= dt;
        if (this.hopT > 0) break;
        const adx = Math.abs(dx);
        if (adx < 75 && g.requestAttack(this)) { this.mode = "tell"; this.st = 0; this.facing = sign(dx) || this.facing; audio.play("hop"); break; }
        // wait for a turn at a respectful distance: close in if far, shuffle back if crowding
        const dir = adx > 50 ? sign(dx) || 1 : -(sign(dx) || 1);
        this.facing = sign(dx) || this.facing;
        this.vy = -rng.range(100, 130);
        this.vx = bogAhead(dir) ? 0 : dir * rng.range(30, 45);
        this.hopT = rng.range(0.45, 0.8);
        break;
      }
      case "tell":
        // squash down and flash: the jump is coming
        this.vx = 0;
        if (this.st > 0.45) {
          const reach = Math.min(Math.abs(dx) * 1.7, 110);
          this.mode = "lunge"; this.st = 0;
          this.vy = -205; this.vx = bogAhead(this.facing) ? 0 : this.facing * Math.max(55, reach);
          this.contactId = g.nextAttackId();
          audio.play("hop");
        }
        break;
      case "lunge":
        if (this.onGround && this.st > 0.1) { this.mode = "recover"; this.st = 0; this.token = false; }
        break;
      case "recover":
        this.vx = approach(this.vx, 0, 400 * dt);
        if (this.st > rng.range(0.7, 1.1)) { this.mode = aggro ? "approach" : "idle"; this.hopT = rng.range(0.2, 0.5); }
        break;
    }
  }
  contactActive() { return this.mode === "lunge"; }
  protected onHurt(_g: Game, _d: number, dir: number) { this.vx = dir * 110; this.vy = -90; this.mode = "recover"; this.st = 0; this.token = false; }
  protected onDeath(g: Game) {
    audio.play("splat");
    g.particles.splat(this.cx, this.y + 5, [this.pal[1], this.pal[2], this.pal[4], this.pal[0]], 16);
    this.remove = true;
  }
  stomped(g: Game) {
    this.squashT = 0.25;
    this.mode = "recover"; this.st = 0; this.token = false;
    g.particles.splat(this.cx, this.y, [this.pal[2], this.pal[4]], 6);
  }
  draw(g: Game, ctx: Ctx, camX: number, camY: number) {
    const sx = this.cx - camX, sy = this.bottom - camY;
    shadow(ctx, sx, sy + 1, 12);
    const c = blobBuf.begin();
    const air = !this.onGround;
    let rx = 7, ry = 5;
    if (this.mode === "tell") { const k = Math.min(1, this.st / 0.3); rx = 7 + 2.5 * k; ry = 5 - 2 * k; }
    else if (this.squashT > 0) { rx = 9; ry = 3; } else if (air) { rx = 5.5; ry = 6.5; } else { const w = Math.sin(this.t * 5) * 0.5; rx += w; ry -= w; }
    const cy = -ry;
    const P = this.pal;
    disc(c, 0, cy, rx, ry, P[0]);
    disc(c, -0.5, cy - 0.5, rx - 1.2, ry - 1.2, P[1]);
    disc(c, -2, cy - ry * 0.45, Math.max(1, rx * 0.35), Math.max(1, ry * 0.3), P[2]);
    c.fillStyle = P[3]; c.fillRect(-3, Math.round(cy - ry * 0.6), 1, 1);
    // sickly spots & drip
    c.fillStyle = P[4]; c.fillRect(Math.round(rx * 0.4), Math.round(cy + 1), 1, 1); c.fillRect(-Math.round(rx * 0.6), Math.round(cy + 2), 1, 1);
    if (!air) { c.fillStyle = P[1]; c.fillRect(Math.round(-rx + 2), 0, 1, 1 + (Math.floor(this.t * 2) % 2)); }
    // eye tracks the player
    const look = clamp((g.player.cx - this.cx) / 30, -1, 1);
    const ex = Math.round(1 + look), ey = Math.round(cy - 1);
    rect(c, ex - 1, ey - 1, 4, 3, C.cream);
    rect(c, ex + (look > 0 ? 1 : 0), ey, 2, 2, C.ink);
    rect(c, ex - 1, ey - 2, 4, 1, P[5]);
    const tell = this.mode === "tell" && Math.floor(this.st * 12) % 2 === 0 ? 0.55 : 0;
    blobBuf.end(ctx, sx, sy, { flip: false, outline: this.outlineColor, flash: this.flash * 8 + tell });
  }
  lights(g: Game, camX: number, camY: number) { g.lighting.add(this.cx - camX, this.y + 4 - camY, 14, this.pal[2], 0.5); }
}

// ======================================================================= Rotcrow
const crowBuf = new SpriteBuf(40, 30, 10);

export class Crow extends Enemy {
  readonly table: string = "crow";
  readonly label: string = "Rotcrow";
  home: { x: number; y: number };
  mode: "hover" | "tell" | "dive" | "rise" | "stun" = "hover";
  target = { x: 0, y: 0 };
  cd = rng.range(0.5, 1.5);
  attackId = 0;
  constructor(cx: number, y: number) {
    super(cx, y + 8, 12, 8, 14);
    this.home = { x: this.x, y: this.y };
    this.contactDmg = 12;
  }
  protected think(g: Game, dt: number) {
    const { dx, dist } = this.toPlayer(g);
    const p = g.player;
    this.cd -= dt;
    switch (this.mode) {
      case "hover": {
        const tx = this.home.x + Math.sin(this.t * 0.8) * 14, ty = this.home.y + Math.sin(this.t * 2.1) * 4;
        this.vx = approach(this.vx, (tx - this.x) * 2, 200 * dt);
        this.vy = approach(this.vy, (ty - this.y) * 2, 200 * dt);
        if (Math.abs(dx) > 2) this.facing = sign(dx);
        if (dist < 140 && this.cd <= 0 && p.alive && g.requestAttack(this)) {
          this.mode = "tell"; this.st = 0; audio.play("caw");
        }
        break;
      }
      case "tell":
        this.vx = approach(this.vx, 0, 300 * dt); this.vy = approach(this.vy, -25, 300 * dt);
        this.facing = sign(dx) || this.facing;
        if (this.st > 0.5) { this.mode = "dive"; this.st = 0; this.target = { x: p.cx - this.w / 2, y: p.y + 6 }; this.attackId = g.nextAttackId(); }
        break;
      case "dive": {
        const ddx = this.target.x - this.x, ddy = this.target.y - this.y;
        const d = Math.hypot(ddx, ddy) || 1;
        this.vx = (ddx / d) * 210; this.vy = (ddy / d) * 210;
        if (d < 6 || this.st > 1.0) { this.mode = "rise"; this.st = 0; this.token = false; }
        break;
      }
      case "rise":
        this.vx = approach(this.vx, (this.home.x - this.x) * 1.5, 250 * dt);
        this.vy = approach(this.vy, -80, 300 * dt);
        if (this.y <= this.home.y + 2 || this.st > 1.6) { this.mode = "hover"; this.cd = rng.range(1.1, 2.0); }
        break;
      case "stun":
        this.vx = approach(this.vx, 0, 200 * dt); this.vy = approach(this.vy, 0, 200 * dt);
        if (this.st > 0.35) { this.mode = "rise"; this.st = 0; }
        break;
    }
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (g.level.solidAt(Math.floor(this.cx / 16), Math.floor(this.bottom / 16))) { this.y -= this.vy * dt; if (this.mode === "dive") { this.mode = "rise"; this.st = 0; this.token = false; } }
    this.contactId = this.attackId;
  }
  contactActive() { return this.mode === "dive"; }
  protected onHurt(_g: Game, _d: number, dir: number) { this.vx = dir * 120; this.vy = -40; this.mode = "stun"; this.st = 0; this.token = false; }
  protected onDeath(g: Game) {
    audio.play("caw");
    g.particles.burst(this.cx, this.y + 4, 10, { speed: 60, colors: [C.inkSoft, "#2a2438", C.blight2], max: 0.9, g: 120, drag: 2, wobble: 30 });
  }
  protected updateDead(g: Game, dt: number) {
    this.vy += 600 * dt; this.x += this.vx * dt; this.y += this.vy * dt;
    if (this.deathT > 0.7) { this.remove = true; g.particles.burst(this.cx, this.y, 6, { speed: 40, colors: [C.blight3, C.inkSoft], max: 0.5 }); }
  }
  draw(g: Game, ctx: Ctx, camX: number, camY: number) {
    void g;
    const sx = this.cx - camX, sy = this.bottom - camY;
    const c = crowBuf.begin();
    const flap = this.mode === "dive" ? 2 : Math.floor(this.t * (this.mode === "tell" ? 18 : 10)) % 3;
    const body = "#221c30", hi = "#3a3452";
    rect(c, -4, -6, 9, 5, body); rect(c, -3, -7, 6, 1, hi);
    rect(c, 4, -8, 4, 4, body); // head
    rect(c, 8, -6, 2, 1, C.gold1); rect(c, 8, -5, 1, 1, C.gold0);
    rect(c, 6, -7, 1, 1, this.mode === "tell" ? C.white : "#e0405a");
    rect(c, -7, -5, 3, 2, body); rect(c, -8, -4, 2, 1, hi); // tail
    if (flap === 0) { line(c, -2, -7, -6, -12, body, 2); line(c, 0, -7, -3, -13, hi); }
    else if (flap === 1) { rect(c, -4, -7, 8, 2, body); rect(c, -3, -7, 6, 1, hi); }
    else { line(c, -2, -3, -5, 1, body, 2); line(c, 0, -3, -2, 2, hi); }
    if (this.dead) { c.fillStyle = C.ink; c.fillRect(6, -7, 1, 1); }
    crowBuf.end(ctx, sx, sy, { flip: this.facing < 0, outline: this.outlineColor, flash: this.flash * 8 + (this.mode === "tell" && Math.floor(this.st * 12) % 2 ? 0.6 : 0) });
  }
  lights(g: Game, camX: number, camY: number) { g.lighting.add(this.cx + this.facing * 4 - camX, this.y + 2 - camY, 8, "#e0405a", 0.5); }
}

// ======================================================================= Husk
const huskBuf = new SpriteBuf(90, 48, 6);
/** Husk timing: wind-up length, when the tell glint appears, and how long the fork stays stuck. */
const HUSK_WINDUP = 0.6, HUSK_GLINT = 0.38, HUSK_STUCK = 0.9;

export class Husk extends Enemy {
  readonly table: string = "husk";
  readonly label: string = "Husk";
  /** Drowned Miners share the Husk's moveset with a pick instead of a fork. */
  protected miner = false;
  mode: "idle" | "walk" | "windup" | "thrust" | "stuck" | "recover" | "stagger" = "idle";
  poise = 26; poiseDmg = 0; poiseT = 0;
  thrustId = 0; walkPhase = 0; glinted = false;
  constructor(cx: number, gy: number) { super(cx, gy, 12, 22, 60); }
  makeRotborn() { super.makeRotborn(); this.poise *= 2; }

  protected think(g: Game, dt: number) {
    this.physics(g, dt);
    const { dx, dy } = this.toPlayer(g);
    this.poiseT -= dt;
    if (this.poiseT <= 0) this.poiseDmg = 0;
    const aggro = Math.abs(dx) < 170 && Math.abs(dy) < 60 && g.player.alive;
    switch (this.mode) {
      case "idle":
        this.vx = approach(this.vx, 0, 300 * dt);
        if (aggro) { this.mode = "walk"; this.st = 0; }
        break;
      case "walk": {
        this.facing = sign(dx) || this.facing;
        const inRange = Math.abs(dx) < 38 && Math.abs(dy) < 24;
        if (inRange && g.requestAttack(this)) { this.startWindup(0.55); break; }
        // without a turn to attack, hold just outside fork reach
        const want = inRange ? 0 : Math.abs(dx) < 48 ? 0 : this.facing * 34;
        const edge = !groundBelow(g.level, this.cx + this.facing * 10, this.bottom) || touchesTile(g.level, this.cx + this.facing * 10 - 2, this.y, 4, this.h + 4, T.BOG, 0);
        this.vx = edge ? 0 : approach(this.vx, want, 300 * dt);
        this.walkPhase += Math.abs(this.vx) * dt * 0.2;
        if (!aggro) { this.mode = "idle"; break; }
        break;
      }
      case "windup":
        // committed: the fork rises, then glints 0.2s before the thrust. That glint is your cue.
        this.vx = approach(this.vx, -this.facing * 10, 200 * dt);
        if (!this.glinted && this.st > HUSK_GLINT) { this.glinted = true; audio.play("tell"); }
        if (this.st > HUSK_WINDUP) {
          this.mode = "thrust"; this.st = 0; this.thrustId = g.nextAttackId();
          this.vx = this.facing * 120;
          audio.play("swingHeavy");
        }
        break;
      case "thrust":
        this.vx = approach(this.vx, 0, 500 * dt);
        if (this.st > 0.2) {
          this.mode = "stuck"; this.st = 0; this.vx = 0;
          audio.play("land");
          g.particles.dust(this.cx + this.facing * 22, this.bottom, 6);
        }
        break;
      case "stuck":
        // the fork is wedged in the dirt: this is the opening
        this.vx = 0;
        if (this.st > HUSK_STUCK) { this.mode = "recover"; this.st = 0; }
        break;
      case "recover":
        this.vx = approach(this.vx, 0, 400 * dt);
        if (this.st > 0.3) { this.mode = "walk"; this.st = 0; this.token = false; }
        break;
      case "stagger":
        this.vx = approach(this.vx, 0, 300 * dt);
        if (this.st > 0.6) { this.mode = "walk"; this.st = 0; this.token = false; }
        break;
    }
  }
  private startWindup(_t: number) {
    this.mode = "windup"; this.st = 0; this.glinted = false;
  }
  vulnMult() { return this.mode === "stuck" || this.mode === "recover" ? 1.5 : 1; }
  attackBoxes(): AttackBox[] {
    if (this.mode !== "thrust" || this.st > 0.16) return [];
    const x0 = this.facing > 0 ? this.cx + 4 : this.cx - 4 - 28;
    return [{ x: x0, y: this.y + 5, w: 28, h: 10, dmg: this.miner ? 26 : 22, id: this.thrustId }];
  }
  protected onHurt(g: Game, dmg: number, dir: number, heavy = false) {
    if (this.mode === "windup" || this.mode === "thrust") {
      // armoured while committed: only a finisher or a counter breaks through
      if (heavy) { this.mode = "stagger"; this.st = 0; this.vx = dir * 90; this.token = false; audio.play("crit"); return; }
      audio.play("clink", 3);
      g.particles.hit(this.cx - dir * 4, this.y + 8, -dir, C.steel2, 4);
      return;
    }
    if (this.mode === "stuck" || this.mode === "recover") return; // stays open to punishment
    this.poiseDmg += dmg; this.poiseT = 1.2;
    if (this.poiseDmg >= this.poise) {
      this.poiseDmg = 0; this.mode = "stagger"; this.st = 0; this.vx = dir * 80; this.token = false;
    } else this.vx += dir * 25;
  }
  protected onDeath(g: Game) {
    audio.play("splat");
    this.vx = 0;
    g.particles.burst(this.cx, this.y + 8, 18, { speed: 50, colors: [C.blight3, C.blight4, C.blight2, C.sick1], max: 1.2, g: -30, drag: 1.5, wobble: 20, light: 5, lightColor: C.blight4 });
  }
  protected updateDead(g: Game, dt: number) {
    this.physics(g, dt);
    if (this.deathT > 0.9) this.remove = true;
  }
  draw(g: Game, ctx: Ctx, camX: number, camY: number) {
    void g;
    const sx = this.cx - camX, sy = this.bottom - camY;
    shadow(ctx, sx, sy + 1, 12);
    const c = huskBuf.begin();
    const m = this.mode;
    let lean = 2, forkAng = 0.35, handX = 5, handY = -12, bob = 0;
    let fF = [2, 0], bF = [-2, 0];
    if (m === "walk") {
      const ph = this.walkPhase;
      fF = [Math.round(Math.sin(ph) * 2), -Math.round(Math.max(0, Math.cos(ph)))];
      bF = [Math.round(-Math.sin(ph) * 2), -Math.round(Math.max(0, -Math.cos(ph)))];
      bob = Math.abs(Math.sin(ph)) > 0.7 ? 1 : 0;
    } else if (m === "idle") { bob = Math.sin(this.t * 1.7) > 0.4 ? 1 : 0; }
    if (m === "windup") {
      const k = Math.min(1, this.st / HUSK_GLINT);
      lean = Math.round(1 - 2 * k); forkAng = -0.25 * k; handX = Math.round(3 - 6 * k); handY = -12 - Math.round(2 * k); fF = [3, 0]; bF = [-3, 0];
    }
    if (m === "thrust") { lean = 4; forkAng = 0; handX = 10; handY = -12; fF = [4, 0]; bF = [-4, 0]; }
    if (m === "stuck") { lean = 5; forkAng = 0.95; handX = 9; handY = -9; fF = [4, 0]; bF = [-5, 0]; bob = 1; }
    if (m === "recover") { lean = 3; forkAng = 0.95 - this.st * 1.5; handX = 7; handY = -9; }
    if (m === "stagger") { lean = -2; forkAng = -1.2; handX = 0; handY = -17; }
    let dying = 0;
    if (this.dead) { dying = clamp(this.deathT / 0.6, 0, 1); bob = Math.round(dying * 10); lean = 3 + Math.round(dying * 3); }
    const mn = this.miner;
    const skin = mn ? "#6a8a8e" : "#7a8a6a", skinD = mn ? "#4a6a70" : "#5a6a52", shirt = mn ? "#3a4a5a" : "#4a3f55", shirtD = mn ? "#283444" : "#342c40";
    // legs
    line(c, -1, -9 + bob, bF[0] - 1, bF[1] - 1, "#2a2433", 2);
    line(c, 1, -9 + bob, fF[0] + 1, fF[1] - 1, "#3a3040", 2);
    // torso (hunched)
    for (let yy = 0; yy < 10; yy++) {
      const off = Math.round((lean * (10 - yy)) / 10);
      rect(c, -3 + off, -18 + yy + bob, 7, 1, yy % 4 === 3 ? shirtD : shirt);
      c.fillStyle = shirtD; c.fillRect(-3 + off, -18 + yy + bob, 1, 1);
    }
    c.fillStyle = C.blight3; c.fillRect(-1 + lean, -15 + bob, 1, 1); c.fillRect(1 + lean, -12 + bob, 1, 1);
    // head
    const hx = -2 + lean + 1, hy = -23 + bob;
    rect(c, hx, hy, 5, 5, skin); rect(c, hx, hy + 3, 5, 2, skinD);
    const eyeC = m === "stuck" || m === "recover" ? "#4a3a5a" : m === "windup" && this.glinted ? C.white : mn ? "#6ad0c0" : "#d070ff";
    rect(c, hx + 3, hy + 1, 1, 1, eyeC); rect(c, hx + 1, hy + 1, 1, 1, eyeC);
    rect(c, hx + 2, hy + 3, 2, 1, C.ink);
    const ca = Math.cos(forkAng), sa = Math.sin(forkAng);
    if (mn) {
      // dented brass helmet with a lamp that still burns
      rect(c, hx - 2, hy - 1, 10, 1, "#6a5a2a"); rect(c, hx - 1, hy - 3, 7, 2, "#8a7a3a"); rect(c, hx, hy - 4, 5, 1, "#a8964a");
      rect(c, hx + 5, hy - 3, 2, 2, this.dead ? "#4a3a2a" : C.fire2);
      c.fillStyle = "#2e7a78"; c.fillRect(hx - 1, hy + 4, 1, 2); c.fillRect(hx + 4, hy + 5, 1, 1); // barnacles
      // pickaxe
      for (let i = -8; i <= 18; i++) { c.fillStyle = i % 5 === 0 ? C.wood1 : C.wood2; c.fillRect(Math.round(handX + ca * i), Math.round(handY + sa * i), 1, 1); }
      for (let j = -6; j <= 6; j++) {
        const back = Math.abs(j) * Math.abs(j) * 0.12;
        const px = handX + ca * (19 - back) - sa * j, py = handY + sa * (19 - back) + ca * j;
        c.fillStyle = Math.abs(j) > 4 ? C.steel3 : Math.abs(j) < 2 ? C.steel0 : C.steel1;
        c.fillRect(Math.round(px), Math.round(py), 1, 1);
        c.fillStyle = C.steel0; c.fillRect(Math.round(px - ca), Math.round(py - sa), 1, 1);
      }
    } else {
      // tattered straw hat
      rect(c, hx - 3, hy - 1, 11, 1, C.straw1); rect(c, hx - 1, hy - 3, 7, 2, C.straw1); rect(c, hx, hy - 3, 5, 1, C.straw2);
      c.fillStyle = C.straw0; c.fillRect(hx - 3, hy, 1, 1); c.fillRect(hx + 7, hy, 1, 1);
      // pitchfork
      for (let i = -10; i <= 18; i++) { c.fillStyle = i % 5 === 0 ? C.wood1 : C.wood2; c.fillRect(Math.round(handX + ca * i), Math.round(handY + sa * i), 1, 1); }
      for (let j = -2; j <= 2; j++) { c.fillStyle = C.steel1; c.fillRect(Math.round(handX + ca * 18 - sa * j), Math.round(handY + sa * 18 + ca * j), 1, 1); }
      for (const j of [-2, 0, 2]) for (let i = 19; i <= 23; i++) { c.fillStyle = i === 23 ? C.steel3 : C.steel2; c.fillRect(Math.round(handX + ca * i - sa * j), Math.round(handY + sa * i + ca * j), 1, 1); }
    }
    rect(c, handX - 1, handY - 1, 2, 2, skin);
    line(c, lean, -16 + bob, handX, handY, shirt);
    const alpha = this.dead ? 1 - dying : 1;
    huskBuf.end(ctx, sx, sy, { flip: this.facing < 0, outline: this.outlineColor, flash: this.flash * 8 + (m === "windup" && this.glinted && this.st < HUSK_GLINT + 0.06 ? 0.8 : 0), alpha });
    if (m === "windup" && this.glinted) {
      // telegraph glint on the tines
      const tx = sx + this.facing * (handX + ca * 22), ty = sy + handY + sa * 22;
      if (Math.floor(this.st * 10) % 2 === 0) { ctx.fillStyle = C.white; ctx.fillRect(Math.round(tx), Math.round(ty) - 2, 1, 5); ctx.fillRect(Math.round(tx) - 2, Math.round(ty), 5, 1); }
    }
  }
  lights(g: Game, camX: number, camY: number) {
    if (this.dead) return;
    if (this.miner) g.lighting.add(this.cx + this.facing * 5 - camX, this.y - 1 - camY, 26, C.fire1, 0.75);
    if (this.mode === "stuck" || this.mode === "recover") return;
    g.lighting.add(this.cx + this.facing * 3 - camX, this.y + 3 - camY, 10, this.miner ? "#6ad0c0" : "#d070ff", this.mode === "windup" && this.glinted ? 1 : 0.45);
  }
}

// ======================================================================= Mines variants
const SLUDGE_PAL: BlobPal = ["#1a4a52", "#2e7a78", "#4aa89a", "#9ae0d0", "#c9e06a", "#11303a"];

/** Flood-water goo from the Mines. Tougher and hits harder than its orchard cousin. */
export class Sludgeling extends Blightling {
  readonly table = "sludgeling";
  readonly label = "Sludgeling";
  constructor(cx: number, gy: number) {
    super(cx, gy);
    this.pal = SLUDGE_PAL;
    this.hp = this.maxHp = 32;
    this.contactDmg = 13;
  }
}

const batBuf = new SpriteBuf(40, 30, 10);

export class Bat extends Crow {
  readonly table = "bat";
  readonly label = "Cave Bat";
  constructor(cx: number, y: number) {
    super(cx, y);
    this.hp = this.maxHp = 16;
    this.contactDmg = 13;
  }
  protected onDeath(g: Game) {
    audio.play("caw", 0);
    g.particles.burst(this.cx, this.y + 4, 10, { speed: 60, colors: ["#2a2438", "#4a3a4a", "#6ad0c0"], max: 0.9, g: 120, drag: 2, wobble: 30 });
  }
  draw(_g: Game, ctx: Ctx, camX: number, camY: number) {
    const sx = this.cx - camX, sy = this.bottom - camY;
    const c = batBuf.begin();
    const flap = this.mode === "dive" ? 2 : Math.floor(this.t * (this.mode === "tell" ? 20 : 12)) % 3;
    const body = "#2a2032", hi = "#4a3a50", membrane = "#3a2a42";
    rect(c, -2, -7, 5, 5, body); rect(c, -1, -8, 3, 1, hi);
    rect(c, -2, -9, 1, 2, body); rect(c, 2, -9, 1, 2, body); // ears
    const eye = this.mode === "tell" ? C.white : "#6ad0c0";
    c.fillStyle = eye; c.fillRect(-1, -6, 1, 1); c.fillRect(1, -6, 1, 1);
    c.fillStyle = C.cream; c.fillRect(0, -4, 1, 1); // fang
    const wing = (dir: number) => {
      if (flap === 0) { line(c, dir * 2, -6, dir * 9, -11, membrane, 2); line(c, dir * 9, -11, dir * 11, -6, hi); }
      else if (flap === 1) { rect(c, dir > 0 ? 3 : -10, -7, 8, 2, membrane); c.fillStyle = hi; c.fillRect(dir * 10, -6, 1, 1); }
      else { line(c, dir * 2, -4, dir * 7, 0, membrane, 2); line(c, dir * 7, 0, dir * 9, -3, hi); }
    };
    wing(-1); wing(1);
    if (this.dead) { c.fillStyle = C.ink; c.fillRect(-1, -6, 3, 1); }
    batBuf.end(ctx, sx, sy, { flip: this.facing < 0, outline: this.outlineColor, flash: this.flash * 8 + (this.mode === "tell" && Math.floor(this.st * 12) % 2 ? 0.6 : 0) });
  }
  lights(g: Game, camX: number, camY: number) { g.lighting.add(this.cx - camX, this.y + 2 - camY, 9, "#6ad0c0", 0.5); }
}

export class Miner extends Husk {
  readonly table = "miner";
  readonly label = "Drowned Miner";
  constructor(cx: number, gy: number) {
    super(cx, gy);
    this.miner = true;
    this.hp = this.maxHp = 76;
    this.poise = 30;
  }
}

// ======================================================================= Pot
export class Pot {
  x: number; y: number; w = 10; h = 12;
  broken = false; lastHitId = -1;
  constructor(cx: number, gy: number, readonly variant: number) { this.x = cx - 5; this.y = gy - 12; }
  get cx() { return this.x + 5; }
  hurtbox(): Rect { return this; }
  break(g: Game) {
    this.broken = true;
    audio.play("pot");
    g.particles.burst(this.cx, this.y + 6, 12, { speed: 90, colors: ["#8a4a3a", "#a86a4a", "#5a2f2a"], g: 400, max: 0.8, size: 2 });
    g.spawnDrops("pot", this.cx, this.y + 4);
  }
  draw(ctx: Ctx, camX: number, camY: number) {
    if (this.broken) return;
    const x = Math.round(this.x - camX), y = Math.round(this.y - camY);
    const body = this.variant ? "#7a4a5a" : "#9a5a3f", hi = this.variant ? "#a46a7a" : "#c07a55", lo = this.variant ? "#4a2a3a" : "#5e3024";
    ctx.fillStyle = C.ink;
    ctx.fillRect(x + 2, y - 1, 6, 1); ctx.fillRect(x, y + 3, 10, 7); ctx.fillRect(x + 1, y + 2, 8, 9); ctx.fillRect(x + 2, y + 11, 6, 1);
    rect(ctx, x + 3, y, 4, 2, lo); rect(ctx, x + 2, y, 6, 1, body);
    rect(ctx, x + 1, y + 3, 8, 7, body); rect(ctx, x + 2, y + 2, 6, 9, body);
    rect(ctx, x + 2, y + 4, 2, 4, hi); rect(ctx, x + 7, y + 4, 1, 6, lo); rect(ctx, x + 3, y + 10, 5, 1, lo);
    rect(ctx, x + 1, y + 6, 8, 1, lo);
  }
}
