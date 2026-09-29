import { audio } from "../core/audio";
import { approach, clamp, type Rect } from "../core/math";
import { rng } from "../core/rng";
import type { Ctx } from "../gfx/canvas";
import { line, rect } from "../gfx/canvas";
import { drawIcon } from "../gfx/icons";
import { C, RARITY } from "../gfx/palette";
import { shadow, SpriteBuf } from "../gfx/sprite";
import { drawSmear, drawWeapon } from "../gfx/weapons";
import type { Game } from "../game";
import { baseOf } from "../systems/items";
import { groundBelow, moveBody, T, touchesTile, type Body } from "../world/physics";

export type PState = "normal" | "attack" | "roll" | "hurt" | "drink" | "dead" | "rest" | "fog";

const GRAV = 900, JUMP_V = 300, DJUMP_V = 262, MAX_FALL = 340;
const RUN = 100, ACC = 1000, DEC = 1500, AIR_ACC = 720;
const ROLL_SPEED = 185, ROLL_T = 0.36, ROLL_IF: [number, number] = [0.02, 0.3], ROLL_COST = 22;
const DJUMP_COST = 8;

interface Swing { wind: number; active: number; rec: number; dmg: number; a0: number; a1: number; lunge: number; cost: number; heavy?: boolean }
const SWINGS: Swing[] = [
  { wind: 0.08, active: 0.09, rec: 0.2, dmg: 1, a0: -2.1, a1: 1.1, lunge: 55, cost: 14 },
  { wind: 0.06, active: 0.09, rec: 0.2, dmg: 1, a0: 1.2, a1: -1.7, lunge: 55, cost: 14 },
  { wind: 0.16, active: 0.12, rec: 0.32, dmg: 1.6, a0: -2.8, a1: 1.35, lunge: 120, cost: 22, heavy: true },
];

const buf = new SpriteBuf(120, 100, 30);

export class Player implements Body {
  x: number; y: number; w = 10; h = 20;
  vx = 0; vy = 0; onGround = false;
  facing = 1;
  hp = 100; stam = 100; stamDelay = 0; tonics = 3;
  state: PState = "normal"; st = 0;
  combo = 0; queued = false; lunged = false; airAttack = false;
  swingId = 0;
  atkBuf = 0; jumpBuf = 0; rollBuf = 0; coyote = 0; canDouble = true; jumpHeld = false;
  dropT = 0;
  invuln = 0; hurtFlash = 0;
  animT = 0; runPhase = 0; squash = 0;
  healLeft = 0; drinkDone = false;
  lastSafe: { x: number; y: number };
  safeT = 0;
  hpTrail = 100; trailDelay = 0;
  deathHandled = false;
  hazardCd = 0;

  constructor(x: number, y: number) {
    this.x = x - this.w / 2;
    this.y = y - this.h;
    this.lastSafe = { x: this.x, y: this.y };
  }

  get cx() { return this.x + this.w / 2; }
  get bottom() { return this.y + this.h; }
  get iframes() { return this.state === "roll" && this.st >= ROLL_IF[0] && this.st <= ROLL_IF[1]; }
  get alive() { return this.state !== "dead"; }
  hurtbox(): Rect { return { x: this.x + 1, y: this.y + 2, w: this.w - 2, h: this.h - 2 }; }

  place(x: number, groundY: number) {
    this.x = x - this.w / 2; this.y = groundY - this.h;
    this.vx = this.vy = 0;
    this.lastSafe = { x: this.x, y: this.y };
  }

  spendStam(n: number) {
    this.stam -= n;
    this.stamDelay = 0.55;
  }

  update(g: Game, dt: number) {
    const inp = g.input, s = g.stats;
    this.st += dt; this.animT += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    this.squash = Math.max(0, this.squash - dt);
    this.dropT = Math.max(0, this.dropT - dt);
    this.hazardCd = Math.max(0, this.hazardCd - dt);

    this.jumpBuf = inp.pressed("jump") ? 0.12 : this.jumpBuf - dt;
    this.atkBuf = inp.pressed("attack") ? 0.18 : this.atkBuf - dt;
    this.rollBuf = inp.pressed("roll") ? 0.14 : this.rollBuf - dt;

    // HP damage trail (Souls-style)
    if (this.hpTrail > this.hp) { this.trailDelay -= dt; if (this.trailDelay <= 0) this.hpTrail = Math.max(this.hp, this.hpTrail - 60 * dt); }
    else this.hpTrail = this.hp;

    if (this.healLeft > 0) {
      const amt = Math.min(this.healLeft, s.maxHp * 0.9 * dt);
      this.hp = Math.min(s.maxHp, this.hp + amt);
      this.healLeft -= amt;
      if (this.hp >= s.maxHp) this.healLeft = 0;
    }
    if (this.state !== "attack" && this.state !== "roll") {
      if (this.stamDelay > 0) this.stamDelay -= dt;
      else this.stam = Math.min(s.maxStam, this.stam + 58 * s.regenMult * dt);
    }

    const move = (inp.isHeld("right") ? 1 : 0) - (inp.isHeld("left") ? 1 : 0);

    switch (this.state) {
      case "normal": this.normal(g, dt, move); break;
      case "attack": this.attack(g, dt, move); break;
      case "roll": this.roll(g, dt); break;
      case "hurt":
        this.vx = approach(this.vx, 0, 500 * dt);
        if (this.st > 0.26) this.state = "normal";
        break;
      case "drink":
        this.vx = approach(this.vx, move * RUN * 0.3, ACC * dt);
        if (this.st > 0.45 && !this.drinkDone) {
          this.drinkDone = true;
          this.healLeft += s.maxHp * 0.45;
          audio.play("heal");
          for (let i = 0; i < 14; i++) g.particles.spawn(this.cx + rng.range(-6, 6), this.bottom - rng.range(0, 18), { vy: rng.range(-40, -15), max: rng.range(0.4, 0.8), color: C.scarf2, color2: C.fire2, light: 6, lightColor: C.scarf2 });
        }
        if (this.st > 0.85) this.state = "normal";
        break;
      case "dead":
        this.vx = approach(this.vx, 0, 400 * dt);
        if (this.st > 1.6 && !this.deathHandled) { this.deathHandled = true; g.onPlayerDeathDone(); }
        break;
      case "rest":
        this.vx = 0;
        break;
      case "fog":
        this.vx = 38; this.facing = 1;
        this.x += this.vx * dt;
        this.animRun(dt);
        return;
    }

    // variable jump height
    if (this.jumpHeld && !inp.isHeld("jump") && this.vy < 0) { this.vy *= 0.45; this.jumpHeld = false; }
    if (this.vy >= 0) this.jumpHeld = false;

    // physics
    this.vy = Math.min(this.vy + GRAV * dt, MAX_FALL);
    const res = moveBody(this, g.level, dt, { dropThrough: this.dropT > 0 });
    if (res.landed) {
      this.canDouble = true;
      if (res.landVy > 140) {
        g.particles.dust(this.cx, this.bottom, 5);
        audio.play("land");
        this.squash = 0.1;
      }
    }
    if (this.onGround) { this.coyote = 0.1; this.canDouble = true; }
    else this.coyote -= dt;

    if (Math.abs(this.vx) > 5 && this.onGround) this.animRun(dt);
    else if (this.onGround) this.runPhase = 0;

    this.hazards(g, dt);
  }

  private animRun(dt: number) {
    const prev = this.runPhase;
    this.runPhase += Math.abs(this.vx) * dt * 0.16;
    if (Math.floor(prev / Math.PI) !== Math.floor(this.runPhase / Math.PI) && this.onGround) audio.play("step");
  }

  private normal(g: Game, dt: number, move: number) {
    const s = g.stats, inp = g.input;
    const speed = RUN * s.moveMult;
    const accel = this.onGround ? (move ? ACC : DEC) : AIR_ACC;
    this.vx = approach(this.vx, move * speed, accel * dt);
    if (move) this.facing = move;

    if (this.jumpBuf > 0) {
      const onOneWay = this.onGround && g.level.isOneWay(g.level.get(Math.floor(this.cx / 16), Math.floor((this.bottom + 1) / 16)));
      if (inp.isHeld("down") && onOneWay) {
        this.dropT = 0.22; this.jumpBuf = 0; this.y += 1; this.onGround = false;
      } else if (this.onGround || this.coyote > 0) {
        this.vy = -JUMP_V; this.jumpBuf = 0; this.coyote = 0; this.jumpHeld = true; this.onGround = false;
        audio.play("jump");
        g.particles.dust(this.cx, this.bottom, 3);
      } else if (this.canDouble && this.stam >= DJUMP_COST) {
        this.vy = -DJUMP_V; this.canDouble = false; this.jumpBuf = 0; this.jumpHeld = true;
        this.spendStam(DJUMP_COST);
        audio.play("djump");
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          g.particles.spawn(this.cx, this.bottom, { vx: Math.cos(a) * 50, vy: Math.sin(a) * 18 + 10, max: 0.3, color: C.cream, color2: C.dim, drag: 5 });
        }
      }
    }
    if (this.atkBuf > 0 && this.stam > 0) { this.startAttack(g, 0); return; }
    if (this.rollBuf > 0 && this.onGround && this.stam > 0) { this.startRoll(g, move); return; }
    if (inp.pressed("heal")) {
      if (this.tonics > 0 && this.onGround) {
        this.state = "drink"; this.st = 0; this.drinkDone = false; this.tonics--;
        audio.play("drink");
      } else if (this.tonics <= 0) { audio.play("deny"); g.toast("Your tonic flask is empty."); }
    }
  }

  private startAttack(g: Game, n: number) {
    const sw = SWINGS[n];
    this.state = "attack"; this.st = 0; this.combo = n; this.queued = false; this.lunged = false; this.atkBuf = 0;
    this.airAttack = !this.onGround;
    this.swingId = g.nextAttackId();
    this.spendStam(sw.cost);
    audio.play(sw.heavy ? "swingHeavy" : "swing");
  }

  private startRoll(g: Game, move: number) {
    if (move) this.facing = move;
    this.state = "roll"; this.st = 0; this.rollBuf = 0;
    this.spendStam(ROLL_COST);
    audio.play("roll");
    g.particles.dust(this.cx, this.bottom, 4, -this.facing);
  }

  swingT(g: Game) {
    const sw = SWINGS[this.combo];
    return { sw, t: this.st * g.stats.atkSpeed };
  }

  private attack(g: Game, dt: number, move: number) {
    const { sw, t } = this.swingT(g);
    const activeStart = sw.wind, activeEnd = sw.wind + sw.active, end = activeEnd + sw.rec;
    if (this.airAttack && !this.onGround) this.vx = approach(this.vx, move * RUN * 0.8, AIR_ACC * dt);
    else if (t < activeStart) this.vx = approach(this.vx, 0, 900 * dt);
    else if (!this.lunged) { this.lunged = true; if (this.onGround) this.vx = this.facing * sw.lunge; }
    else this.vx = approach(this.vx, 0, 700 * dt);

    if (t >= activeStart && t <= activeEnd + 0.02) g.playerStrike(this.strikeBox(g), sw.dmg, this.swingId, !!sw.heavy);

    if (this.atkBuf > 0 && t > sw.wind * 0.5) { this.queued = true; this.atkBuf = 0; }
    if (t >= activeEnd + 0.05 && this.queued && this.combo < 2 && !this.airAttack && this.stam > 0) { this.startAttack(g, this.combo + 1); return; }
    if (t >= activeEnd && this.rollBuf > 0 && this.onGround && this.stam > 0) { this.startRoll(g, move); return; }
    if (t >= end || (this.airAttack && this.onGround && t > activeEnd)) { this.state = "normal"; this.st = 0; }
  }

  strikeBox(g: Game): Rect {
    const R = g.stats.reach + (SWINGS[this.combo].heavy ? 5 : 0);
    const spear = g.stats.kind === "spear";
    const y = spear ? this.y + 4 : this.y - 8, h = spear ? 12 : this.h + 12;
    return { x: this.facing > 0 ? this.x + this.w - 3 : this.x + 3 - R, y, w: R, h };
  }

  private roll(g: Game, dt: number) {
    const p = this.st / ROLL_T;
    this.vx = this.facing * ROLL_SPEED * (p < 0.7 ? 1 : Math.max(0, 1 - (p - 0.7) * 3));
    if (Math.floor(this.st * 20) % 3 === 0 && this.onGround) g.particles.dust(this.cx - this.facing * 4, this.bottom, 1, -this.facing);
    void dt;
    if (this.st >= ROLL_T) { this.state = "normal"; this.st = 0; }
  }

  private hazards(g: Game, dt: number) {
    const L = g.level;
    if (!this.alive) return;
    if (touchesTile(L, this.x, this.y, this.w, this.h, T.BOG, 3) || this.y > L.pxH + 20) {
      g.playerFellInBog();
      return;
    }
    if (this.hazardCd <= 0 && touchesTile(L, this.x, this.y + 6, this.w, this.h - 6, T.THORN, 2)) {
      this.hazardCd = 0.5;
      if (g.damagePlayer(14, this.cx + this.facing * 10, { source: "thorns" })) this.vy = -230;
    }
    // remember safe footing for bog / pit respawns
    if (this.onGround && (this.state === "normal" || this.state === "attack" || this.state === "drink")) {
      this.safeT += dt;
      const ok = groundBelow(L, this.x - 6, this.bottom) && groundBelow(L, this.x + this.w + 6, this.bottom) &&
        !touchesTile(L, this.x - 16, this.y, this.w + 32, this.h + 4, T.BOG, 0) &&
        !touchesTile(L, this.x - 8, this.y, this.w + 16, this.h, T.THORN, 0);
      if (ok && this.safeT > 0.12) { this.lastSafe = { x: this.x, y: this.y }; this.safeT = 0; }
    } else this.safeT = 0;
  }

  // ======================================================================= drawing
  draw(g: Game, ctx: Ctx, camX: number, camY: number) {
    const sx = Math.round(this.cx - camX), sy = Math.round(this.bottom - camY);
    if (this.state !== "dead" || this.st < 0.5) shadow(ctx, sx, sy + 1, 10);
    if (this.invuln > 0 && this.state !== "hurt" && Math.floor(this.invuln * 16) % 2 === 0) return;
    const c = buf.begin();
    const s = g.stats;
    const weapon = g.save.eq.weapon;
    const rarity = weapon ? weapon.rarity : 0;
    const glint = rarity >= 2 ? RARITY[rarity].color : null;
    const kind = s.kind;
    const t = this.animT;

    // pose defaults
    let bob = 0, lean = 0;
    let fF = [1, 0], bF = [-2, 0];
    let hand = [3, -9], wAng = 1.15, showWeapon = true, backWeapon = false;
    let smear: null | { a0: number; a1: number; fade: number } = null;
    const shoulder = [0, -12];

    switch (this.state) {
      case "normal": case "fog":
        if (!this.onGround && this.state === "normal") {
          if (this.vy < 0) { fF = [2, -4]; bF = [-2, -1]; hand = [3, -12]; wAng = -0.7; }
          else { fF = [2, -2]; bF = [-3, -3]; hand = [4, -11]; wAng = 0.5; }
        } else if (Math.abs(this.vx) > 5 || this.state === "fog") {
          const ph = this.runPhase;
          fF = [Math.round(Math.sin(ph) * 3), -Math.round(Math.max(0, Math.cos(ph)) * 2)];
          bF = [Math.round(-Math.sin(ph) * 3), -Math.round(Math.max(0, -Math.cos(ph)) * 2)];
          bob = Math.abs(Math.sin(ph)) > 0.75 ? -1 : 0;
          hand = [Math.round(1 - Math.sin(ph) * 2), -9 + bob];
          wAng = 2.55; lean = 1;
        } else {
          bob = Math.sin(t * 2.6) > 0.55 ? 1 : 0;
          hand = [3, -8 + bob]; wAng = 1.2;
        }
        break;
      case "attack": {
        const { sw, t: at } = this.swingT(g);
        const p = clamp((at - sw.wind) / sw.active, 0, 1);
        const e = 1 - Math.pow(1 - p, 3);
        fF = [3, 0]; bF = [-4, 0];
        if (kind === "spear") {
          const ext = at < sw.wind ? -3 : Math.round(-3 + e * 9);
          wAng = sw.heavy ? 0 : this.combo === 1 ? -0.2 : 0.15;
          hand = [ext, -10];
          lean = at >= sw.wind ? 1 : -1;
        } else {
          wAng = at < sw.wind ? sw.a0 : sw.a0 + (sw.a1 - sw.a0) * e;
          hand = [shoulder[0] + Math.round(Math.cos(wAng) * 5), shoulder[1] + Math.round(Math.sin(wAng) * 5)];
          lean = at >= sw.wind ? 1 : 0;
          if (at >= sw.wind && at < sw.wind + sw.active + 0.08) {
            const fade = 1 - clamp((at - sw.wind - sw.active) / 0.08, 0, 1);
            smear = { a0: sw.a0, a1: wAng, fade };
          }
        }
        if (this.airAttack && !this.onGround) { fF = [2, -3]; bF = [-2, -1]; }
        break;
      }
      case "hurt":
        lean = -1; hand = [-1, -14]; wAng = -2.3; fF = [2, 0]; bF = [-3, -1];
        break;
      case "drink":
        showWeapon = false; backWeapon = true;
        hand = [2, -15]; bob = 0;
        break;
      case "rest":
        bob = 4; fF = [4, 0]; bF = [-3, 0]; hand = [5, -6]; wAng = Math.PI / 2;
        break;
      case "dead":
        break;
    }
    if (this.squash > 0) bob += 1;

    if (this.state === "roll") {
      this.drawRoll(c, g);
    } else if (this.state === "dead") {
      const k = this.st < 0.35 ? 0 : this.st < 0.75 ? 1 : 2;
      if (k === 2) { c.save(); c.rotate(-Math.PI / 2); c.translate(0, 3); }
      this.drawBody(c, g, k === 1 ? 4 : 0, k === 1 ? 1 : -1, [3, 0], [-3, 0], [3, -6], 1.6, false, true, kind, glint, t);
      if (k === 2) c.restore();
    } else {
      if (backWeapon) drawWeapon(c, kind, -4, -7 + bob, -2.0, null, t);
      this.drawBody(c, g, bob, lean, fF, bF, hand, wAng, showWeapon, false, kind, glint, t);
      if (this.state === "drink") { drawIconSmall(c, hand[0] - 3, hand[1] - 5); }
      if (smear) drawSmear(c, shoulder[0] + lean, shoulder[1] + bob, smear.a0, smear.a1, 6, g.stats.reach - 3 + (SWINGS[this.combo].heavy ? 4 : 0), smear.fade, glint ?? C.cream);
    }
    const flash = this.hurtFlash > 0 ? this.hurtFlash * 5 : 0;
    buf.end(ctx, sx, sy, { flip: this.facing < 0, flash, flashColor: C.hp });
  }

  private drawBody(c: Ctx, g: Game, bob: number, lean: number, fF: number[], bF: number[], hand: number[], wAng: number, showWeapon: boolean, dead: boolean, kind: import("../systems/items").WeaponKind, glint: string | null, t: number) {
    const body = g.save.eq.body, helm = g.save.eq.helm;
    const look = body ? baseOf(body).look : undefined;
    const pal = look === "gambeson" ? [C.wood1, C.wood3, C.wood4] : look === "mail" ? [C.steel0, C.steel1, C.steel2] : look === "tunic" ? [C.cloth0, C.cloth1, C.cloth2] : ["#3a2f2a", "#5a4a3f", "#7a6a5a"];
    const L = lean;
    // scarf (behind)
    const speed = clamp(Math.abs(this.vx) / 110, 0, 1);
    let px = -1 + L, py = -13 + bob;
    for (let i = 1; i <= 6; i++) {
      const nx = -1 + L - i * 2;
      const ny = -13 + bob + i * (dead ? 0.2 : 0.9 - 0.75 * speed) + Math.sin(t * (6 + speed * 8) + i * 0.9) * (0.3 + speed * 0.9) + (this.vy < -50 ? i * 0.6 : 0);
      line(c, px, py, nx, ny, i > 4 ? C.scarf2 : C.scarf1, i > 4 ? 1 : 2);
      if (i <= 4) line(c, px, py + 1, nx, ny + 1, C.scarf0);
      px = nx; py = ny;
    }
    // back arm
    line(c, -2 + L, -11 + bob, -3 + L, -7 + bob, pal[0], 2);
    // back leg
    line(c, -1 + L * 0, -6 + bob, bF[0] - 1, bF[1] - 1, "#211d2c", 2);
    rect(c, bF[0] - 2, bF[1] - 1, 3, 1, C.boots);
    // torso
    for (let yy = 0; yy < 7; yy++) for (let xx = 0; xx < 6; xx++) {
      const X = -3 + xx + L, Y = -12 + yy + bob;
      let col = xx === 0 ? pal[0] : xx >= 4 ? pal[2] : pal[1];
      if (look === "mail" && (X + Y) % 2 === 0) col = pal[0];
      if (look === "gambeson" && yy % 2 === 1 && xx > 0) col = pal[0];
      c.fillStyle = col; c.fillRect(X, Y, 1, 1);
    }
    rect(c, -3 + L, -7 + bob, 6, 1, C.wood0);
    rect(c, 1 + L, -7 + bob, 1, 1, C.gold2);
    // front leg
    line(c, 1, -6 + bob, fF[0] + 1, fF[1] - 1, C.pants, 2);
    rect(c, fF[0] + 1, fF[1] - 1, 3, 1, C.boots);
    // head
    const hx = -3 + L, hy = -18 + bob;
    rect(c, hx, hy, 6, 6, C.skin1);
    rect(c, hx + 3, hy + 2, 3, 3, C.skin2);
    rect(c, hx, hy, 6, 2, C.hair); rect(c, hx, hy, 2, 5, C.hair); rect(c, hx + 1, hy - 1, 4, 1, C.hair);
    c.fillStyle = C.ink; c.fillRect(hx + 4, hy + 2, 1, dead ? 0 : Math.sin(t * 0.9) > 0.97 ? 0 : 2);
    if (dead) c.fillRect(hx + 4, hy + 3, 1, 1);
    c.fillStyle = C.skin0; c.fillRect(hx + 5, hy + 4, 1, 1);
    const hl = helm ? baseOf(helm).look : undefined;
    if (hl === "straw") {
      rect(c, hx - 3, hy, 13, 1, C.straw2); rect(c, hx - 2, hy + 1, 11, 1, C.straw1);
      rect(c, hx, hy - 3, 6, 3, C.straw2); rect(c, hx, hy - 1, 6, 1, C.scarf0); rect(c, hx + 4, hy - 3, 2, 2, C.straw3);
    } else if (hl === "cap") {
      rect(c, hx - 1, hy - 2, 7, 3, C.wood2); rect(c, hx, hy - 3, 5, 1, C.wood3); rect(c, hx - 1, hy + 1, 2, 3, C.wood2); rect(c, hx + 5, hy, 2, 1, C.wood1);
    } else if (hl === "kettle") {
      rect(c, hx - 1, hy - 3, 8, 4, C.steel1); rect(c, hx, hy - 4, 6, 1, C.steel2); rect(c, hx - 2, hy + 1, 10, 1, C.steel0);
      rect(c, hx + 1, hy - 3, 2, 1, C.steel3);
    } else if (hl === "hood") {
      rect(c, hx - 1, hy - 2, 7, 8, "#9a8055"); rect(c, hx + 2, hy + 1, 4, 4, "#b89a66");
      c.fillStyle = C.fire2; c.fillRect(hx + 4, hy + 2, 1, 1); c.fillRect(hx + 2, hy + 2, 1, 1);
      rect(c, hx + 2, hy + 4, 3, 1, C.wood0); rect(c, hx - 1, hy - 2, 2, 8, "#7a6040");
    }
    // front arm + weapon
    if (showWeapon) {
      line(c, 1 + L, -11 + bob, hand[0], hand[1], pal[1], 1);
      drawWeapon(c, kind, hand[0], hand[1], wAng, glint, t);
    } else {
      line(c, 1 + L, -11 + bob, hand[0], hand[1], pal[1], 1);
      rect(c, hand[0] - 1, hand[1] - 1, 2, 2, C.skin1);
    }
  }

  private drawRoll(c: Ctx, g: Game) {
    const k = Math.floor((this.st / ROLL_T) * 4.99) % 4;
    const body = g.save.eq.body;
    const look = body ? baseOf(body).look : undefined;
    const mid = look === "gambeson" ? C.wood3 : look === "mail" ? C.steel1 : look === "tunic" ? C.cloth1 : "#5a4a3f";
    c.save();
    c.translate(0, -6);
    c.rotate((k * Math.PI) / 2);
    for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) {
      const d = x * x + y * y;
      if (d > 27) continue;
      let col = mid;
      if (y < -1 && x > -1) col = C.hair;
      if (y < -1 && x > 1) col = C.skin1;
      if (x < -2 && y > 0) col = C.pants;
      if (d > 20 && y > 2) col = C.boots;
      c.fillStyle = col; c.fillRect(x, y, 1, 1);
    }
    rect(c, -6, -3, 3, 2, C.scarf1); rect(c, -8, -2, 2, 1, C.scarf2);
    c.restore();
  }
}

function drawIconSmall(c: Ctx, x: number, y: number) {
  // tiny tonic flask held to the lips
  rect(c, x + 1, y, 2, 1, C.wood2);
  rect(c, x, y + 1, 4, 4, "#9ad8ff");
  rect(c, x, y + 3, 4, 2, C.hp);
  void drawIcon;
}
