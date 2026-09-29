import { audio } from "../core/audio";
import { approach, clamp, hash, sign } from "../core/math";
import { rng } from "../core/rng";
import { disc, line, rect, type Ctx } from "../gfx/canvas";
import { C } from "../gfx/palette";
import { shadow, SpriteBuf } from "../gfx/sprite";
import type { Game } from "../game";
import { moveBody } from "../world/physics";
import { Crow, Enemy, type AttackBox } from "./enemies";

type Mode =
  | "dormant" | "wake" | "roar" | "idle" | "walk"
  | "sweepWind" | "sweep" | "sweepRec"
  | "crouch" | "leap" | "slam" | "slamRec"
  | "throwWind" | "throwRec" | "call" | "dying";

const buf = new SpriteBuf(180, 130, 24);
export const WICK_NAME = "Wick, the Harvest Warden";

export class Wick extends Enemy {
  readonly table = "wick";
  readonly label = WICK_NAME;
  mode: Mode = "dormant";
  phase = 1;
  atkId = 0;
  combo = 0;
  callCd = 6;
  homeX: number; homeY: number;
  walkPhase = 0;
  shakeT = 0;

  constructor(cx: number, gy: number) {
    super(cx, gy, 24, 46, 420);
    this.isBoss = true;
    this.homeX = cx; this.homeY = gy;
    this.facing = -1;
  }

  get awake() { return this.mode !== "dormant"; }
  get invulnerable() { return this.mode === "dormant" || this.mode === "wake" || this.mode === "roar" || this.mode === "dying"; }

  wake() { if (this.mode === "dormant") { this.mode = "wake"; this.st = 0; } }

  takeHit(g: Game, dmg: number, crit: boolean, dir: number, quiet = false) {
    if (this.invulnerable || this.dead) { if (!quiet) audio.play("clink", 3); return; }
    super.takeHit(g, dmg, crit, dir, quiet);
    if (!this.dead && this.mode !== "dying" && this.phase === 1 && this.hp <= this.maxHp * 0.5) {
      this.phase = 2; this.mode = "roar"; this.st = 0; this.vx = 0;
      audio.play("roar");
      g.shake(5, 1.2);
      g.onBossPhase2();
    }
  }
  protected onHurt() { /* no stagger — he is a Warden */ }
  protected onDeath(g: Game) {
    this.mode = "dying"; this.st = 0; this.dead = false; // play the death animation first
    this.hp = 0;
    audio.play("roar");
    g.shake(4, 1.5);
    g.hitstopFor(0.25);
  }

  protected think(g: Game, dt: number) {
    const p = g.player;
    const dx = p.cx - this.cx, dist = Math.abs(dx);
    const A = g.level.arena;
    const fast = this.phase === 2 ? 0.72 : 1;
    this.shakeT = Math.max(0, this.shakeT - dt);
    if (this.hp <= 0 && this.mode !== "dying") { this.mode = "dying"; this.st = 0; }

    if (this.mode !== "dormant" && this.mode !== "wake" && this.mode !== "leap") {
      this.vy = Math.min(this.vy + 900 * dt, 400);
      moveBody(this, g.level, dt);
    }
    this.x = clamp(this.x, A.x0 + 4, A.x1 - this.w - 4);

    switch (this.mode) {
      case "dormant":
        this.x = this.homeX - this.w / 2; this.y = this.homeY - this.h - 26; this.vx = this.vy = 0;
        break;
      case "wake":
        this.x = this.homeX - this.w / 2;
        if (this.st < 1.5) { this.y = this.homeY - this.h - 26; if (this.st > 0.8) this.shakeT = 0.1; }
        else { this.vy = Math.min(this.vy + 900 * dt, 400); moveBody(this, g.level, dt); }
        if (this.st > 1.5 && this.st - dt <= 1.5) {
          audio.play("fog");
          g.particles.burst(this.cx, this.y + 10, 20, { speed: 80, colors: [C.straw1, C.straw2, C.straw3], g: 300, max: 1, size: 1 });
        }
        if (this.st > 1.5 && this.onGround) {
          this.mode = "roar"; this.st = 0; audio.play("roar"); g.shake(4, 1.0);
          g.particles.dust(this.cx, this.bottom, 12);
        }
        break;
      case "roar":
        this.vx = 0;
        if (this.phase === 2 && Math.floor(this.st * 30) % 2 === 0) this.headFire(g, 3);
        if (this.st > 1.5) this.toIdle();
        break;
      case "idle":
        this.vx = approach(this.vx, 0, 400 * dt);
        this.facing = sign(dx) || this.facing;
        if (this.st > 0.55 * fast && p.alive) this.choose(g, dist);
        break;
      case "walk":
        this.facing = sign(dx) || this.facing;
        this.vx = approach(this.vx, this.facing * (this.phase === 2 ? 68 : 52), 400 * dt);
        this.walkPhase += Math.abs(this.vx) * dt * 0.12;
        if (dist < 64) this.begin("sweepWind");
        else if (this.st > 1.6) this.choose(g, dist);
        break;
      case "sweepWind":
        this.vx = approach(this.vx, -this.facing * 15, 300 * dt);
        if (this.st > (this.combo > 0 ? 0.36 : 0.7 * fast)) { this.begin("sweep"); this.atkId = g.nextAttackId(); this.vx = this.facing * 130; audio.play("swingHeavy"); }
        break;
      case "sweep":
        this.vx = approach(this.vx, 0, 500 * dt);
        if (this.st > 0.24) this.begin("sweepRec");
        break;
      case "sweepRec":
        this.vx = approach(this.vx, 0, 500 * dt);
        if (this.phase === 2 && this.combo === 0 && this.st > 0.2 && dist < 90) {
          this.combo = 1; this.facing = sign(dx) || this.facing; this.begin("sweepWind"); audio.play("tell");
        } else if (this.st > 0.8 * fast) { this.combo = 0; this.toIdle(); }
        break;
      case "crouch":
        this.vx = 0;
        if (this.st > 0.5 * fast) {
          const tx = clamp(p.cx, A.x0 + 30, A.x1 - 30);
          const air = 0.82;
          this.vx = (tx - this.cx) / air; this.vy = -370;
          this.onGround = false;
          this.begin("leap");
          audio.play("jump");
          g.particles.dust(this.cx, this.bottom, 10);
        }
        break;
      case "leap":
        this.vy = Math.min(this.vy + 900 * dt, 420);
        this.facing = sign(this.vx) || this.facing;
        moveBody(this, g.level, dt);
        if (this.onGround && this.st > 0.1) {
          this.begin("slam"); this.atkId = g.nextAttackId(); this.vx = 0;
          audio.play("slam"); g.shake(6, 0.4);
          g.particles.dust(this.cx, this.bottom, 16);
          g.projectiles.push(new Shockwave(this.cx, this.bottom, -1, g.nextAttackId()), new Shockwave(this.cx, this.bottom, 1, g.nextAttackId()));
        }
        break;
      case "slam":
        if (this.st > 0.12) this.begin("slamRec");
        break;
      case "slamRec":
        if (this.st > 0.95 * fast) this.toIdle();
        break;
      case "throwWind":
        this.facing = sign(dx) || this.facing;
        if (this.st > 0.55 * fast) {
          const n = this.phase === 2 ? 5 : 3;
          for (let i = 0; i < n; i++) {
            const k = i / (n - 1);
            const air = 0.9 + k * 0.35;
            const tx = p.cx + (k - 0.5) * (this.phase === 2 ? 120 : 80) + rng.range(-10, 10);
            g.projectiles.push(new Seed(this.cx + this.facing * 10, this.y + 8, (tx - this.cx) / air, -air * 330, g.nextAttackId()));
          }
          audio.play("throw");
          this.begin("throwRec");
        }
        break;
      case "throwRec":
        if (this.st > 0.6 * fast) this.toIdle();
        break;
      case "call":
        this.vx = 0;
        if (this.st > 0.6 && this.st - dt <= 0.6) {
          audio.play("caw");
          for (const side of [-1, 1]) {
            const c = new Crow(clamp(p.cx + side * 90, A.x0 + 20, A.x1 - 20), 60);
            c.cd = 0.8;
            g.enemies.push(c);
          }
        }
        if (this.st > 1.3) { this.callCd = 11; this.toIdle(); }
        break;
      case "dying":
        this.vx = 0;
        if (Math.floor(this.st * 20) % 3 === 0) g.particles.burst(this.cx + rng.range(-10, 10), this.y + rng.range(10, 40), 3, { speed: 70, colors: [C.straw1, C.straw2, C.straw3, C.blight4], g: 200, max: 1 });
        if (this.st > 2.2) {
          this.dead = true; this.remove = true;
          g.particles.burst(this.cx, this.y + 24, 60, { speed: 160, colors: [C.straw1, C.straw2, C.straw3, C.blight3, C.blight5], g: 260, max: 1.6, size: 2 });
          g.onBossDefeated(this);
        }
        break;
    }
    if (this.phase === 2 && this.mode !== "dying" && this.mode !== "dormant" && Math.floor(this.t * 20) % 2 === 0) this.headFire(g, 1);
    this.callCd -= dt;
  }

  private headFire(g: Game, n: number) {
    for (let i = 0; i < n; i++)
      g.particles.spawn(this.cx + this.facing * 2 + rng.range(-6, 6), this.y - 6 + rng.range(-3, 3), { vy: rng.range(-50, -25), vx: rng.range(-8, 8), max: rng.range(0.3, 0.6), color: C.sick2, color2: C.blight4, light: 10, lightColor: C.sick1, front: true });
  }

  private begin(m: Mode) { this.mode = m; this.st = 0; }
  private toIdle() { this.begin("idle"); }

  private choose(g: Game, dist: number) {
    const crows = g.enemies.filter((e) => e instanceof Crow && !e.dead).length;
    if (this.phase === 2 && this.callCd <= 0 && crows === 0) { this.begin("call"); return; }
    if (dist < 64) { this.begin("sweepWind"); audio.play("tell"); return; }
    const r = rng.next();
    if (dist < 170) {
      if (r < 0.42) { this.begin("crouch"); audio.play("tell"); }
      else if (r < 0.7) this.begin("walk");
      else { this.begin("throwWind"); audio.play("tell"); }
    } else {
      if (r < 0.5) { this.begin("crouch"); audio.play("tell"); }
      else if (r < 0.8) { this.begin("throwWind"); audio.play("tell"); }
      else this.begin("walk");
    }
  }

  attackBoxes(): AttackBox[] {
    if (this.mode === "sweep" && this.st < 0.2) {
      const x0 = this.facing > 0 ? this.cx - 12 : this.cx - 62;
      return [{ x: x0, y: this.bottom - 30, w: 74, h: 28, dmg: 30, id: this.atkId }];
    }
    if (this.mode === "slam") return [{ x: this.cx - 30, y: this.bottom - 22, w: 60, h: 22, dmg: 34, id: this.atkId }];
    return [];
  }

  hurtbox() { return { x: this.x + 2, y: this.y - 8, w: this.w - 4, h: this.h + 8 }; }

  // ========================================================================= draw
  draw(g: Game, ctx: Ctx, camX: number, camY: number) {
    void g;
    const m = this.mode;
    let ox = 0, oy = 0;
    if (this.shakeT > 0 || m === "roar") ox = Math.round(Math.sin(this.t * 60) * 1);
    const sx = this.cx - camX + ox, sy = this.bottom - camY + oy;
    if (m !== "dormant" && m !== "wake") shadow(ctx, sx, sy + 1, 26, 0.45);
    const c = buf.begin();
    const t = this.t;
    let lean = 0, bob = 0, headDy = 0, headDx = 0;
    let fF = [4, 0], bF = [-4, 0];
    let hand = [10, -30], sc = -1.35;
    let backHand = [-9, -26];
    let armsWide = false, hanging = false, smear: null | [number, number] = null;
    let eyes: string = this.phase === 2 ? C.sick2 : C.fire2;

    switch (m) {
      case "dormant":
        hanging = true; headDy = 3; headDx = 2; eyes = "#3a2a2a"; armsWide = true;
        fF = [1, 2]; bF = [-2, 3];
        break;
      case "wake":
        hanging = this.st < 1.5; armsWide = this.st < 1.5; headDy = this.st < 0.6 ? 3 - this.st * 5 : 0;
        eyes = this.st < 0.5 ? "#3a2a2a" : Math.floor(this.st * 10) % 3 ? eyes : C.white;
        if (!hanging) { fF = [3, -3]; bF = [-3, -2]; }
        break;
      case "roar":
        armsWide = true; headDy = -2; lean = -2; bob = Math.floor(this.st * 12) % 2;
        break;
      case "idle":
        bob = Math.sin(t * 2) > 0.3 ? 1 : 0; lean = 1;
        break;
      case "walk": {
        const ph = this.walkPhase;
        fF = [Math.round(Math.sin(ph) * 5), -Math.round(Math.max(0, Math.cos(ph)) * 3)];
        bF = [Math.round(-Math.sin(ph) * 5), -Math.round(Math.max(0, -Math.cos(ph)) * 3)];
        bob = Math.abs(Math.sin(ph)) > 0.7 ? -1 : 0; lean = 2;
        break;
      }
      case "sweepWind":
        lean = -3; sc = -2.7; hand = [-8, -40]; fF = [7, 0]; bF = [-6, 0];
        if (Math.floor(this.st * 12) % 2 === 0) eyes = C.white;
        break;
      case "sweep": {
        const e = 1 - Math.pow(1 - clamp(this.st / 0.14, 0, 1), 3);
        sc = -2.7 + (0.35 + 2.7) * e; lean = 4;
        hand = [Math.round(Math.cos(sc) * 14), -28 + Math.round(Math.sin(sc) * 12)];
        fF = [9, 0]; bF = [-7, 0];
        smear = [-2.7, sc];
        break;
      }
      case "sweepRec":
        sc = 0.35; lean = 4; hand = [14, -22]; fF = [9, 0]; bF = [-7, 0];
        break;
      case "crouch":
        bob = 7; sc = -2.3; hand = [-2, -30]; fF = [7, 0]; bF = [-7, 0];
        if (Math.floor(this.st * 12) % 2 === 0) eyes = C.white;
        break;
      case "leap":
        sc = -1.9; hand = [0, -44]; fF = [4, -8]; bF = [-5, -5]; backHand = [-10, -40];
        break;
      case "slam": case "slamRec":
        bob = m === "slam" ? 6 : Math.max(0, 6 - Math.floor(this.st * 10)); sc = 1.1; hand = [14, -20]; lean = 5; fF = [8, 0]; bF = [-8, 0];
        break;
      case "throwWind":
        backHand = [-16, -40 + Math.round(this.st * 10)]; lean = -2;
        if (Math.floor(this.st * 12) % 2 === 0) eyes = C.white;
        break;
      case "throwRec":
        backHand = [16, -30]; lean = 3;
        break;
      case "call":
        armsWide = true; headDy = -2; sc = -1.7; hand = [8, -48];
        break;
      case "dying": {
        const k = clamp(this.st / 2, 0, 1);
        bob = Math.round(k * 20); lean = Math.round(k * 6); headDy = Math.round(k * 4);
        eyes = Math.floor(this.st * 8) % 2 ? eyes : "#3a2a2a";
        break;
      }
    }

    const coat = "#3a2a3a", coatD = "#271c29", coatL = "#523c52", patch = "#5a4a3a";
    // legs (straw-stuffed trousers)
    const leg = (hx: number, f: number[], col: string) => {
      line(c, hx, -20 + bob, f[0], f[1] - 2, col, 3);
      rect(c, f[0] - 1, f[1] - 2, 4, 2, C.straw1);
      c.fillStyle = C.straw2; c.fillRect(f[0] - 2, f[1] - 1, 1, 1); c.fillRect(f[0] + 3, f[1] - 1, 1, 1);
    };
    leg(-3, bF, "#2d2436");
    // back arm
    if (armsWide) { line(c, -6 + lean, -38 + bob, -28, -40 + bob, C.wood1, 2); rect(c, -31, -42 + bob, 4, 4, C.straw2); }
    else { line(c, -6 + lean, -38 + bob, backHand[0], backHand[1] + bob, C.wood1, 2); rect(c, backHand[0] - 2, backHand[1] - 2 + bob, 4, 4, C.straw2); }
    if (m === "throwWind") { disc(c, backHand[0], backHand[1] - 3 + bob, 2, 2, C.blight3); c.fillStyle = C.blight5; c.fillRect(backHand[0], backHand[1] - 4 + bob, 1, 1); }
    // coat with a tattered hem
    for (let yy = 0; yy < 28; yy++) {
      const Y = -42 + yy + bob;
      const hw = 7 + Math.floor(yy / 5);
      const off = Math.round((lean * (28 - yy)) / 28);
      for (let xx = -hw; xx <= hw; xx++) {
        if (yy > 22 && hash(xx + 50, Math.floor(t * 3), 3) > 0.62 + (27 - yy) * 0.05) continue;
        let col = xx < -hw + 2 ? coatD : xx > hw - 3 ? coatL : coat;
        if (yy > 5 && yy < 11 && xx > 1 && xx < 6) col = patch;
        c.fillStyle = col; c.fillRect(xx + off, Y, 1, 1);
      }
    }
    rect(c, -8 + Math.round(lean * 0.5), -27 + bob, 17, 2, "#8a6a4a"); // rope belt
    for (let k = 0; k < 6; k++) { c.fillStyle = k % 2 ? C.straw3 : C.straw2; c.fillRect(-2 + k + lean, -36 + bob - (k % 3), 1, 3); }
    leg(3, fF, "#3a3045");
    // head: burlap sack with stitched grin
    const hx = headDx + lean, hy = -54 + bob + headDy;
    for (let yy = 0; yy < 13; yy++) for (let xx = -7; xx <= 7; xx++) {
      if ((yy < 2 || yy > 10) && Math.abs(xx) > 5) continue;
      const col = xx < -4 ? "#6a5238" : (xx + yy) % 4 === 0 ? "#8a7048" : "#9a8055";
      c.fillStyle = col; c.fillRect(hx + xx, hy + yy, 1, 1);
    }
    // neck tie
    rect(c, hx - 4, hy + 12, 9, 2, "#8a6a4a");
    // eyes (triangular holes that glow)
    for (const ex of [-3, 3]) { rect(c, hx + ex - 1, hy + 4, 3, 1, eyes); rect(c, hx + ex, hy + 5, 1, 1, eyes); }
    // stitched grin
    for (let k = -4; k <= 4; k++) { c.fillStyle = "#2a1a1a"; c.fillRect(hx + k, hy + 8 + (k % 2 === 0 ? 0 : 1), 1, 1); }
    for (let k = -4; k <= 4; k += 2) { c.fillStyle = "#c9b894"; c.fillRect(hx + k, hy + 7, 1, 1); }
    // floppy hat
    rect(c, hx - 12, hy - 1, 25, 2, "#4a3528"); rect(c, hx - 13, hy, 3, 1, "#3a2a20"); rect(c, hx + 11, hy + 1, 3, 1, "#3a2a20");
    for (let yy = 0; yy < 9; yy++) { const w = 10 - Math.floor(yy / 2); rect(c, hx - 5 + Math.floor(yy / 3), hy - 2 - yy, w, 1, yy === 2 ? C.scarf0 : "#5a4030"); }
    rect(c, hx + 1, hy - 11, 3, 2, "#5a4030");
    if (this.phase === 2) { c.fillStyle = C.sick1; c.fillRect(hx - 5, hy - 1, 1, 1); c.fillRect(hx + 6, hy - 2, 1, 1); }
    // front arm + scythe
    if (armsWide && !(m === "call")) {
      line(c, 6 + lean, -38 + bob, 28, -40 + bob, C.wood1, 2); rect(c, 27, -42 + bob, 4, 4, C.straw2);
    } else {
      line(c, 6 + lean, -38 + bob, hand[0], hand[1] + bob, C.wood1, 2);
    }
    if (!hanging && !(armsWide && m !== "call")) this.drawScythe(c, hand[0], hand[1] + bob, sc);
    if (smear) this.drawSweepSmear(c, lean, bob, smear[0], smear[1]);

    const alpha = m === "dying" ? clamp(1.4 - this.st / 1.6, 0, 1) : 1;
    buf.end(ctx, sx, sy, { flip: this.facing < 0, flash: this.flash * 7, alpha });
    if (hanging) {
      // the scythe waits, stuck in the dirt beside his post
      const bx = Math.round(this.homeX + 22 - camX), by = Math.round(this.homeY - camY);
      const c2 = ctx;
      line(c2, bx, by, bx - 8, by - 40, C.wood1, 1);
      for (let k = 0; k < 16; k++) { c2.fillStyle = k > 12 ? C.steel3 : C.steel2; c2.fillRect(bx - 8 - k, by - 40 + Math.round((k * k) / 22), 1, 1); }
    }
  }

  private drawScythe(c: Ctx, hx: number, hy: number, ang: number) {
    const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
    for (let i = -12; i <= 30; i++) { c.fillStyle = i % 7 === 0 ? C.wood0 : C.wood1; c.fillRect(Math.round(hx + dx * i), Math.round(hy + dy * i), 2, 1); }
    const tx = hx + dx * 30, ty = hy + dy * 30;
    for (let k = 0; k <= 20; k++) {
      const bx = tx + nx * k - dx * ((k * k) / 18), by = ty + ny * k - dy * ((k * k) / 18);
      c.fillStyle = k > 17 ? C.steel3 : hash(k, 0, 9) > 0.8 ? "#8a5a4a" : C.steel2; c.fillRect(Math.round(bx), Math.round(by), 1, 1);
      c.fillStyle = C.steel1; c.fillRect(Math.round(bx - dx), Math.round(by - dy), 1, 1);
      if (k < 16) { c.fillStyle = C.steel0; c.fillRect(Math.round(bx - dx * 2), Math.round(by - dy * 2), 1, 1); }
    }
    rect(c, hx - 1, hy - 1, 3, 3, C.straw2);
  }

  private drawSweepSmear(c: Ctx, lean: number, bob: number, a0: number, a1: number) {
    const cx = lean, cy = -28 + bob;
    for (let s = 0; s <= 24; s++) {
      const a = a0 + ((a1 - a0) * s) / 24;
      const f = s / 24;
      for (let r = 34; r <= 50; r++) {
        if (f < 0.25 || ((r + s) % 2 && f < 0.6)) continue;
        c.fillStyle = r > 46 ? C.white : this.phase === 2 ? C.sick1 : C.cream;
        c.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.8), 1, 1);
      }
    }
  }

  lights(g: Game, camX: number, camY: number) {
    if (this.mode === "dormant") return;
    const col = this.phase === 2 ? C.sick1 : C.fire1;
    g.lighting.add(this.cx - camX, this.y - 2 - camY, this.phase === 2 ? 40 : 24, col, 0.9);
  }
}

// ======================================================================= projectiles
export interface Projectile {
  dead: boolean;
  update(g: Game, dt: number): void;
  draw(ctx: Ctx, camX: number, camY: number, time: number): void;
  box(): AttackBox | null;
  lights?(g: Game, camX: number, camY: number): void;
}

export class Shockwave implements Projectile {
  dead = false; t = 0;
  constructor(public x: number, public y: number, public dir: number, public id: number) { }
  update(g: Game, dt: number) {
    this.t += dt;
    this.x += this.dir * 175 * dt;
    const A = g.level.arena;
    if (this.t > 1.5 || this.x < A.x0 || this.x > A.x1) this.dead = true;
    if (Math.floor(this.t * 30) % 2 === 0) g.particles.spawn(this.x, this.y - 2, { vx: -this.dir * 20, vy: -rng.range(20, 60), g: 300, max: 0.4, color: rng.chance(0.5) ? C.dirt3 : C.blight3, size: 2 });
  }
  box(): AttackBox { return { x: this.x - 5, y: this.y - 13, w: 10, h: 13, dmg: 18, id: this.id }; }
  draw(ctx: Ctx, camX: number, camY: number, time: number) {
    const x = Math.round(this.x - camX), y = Math.round(this.y - camY);
    for (let k = 0; k < 7; k++) {
      const h = [4, 8, 12, 13, 10, 6, 3][k] + (Math.floor(time * 30 + k) % 2);
      ctx.fillStyle = k === 3 ? C.blight5 : k % 2 ? C.blight3 : C.blight2;
      ctx.fillRect(x - 3 * this.dir + k * this.dir - (this.dir < 0 ? 0 : 0), y - h, 1, h);
    }
    ctx.fillStyle = C.ink; ctx.fillRect(x - 5, y - 1, 10, 1);
  }
  lights(g: Game, camX: number, camY: number) { g.lighting.add(this.x - camX, this.y - 6 - camY, 16, C.blight4, 0.8); }
}

export class Seed implements Projectile {
  dead = false; t = 0;
  constructor(public x: number, public y: number, public vx: number, public vy: number, public id: number) { }
  update(g: Game, dt: number) {
    this.t += dt;
    this.vy += 660 * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (Math.floor(this.t * 40) % 2 === 0) g.particles.spawn(this.x, this.y, { max: 0.3, color: C.blight4, color2: C.blight2 });
    const L = g.level;
    if (L.solidAt(Math.floor(this.x / 16), Math.floor((this.y + 2) / 16))) {
      this.dead = true;
      const gy = Math.floor((this.y + 2) / 16) * 16;
      g.projectiles.push(new Puddle(this.x, gy, g));
      audio.play("splat");
      g.particles.splat(this.x, gy - 2, [C.blight3, C.blight4, C.sick1], 8);
    }
    if (this.t > 3) this.dead = true;
  }
  box(): AttackBox { return { x: this.x - 3, y: this.y - 3, w: 6, h: 6, dmg: 14, id: this.id }; }
  draw(ctx: Ctx, camX: number, camY: number) {
    const x = Math.round(this.x - camX), y = Math.round(this.y - camY);
    ctx.fillStyle = C.ink; ctx.fillRect(x - 2, y - 3, 5, 6); ctx.fillRect(x - 3, y - 2, 7, 4);
    ctx.fillStyle = C.blight3; ctx.fillRect(x - 2, y - 2, 5, 4);
    ctx.fillStyle = C.blight5; ctx.fillRect(x - 1, y - 2, 2, 1);
    ctx.fillStyle = C.sick1; ctx.fillRect(x + 1, y + 1, 1, 1);
  }
  lights(g: Game, camX: number, camY: number) { g.lighting.add(this.x - camX, this.y - camY, 12, C.blight4, 0.7); }
}

export class Puddle implements Projectile {
  dead = false; t = 0; id: number; tick = 0;
  constructor(public x: number, public y: number, g: Game) { this.id = g.nextAttackId(); }
  update(g: Game, dt: number) {
    this.t += dt; this.tick += dt;
    if (this.tick > 0.5) { this.tick = 0; this.id = g.nextAttackId(); }
    if (rng.chance(dt * 6)) g.particles.spawn(this.x + rng.range(-10, 10), this.y - 2, { vy: -rng.range(10, 25), max: 0.6, color: C.blight4, color2: C.sick1, light: 4, lightColor: C.blight4 });
    if (this.t > 2.8) this.dead = true;
  }
  box(): AttackBox | null { return this.t < 2.6 ? { x: this.x - 12, y: this.y - 5, w: 24, h: 5, dmg: 7, id: this.id } : null; }
  draw(ctx: Ctx, camX: number, camY: number, time: number) {
    const k = this.t < 0.2 ? this.t / 0.2 : this.t > 2.3 ? Math.max(0, (2.8 - this.t) / 0.5) : 1;
    const hw = Math.round(12 * k);
    const x = Math.round(this.x - camX), y = Math.round(this.y - camY);
    ctx.fillStyle = C.blight2; ctx.fillRect(x - hw, y - 2, hw * 2, 2);
    ctx.fillStyle = C.blight3; ctx.fillRect(x - hw + 2, y - 3, Math.max(0, hw * 2 - 4), 1);
    for (let i = -hw; i < hw; i += 3) if (Math.sin(time * 6 + i) > 0.6) { ctx.fillStyle = C.blight5; ctx.fillRect(x + i, y - 3, 1, 1); }
  }
  lights(g: Game, camX: number, camY: number) { g.lighting.add(this.x - camX, this.y - 2 - camY, 16, C.blight4, 0.5); }
}
