import { audio } from "../core/audio";
import { approach, clamp, hash, sign } from "../core/math";
import { rng } from "../core/rng";
import { disc, line, rect, type Ctx } from "../gfx/canvas";
import { C } from "../gfx/palette";
import { shadow, SpriteBuf } from "../gfx/sprite";
import type { Game } from "../game";
import { moveBody } from "../world/physics";
import type { Projectile } from "./boss";
import { Boss, KNEEL_T, POSTURE_MAX } from "./bossBase";
import { Sludgeling, type AttackBox } from "./enemies";

type Mode =
  | "dormant" | "wake" | "roar" | "idle" | "walk"
  | "pickWind" | "pick" | "pickStuck"
  | "hookWind" | "hook" | "hookRec"
  | "bellWind" | "bell"
  | "spitWind" | "spitRec"
  | "call" | "kneel" | "dying";

const buf = new SpriteBuf(180, 130, 24);
export const GRIM_NAME = "Grimwater, the Drowned Foreman";
/** How deep the flood gets over the arena floor. Platforms stay dry. */
const FLOOD_DEPTH = 46;
const W1 = "#1a4a52", W2 = "#2e7a78", W3 = "#6ad0c0", W4 = "#b8f0e0";

/**
 * The Foreman rang the flood bell the night the seam broke, and never stopped.
 * Reads like Wick with heavier commitments: a slow overhead pick that sticks in the rock,
 * a chained anchor thrown along the floor, bubbles that drift after you, and the bell:
 * when it rings, the shaft floods and the only dry ground is up on the scaffolds.
 */
export class Grimwater extends Boss {
  readonly table = "grimwater";
  readonly label = GRIM_NAME;
  readonly title = "GRIMWATER";
  readonly subtitle = "THE DROWNED FOREMAN";
  readonly deathTitle = "THE BELL FALLS SILENT";
  readonly phase2Text = "The Foreman's lamp turns the colour of the Rot...";
  readonly music: [string, string] = ["grim", "grim2"];
  mode: Mode = "dormant";
  atkId = 0;
  walkPhase = 0;
  bellCd = 7;
  callCd = 8;
  /** 0 = dry, 1 = fully flooded. */
  flood = 0;
  floodState: "none" | "rise" | "hold" | "fall" = "none";
  floodT = 0;
  anchor: Anchor | null = null;
  shakeT = 0;

  constructor(cx: number, gy: number) {
    super(cx, gy, 28, 44, 560);
  }

  get invulnerable() { return this.mode === "dormant" || this.mode === "wake" || this.mode === "roar" || this.mode === "dying"; }
  wake() { if (this.mode === "dormant") { this.mode = "wake"; this.st = 0; } }

  waterY(): number | null { return this.flood > 0.01 ? this.homeY - FLOOD_DEPTH * this.flood : null; }

  takeHit(g: Game, dmg: number, crit: boolean, dir: number, quiet = false, heavy = false) {
    if (this.invulnerable || this.dead) { if (!quiet) audio.play("clink", 3); return; }
    super.takeHit(g, dmg, crit, dir, quiet, heavy);
    if (!this.dead && this.mode !== "dying" && this.phase === 1 && this.hp <= this.maxHp * 0.5) {
      this.phase = 2; this.mode = "roar"; this.st = 0; this.vx = 0; this.posture = 0;
      this.bellCd = Math.min(this.bellCd, 3);
      audio.play("roar");
      g.shake(5, 1.2);
      g.onBossPhase2();
    }
  }
  protected onHurt() { /* he doesn't flinch */ }
  vulnMult() { return this.mode === "kneel" ? 2 : this.mode === "pickStuck" ? 1.35 : 1; }
  protected onDeath(g: Game) {
    this.mode = "dying"; this.st = 0; this.dead = false;
    this.hp = 0;
    this.floodState = this.flood > 0 ? "fall" : "none"; this.floodT = 0;
    audio.play("roar");
    g.shake(4, 1.5);
    g.hitstopFor(0.25);
  }

  private begin(m: Mode) { this.mode = m; this.st = 0; }
  private toIdle() { this.begin("idle"); }

  private updateFlood(g: Game, dt: number) {
    this.floodT += dt;
    const hold = this.phase === 2 ? 4.2 : 3.4;
    switch (this.floodState) {
      case "rise":
        this.flood = clamp(this.floodT / 1.5, 0, 1);
        if (Math.floor(this.floodT * 20) % 2 === 0) g.particles.spawn(rng.range(g.level.arena.x0, g.level.arena.x1), this.homeY - FLOOD_DEPTH * this.flood, { vy: -rng.range(10, 30), max: 0.5, color: W4, color2: W3 });
        if (this.floodT >= 1.5) { this.floodState = "hold"; this.floodT = 0; }
        break;
      case "hold":
        this.flood = 1;
        if (this.floodT >= hold) { this.floodState = "fall"; this.floodT = 0; }
        break;
      case "fall":
        this.flood = clamp(1 - this.floodT / 1.3, 0, 1);
        if (this.flood <= 0) { this.floodState = "none"; this.floodT = 0; }
        break;
    }
  }

  protected think(g: Game, dt: number) {
    const p = g.player;
    const dx = p.cx - this.cx, dist = Math.abs(dx);
    const A = g.level.arena;
    const fast = this.phase === 2 ? 0.76 : 1;
    this.shakeT = Math.max(0, this.shakeT - dt);
    this.updateFlood(g, dt);
    if (this.hp <= 0 && this.mode !== "dying") { this.mode = "dying"; this.st = 0; }
    this.postureT += dt;
    if (this.postureT > 3 && this.mode !== "kneel") this.posture = Math.max(0, this.posture - 6 * dt);
    const canKneel = !["dying", "roar", "dormant", "wake", "kneel", "bell"].includes(this.mode);
    if (this.posture >= POSTURE_MAX && canKneel) {
      this.begin("kneel"); this.vx = 0;
      if (this.anchor) { this.anchor.returning = true; }
      audio.play("slam"); g.shake(4, 0.3);
      g.addFloat("STAGGERED", this.cx, this.y - 16, C.gold2, true);
      g.particles.burst(this.cx, this.y + 20, 24, { speed: 90, colors: [W2, W3, C.gold2], g: 250, max: 0.9 });
    }

    if (this.mode !== "dormant") {
      this.vy = Math.min(this.vy + 900 * dt, 400);
      moveBody(this, g.level, dt, { ignoreOneWay: true });
    }
    this.x = clamp(this.x, A.x0 + 4, A.x1 - this.w - 4);
    if (rng.chance(dt * 5) && this.mode !== "dormant") g.particles.spawn(this.cx + rng.range(-12, 12), this.y + rng.range(8, 36), { vy: 20, g: 300, max: 0.6, color: W3, color2: W2 });

    switch (this.mode) {
      case "dormant":
        this.x = this.homeX - this.w / 2; this.vx = 0;
        break;
      case "wake":
        this.vx = 0;
        if (this.st > 0.4 && this.st - dt <= 0.4) audio.play("bell");
        if (this.st > 1.4) { this.begin("roar"); audio.play("roar"); g.shake(4, 1.0); }
        break;
      case "roar":
        this.vx = 0;
        if (this.st > 1.4) this.toIdle();
        break;
      case "idle":
        this.vx = approach(this.vx, 0, 400 * dt);
        this.facing = sign(dx) || this.facing;
        if (this.st > 0.6 * fast && p.alive) this.choose(g, dist);
        break;
      case "walk":
        this.facing = sign(dx) || this.facing;
        this.vx = approach(this.vx, this.facing * (this.phase === 2 ? 60 : 46), 400 * dt);
        this.walkPhase += Math.abs(this.vx) * dt * 0.12;
        if (dist < 58) { this.begin("pickWind"); audio.play("tell"); }
        else if (this.st > 1.6) this.choose(g, dist);
        break;
      case "pickWind":
        // the pick goes up, and up: a long, honest wind-up
        this.vx = approach(this.vx, -this.facing * 12, 300 * dt);
        if (this.st > 0.78 * fast) {
          this.begin("pick"); this.atkId = g.nextAttackId(); this.vx = this.facing * 90;
          audio.play("swingHeavy");
        }
        break;
      case "pick":
        this.vx = approach(this.vx, 0, 600 * dt);
        if (this.st > 0.14) {
          this.begin("pickStuck"); this.vx = 0;
          audio.play("slam"); g.shake(5, 0.35);
          const hx = this.cx + this.facing * 34;
          g.particles.dust(hx, this.bottom, 14);
          g.particles.burst(hx, this.bottom - 2, 14, { speed: 90, colors: [C.stone2, C.stone3, W3], g: 400, max: 0.7, size: 2 });
          if (this.phase === 2) g.projectiles.push(new Ripple(hx, this.bottom, this.facing, g.nextAttackId()));
        }
        break;
      case "pickStuck":
        // the pick is wedged in the rock: this is your opening
        this.vx = 0;
        if (this.st > 0.95 * fast) this.toIdle();
        break;
      case "hookWind":
        this.facing = sign(dx) || this.facing;
        this.vx = 0;
        if (Math.floor(this.st * 8) !== Math.floor((this.st - dt) * 8)) audio.play("chain");
        if (this.st > 0.62 * fast) {
          this.anchor = new Anchor(this, this.cx + this.facing * 18, this.bottom - 9, this.facing, g.nextAttackId(), this.phase === 2 ? 290 : 250);
          g.projectiles.push(this.anchor);
          audio.play("throw");
          this.begin("hook");
        }
        break;
      case "hook":
        this.vx = 0;
        if (!this.anchor || this.anchor.dead) { this.anchor = null; this.begin("hookRec"); }
        break;
      case "hookRec":
        if (this.st > 0.5 * fast) this.toIdle();
        break;
      case "bellWind":
        this.vx = 0;
        if (this.st > 0.9) {
          this.begin("bell");
          audio.play("bell"); g.shake(3, 0.8);
          g.chat.push("The flood bell tolls. Get to high ground!", W3);
          this.floodState = "rise"; this.floodT = 0;
          this.bellCd = this.phase === 2 ? 10 : 14;
        }
        break;
      case "bell":
        this.vx = 0;
        if (this.st > 0.7) this.toIdle();
        break;
      case "spitWind":
        this.facing = sign(dx) || this.facing;
        if (this.st > 0.55 * fast) {
          const n = this.phase === 2 ? 5 : 3;
          for (let i = 0; i < n; i++) {
            const k = i / (n - 1);
            g.projectiles.push(new Bubble(this.cx + this.facing * 8, this.y + 6, this.facing * (40 + k * 120), -rng.range(90, 170), g.nextAttackId()));
          }
          audio.play("splash");
          this.begin("spitRec");
        }
        break;
      case "spitRec":
        if (this.st > 0.6 * fast) this.toIdle();
        break;
      case "call":
        this.vx = 0;
        if (this.st > 0.6 && this.st - dt <= 0.6) {
          audio.play("splash");
          for (const side of [-1, 1]) {
            const x = clamp(p.cx + side * 100, A.x0 + 24, A.x1 - 24);
            const s = new Sludgeling(x, this.homeY);
            s.hp = s.maxHp = 20;
            g.enemies.push(s);
            g.particles.splat(x, this.homeY - 4, [W2, W3, W4], 12);
          }
        }
        if (this.st > 1.2) { this.callCd = 15; this.toIdle(); }
        break;
      case "kneel":
        this.vx = 0;
        this.posture = POSTURE_MAX * Math.max(0, 1 - this.st / KNEEL_T);
        if (this.st > KNEEL_T) { this.posture = 0; this.toIdle(); }
        break;
      case "dying":
        this.vx = 0;
        if (Math.floor(this.st * 20) % 3 === 0) g.particles.burst(this.cx + rng.range(-12, 12), this.y + rng.range(10, 40), 3, { speed: 70, colors: [W2, W3, W4, C.gold1], g: 200, max: 1 });
        if (this.st > 2.2) {
          this.dead = true; this.remove = true;
          g.particles.burst(this.cx, this.y + 24, 60, { speed: 160, colors: [W1, W2, W3, W4, C.gold2], g: 260, max: 1.6, size: 2 });
          g.onBossDefeated(this);
        }
        break;
    }
    this.bellCd -= dt;
    this.callCd -= dt;
  }

  private choose(g: Game, dist: number) {
    const sludges = g.enemies.filter((e) => e instanceof Sludgeling && !e.dead).length;
    if (this.bellCd <= 0 && this.floodState === "none") { this.begin("bellWind"); audio.play("tell"); return; }
    if (this.phase === 2 && this.callCd <= 0 && sludges === 0) { this.begin("call"); return; }
    if (dist < 58) { this.begin("pickWind"); audio.play("tell"); return; }
    const r = rng.next();
    if (dist < 150) {
      if (r < 0.4) this.begin("walk");
      else if (r < 0.72) { this.begin("hookWind"); audio.play("tell"); }
      else { this.begin("spitWind"); audio.play("tell"); }
    } else {
      if (r < 0.45) { this.begin("hookWind"); audio.play("tell"); }
      else if (r < 0.75) { this.begin("spitWind"); audio.play("tell"); }
      else this.begin("walk");
    }
  }

  attackBoxes(): AttackBox[] {
    if (this.mode === "pick" && this.st < 0.14) {
      const x0 = this.facing > 0 ? this.cx : this.cx - 52;
      return [{ x: x0, y: this.bottom - 44, w: 52, h: 44, dmg: 34, id: this.atkId }];
    }
    return [];
  }

  hurtbox() { return { x: this.x + 2, y: this.y - 6, w: this.w - 4, h: this.h + 6 }; }

  // ========================================================================= draw
  draw(_g: Game, ctx: Ctx, camX: number, camY: number) {
    const m = this.mode;
    const ox = this.shakeT > 0 || m === "roar" ? Math.round(Math.sin(this.t * 60)) : 0;
    const sx = this.cx - camX + ox, sy = this.bottom - camY;
    shadow(ctx, sx, sy + 1, 30, 0.45);
    const c = buf.begin();
    const t = this.t;
    let lean = 0, bob = 0, pickA = -2.2, handY = -26, headDy = 0;
    let fF = [6, 0], bF = [-6, 0];
    let lamp: string = this.phase === 2 ? C.sick2 : C.fire2;
    let bellSwing = Math.sin(t * 2) * 0.3;
    switch (m) {
      case "dormant": bob = 8; lean = 4; headDy = 4; pickA = 0.9; handY = -14; lamp = Math.floor(t * 1.5) % 3 ? "#4a3a2a" : C.fire0; break;
      case "wake": { const k = clamp(this.st / 1.2, 0, 1); bob = Math.round(8 * (1 - k)); lean = Math.round(4 * (1 - k)); pickA = 0.9 - k * 2.4; lamp = Math.floor(this.st * 10) % 2 ? lamp : C.white; break; }
      case "roar": lean = -3; headDy = -2; bob = Math.floor(this.st * 12) % 2; pickA = -2.6; handY = -34; break;
      case "idle": bob = Math.sin(t * 1.8) > 0.3 ? 1 : 0; lean = 1; break;
      case "walk": {
        const ph = this.walkPhase;
        fF = [Math.round(Math.sin(ph) * 6), -Math.round(Math.max(0, Math.cos(ph)) * 3)];
        bF = [Math.round(-Math.sin(ph) * 6), -Math.round(Math.max(0, -Math.cos(ph)) * 3)];
        bob = Math.abs(Math.sin(ph)) > 0.7 ? -1 : 0; lean = 2;
        break;
      }
      case "pickWind": { const k = clamp(this.st / 0.5, 0, 1); lean = -3; pickA = -2.2 - k * 1.1; handY = -30 - Math.round(k * 8); fF = [8, 0]; bF = [-7, 0]; if (Math.floor(this.st * 12) % 2 === 0) lamp = C.white; break; }
      case "pick": { const e = clamp(this.st / 0.1, 0, 1); pickA = -3.3 + e * 4.2; lean = 5; handY = -30 + Math.round(e * 14); fF = [10, 0]; bF = [-8, 0]; break; }
      case "pickStuck": pickA = 0.95; lean = 6; handY = -16; bob = 2; fF = [10, 0]; bF = [-8, 0]; break;
      case "hookWind": lean = -2; handY = -30; pickA = -1.2; bellSwing = 0; if (Math.floor(this.st * 12) % 2 === 0) lamp = C.white; break;
      case "hook": case "hookRec": lean = 3; handY = -24; pickA = -0.6; break;
      case "bellWind": bellSwing = Math.sin(this.st * 30) * 1.2; lean = -1; lamp = Math.floor(this.st * 10) % 2 ? W4 : lamp; break;
      case "bell": bellSwing = Math.sin(this.st * 24) * (1.2 - this.st); break;
      case "spitWind": headDy = -2; lean = -2; break;
      case "spitRec": headDy = 1; lean = 2; break;
      case "call": lean = -2; headDy = -2; pickA = -2.6; handY = -36; break;
      case "kneel": bob = 9; lean = 5; headDy = 4; pickA = 1.1; handY = -12; fF = [9, -2]; bF = [-6, 0]; lamp = Math.floor(this.st * 6) % 2 ? "#3a2a2a" : lamp; break;
      case "dying": { const k = clamp(this.st / 2, 0, 1); bob = Math.round(k * 22); lean = Math.round(k * 6); headDy = Math.round(k * 4); lamp = Math.floor(this.st * 8) % 2 ? lamp : "#3a2a2a"; break; }
    }

    const coat = "#24444a", coatD = "#162c32", coatL = "#35606a", trouser = "#262a38";
    // legs
    const leg = (hx: number, f: number[], col: string) => {
      line(c, hx, -18 + bob, f[0], f[1] - 3, col, 5);
      rect(c, f[0] - 3, f[1] - 3, 8, 3, "#15141c"); rect(c, f[0] - 3, f[1] - 3, 8, 1, "#2a2833");
    };
    leg(-5, bF, "#1d2030");
    // back arm (on the pick haft)
    const hx0 = lean + 2, hy0 = handY + bob;
    line(c, -9 + lean, -32 + bob, hx0 - 4, hy0 + 2, coatD, 4);
    // barrel body: an oilskin coat, barnacled and dripping
    for (let yy = 0; yy < 28; yy++) {
      const Y = -44 + yy + bob;
      const bulge = Math.round(Math.sin((yy / 28) * Math.PI) * 4);
      const hw = 10 + bulge;
      const off = Math.round((lean * (28 - yy)) / 28);
      for (let xx = -hw; xx <= hw; xx++) {
        let col = xx < -hw + 3 ? coatD : xx > hw - 4 ? coatL : coat;
        if (yy > 23 && hash(xx + 40, Math.floor(t * 2), 7) > 0.7) col = coatD;
        if (hash(xx + off, yy, 31) > 0.95) col = W2; // barnacles and weed
        c.fillStyle = col; c.fillRect(xx + off, Y, 1, 1);
      }
    }
    rect(c, -12 + Math.round(lean * 0.4), -24 + bob, 25, 3, "#3a2a22"); // belt
    rect(c, -2 + Math.round(lean * 0.4), -24 + bob, 4, 3, C.gold1);
    // the flood bell on his hip
    const bx = -9 + Math.round(lean * 0.3) + Math.round(Math.sin(bellSwing) * 4), by = -21 + bob;
    for (let yy = 0; yy < 8; yy++) { const w = 3 + Math.floor(yy / 2); rect(c, bx - w, by + yy, w * 2 + 1, 1, yy === 0 ? C.gold2 : yy > 6 ? C.gold0 : C.gold1); }
    rect(c, bx, by + 8, 1, 2, C.gold0);
    leg(5, fF, trouser);
    // diving helmet
    const hx = lean + 1, hy = -58 + bob + headDy;
    disc(c, hx, hy + 7, 9, 8, "#5a4a22");
    disc(c, hx, hy + 7, 8, 7, "#8a7a3a");
    disc(c, hx - 2, hy + 4, 3, 2, "#a8964a");
    rect(c, hx - 9, hy + 13, 19, 3, "#6a5a2a");
    for (const bxx of [-7, -2, 3, 8]) { c.fillStyle = "#c9b894"; c.fillRect(hx + bxx, hy + 14, 1, 1); }
    // porthole with eyes swimming in murk
    disc(c, hx + 3, hy + 7, 4, 4, "#4a3a1a");
    disc(c, hx + 3, hy + 7, 3, 3, "#0f2226");
    const eye = this.phase === 2 ? C.sick2 : W3;
    c.fillStyle = eye; c.fillRect(hx + 2, hy + 6, 1, 1); c.fillRect(hx + 5, hy + 6, 1, 1);
    c.fillStyle = W4; c.fillRect(hx + 1, hy + 5, 1, 1);
    // lamp on the crown
    rect(c, hx - 2, hy - 3, 5, 3, "#5a4a22"); rect(c, hx - 1, hy - 2, 3, 2, lamp);
    // front arm and the great pick
    line(c, 9 + lean, -34 + bob, hx0 + 2, hy0, coat, 4);
    this.drawPick(c, hx0, hy0, pickA);
    rect(c, hx0 - 2, hy0 - 2, 5, 5, "#4a6a70");

    const alpha = m === "dying" ? clamp(1.4 - this.st / 1.6, 0, 1) : 1;
    buf.end(ctx, sx, sy, { flip: this.facing < 0, flash: this.flash * 7, alpha });
  }

  private drawPick(c: Ctx, hx: number, hy: number, ang: number) {
    const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
    for (let i = -10; i <= 34; i++) { c.fillStyle = i % 7 === 0 ? C.wood0 : C.wood1; c.fillRect(Math.round(hx + dx * i), Math.round(hy + dy * i), 2, 2); }
    // chain wrapped round the haft
    for (let i = 4; i < 14; i += 2) { c.fillStyle = C.steel1; c.fillRect(Math.round(hx + dx * i + nx), Math.round(hy + dy * i + ny), 1, 1); }
    const tx = hx + dx * 34, ty = hy + dy * 34;
    for (let k = -14; k <= 14; k++) {
      const back = (k * k) / 26;
      const bx = tx + nx * k - dx * back, by = ty + ny * k - dy * back;
      c.fillStyle = Math.abs(k) > 11 ? C.steel3 : Math.abs(k) < 3 ? C.steel0 : C.steel2;
      c.fillRect(Math.round(bx), Math.round(by), 2, 2);
      if (Math.abs(k) < 11) { c.fillStyle = C.steel0; c.fillRect(Math.round(bx - dx * 2), Math.round(by - dy * 2), 1, 1); }
    }
  }

  lights(g: Game, camX: number, camY: number) {
    const col = this.phase === 2 ? C.sick1 : C.fire1;
    g.lighting.add(this.cx + this.facing - camX, this.y - 14 - camY, this.mode === "dormant" ? 26 : this.phase === 2 ? 50 : 40, col, 0.95);
    g.lighting.add(this.cx - camX, this.y + 22 - camY, 34, "#2e7a78", 0.6);
  }

  /** The flood, drawn over everyone standing in it. */
  drawFront(g: Game, ctx: Ctx, camX: number, camY: number) {
    const wy = this.waterY();
    if (wy === null) return;
    const A = g.level.arena, t = this.t;
    const x0 = Math.max(0, Math.round(A.x0 - camX)), x1 = Math.min(384, Math.round(A.x1 - camX));
    const floor = Math.round(this.homeY - camY) + 16;
    for (let x = x0; x < x1; x++) {
      const wx = x + camX;
      const wave = Math.round(Math.sin(t * 2.6 + wx * 0.12) * 1.2 + Math.sin(t * 1.4 + wx * 0.05));
      const sy = Math.round(wy - camY) + wave;
      if (sy >= floor) continue;
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = W1; ctx.fillRect(x, sy + 2, 1, floor - sy - 2);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = W2; ctx.fillRect(x, sy + 1, 1, 1);
      ctx.fillStyle = hash(wx, Math.floor(t * 4), 3) > 0.93 ? W4 : W3; ctx.fillRect(x, sy, 1, 1);
      ctx.globalAlpha = 1;
    }
  }
}

// ======================================================================= projectiles
/** The anchor on its chain: skims the floor out and back. Jump it or roll through it. */
export class Anchor implements Projectile {
  dead = false; t = 0; returning = false;
  private dist = 0;
  constructor(private owner: Grimwater, public x: number, public y: number, public dir: number, public id: number, private speed: number) { }
  update(g: Game, dt: number) {
    this.t += dt;
    const A = g.level.arena;
    if (!this.returning) {
      this.x += this.dir * this.speed * dt; this.dist += this.speed * dt;
      if (this.dist > 170 || this.x < A.x0 + 6 || this.x > A.x1 - 6) {
        this.returning = true; this.id = g.nextAttackId();
        audio.play("clink", 3);
        g.particles.hit(this.x, this.y, -this.dir, C.steel2, 5);
      }
    } else {
      const hx = this.owner.cx + this.dir * 16;
      const d = hx - this.x;
      this.x += Math.sign(d) * Math.min(Math.abs(d), this.speed * 1.1 * dt);
      if (Math.abs(d) < 4 || this.owner.mode === "dying") this.dead = true;
    }
    if (Math.floor(this.t * 30) % 3 === 0) g.particles.spawn(this.x, this.y + 6, { vx: -this.dir * 20, vy: -rng.range(10, 30), g: 300, max: 0.3, color: C.stone2 });
  }
  box(): AttackBox { return { x: this.x - 7, y: this.y - 6, w: 14, h: 12, dmg: 22, id: this.id }; }
  draw(ctx: Ctx, camX: number, camY: number) {
    const x = Math.round(this.x - camX), y = Math.round(this.y - camY);
    const ox = Math.round(this.owner.cx + this.dir * 16 - camX), oy = Math.round(this.owner.y + 18 - camY);
    // chain
    const n = Math.max(1, Math.floor(Math.hypot(x - ox, y - oy) / 3));
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      const sag = Math.sin(k * Math.PI) * 4;
      ctx.fillStyle = i % 2 ? C.steel1 : C.steel0;
      ctx.fillRect(Math.round(ox + (x - ox) * k), Math.round(oy + (y - oy) * k + sag), 2, 1);
    }
    // anchor
    const d = this.dir;
    ctx.fillStyle = C.ink; ctx.fillRect(x - 2, y - 7, 4, 13); ctx.fillRect(x - 7, y + 2, 14, 4);
    ctx.fillStyle = C.steel1; ctx.fillRect(x - 1, y - 6, 2, 11);
    ctx.fillStyle = C.steel2; ctx.fillRect(x - 6, y + 3, 12, 2);
    ctx.fillStyle = C.steel3; ctx.fillRect(x - 6 * d, y + 1, 1, 2); ctx.fillRect(x + 6 * d, y + 1, 1, 2);
    ctx.fillStyle = C.steel0; ctx.fillRect(x - 2, y - 7, 4, 2);
  }
}

/** A drifting bubble of drowned air. It lazily follows you, then pops. */
export class Bubble implements Projectile {
  dead = false; t = 0;
  constructor(public x: number, public y: number, public vx: number, public vy: number, public id: number) { }
  update(g: Game, dt: number) {
    this.t += dt;
    const p = g.player;
    if (this.t < 0.6) { this.vy += 300 * dt; }
    else {
      const dx = p.cx - this.x, dy = p.y + 8 - this.y, d = Math.hypot(dx, dy) || 1;
      this.vx = approach(this.vx, (dx / d) * 42, 60 * dt);
      this.vy = approach(this.vy, (dy / d) * 42 + Math.sin(this.t * 3) * 10, 60 * dt);
    }
    this.x += this.vx * dt; this.y += this.vy * dt;
    const L = g.level;
    if (L.solidAt(Math.floor(this.x / 16), Math.floor((this.y + 4) / 16))) { this.y -= this.vy * dt; this.vy = -Math.abs(this.vy) * 0.3; }
    if (this.t > 4.5) this.pop(g);
  }
  pop(g: Game) {
    if (this.dead) return;
    this.dead = true;
    audio.play("splash");
    g.particles.burst(this.x, this.y, 10, { speed: 60, colors: [W3, W4, C.white], max: 0.4, g: 100 });
  }
  box(): AttackBox { return { x: this.x - 4, y: this.y - 4, w: 8, h: 8, dmg: 12, id: this.id }; }
  draw(ctx: Ctx, camX: number, camY: number, time: number) {
    const x = Math.round(this.x - camX), y = Math.round(this.y - camY);
    const r = 4 + (Math.floor(time * 6 + this.x) % 2);
    disc(ctx, x, y, r, r, W2);
    disc(ctx, x, y, r - 1, r - 1, W1);
    ctx.fillStyle = W4; ctx.fillRect(x - 2, y - 2, 2, 1); ctx.fillRect(x - 2, y - 1, 1, 1);
    if (this.t > 4) { ctx.fillStyle = C.white; ctx.fillRect(x, y, 1, 1); }
  }
  lights(g: Game, camX: number, camY: number) { g.lighting.add(this.x - camX, this.y - camY, 12, W3, 0.6); }
}

/** Phase 2: the pick's impact sends a ripple of rock along the floor. */
export class Ripple implements Projectile {
  dead = false; t = 0;
  constructor(public x: number, public y: number, public dir: number, public id: number) { }
  update(g: Game, dt: number) {
    this.t += dt;
    this.x += this.dir * 150 * dt;
    const A = g.level.arena;
    if (this.t > 1.4 || this.x < A.x0 || this.x > A.x1) this.dead = true;
    if (Math.floor(this.t * 30) % 2 === 0) g.particles.spawn(this.x, this.y - 2, { vx: -this.dir * 20, vy: -rng.range(20, 60), g: 300, max: 0.4, color: rng.chance(0.5) ? C.stone2 : W3, size: 2 });
  }
  box(): AttackBox { return { x: this.x - 5, y: this.y - 12, w: 10, h: 12, dmg: 16, id: this.id }; }
  draw(ctx: Ctx, camX: number, camY: number, time: number) {
    const x = Math.round(this.x - camX), y = Math.round(this.y - camY);
    for (let k = 0; k < 7; k++) {
      const h = [3, 7, 10, 12, 9, 5, 2][k] + (Math.floor(time * 30 + k) % 2);
      ctx.fillStyle = k === 3 ? W4 : k % 2 ? C.stone2 : C.stone1;
      ctx.fillRect(x - 3 * this.dir + k * this.dir, y - h, 1, h);
    }
  }
  lights(g: Game, camX: number, camY: number) { g.lighting.add(this.x - camX, this.y - 6 - camY, 14, W3, 0.7); }
}
