import { audio } from "./core/audio";
import { H, STEP, TILE, W } from "./core/constants";
import { Input } from "./core/input";
import { approach, clamp, hash, mix, overlap, type Rect } from "./core/math";
import { rng } from "./core/rng";
import { Background } from "./gfx/background";
import type { Ctx } from "./gfx/canvas";
import { Lighting, makeVignette } from "./gfx/lighting";
import { C, RARITY } from "./gfx/palette";
import { Particles } from "./gfx/particles";
import { drawBog, drawFog, renderTiles, type TileLayers } from "./gfx/tiles";
import { Puddle, Wick, type Projectile } from "./entities/boss";
import { Blightling, Crow, Enemy, Husk, Pot } from "./entities/enemies";
import { NPC, Pet, Pickup, Purse, Shrine, Sign } from "./entities/objects";
import { Player } from "./entities/player";
import { Chat } from "./systems/chat";
import { baseOf, displayName, type Item, type Slot } from "./systems/items";
import { DICE_CHARGE, FACES, rollFinisher, type FinFace } from "./systems/dice";
import { rollDrops } from "./systems/loot";
import { loadSave, newSave, wipeSave, writeSave, type SaveData } from "./systems/save";
import { levelForXp, SKILL_INFO, type Skill } from "./systems/skills";
import { computeStats, type Stats } from "./systems/stats";
import { DiceMenu, drawFinFx, type FinFx } from "./ui/dice";
import { Dialog } from "./ui/dialog";
import { drawFloaters, drawHud, type Floater, type XpDrop } from "./ui/hud";
import { InventoryMenu, type Overlay } from "./ui/menu";
import { drawBanner, drawDeath, IntroScreen, PauseMenu, RestMenu, TitleScreen, type Banner } from "./ui/screens";
import { ShopMenu } from "./ui/shop";
import { buildLevel1, T, type Level } from "./world/level";
import { drawMillBlades, renderProps, type PropLayer } from "./world/props";

type Mode = "title" | "intro" | "play" | "dead";

const MAX_ATTACKERS = 2;
/** A roll counts as perfect if the attack lands within this long of the roll starting. */
const PERFECT_WINDOW = 0.24;
const ATTACK_GAP = 0.35;

export class Game {
  readonly ctx: Ctx;
  readonly input: Input;
  readonly level: Level;
  private bg: Background;
  private tiles: TileLayers;
  private props: PropLayer;
  readonly lighting = new Lighting();
  private vignette: HTMLCanvasElement;
  readonly particles = new Particles();
  readonly chat = new Chat();

  save: SaveData;
  stats: Stats;
  player: Player;
  enemies: Enemy[] = [];
  pots: Pot[] = [];
  boss: Wick | null = null;
  bossActive = false;
  bossTrail = 0;
  projectiles: Projectile[] = [];
  pickups: Pickup[] = [];
  npcs: NPC[];
  shrines: Shrine[];
  signs: Sign[];
  purse: Purse | null = null;
  pet: Pet | null = null;
  floaters: Floater[] = [];
  xpDrops: XpDrop[] = [];

  mode: Mode = "title";
  overlays: Overlay[] = [];
  private titleScreen = new TitleScreen();
  private intro: IntroScreen | null = null;
  banner: Banner | null = null;
  private bannerQueue: Banner[] = [];

  cam = { x: 0, y: 0 };
  private camLook = 0;
  private shakeAmt = 0;
  private shakeT = 0;
  private hitstop = 0;
  private flashT = 0;
  private flashColor: string = C.hp;
  private fade = 0;
  time = 0;
  private attackIds = 1;
  private lastAttackStart = -10;
  private riposteFor = -1;
  /** Real-time seconds of slow motion left (perfect dodge). */
  private slowT = 0;
  /** Stamina bar flash when an attack is refused. */
  stamFlash = 0;
  /** The finisher die is rolled once per heavy swing, on its first hit. */
  private finFor = -1;
  private finFace: FinFace = "blank";
  finFx: FinFx[] = [];
  private dodged = new Set<number>();
  prompt: { x: number; y: number; text: string } | null = null;
  private region = "";
  private seenRegions = new Set<string>();
  private deathT = 0;
  private deathLostPurse = false;
  healFlash = 0;
  private lastToast = "";
  private lastToastT = 0;
  private ambientT = 0;
  private bogCd = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    this.ctx.imageSmoothingEnabled = false;
    this.input = new Input(window);
    this.input.onFirstGesture = () => audio.unlock();
    this.level = buildLevel1();
    this.bg = new Background(this.level);
    this.tiles = renderTiles(this.level);
    this.props = renderProps(this.level);
    this.vignette = makeVignette(C.black);
    this.save = loadSave() ?? newSave();
    this.stats = computeStats(this.save);
    this.player = new Player(0, 0);
    this.npcs = this.level.npcs.map((d) => new NPC(d));
    this.shrines = this.level.shrines.map((d) => new Shrine(d));
    this.signs = this.level.signs.map((d) => new Sign(d));
    this.placeAtShrine("village");
    this.resetWorld();
    this.cam.x = 60; this.cam.y = this.level.pxH - H;
    audio.music("title");
  }

  // ===================================================================== flow
  startGame(fresh: boolean) {
    if (fresh) { wipeSave(); this.save = newSave(); }
    else this.save = loadSave() ?? newSave();
    this.stats = computeStats(this.save);
    this.pickups = []; this.floaters = []; this.xpDrops = []; this.chat.lines = [];
    this.seenRegions.clear(); this.region = "";
    this.purse = this.save.purse ? new Purse(this.save.purse.x, this.save.purse.y, this.save.purse.amount) : null;
    this.pet = this.save.pet ? new Pet(0, 0) : null;
    this.respawnPlayer(this.save.lastShrine);
    this.resetWorld();
    if (fresh) { this.mode = "intro"; this.intro = new IntroScreen(); audio.music("title"); }
    else { this.mode = "play"; this.fade = 1; this.chat.push("Welcome back to Hollowmere.", C.dim); }
  }

  finishIntro() {
    this.mode = "play";
    this.intro = null;
    this.fade = 1;
    this.chat.push("Welcome to Hollowmere.", C.cream);
    this.chat.push("Speak with Elder Maud by the Hearth.  [E]", C.dim);
    this.persist();
  }

  toTitle() {
    this.overlays = [];
    this.mode = "title";
    this.titleScreen = new TitleScreen();
    this.bossActive = false;
    audio.music("title");
  }

  private respawnPlayer(shrineId: string) {
    const s = this.stats;
    this.placeAtShrine(shrineId);
    const p = this.player;
    p.hp = p.hpTrail = s.maxHp; p.stam = s.maxStam; p.tonics = this.save.tonicMax + s.tonicBonus;
    p.state = "normal"; p.st = 0; p.healLeft = 0; p.deathHandled = false; p.invuln = 0;
    this.snapCamera();
  }

  private placeAtShrine(id: string) {
    const sh = this.level.shrines.find((s) => s.id === id) ?? this.level.shrines[0];
    this.player.place(sh.x + 16, sh.y);
    this.player.facing = 1;
    if (this.pet) { this.pet.x = sh.x; this.pet.y = sh.y; }
  }

  /** Respawn every foe and pot, and revive Wick. Called on rest and on death. */
  resetWorld() {
    const L = this.level;
    this.enemies = [];
    this.pots = [];
    for (const s of L.spawns) {
      if (s.kind === "blightling") this.enemies.push(new Blightling(s.x, s.y));
      else if (s.kind === "crow") this.enemies.push(new Crow(s.x, s.y));
      else if (s.kind === "husk") this.enemies.push(new Husk(s.x, s.y));
      else this.pots.push(new Pot(s.x, s.y, hash(s.x, 0, 1) > 0.6 ? 1 : 0));
    }
    this.boss = new Wick(L.arena.bossX, L.arena.bossY);
    this.bossActive = false;
    L.setFog(true);
    this.projectiles = [];
    this.dodged.clear();
  }

  openOverlay(o: Overlay) {
    this.overlays.push(o);
    this.input.consumeAll();
    audio.play("open");
  }
  closeOverlay() {
    this.overlays.pop();
    this.input.consumeAll();
  }

  persist() {
    if (this.mode === "title" || this.mode === "intro") return;
    writeSave(this.save);
  }

  nextAttackId() { return this.attackIds++; }

  /**
   * Crowd control: at most MAX_ATTACKERS foes may commit to an attack at once, new attacks
   * start at least ATTACK_GAP apart, and only foes on screen may attack. Everyone else waits
   * their turn, so a crowd stays dangerous but every hit can be read and dodged.
   */
  requestAttack(e: Enemy) {
    if (e.token) return true;
    if (!this.player.alive || this.time - this.lastAttackStart < ATTACK_GAP) return false;
    const sx = e.cx - this.cam.x;
    if (sx < 0 || sx > W) return false;
    let active = 0;
    for (const o of this.enemies) if (o.token && !o.dead) active++;
    if (active >= (this.bossActive ? 1 : MAX_ATTACKERS)) return false;
    e.token = true;
    this.lastAttackStart = this.time;
    return true;
  }

  /** Nudge overlapping ground foes apart so they can't stack into one unreadable pile. */
  private separateEnemies() {
    const L = this.level;
    const ground = this.enemies.filter((e) => !e.dead && !(e instanceof Crow));
    for (let i = 0; i < ground.length; i++) {
      for (let j = i + 1; j < ground.length; j++) {
        const a = ground[i], b = ground[j];
        if (Math.abs(a.bottom - b.bottom) > 12) continue;
        const minGap = (a.w + b.w) / 2 + 4;
        const d = b.cx - a.cx;
        if (Math.abs(d) >= minGap) continue;
        const push = Math.min(1.5, (minGap - Math.abs(d)) / 2) * (d === 0 ? 1 : Math.sign(d));
        const free = (e: Enemy, dx: number) => {
          const edge = dx > 0 ? e.x + e.w + dx : e.x + dx;
          return !L.solidAt(Math.floor(edge / TILE), Math.floor((e.bottom - 2) / TILE));
        };
        if (free(a, -push)) a.x -= push;
        if (free(b, push)) b.x += push;
      }
    }
  }
  shake(amount: number, dur = 0.2) { this.shakeAmt = Math.max(this.shakeAmt, amount); this.shakeT = Math.max(this.shakeT, dur); }
  hitstopFor(t: number) { this.hitstop = Math.max(this.hitstop, t); }
  flash(color: string, t = 0.25) { this.flashColor = color; this.flashT = t; }

  showBanner(title: string, sub = "", color: string = C.cream, big = false, dur = 3.2, region = false) {
    const b: Banner = { title, sub, color, big, t: 0, dur, region };
    // region cards never queue up behind each other; the latest one wins
    if (region) this.bannerQueue = this.bannerQueue.filter((q) => !q.region);
    if (this.banner && !(region && this.banner.region) && this.banner.t < this.banner.dur - 0.5) this.bannerQueue.push(b);
    else this.banner = b;
  }

  toast(msg: string, color: string = C.dim) {
    if (msg === this.lastToast && this.time - this.lastToastT < 3) return;
    this.lastToast = msg; this.lastToastT = this.time;
    this.chat.push(msg, color);
  }

  addFloat(text: string, x: number, y: number, color: string, big = false) {
    this.floaters.push({ text, x, y, vy: -38, t: 0, color, big });
  }

  // ===================================================================== economy & gear
  canAfford(n: number) { return this.save.bank + this.save.gold >= n; }
  spend(n: number) {
    const fromBank = Math.min(this.save.bank, n);
    this.save.bank -= fromBank;
    this.save.gold -= n - fromBank;
  }
  giveItem(item: Item) {
    const i = this.save.inv.indexOf(null);
    if (i < 0) return false;
    this.save.inv[i] = item;
    return true;
  }
  equipFromInv(idx: number) {
    const it = this.save.inv[idx];
    if (!it) return;
    const slot = baseOf(it).slot;
    this.save.inv[idx] = this.save.eq[slot];
    this.save.eq[slot] = it;
    audio.play("select");
    this.onGearChanged();
    this.persist();
  }
  unequip(slot: Slot) {
    const it = this.save.eq[slot];
    if (!it) return;
    if (slot === "weapon") { audio.play("deny"); this.toast("You'd rather not face the Rot bare-handed."); return; }
    if (!this.giveItem(it)) { audio.play("deny"); this.toast("You don't have enough inventory space."); return; }
    this.save.eq[slot] = null;
    audio.play("move");
    this.onGearChanged();
    this.persist();
  }
  onGearChanged() {
    const oldMax = this.stats.maxHp;
    this.stats = computeStats(this.save);
    const p = this.player;
    if (this.stats.maxHp > oldMax) p.hp += this.stats.maxHp - oldMax;
    p.hp = Math.min(p.hp, this.stats.maxHp);
    p.hpTrail = Math.min(p.hpTrail, this.stats.maxHp);
    p.stam = Math.min(p.stam, this.stats.maxStam);
  }

  gainXp(skill: Skill, amount: number) {
    const before = levelForXp(this.save.xp[skill]);
    this.save.xp[skill] += amount;
    const after = levelForXp(this.save.xp[skill]);
    if (after > before) this.levelUp(skill, after);
  }

  private xpDrop(amount: number, icon: string, color: string) {
    const last = this.xpDrops[this.xpDrops.length - 1];
    if (last && last.t < 0.05 && last.icon === icon) { last.text = `+${parseInt(last.text.slice(1)) + Math.round(amount)}`; return; }
    this.xpDrops.push({ text: `+${Math.round(amount)}`, color, t: 0, icon });
  }

  private levelUp(skill: Skill, lvl: number) {
    const name = SKILL_INFO[skill].name;
    audio.play("levelup");
    this.chat.push(`Congratulations, you just advanced a ${name} level.`, C.gold2);
    this.chat.push(`Your ${name} level is now ${lvl}.`, C.gold2);
    const p = this.player;
    this.addFloat("LEVEL UP!", p.cx, p.y - 12, C.gold2, true);
    for (let i = 0; i < 3; i++) {
      const x = p.cx + rng.range(-30, 30), y = p.y - rng.range(10, 40);
      this.particles.burst(x, y, 18, { speed: 70, colors: [C.gold2, C.gold3, SKILL_INFO[skill].color, C.white], g: 60, max: 0.9, drag: 2, light: 6, lightColor: C.gold2 });
    }
    this.onGearChanged();
    if (skill === "hitpoints") p.hp = Math.min(this.stats.maxHp, p.hp + 10);
    this.persist();
  }

  // ===================================================================== combat
  playerStrike(box: Rect, mult: number, id: number, heavy: boolean) {
    const p = this.player, s = this.stats;
    const targets: (Enemy | Pot)[] = [...this.enemies.filter((e) => !e.dead), ...this.pots.filter((q) => !q.broken)];
    if (this.boss && !this.boss.dead) targets.push(this.boss);
    for (const t of targets) {
      if (t.lastHitId === id || !overlap(box, t.hurtbox())) continue;
      t.lastHitId = id;
      if (t instanceof Pot) { t.break(this); continue; }
      if (t instanceof Wick && t.invulnerable) { t.takeHit(this, 0, false, p.facing); this.particles.hit(t.cx - p.facing * 8, p.y + 6, -p.facing, C.steel2, 4); continue; }
      // a riposte (after a perfect dodge) turns the whole next swing into a guard-breaking crit
      if (p.riposteT > 0 && this.riposteFor !== id) { this.riposteFor = id; p.riposteT = 0; }
      const riposte = this.riposteFor === id;
      const crit = riposte || rng.chance(s.crit);
      let fin: FinFace | null = null;
      if (heavy) {
        if (this.finFor !== id) {
          this.finFor = id;
          this.finFace = rollFinisher(s.kind);
          this.finFx.push({ x: t.cx, y: t.y - 16, t: 0, face: this.finFace, seed: rng.int(0, 5) });
          audio.play("diceLand");
        }
        fin = this.finFace;
      }
      const finMult = fin === "x2" ? 2 : fin === "x15" || fin === "skewer" ? 1.5 : 1;
      const vuln = t.vulnMult();
      const dmg = Math.max(1, Math.round(rng.int(s.dmg[0], s.dmg[1]) * s.dmgMult * mult * finMult * vuln * (riposte ? 2 : crit ? 1.75 : 1)));
      t.takeHit(this, dmg, crit, p.facing, false, heavy || riposte);
      if (fin) this.applyFinisher(fin, t, dmg, id);
      if (t instanceof Wick) t.addPosture((riposte ? 22 : 0) + (heavy ? (fin && fin !== "blank" ? 16 : 7) : 0), this);
      const hx = clamp(p.cx + p.facing * 14, t.x, t.x + t.w), hy = clamp(p.y + 8, t.y, t.y + t.h);
      this.particles.hit(hx, hy, p.facing, crit ? C.gold2 : C.fire3, crit ? 12 : 7);
      this.particles.splat(hx, hy, t instanceof Crow ? [C.inkSoft, C.blight2] : [C.blight3, C.blight4], crit ? 6 : 3);
      this.addFloat(riposte ? `${dmg}!!` : crit ? `${dmg}!` : `${dmg}`, hx, t.y - 4, riposte ? C.gold3 : crit ? C.gold2 : vuln > 1 ? C.fire1 : C.cream, crit || vuln > 1);
      this.hitstopFor(riposte ? 0.12 : crit || heavy ? 0.08 : 0.05);
      this.shake(crit ? 2.5 : heavy ? 2 : 1.2, 0.12);
      audio.play(crit ? "crit" : "hit");
      if (s.leech && p.hp < s.maxHp) { p.hp = Math.min(s.maxHp, p.hp + s.leech); }
      this.gainXp("attack", dmg * 1.6);
      this.gainXp("strength", dmg * 1.6);
      this.gainXp("hitpoints", dmg * 1.33);
      this.xpDrop(dmg * 4.53, "sword", C.cream);
    }
  }

  /** Signature finisher-die effects (the damage multipliers are applied by the caller). */
  private applyFinisher(fin: FinFace, t: Enemy, dmg: number, id: number) {
    const p = this.player, s = this.stats;
    if (fin === "rend") t.bleed(Math.max(1, Math.round(dmg * 0.15)));
    else if (fin === "reap") {
      const heal = Math.max(1, Math.round(dmg * 0.3));
      p.hp = Math.min(s.maxHp, p.hp + heal);
      this.addFloat(`+${heal}`, p.cx, p.y - 8, C.good);
    } else if (fin === "skewer" && !t.isBoss && !t.dead) { t.vx = p.facing * 260; t.vy = -140; }
    else if (fin === "twin" && t.hp > 0) {
      const d2 = Math.max(1, Math.round(dmg * 0.7));
      t.takeHit(this, d2, false, p.facing);
      this.addFloat(`${d2}`, t.cx + 6, t.y - 10, C.xp);
    } else if (fin === "cleave") {
      const others: Enemy[] = this.enemies.filter((e) => e !== t && !e.dead && Math.abs(e.cx - t.cx) < 56 && Math.abs(e.bottom - t.bottom) < 40);
      if (this.boss && this.boss !== t && !this.boss.dead && Math.abs(this.boss.cx - t.cx) < 56) others.push(this.boss);
      for (const o of others) {
        if (o.lastHitId === id) continue;
        o.lastHitId = id;
        const d2 = Math.max(1, Math.round(dmg * 0.6));
        o.takeHit(this, d2, false, p.facing);
        this.addFloat(`${d2}`, o.cx, o.y - 4, C.fire1);
        this.particles.hit(o.cx, o.y + o.h / 2, p.facing, C.fire1, 5);
      }
    }
  }

  /** Returns true if damage landed. */
  damagePlayer(raw: number, fromX: number, _o: { source?: string } = {}) {
    const p = this.player;
    if (!p.alive || p.invuln > 0 || p.iframes || p.state === "rest" || p.state === "fog") return false;
    const dmg = Math.max(1, Math.round(raw * this.stats.foeDmgMult * (1 - this.stats.dr)));
    const perks = this.stats.perks;
    p.hpTrail = Math.max(p.hpTrail, p.hp);
    p.trailDelay = 0.55;
    const taken = Math.min(dmg, Math.max(0, p.hp));
    p.hp -= dmg;
    p.invuln = 1.0; p.hurtFlash = 0.2;
    if (p.state === "drink" && !p.drinkDone) this.toast("The tonic spills from your hands!", C.bad);
    if (!perks.includes("bulwark")) {
      p.state = "hurt"; p.st = 0;
      p.vx = (Math.sign(p.cx - fromX) || -p.facing) * 130; p.vy = -150;
    }
    if (p.hp <= 0 && perks.includes("secondWind") && !this.save.secondWindUsed) {
      this.save.secondWindUsed = true;
      p.hp = 1;
      this.chat.push("Second Wind! The Hearth Dice hold you up.", C.gold2);
      this.flash(C.gold2, 0.4);
      audio.loot(4);
    }
    this.gainXp("defence", taken * 2);
    this.shake(3.5, 0.22);
    this.hitstopFor(0.07);
    this.flash(C.hp, 0.18);
    audio.play("hurt");
    this.particles.burst(p.cx, p.y + 8, 10, { speed: 90, colors: [C.hp, C.scarf0, C.scarf2], g: 400, max: 0.6, size: 2 });
    this.addFloat(`${dmg}`, p.cx, p.y - 6, C.bad, dmg >= 25);
    if (p.hp <= 0) this.playerDied();
    return true;
  }

  private combat() {
    const p = this.player;
    if (!p.alive) return;
    const hb = p.hurtbox();
    const all: Enemy[] = [...this.enemies];
    if (this.boss && this.boss.awake) all.push(this.boss);
    for (const e of all) {
      if (e.dead) continue;
      for (const box of e.attackBoxes()) if (overlap(box, hb)) this.tryHit(box.dmg, box.x + box.w / 2, box.id, e);
      if (e.contactDmg > 0 && overlap(e.hurtbox(), hb)) {
        const falling = p.vy > 40 && p.bottom - p.vy * STEP <= e.y + 5;
        if (e.stompable && falling && p.state !== "roll") {
          p.vy = this.input.isHeld("jump") ? -330 : -240; p.canDouble = true; p.jumpHeld = this.input.isHeld("jump");
          audio.play("stomp");
          if (e instanceof Blightling) e.stomped(this);
          const dmg = Math.round(12 * this.stats.dmgMult);
          e.takeHit(this, dmg, false, 0);
          this.addFloat(`${dmg}`, e.cx, e.y - 4, C.cream);
          this.hitstopFor(0.04);
          this.gainXp("attack", dmg); this.gainXp("strength", dmg * 2); this.gainXp("hitpoints", dmg * 1.33);
          this.xpDrop(dmg * 4.33, "sword", C.cream);
        } else if (e.contactActive()) this.tryHit(e.contactDmg, e.cx, e.contactId, e);
      }
    }
    for (const pr of this.projectiles) {
      const box = pr.box();
      if (box && overlap(box, hb)) this.tryHit(box.dmg, box.x + box.w / 2, box.id, null, !(pr instanceof Puddle));
    }
  }

  private tryHit(dmg: number, fromX: number, id: number, source: Enemy | null = null, perfectable = true) {
    const p = this.player;
    // an attack you rolled through can't catch you as the roll ends
    if (this.dodged.has(id)) return;
    if (p.iframes) {
      this.dodged.add(id);
      if (perfectable && p.st <= PERFECT_WINDOW && !p.perfectUsed) this.perfectDodge(source);
      else {
        this.gainXp("defence", 8);
        this.xpDrop(8, "shield", C.xp);
        for (let i = 0; i < 6; i++) this.particles.spawn(p.cx + rng.range(-5, 5), p.y + rng.range(0, 18), { vy: -30, max: 0.35, color: C.cream, color2: C.xp });
      }
      return;
    }
    this.damagePlayer(dmg, fromX);
  }

  /** Rolling just as an attack lands: slow motion, stamina back, and a guaranteed counter. */
  private perfectDodge(source: Enemy | null) {
    const p = this.player, s = this.stats;
    p.perfectUsed = true;
    p.riposteT = 1.6;
    p.stam = Math.min(s.maxStam, p.stam + 30);
    p.winded = false;
    this.slowT = 0.45;
    this.flash(C.cream, 0.12);
    audio.play("perfect");
    this.addFloat("PERFECT", p.cx, p.y - 10, C.gold2, true);
    this.gainXp("defence", 20);
    this.xpDrop(20, "shield", C.xp);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      this.particles.spawn(p.cx, p.y + 10, { vx: Math.cos(a) * 70, vy: Math.sin(a) * 70, max: 0.4, color: C.gold3, color2: C.gold1, drag: 4, light: 4, lightColor: C.gold2 });
    }
    if (source instanceof Wick) source.addPosture(34, this);
    else if (!source && this.bossActive && this.boss) this.boss.addPosture(20, this);
  }

  stamDenied() {
    if (this.stamFlash <= 0) audio.play("deny");
    this.stamFlash = 0.35;
  }

  private playerDied() {
    const p = this.player;
    p.hp = 0; p.state = "dead"; p.st = 0; p.deathHandled = false; p.healLeft = 0;
    audio.play("death");
    audio.music("");
    this.save.deaths++;
    this.hitstopFor(0.2);
    this.shake(4, 0.4);
    if (this.save.purse) this.chat.push("Your old purse is lost to the Rot.", C.bad);
    this.purse = null;
    this.save.purse = null;
    this.deathLostPurse = this.save.gold > 0;
    if (this.save.gold > 0) {
      const x = p.lastSafe.x + p.w / 2, y = p.lastSafe.y + p.h;
      this.save.purse = { x, y, amount: this.save.gold };
      this.purse = new Purse(x, y, this.save.gold);
      this.save.gold = 0;
    }
    this.persist();
  }

  onPlayerDeathDone() {
    this.mode = "dead";
    this.deathT = 0;
  }

  private respawn() {
    this.mode = "play";
    this.resetWorld();
    this.respawnPlayer(this.save.lastShrine);
    this.player.invuln = 1;
    this.fade = 1;
    this.region = "";
    this.persist();
  }

  playerFellInBog() {
    const p = this.player;
    if (this.bogCd > 0) return;
    this.bogCd = 0.5;
    audio.play("bog");
    this.particles.splat(p.cx, p.bottom - 4, [C.blight3, C.blight4, C.blight5, C.sick1], 20);
    const dmg = Math.round(this.stats.maxHp * 0.2);
    p.hp -= dmg;
    this.addFloat(`${dmg}`, p.cx, p.y, C.bad);
    this.flash(C.blight3, 0.3);
    if (!this.save.flags.bogWarned) { this.save.flags.bogWarned = true; this.chat.push("The purple is not for drinking.", C.blight5); }
    if (p.hp <= 0) {
      p.x = p.lastSafe.x; p.y = p.lastSafe.y;
      this.playerDied();
      return;
    }
    p.x = p.lastSafe.x; p.y = p.lastSafe.y; p.vx = 0; p.vy = 0;
    p.state = "normal"; p.invuln = 1.0; p.hpTrail = Math.max(p.hpTrail, p.hp + dmg); p.trailDelay = 0.5;
    this.fade = 0.6;
  }

  // ===================================================================== loot
  onEnemyKilled(e: Enemy) {
    if (e.isBoss) return;
    this.save.kills[e.table] = (this.save.kills[e.table] ?? 0) + 1;
    this.chargeDice(1);
    if (this.stats.perks.includes("bloodlust") && this.player.alive) {
      this.player.hp = Math.min(this.stats.maxHp, this.player.hp + 4);
      this.addFloat("+4", this.player.cx, this.player.y - 8, C.good);
    }
    this.spawnDrops(e.table, e.cx, e.y + e.h / 2);
  }

  chargeDice(n: number) {
    const s = this.save;
    if (s.diceCharge >= DICE_CHARGE) return;
    s.diceCharge = Math.min(DICE_CHARGE, s.diceCharge + n);
    if (s.diceCharge >= DICE_CHARGE) {
      this.chat.push("Your Hearth Dice are charged. Rest at a Hearthstone to roll.", C.gold2);
      audio.play("dice");
    }
  }

  spawnDrops(table: string, x: number, y: number) {
    for (const d of rollDrops(table, this.stats.goldFind, rng, this.stats.gearMult, this.stats.perks.includes("windfall"))) {
      if (d.type === "gold") {
        const n = Math.min(10, Math.ceil(d.amount / 4));
        let left = d.amount;
        for (let i = 0; i < n; i++) {
          const a = i === n - 1 ? left : Math.floor(d.amount / n);
          left -= a;
          this.pickups.push(new Pickup("gold", x, y, a));
        }
      } else if (d.type === "item") {
        this.pickups.push(new Pickup("item", x, y, 1, d.item));
        if (d.item.rarity >= 3) {
          audio.loot(d.item.rarity);
          this.chat.push(`Valuable drop: ${displayName(d.item)}`, RARITY[d.item.rarity].color);
        }
      } else if (d.type === "shard") this.pickups.push(new Pickup("shard", x, y, d.amount));
      else if (d.type === "rune") { const pk = new Pickup("rune", x, y); pk.face = d.face; this.pickups.push(pk); }
      else if (d.type === "orb") this.pickups.push(new Pickup("orb", x, y));
      else if (d.type === "pet") {
        if (!this.save.pet) {
          this.save.pet = true;
          this.pet = new Pet(x, y);
          audio.loot(5);
          this.chat.push("You have a funny feeling like you're being followed.", C.gold2);
          this.showBanner("LIL' WICK", "A new friend follows you", RARITY[5].color, false, 4);
        } else this.chat.push("You have a funny feeling like you would have been followed...", C.dim);
      }
    }
  }

  collect(pk: Pickup) {
    const p = this.player, s = this.save;
    if (pk.kind === "gold") {
      s.gold += pk.amount;
      audio.play("coin");
      this.addFloat(`+${pk.amount}`, pk.cx, pk.y - 4, C.gold2);
    } else if (pk.kind === "orb") {
      p.hp = Math.min(this.stats.maxHp, p.hp + Math.round(this.stats.maxHp * 0.12));
      audio.play("heal");
      this.addFloat("+HP", pk.cx, pk.y - 4, C.good);
    } else if (pk.kind === "rune" && pk.face) {
      s.runes[pk.face] = (s.runes[pk.face] ?? 0) + 1;
      audio.loot(FACES[pk.face].rare ? 4 : 3);
      this.chat.push(`You find a ${FACES[pk.face].name} rune.`, FACES[pk.face].color);
      if (!s.flags.runeHint) { s.flags.runeHint = true; this.chat.push("Inscribe it onto your Hearth Dice at any Hearthstone.", C.dim); }
      this.addFloat("RUNE", pk.cx, pk.y - 8, FACES[pk.face].color);
      this.persist();
    } else if (pk.kind === "shard") {
      s.shards += pk.amount;
      audio.play("purse");
      this.chat.push(pk.amount > 1 ? `You gather ${pk.amount} Blight Shards.` : "You gather a Blight Shard.", C.blight5);
    } else if (pk.item) {
      if (pk.blocked > 0) return;
      if (!this.giveItem(pk.item)) {
        pk.blocked = 1.5;
        this.toast("You don't have enough inventory space.", C.bad);
        return;
      }
      const it = pk.item;
      audio.loot(it.rarity);
      this.chat.push(`You pick up: ${displayName(it)}`, RARITY[it.rarity].color);
      if (it.rarity > s.bestRarity && it.rarity <= 4) s.bestRarity = it.rarity;
      if (it.rarity === 5) {
        const first = !(s.log[it.base] > 0);
        s.log[it.base] = (s.log[it.base] ?? 0) + 1;
        if (first) this.chat.push(`New item added to your collection log: ${baseOf(it).name}`, RARITY[5].color);
        s.bestRarity = Math.max(s.bestRarity, 4);
      }
      this.addFloat(RARITY[it.rarity].name.toUpperCase(), pk.cx, pk.y - 8, RARITY[it.rarity].color);
      this.persist();
    }
    pk.dead = true;
  }

  // ===================================================================== interactions
  private interact() {
    const p = this.player;
    this.prompt = null;
    if (p.state !== "normal" || !p.onGround) return;
    type Cand = { d: number; x: number; y: number; text: string; act: () => void };
    const cands: Cand[] = [];
    for (const sh of this.shrines) {
      const d = Math.abs(p.cx - sh.x);
      if (d < 18 && Math.abs(p.bottom - sh.y) < 20) {
        const lit = this.save.shrines.includes(sh.def.id);
        cands.push({ d, x: sh.x, y: sh.y - 36, text: lit ? "REST" : "KINDLE", act: () => this.rest(sh) });
      }
    }
    for (const n of this.npcs) {
      const d = Math.abs(p.cx - n.x);
      if (d < 24 && Math.abs(p.bottom - n.y) < 20) cands.push({ d, x: n.x, y: n.y - 30, text: "TALK", act: () => this.talk(n) });
    }
    for (const sg of this.signs) {
      const d = Math.abs(p.cx - sg.x);
      if (d < 12 && Math.abs(p.bottom - sg.y) < 20) cands.push({ d, x: sg.x, y: sg.y - 22, text: "READ", act: () => this.openOverlay(new Dialog("Signpost", sg.def.text.split("\n\n"), null)) });
    }
    const A = this.level.arena;
    const fogX = A.fogCol * TILE;
    if (this.level.get(A.fogCol, A.fogBottom) === T.FOG && !this.bossActive && p.cx < fogX && fogX - p.cx < 32) {
      cands.push({ d: fogX - p.cx, x: fogX + 8, y: p.y - 6, text: "ENTER THE FOG", act: () => this.enterFog() });
    }
    if (!cands.length) return;
    cands.sort((a, b) => a.d - b.d);
    const c = cands[0];
    this.prompt = { x: c.x - this.cam.x, y: c.y - this.cam.y, text: c.text };
    if (this.input.pressed("interact")) { this.input.consume("interact"); this.prompt = null; c.act(); }
  }

  private talk(n: NPC) {
    const lines = n.lines(this);
    this.openOverlay(new Dialog(n.name, lines, (c, x, y) => n.portrait(c, x, y), n.id === "brom" ? (g) => g.openOverlay(new ShopMenu()) : undefined));
  }

  private rest(sh: Shrine) {
    const p = this.player, s = this.save;
    const id = sh.def.id;
    if (!s.shrines.includes(id)) {
      s.shrines.push(id);
      audio.play("kindle");
      this.showBanner("HEARTHSTONE KINDLED", sh.def.name, C.fire2, true, 3.5);
      this.particles.burst(sh.x, sh.y - 30, 40, { speed: 90, colors: [C.fire1, C.fire2, C.fire3], max: 1.2, g: -40, drag: 2, light: 8, lightColor: C.fire1 });
    } else audio.play("shrine");
    p.state = "rest"; p.st = 0; p.vx = 0;
    p.hp = p.hpTrail = this.stats.maxHp; p.stam = this.stats.maxStam; p.tonics = s.tonicMax + this.stats.tonicBonus; p.healLeft = 0;
    this.healFlash = 1;
    if (s.gold > 0) { this.chat.push(`The Hearth keeps your ${s.gold} gold safe. (Bank: ${s.bank + s.gold})`, C.gold2); s.bank += s.gold; s.gold = 0; }
    s.lastShrine = id;
    this.resetWorld();
    this.persist();
    for (let i = 0; i < 16; i++) this.particles.spawn(sh.x + rng.range(-8, 8), sh.y - 30, { vy: -rng.range(20, 60), vx: rng.range(-10, 10), max: rng.range(0.6, 1.2), color: C.fire2, color2: C.fire0, light: 6, lightColor: C.fire1 });
    this.openOverlay(new RestMenu(id));
    if (s.diceCharge >= DICE_CHARGE) this.openOverlay(new DiceMenu(this, true));
  }

  travelTo(id: string) {
    this.overlays = [];
    this.save.lastShrine = id;
    this.placeAtShrine(id);
    this.player.state = "normal";
    this.snapCamera();
    this.fade = 1;
    this.region = "";
    this.persist();
  }

  private enterFog() {
    const p = this.player;
    audio.play("fog");
    p.state = "fog"; p.st = 0; p.vx = 0; p.vy = 0;
    p.y = this.level.arena.bossY - p.h;
  }

  private startBoss() {
    if (!this.boss) return;
    this.bossActive = true;
    this.bossTrail = this.boss.maxHp;
    this.boss.wake();
    audio.music("boss");
    this.showBanner("WICK", "THE HARVEST WARDEN", C.cream, true, 3.6);
  }

  onBossPhase2() {
    audio.music("boss2");
    this.flash(C.sick1, 0.4);
    this.chat.push("The Warden's head catches a sickly flame...", C.sick1);
  }

  onBossDefeated(b: Wick) {
    const s = this.save;
    s.kills.wick = (s.kills.wick ?? 0) + 1;
    this.chargeDice(DICE_CHARGE);
    this.bossActive = false;
    this.level.setFog(false);
    this.chat.push(`Your Wick kill count is: ${s.kills.wick}.`, "#e0605a");
    audio.play("victory");
    this.flash(C.white, 0.5);
    this.showBanner("HARVEST ENDED", "", C.gold2, true, 4.5);
    this.spawnDrops("wick", b.cx, b.y + 20);
    if (!s.flags.wickSlain) {
      s.flags.wickSlain = true;
      this.chat.push("Rest at a Hearthstone to face the Warden again.", C.dim);
    }
    this.boss = null;
    for (const e of this.enemies) if (e instanceof Crow && !e.dead) { e.hp = 0; e.dead = true; e.remove = true; this.particles.burst(e.cx, e.y, 8, { speed: 40, colors: [C.inkSoft, C.blight2], max: 0.5 }); }
    setTimeout(() => { if (this.mode === "play" && !this.bossActive) audio.music("outskirts"); }, 5000);
    this.persist();
  }

  // ===================================================================== update
  update(dt: number) {
    this.input.step();
    if (this.input.pressed("mute")) audio.toggleMute();
    audio.update();
    this.time += dt;
    this.fade = Math.max(0, this.fade - dt * 1.6);
    this.flashT = Math.max(0, this.flashT - dt);
    this.healFlash = Math.max(0, this.healFlash - dt * 1.5);

    if (this.mode === "title") {
      this.titleScreen.update(this, dt);
      this.cam.x = 150 + Math.sin(this.time * 0.07) * 140;
      this.cam.y = this.level.pxH - H;
      this.ambient(dt);
      this.particles.update(dt);
      for (const n of this.npcs) n.update(this, dt);
      return;
    }
    if (this.mode === "intro") { this.intro?.update(this, dt); return; }

    this.save.playTime += dt;
    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t > this.banner.dur) this.banner = this.bannerQueue.shift() ?? null;
    }
    this.chat.update(dt);
    for (const f of this.floaters) { f.t += dt; f.y += f.vy * dt; f.vy *= 0.94; }
    this.floaters = this.floaters.filter((f) => f.t < 1);
    for (const d of this.xpDrops) d.t += dt;
    for (const f of this.finFx) f.t += dt;
    this.finFx = this.finFx.filter((f) => f.t < 1.25);
    this.xpDrops = this.xpDrops.filter((d) => d.t < 2.2);

    if (this.mode === "dead") {
      this.deathT += dt;
      this.particles.update(dt);
      if (this.deathT > 4.5 || (this.deathT > 1.8 && (this.input.pressed("confirm") || this.input.pressed("interact")))) this.respawn();
      return;
    }

    const top = this.overlays[this.overlays.length - 1];
    if (top) { top.update(this, dt); return; }
    if (this.input.pressed("pause")) { this.openOverlay(new PauseMenu()); return; }
    if (this.input.pressed("menu") && this.player.alive) { this.openOverlay(new InventoryMenu()); return; }
    this.stamFlash = Math.max(0, this.stamFlash - dt);
    const slow = this.slowT > 0;
    this.slowT = Math.max(0, this.slowT - dt);
    this.updateWorld(slow ? dt * 0.3 : dt);
  }

  private updateWorld(dt: number) {
    this.shakeT = Math.max(0, this.shakeT - dt);
    if (this.hitstop > 0) { this.hitstop -= dt; return; }
    this.bogCd = Math.max(0, this.bogCd - dt);
    const p = this.player;
    p.update(this, dt);
    for (const e of this.enemies) e.update(this, dt);
    this.boss?.update(this, dt);
    for (const pr of this.projectiles) pr.update(this, dt);
    this.projectiles = this.projectiles.filter((pr) => !pr.dead);
    for (const pk of this.pickups) pk.update(this, dt);
    this.pickups = this.pickups.filter((pk) => !pk.dead);
    for (const n of this.npcs) n.update(this, dt);
    this.pet?.update(this, dt);
    this.combat();
    this.enemies = this.enemies.filter((e) => !e.remove);
    this.separateEnemies();

    // reclaim a lost purse
    if (this.purse && p.alive && overlap(p.hurtbox(), this.purse.hitbox())) {
      this.save.gold += this.purse.amount;
      this.chat.push(`You reclaim your purse: ${this.purse.amount} gold.`, C.gold2);
      audio.play("purse");
      this.particles.burst(this.purse.x, this.purse.y - 8, 20, { speed: 80, colors: [C.gold2, C.gold3], max: 0.7, light: 5, lightColor: C.gold2 });
      this.purse = null; this.save.purse = null;
      this.persist();
    }

    // boss arena
    const A = this.level.arena;
    if (p.state === "fog" && p.x > A.x0 + 6) { p.state = "normal"; p.vx = 0; if (this.boss?.mode === "dormant") this.startBoss(); }
    if (this.boss && this.boss.mode === "dormant" && p.alive && p.state !== "fog" && p.x > A.x0 + 10 && p.x < A.x1) this.startBoss();
    if (this.boss && this.bossActive) this.bossTrail = this.bossTrail > this.boss.hp ? approach(this.bossTrail, this.boss.hp, 90 * dt) : this.boss.hp;

    this.interact();
    this.updateRegion();
    this.updateCamera(dt);
    this.ambient(dt);
    this.particles.update(dt);
  }

  private updateRegion() {
    const r = this.level.regionAt(this.player.cx);
    if (r.id === this.region) return;
    this.region = r.id;
    if (!this.bossActive) audio.music(r.music);
    if (!this.seenRegions.has(r.id)) {
      this.seenRegions.add(r.id);
      this.showBanner(r.name, r.sub, C.cream, false, 3.2, true);
    }
  }

  private snapCamera() {
    const p = this.player;
    this.cam.x = clamp(p.cx - W / 2, 0, this.level.pxW - W);
    this.cam.y = clamp(p.bottom - H * 0.74, 0, this.level.pxH - H);
  }

  private updateCamera(dt: number) {
    const p = this.player, L = this.level;
    this.camLook = approach(this.camLook, p.facing * 26, 60 * dt);
    const tx = p.cx - W / 2 + this.camLook;
    const ty = p.bottom - H * 0.74;
    const kx = 1 - Math.exp(-dt * 6), ky = 1 - Math.exp(-dt * 4);
    this.cam.x += (tx - this.cam.x) * kx;
    this.cam.y += (ty - this.cam.y) * ky;
    let minX = 0, maxX = L.pxW - W;
    if (this.bossActive) { minX = L.arena.x0 - 20; maxX = L.arena.x1 - W + 30; }
    this.cam.x = clamp(this.cam.x, minX, maxX);
    this.cam.y = clamp(this.cam.y, 0, L.pxH - H);
  }

  private ambient(dt: number) {
    this.ambientT += dt;
    const cx = this.cam.x, cy = this.cam.y;
    const onScreen = (x: number, y: number, m = 40) => x > cx - m && x < cx + W + m && y > cy - m && y < cy + H + m;
    for (const e of this.props.emitters) {
      if (!onScreen(e.x, e.y, 60)) continue;
      if (e.kind === "smoke" && rng.chance(dt * 5)) this.particles.spawn(e.x + rng.range(-1, 1), e.y, { vy: -rng.range(8, 16), vx: rng.range(2, 8), max: rng.range(2, 3.5), color: "#4a4458", color2: "#2e2a3a", size: rng.chance(0.4) ? 2 : 1, wobble: 6 });
      if (e.kind === "ember" && rng.chance(dt * 4)) this.particles.spawn(e.x + rng.range(-5, 5), e.y, { vy: -rng.range(20, 50), vx: rng.range(-8, 8), max: rng.range(0.6, 1.4), color: C.fire2, color2: C.fire0, light: 4, lightColor: C.fire1, wobble: 10 });
      if (e.kind === "drip" && rng.chance(dt * 0.7)) this.particles.spawn(e.x, e.y, { vy: 10, g: 200, max: 1.2, color: C.blight4, light: 4, lightColor: C.blight4 });
    }
    const b = this.level.blightAt(cx + W / 2);
    // fireflies in healthy fields, rot spores deeper in
    if (rng.chance(dt * 3)) {
      const x = cx + rng.range(0, W), y = cy + rng.range(H * 0.3, H * 0.85);
      if (rng.next() > b) this.particles.spawn(x, y, { vx: rng.range(-6, 6), vy: rng.range(-4, 4), max: rng.range(3, 6), color: "#d8f07a", wobble: 14, light: 7, lightColor: "#c9e06a" });
      else this.particles.spawn(x, y, { vx: rng.range(-4, 4), vy: -rng.range(3, 9), max: rng.range(3, 6), color: C.blight5, color2: C.blight3, wobble: 8, light: 5, lightColor: C.blight4 });
    }
    if (rng.chance(dt * 1.2 * (1 - b))) this.particles.spawn(cx + rng.range(0, W + 60), cy - 4, { vx: -rng.range(8, 20), vy: rng.range(10, 20), max: 8, color: rng.chance(0.5) ? C.straw1 : "#6a4a3a", wobble: 18 });
    // bog bubbles
    const L = this.level;
    if (rng.chance(dt * 6)) {
      const tx = Math.floor((cx + rng.range(0, W)) / TILE);
      for (let ty = 0; ty < L.h; ty++) if (L.get(tx, ty) === T.BOG) {
        this.particles.spawn(tx * TILE + rng.range(2, 14), ty * TILE + 3, { vy: -rng.range(6, 14), max: 0.5, color: C.blight5, light: 3, lightColor: C.blight4 });
        break;
      }
    }
  }

  // ===================================================================== render
  render() {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    if (this.mode === "intro" && this.intro) { this.intro.draw(this, ctx); return; }

    const sh = this.shakeT > 0 ? this.shakeAmt * Math.min(1, this.shakeT * 5) : 0;
    if (this.shakeT <= 0) this.shakeAmt = 0;
    const camX = Math.round(this.cam.x + (sh ? rng.range(-sh, sh) : 0));
    const camY = Math.round(this.cam.y + (sh ? rng.range(-sh, sh) : 0));
    const t = this.time;
    const L = this.level;
    const playing = this.mode !== "title";

    this.bg.draw(ctx, camX, camY, t);
    blit(ctx, this.props.canvas, camX, camY);
    if (this.props.millHub) drawMillBlades(ctx, this.props.millHub, camX, camY, t);
    for (const sh2 of this.shrines) sh2.draw(ctx, camX, camY, this.save.shrines.includes(sh2.def.id), t);
    for (const s of this.signs) s.draw(ctx, camX, camY);
    blit(ctx, this.tiles.tiles, camX, camY);
    drawBog(ctx, L, camX, camY, W, t);
    for (const pt of this.pots) pt.draw(ctx, camX, camY);
    for (const n of this.npcs) n.draw(ctx, camX, camY);
    if (this.boss) this.boss.draw(this, ctx, camX, camY);
    for (const e of this.enemies) e.draw(this, ctx, camX, camY);
    if (this.purse) this.purse.draw(ctx, camX, camY, t);
    for (const pk of this.pickups) pk.draw(ctx, camX, camY, t);
    if (playing) {
      this.pet?.draw(ctx, camX, camY);
      this.player.draw(this, ctx, camX, camY);
    }
    for (const pr of this.projectiles) pr.draw(ctx, camX, camY, t);
    this.particles.draw(ctx, camX, camY, "back");
    blit(ctx, this.tiles.fg, camX, camY);
    drawFog(ctx, L, camX, camY, t);

    // ---- lighting
    this.gatherLights(camX, camY);
    const b = L.blightAt(camX + W / 2);
    if (b > 0.02) {
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = mix("#ffffff", "#c4acd6", b);
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "source-over";
    }
    let dark = 0.34 + b * 0.18;
    if (this.bossActive && this.boss?.phase === 2) dark += 0.08;
    this.lighting.render(ctx, dark, "#07050f", 0.3);
    this.particles.draw(ctx, camX, camY, "glow");
    for (const f of this.finFx) drawFinFx(ctx, f, camX, camY);
    ctx.drawImage(this.vignette, 0, 0);

    if (playing) {
      drawFloaters(this, ctx, camX, camY);
      if (this.mode === "play") drawHud(this, ctx);
      if (this.banner) drawBanner(ctx, this.banner);
      for (const o of this.overlays) o.draw(this, ctx);
      if (this.mode === "dead") drawDeath(ctx, this.deathT, this.deathLostPurse);
    } else this.titleScreen.draw(this, ctx);

    if (this.flashT > 0) {
      ctx.globalAlpha = Math.min(0.45, this.flashT * 1.6);
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    if (this.fade > 0) {
      ctx.globalAlpha = Math.min(1, this.fade);
      ctx.fillStyle = C.black;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  private gatherLights(camX: number, camY: number) {
    const lg = this.lighting, t = this.time;
    for (const l of this.props.lights) {
      const f = 1 - l.flicker * (0.5 + 0.5 * Math.sin(t * 9 + l.x * 0.7) * Math.sin(t * 5.3 + l.y));
      lg.add(l.x - camX, l.y - camY, l.r * (0.95 + 0.05 * f), l.color, (l.strength ?? 0.9) * f);
    }
    for (const lp of this.level.lamps) lg.add(lp.x - camX, lp.y - camY, 40 + Math.sin(t * 7 + lp.x) * 2, C.fire1, 0.95);
    for (const sh of this.shrines) {
      const lit = this.save.shrines.includes(sh.def.id);
      lg.add(sh.x - camX, sh.y - 30 - camY, lit ? 64 + Math.sin(t * 6) * 3 : 18, lit ? C.fire1 : "#6a5a8a", lit ? 1 : 0.5);
    }
    lg.add(292 - camX * 0.01, 26 + (camY / Math.max(1, this.level.pxH - H)) * 6, 40, "#c8b8d8", 0.85);
    const p = this.player;
    if (this.mode !== "title") lg.add(p.cx - camX, p.y + 8 - camY, 34 + this.stats.light * 30, this.stats.light ? C.fire2 : "#c8b8a0", this.stats.light ? 0.9 : 0.55);
    for (const e of this.enemies) e.lights(this, camX, camY);
    this.boss?.lights(this, camX, camY);
    for (const pr of this.projectiles) pr.lights?.(this, camX, camY);
    for (const pk of this.pickups) {
      if (pk.kind === "item" && pk.item) lg.add(pk.cx - camX, pk.y - camY, pk.item.rarity >= 3 ? 30 : 16, RARITY[pk.item.rarity].color, 0.7);
      else if (pk.kind === "gold") lg.add(pk.cx - camX, pk.y + 4 - camY, 8, C.gold2, 0.5);
      else if (pk.kind === "shard") lg.add(pk.cx - camX, pk.y + 2 - camY, 12, C.blight4, 0.7);
    }
    if (this.purse) lg.add(this.purse.x - camX, this.purse.y - 8 - camY, 22, C.gold2, 0.8);
    const A = this.level.arena;
    if (this.level.get(A.fogCol, A.fogBottom) === T.FOG) for (let y = 3; y < 14; y += 4) lg.add(A.fogCol * TILE + 8 - camX, y * TILE - camY, 30, "#b9a8d0", 0.6);
    // bog glow
    const L = this.level;
    for (let tx = Math.floor(camX / TILE); tx <= Math.floor((camX + W) / TILE); tx++) {
      for (let ty = 0; ty < L.h; ty++) if (L.get(tx, ty) === T.BOG && L.get(tx, ty - 1) !== T.BOG) { lg.add(tx * TILE + 8 - camX, ty * TILE + 4 - camY, 22, C.blight4, 0.55); break; }
    }
    for (const n of this.npcs) if (n.id === "brom") lg.add(n.x - 14 - camX, n.y - 12 - camY, 12, C.fire1, n.hammerT > 0.5 && n.hammerT < 0.6 ? 1 : 0);
    this.particles.lights(lg, camX, camY);
  }
}

function blit(ctx: Ctx, src: HTMLCanvasElement, sx: number, sy: number) {
  const x0 = Math.max(0, sx), y0 = Math.max(0, sy);
  const x1 = Math.min(src.width, sx + W), y1 = Math.min(src.height, sy + H);
  if (x1 <= x0 || y1 <= y0) return;
  ctx.drawImage(src, x0, y0, x1 - x0, y1 - y0, x0 - sx, y0 - sy, x1 - x0, y1 - y0);
}

