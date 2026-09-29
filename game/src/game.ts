import { audio } from "./core/audio";
import { H, STEP, TILE, W } from "./core/constants";
import { Input } from "./core/input";
import { approach, clamp, hash, mix, overlap, type Rect } from "./core/math";
import { rng } from "./core/rng";
import { Background } from "./gfx/background";
import type { Ctx } from "./gfx/canvas";
import { CaveBackground } from "./gfx/cave";
import { Lighting, makeVignette } from "./gfx/lighting";
import { C, RARITY } from "./gfx/palette";
import { Particles } from "./gfx/particles";
import { drawBog, drawDynamicTiles, drawFog, renderTiles, type TileLayers } from "./gfx/tiles";
import { Puddle, Wick, type Projectile } from "./entities/boss";
import { Boss } from "./entities/bossBase";
import { Bat, Blightling, Crow, Enemy, Husk, Miner, Pot, Sludgeling } from "./entities/enemies";
import { Bubble, Grimwater } from "./entities/grimwater";
import { drawBoard, NPC, Pet, Pickup, Purse, Shrine, Sign } from "./entities/objects";
import { Player } from "./entities/player";
import { drawBeacon, drawDigSite, drawSigilStone, LootChest, Watcher, type ChestKind } from "./entities/world";
import { Chat } from "./systems/chat";
import { baseOf, displayName, makeUnique, type Item, type Slot } from "./systems/items";
import { dailyBounty, dayKey, describe, milestonesFor, MILESTONES, recedeFor, refreshBounties, rewardText, WICK_FAST_SECONDS, HOPE_MAX, type Bounty, type BountyKind, type BountyTarget } from "./systems/bounties";
import { BEACON_EMBERS } from "./systems/crafting";
import { DICE_CHARGE, FACES, rollFinisher, RUNE_WEIGHTS, type FinFace } from "./systems/dice";
import { DIARY, DIARY_AREAS, tierClaimed, tierComplete, tierKey } from "./systems/diary";
import { rollDrops, ROTBORN_RATE, ROTBORN_RATE_BLOOD, type Drop } from "./systems/loot";
import { petStage, PETS } from "./systems/pets";
import { loadSave, newSave, wipeSave, writeSave, type PetId, type SaveData } from "./systems/save";
import { SIGIL_IDS, sigilMods } from "./systems/sigils";
import { levelForXp, SKILL_INFO, type Skill } from "./systems/skills";
import { computeStats, type Stats } from "./systems/stats";
import { BountyBoard } from "./ui/bounty";
import { ChestReveal } from "./ui/chest";
import { DiceMenu, drawFinFx, type FinFx } from "./ui/dice";
import { Dialog } from "./ui/dialog";
import { drawFloaters, drawHud, type Floater, type XpDrop } from "./ui/hud";
import { InventoryMenu, type Overlay } from "./ui/menu";
import { drawBanner, drawDeath, IntroScreen, PauseMenu, RestMenu, TitleScreen, type Banner } from "./ui/screens";
import { ShopMenu } from "./ui/shop";
import { SigilMenu } from "./ui/sigils";
import { T, type Level, type LevelId } from "./world/level";
import { getLevel, LEVEL_INFO, levelOfShrine } from "./world/levels";
import { drawMillBlades, renderProps, type PropLayer } from "./world/props";

type Mode = "title" | "intro" | "play" | "dead";

const MAX_ATTACKERS = 2;
/** A roll counts as perfect if the attack lands within this long of the roll starting. */
const PERFECT_WINDOW = 0.24;
const ATTACK_GAP = 0.35;

interface Scenery { draw(ctx: Ctx, camX: number, camY: number, time: number): void }
interface LevelArt { bg: Scenery; tiles: TileLayers; props: PropLayer }

export class Game {
  readonly ctx: Ctx;
  readonly input: Input;
  level: Level;
  private bg!: Scenery;
  private tiles!: TileLayers;
  private props!: PropLayer;
  /** Rendered art per level (rebuilt only when Hope restores the Outskirts). */
  private art = new Map<LevelId, LevelArt>();
  readonly lighting = new Lighting();
  private vignette: HTMLCanvasElement;
  readonly particles = new Particles();
  readonly chat = new Chat();

  save: SaveData;
  stats: Stats;
  player: Player;
  enemies: Enemy[] = [];
  pots: Pot[] = [];
  boss: Boss | null = null;
  bossActive = false;
  bossTrail = 0;
  projectiles: Projectile[] = [];
  pickups: Pickup[] = [];
  chests: LootChest[] = [];
  watchers: Watcher[] = [];
  npcs: NPC[] = [];
  shrines: Shrine[] = [];
  signs: Sign[] = [];
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
  private fightStart = 0;
  private fightTonics = 0;
  private fightHits = 0;
  /** Sigils that were actually in force for the current boss. */
  private fightSigils = 0;
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
  private floodTick = 0;
  private rootSwing = -1;
  private dailyCheckT = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    this.ctx.imageSmoothingEnabled = false;
    this.input = new Input(window);
    this.input.onFirstGesture = () => audio.unlock();
    this.save = loadSave() ?? newSave();
    this.stats = computeStats(this.save);
    this.level = getLevel(levelOfShrine(this.save.lastShrine));
    this.vignette = makeVignette(C.black);
    this.player = new Player(0, 0);
    this.loadLevel(this.level.id);
    this.placeAtShrine(this.save.lastShrine);
    this.resetWorld();
    this.cam.x = 60; this.cam.y = this.level.pxH - H;
    audio.music("title");
  }

  // ===================================================================== levels
  /** Switch the active level: data, art (cached), NPCs, shrines, signs, Watchers. */
  private loadLevel(id: LevelId) {
    const L = getLevel(id);
    this.level = L;
    if (L.theme === "outskirts") {
      const m = milestonesFor(this.save.hope);
      if (L.setRestoration(m, recedeFor(m))) this.art.delete(id);
    }
    let art = this.art.get(id);
    if (!art) {
      art = { bg: L.theme === "mines" ? new CaveBackground(L) : new Background(L), tiles: renderTiles(L), props: renderProps(L) };
      this.art.set(id, art);
    }
    this.bg = art.bg; this.tiles = art.tiles; this.props = art.props;
    this.npcs = L.npcs.map((d) => new NPC(d));
    this.shrines = L.shrines.map((d) => new Shrine(d));
    this.signs = L.signs.map((d) => new Sign(d));
    this.watchers = L.watchers.map((d) => new Watcher(d));
    this.updateSight();
  }

  /** Walk into another level at one of its Hearthstones (which is kindled on arrival). */
  private enterLevel(shrineId: string) {
    const id = levelOfShrine(shrineId);
    this.gatherChests();
    this.overlays = [];
    this.bossActive = false;
    this.loadLevel(id);
    const s = this.save;
    if (!s.shrines.includes(shrineId)) s.shrines.push(shrineId);
    s.lastShrine = shrineId;
    this.resetWorld();
    this.placeAtShrine(shrineId);
    this.player.state = "normal"; this.player.vx = 0;
    this.snapCamera();
    this.fade = 1.4;
    this.region = "";
    this.seenRegions.clear();
    this.showBanner(`LEVEL ${LEVEL_INFO[id].n}`, LEVEL_INFO[id].name, C.cream, true, 3.4);
    this.checkDiary();
    this.persist();
  }

  /** Spirit ledges show while Wick's Lantern is carried. */
  private updateSight() {
    this.level.spiritSight = this.save.eq.trinket?.base === "wick_lantern";
  }
  hooded() { return this.save.eq.helm?.base === "straw_hood"; }

  // ===================================================================== flow
  startGame(fresh: boolean) {
    if (fresh) { wipeSave(); this.save = newSave(); }
    else this.save = loadSave() ?? newSave();
    if (!this.save.bounties?.length) this.save.bounties = refreshBounties([]);
    this.stats = computeStats(this.save);
    this.pickups = []; this.floaters = []; this.xpDrops = []; this.chat.lines = []; this.chests = [];
    this.seenRegions.clear(); this.region = "";
    this.loadLevel(levelOfShrine(this.save.lastShrine));
    const pu = this.save.purse;
    this.purse = pu && (pu.level ?? "outskirts") === this.level.id ? new Purse(pu.x, pu.y, pu.amount) : null;
    this.spawnPet();
    this.respawnPlayer(this.save.lastShrine);
    this.resetWorld();
    this.refreshDaily();
    if (fresh) { this.mode = "intro"; this.intro = new IntroScreen(); audio.music("title"); }
    else {
      this.mode = "play"; this.fade = 1; this.chat.push("Welcome back to Hollowmere.", C.dim);
      this.checkDiary();
    }
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

  private spawnPet() {
    const id = this.save.activePet;
    this.pet = id ? new Pet(this.player.cx, this.player.bottom, id, petStage(this.save.petKc[id] ?? 0)) : null;
  }

  cyclePet() {
    const s = this.save;
    if (s.pets.length < 2) { audio.play("deny"); return; }
    const i = s.activePet ? s.pets.indexOf(s.activePet) : -1;
    s.activePet = s.pets[(i + 1) % s.pets.length];
    this.spawnPet();
    this.onGearChanged();
    audio.play("select");
    this.persist();
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

  /** Respawn every foe and pot, revive the boss, refill the caches. Called on rest and on death. */
  resetWorld() {
    const L = this.level;
    this.gatherChests();
    this.enemies = [];
    this.pots = [];
    for (const s of L.spawns) {
      if (s.kind === "blightling") this.enemies.push(new Blightling(s.x, s.y));
      else if (s.kind === "crow") this.enemies.push(new Crow(s.x, s.y));
      else if (s.kind === "husk") this.enemies.push(new Husk(s.x, s.y));
      else if (s.kind === "sludgeling") this.enemies.push(new Sludgeling(s.x, s.y));
      else if (s.kind === "bat") this.enemies.push(new Bat(s.x, s.y));
      else if (s.kind === "miner") this.enemies.push(new Miner(s.x, s.y));
      else this.pots.push(new Pot(s.x, s.y, hash(s.x, 0, 1) > 0.6 ? 1 : 0));
    }
    const rate = this.stats.moon === "blood" ? ROTBORN_RATE_BLOOD : ROTBORN_RATE;
    for (const e of this.enemies) if (rng.oneIn(rate)) e.makeRotborn();
    this.boss = L.bossKind === "grimwater" ? new Grimwater(L.arena.bossX, L.arena.bossY) : new Wick(L.arena.bossX, L.arena.bossY);
    // sigils only bind a boss you've already beaten
    const mods = sigilMods(this.save.sigils);
    this.fightSigils = 0;
    if ((this.save.kills[this.boss.table] ?? 0) > 0 && mods.count > 0) { this.boss.applySigils(mods); this.fightSigils = mods.count; }
    this.bossActive = false;
    L.setFog(true);
    L.regrow();
    for (const w of this.watchers) { w.alert = 0; w.glanced = false; }
    this.chests = L.caches.map((c) => new LootChest(c.x, c.y, "cache", "cache", null, c.id));
    this.projectiles = [];
    this.dodged.clear();
  }

  /** Unopened spoils are never lost: they're gathered for you when the world resets. */
  private gatherChests() {
    for (const ch of this.chests) {
      if (ch.opened || ch.kind === "cache" || !ch.drops) continue;
      ch.opened = true;
      this.claimDrops(ch.drops, ch.x, ch.y);
      this.chat.push("You gather up the unopened spoils.", C.dim);
    }
    this.chests = [];
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

  private count(key: string, n = 1) { this.save.c[key] = (this.save.c[key] ?? 0) + n; }

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
    const had = this.level.spiritSight;
    this.updateSight();
    if (this.level.spiritSight && !had && this.level.theme === "mines") this.toast("The Lantern's light shows ledges that weren't there before.", C.fire2);
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
    this.strikeRoots(box, id);
    const targets: (Enemy | Pot)[] = [...this.enemies.filter((e) => !e.dead), ...this.pots.filter((q) => !q.broken)];
    if (this.boss && !this.boss.dead) targets.push(this.boss);
    for (const pr of this.projectiles) if (pr instanceof Bubble && !pr.dead && overlap(box, pr.box())) pr.pop(this);
    for (const t of targets) {
      if (t.lastHitId === id || !overlap(box, t.hurtbox())) continue;
      t.lastHitId = id;
      if (t instanceof Pot) { t.break(this); this.bountyEvent("pots"); continue; }
      if (t instanceof Boss && t.invulnerable) { t.takeHit(this, 0, false, p.facing); this.particles.hit(t.cx - p.facing * 8, p.y + 6, -p.facing, C.steel2, 4); continue; }
      // a riposte (after a perfect dodge) turns the whole next swing into a guard-breaking crit
      if (p.riposteT > 0 && this.riposteFor !== id) { this.riposteFor = id; p.riposteT = 0; this.bountyEvent("riposte"); this.count("riposte"); }
      const riposte = this.riposteFor === id;
      const crit = riposte || rng.chance(s.crit);
      let fin: FinFace | null = null;
      if (heavy) {
        if (this.finFor !== id) {
          this.finFor = id;
          this.finFace = rollFinisher(s.kind);
          if (this.finFace !== "blank") this.bountyEvent("finisher");
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
      if (t instanceof Boss) t.addPosture((riposte ? 22 : 0) + (heavy ? (fin && fin !== "blank" ? 16 : 7) : 0), this);
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

  /** Orchard roots in the Mines: a curved blade (any scythe) cuts them; anything else bounces off. */
  private strikeRoots(box: Rect, id: number) {
    const L = this.level;
    if (L.theme !== "mines" || this.rootSwing === id) return;
    const c0 = Math.floor(box.x / TILE), c1 = Math.floor((box.x + box.w) / TILE);
    const r0 = Math.floor(box.y / TILE), r1 = Math.floor((box.y + box.h) / TILE);
    for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) {
      if (L.get(c, r) !== T.ROOT) continue;
      this.rootSwing = id;
      if (this.stats.kind === "scythe") {
        for (let y = 0; y < L.h; y++) if (L.get(c, y) === T.ROOT) {
          L.set(c, y, T.EMPTY);
          this.particles.burst(c * TILE + 8, y * TILE + 8, 10, { speed: 90, colors: ["#4a2a3a", "#6a3a4a", C.blight4], g: 300, max: 0.8, size: 2 });
        }
        audio.play("cut"); this.shake(2, 0.15);
        if (!this.save.flags.rootsCut) { this.save.flags.rootsCut = true; this.chat.push("The roots part before the curved blade.", C.good); }
      } else {
        audio.play("clink", 3);
        this.particles.hit(c * TILE + 8, box.y + box.h / 2, -this.player.facing, "#6a3a4a", 5);
        this.toast("The roots are too thick to hack through. A curved blade might part them.");
      }
      return;
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
    if (this.bossActive) this.fightHits++;
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
      for (const box of e.attackBoxes()) if (overlap(box, hb)) this.tryHit(box.dmg * e.dmgMult, box.x + box.w / 2, box.id, e);
      if (e.contactDmg > 0 && overlap(e.hurtbox(), hb)) {
        const falling = p.vy > 40 && p.bottom - p.vy * STEP <= e.y + 5;
        if (e.stompable && falling && p.state !== "roll") {
          p.vy = this.input.isHeld("jump") ? -330 : -240; p.canDouble = true; p.jumpHeld = this.input.isHeld("jump");
          audio.play("stomp");
          this.bountyEvent("stomp");
          this.count("stomp");
          if (e instanceof Blightling) e.stomped(this);
          const dmg = Math.round(12 * this.stats.dmgMult);
          e.takeHit(this, dmg, false, 0);
          this.addFloat(`${dmg}`, e.cx, e.y - 4, C.cream);
          this.hitstopFor(0.04);
          this.gainXp("attack", dmg); this.gainXp("strength", dmg * 2); this.gainXp("hitpoints", dmg * 1.33);
          this.xpDrop(dmg * 4.33, "sword", C.cream);
        } else if (e.contactActive()) this.tryHit(e.contactDmg * e.dmgMult, e.cx, e.contactId, e);
      }
    }
    const pm = this.boss && this.bossActive ? this.boss.dmgMult : 1;
    for (const pr of this.projectiles) {
      const box = pr.box();
      if (box && overlap(box, hb)) {
        this.tryHit(box.dmg * pm, box.x + box.w / 2, box.id, null, !(pr instanceof Puddle));
        if (pr instanceof Bubble && !p.iframes) pr.pop(this);
      }
    }
  }

  private tryHit(dmg: number, fromX: number, id: number, source: Enemy | null = null, perfectable = true) {
    const p = this.player;
    // an attack you rolled through can't catch you as the roll ends
    if (this.dodged.has(id)) return;
    if (p.iframes) {
      this.dodged.add(id);
      const window = PERFECT_WINDOW + (this.stats.moon === "pale" ? 0.06 : 0);
      if (perfectable && p.st <= window && !p.perfectUsed) this.perfectDodge(source);
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
    this.bountyEvent("perfect");
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
    if (source instanceof Boss) source.addPosture(34, this);
    else if (!source && this.bossActive && this.boss) this.boss.addPosture(20, this);
  }

  stamDenied() {
    if (this.stamFlash <= 0) audio.play("deny");
    this.stamFlash = 0.35;
  }

  /** Flood water: you wade at half speed. */
  wading() {
    const wy = this.bossActive ? this.boss?.waterY() ?? null : null;
    return wy !== null && this.player.bottom > wy + 6 ? 0.55 : 1;
  }

  /** Rot-water burns while you stand in it (no stagger, just a steady drain). */
  private floodDamage(dt: number) {
    const p = this.player;
    if (!p.alive || this.wading() >= 1 || p.state === "roll") { this.floodTick = 0; return; }
    this.floodTick += dt;
    if (this.floodTick < 0.6) return;
    this.floodTick = 0;
    const dmg = Math.max(1, Math.round(5 * this.stats.foeDmgMult * (this.boss?.dmgMult ?? 1)));
    p.hp -= dmg;
    p.hpTrail = Math.max(p.hpTrail, p.hp + dmg); p.trailDelay = 0.4;
    p.hurtFlash = 0.08;
    this.fightHits++;
    this.addFloat(`${dmg}`, p.cx, p.y - 4, "#6ad0c0");
    audio.play("splash");
    if (!this.save.flags.floodWarned) { this.save.flags.floodWarned = true; this.chat.push("The rot-water burns. Get up on the scaffolds!", "#6ad0c0"); }
    if (p.hp <= 0) this.playerDied();
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
      this.save.purse = { x, y, amount: this.save.gold, level: this.level.id };
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
    const home = levelOfShrine(this.save.lastShrine);
    if (home !== this.level.id) {
      this.gatherChests();
      this.loadLevel(home);
      const pu = this.save.purse;
      this.purse = pu && (pu.level ?? "outskirts") === home ? new Purse(pu.x, pu.y, pu.amount) : null;
      this.seenRegions.clear();
    }
    this.applyRestoration();
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
    const mines = this.level.theme === "mines";
    audio.play(mines ? "splash" : "bog");
    this.particles.splat(p.cx, p.bottom - 4, mines ? ["#1a4a52", "#2e7a78", "#6ad0c0", "#b8f0e0"] : [C.blight3, C.blight4, C.blight5, C.sick1], 20);
    const dmg = Math.round(this.stats.maxHp * 0.2);
    p.hp -= dmg;
    this.addFloat(`${dmg}`, p.cx, p.y, C.bad);
    this.flash(mines ? "#1a4a52" : C.blight3, 0.3);
    if (mines && !this.save.flags.waterWarned) { this.save.flags.waterWarned = true; this.chat.push("The flood water drags at you, cold as iron.", "#6ad0c0"); }
    if (!mines && !this.save.flags.bogWarned) { this.save.flags.bogWarned = true; this.chat.push("The purple is not for drinking.", C.blight5); }
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
    this.bountyEvent("kill", e.table as BountyTarget);
    if (this.level.theme === "mines") this.count("minesKills");
    if (e.rotborn) {
      this.save.kills.rotborn = (this.save.kills.rotborn ?? 0) + 1;
      this.spawnDrops("rotborn", e.cx, e.y + e.h / 2);
      this.bountyEvent("rotborn");
      this.addHope(2, "Rotborn slain");
    }
    this.chargeDice(1);
    if (this.stats.perks.includes("bloodlust") && this.player.alive) {
      this.player.hp = Math.min(this.stats.maxHp, this.player.hp + 4);
      this.addFloat("+4", this.player.cx, this.player.y - 8, C.good);
    }
    this.spawnDrops(e.table, e.cx, e.y + e.h / 2);
    this.checkDiary();
  }

  onTonicDrunk() { this.fightTonics++; }

  /** Advance every open contract (and today's daily) that matches an event. */
  bountyEvent(kind: BountyKind, target?: BountyTarget) {
    const all = this.save.daily ? [...this.save.bounties, this.save.daily] : this.save.bounties;
    for (const b of all) {
      if (b.done || b.kind !== kind || (b.target && b.target !== target)) continue;
      b.have = Math.min(b.need, b.have + 1);
      if (b.have >= b.need) this.completeBounty(b);
    }
  }

  private completeBounty(b: Bounty) {
    const s = this.save;
    b.done = true;
    s.bountiesDone++;
    const r = b.reward;
    if (r.type === "rune") s.runes[r.face] = (s.runes[r.face] ?? 0) + 1;
    else if (r.type === "shards") s.shards += r.amount;
    else if (r.type === "gold") s.bank += r.amount;
    else if (r.type === "charge") s.diceCharge = DICE_CHARGE;
    else {
      s.dailiesDone++;
      const p = this.player;
      this.dropChest(p.cx + p.facing * 22, p.bottom, "daily", "daily", rollDrops("daily", rng, this.dropMods()));
    }
    audio.play("purse"); audio.loot(3);
    this.showBanner(b.daily ? "DAILY BOUNTY COMPLETE" : "BOUNTY COMPLETE", describe(b), C.gold2, false, 3);
    this.chat.push(`Bounty complete: ${describe(b)}. Reward: ${rewardText(r, (f) => FACES[f].name)}${r.type === "gold" ? " (banked)" : ""}.`, C.gold2);
    this.addHope(b.hope, "bounty");
    this.checkDiary();
    this.persist();
  }

  /** Raise Hollowmere's Hope; crossing a milestone restores part of the village. */
  addHope(n: number, _why: string) {
    const s = this.save;
    const before = milestonesFor(s.hope);
    s.hope = Math.min(HOPE_MAX, s.hope + n);
    this.chat.push(`+${n} Hope for Hollowmere (${s.hope}/${HOPE_MAX}).`, C.fire2);
    const after = milestonesFor(s.hope);
    for (let i = before; i < after; i++) {
      const m = MILESTONES[i];
      this.showBanner(m.title.toUpperCase(), "Hollowmere remembers", C.fire2, true, 4);
      this.chat.push(m.text, C.fire2);
      if (i === 1) s.runeStock = rng.weighted(RUNE_WEIGHTS);
      if (i === 4) {
        const crown = makeUnique("harvest_crown");
        if (!this.giveItem(crown)) this.pickups.push(new Pickup("item", this.player.cx, this.player.y, 1, crown));
        s.log.harvest_crown = (s.log.harvest_crown ?? 0) + 1;
      }
    }
    if (after > before) {
      audio.play("kindle");
      this.onGearChanged();
      // re-rendering the world takes a moment, so the village changes while you rest
      if (getLevel("outskirts").restored !== after) this.chat.push("Rest at a Hearthstone to see Hollowmere change.", C.dim);
    }
    this.persist();
  }

  /** Re-render the Outskirts art if the number of Hope milestones changed. */
  applyRestoration() {
    const L1 = getLevel("outskirts");
    const m = milestonesFor(this.save.hope);
    if (L1.setRestoration(m, recedeFor(m))) {
      this.art.delete("outskirts");
      if (this.level === L1) this.loadLevel("outskirts");
    }
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

  private dropMods(extra: Partial<Parameters<typeof rollDrops>[2]> = {}) {
    const st = this.stats;
    return { goldFind: st.goldFind, gearMult: st.gearMult, alwaysGold: st.perks.includes("windfall"), mapMult: st.mapMult, ...extra };
  }

  spawnDrops(table: string, x: number, y: number) {
    for (const d of rollDrops(table, rng, this.dropMods())) {
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
      else this.claimDrops([d], x, y);
    }
  }

  /** Hand a set of drops straight to the player (chest contents, maps, parts, pets). */
  private claimDrops(drops: Drop[], x: number, y: number) {
    const s = this.save, p = this.player;
    for (const d of drops) {
      switch (d.type) {
        case "gold": s.gold += d.amount; break;
        case "shard": s.shards += d.amount; break;
        case "orb": p.hp = Math.min(this.stats.maxHp, p.hp + Math.round(this.stats.maxHp * 0.12)); break;
        case "rune": s.runes[d.face] = (s.runes[d.face] ?? 0) + 1; break;
        case "mat": s.mats[d.id] = (s.mats[d.id] ?? 0) + d.amount; break;
        case "map": this.addMap(); break;
        case "pet": this.gainPet(d.pet, x, y); break;
        case "item": {
          const it = d.item;
          if (it.rarity > s.bestRarity && it.rarity <= 4) s.bestRarity = it.rarity;
          if (it.rarity === 5) {
            const first = !(s.log[it.base] > 0);
            s.log[it.base] = (s.log[it.base] ?? 0) + 1;
            if (first) this.chat.push(`New item added to your collection log: ${baseOf(it).name}`, RARITY[5].color);
            s.bestRarity = Math.max(s.bestRarity, 4);
          }
          if (!this.giveItem(it)) {
            this.pickups.push(new Pickup("item", x, y - 8, 1, it));
            this.toast("Your pack is full. The rest spills onto the ground.", C.bad);
          }
          break;
        }
      }
    }
    this.persist();
  }

  private gainPet(id: PetId, x: number, y: number) {
    const s = this.save;
    if (s.pets.includes(id)) { this.chat.push("You have a funny feeling like you would have been followed...", C.dim); return; }
    s.pets.push(id);
    if (id === "wick") s.pet = true;
    s.activePet = id;
    this.pet = new Pet(x, y, id, 0);
    audio.loot(5);
    this.chat.push("You have a funny feeling like you're being followed.", C.gold2);
    this.showBanner(PETS[id].stages[0].toUpperCase(), "A new friend follows you", RARITY[5].color, false, 4);
    this.onGearChanged();
  }

  /** A treasure map for a random dig site in any level you can reach. One map at a time. */
  private addMap() {
    const s = this.save;
    if (s.maps.length) {
      s.gold += 25;
      this.chat.push("You already carry a map. You sell the spare for 25 gold.", C.dim);
      return;
    }
    const lvls: LevelId[] = s.flags.minesOpen ? ["outskirts", "mines"] : ["outskirts"];
    const lid = rng.pick(lvls);
    const spot = rng.pick(getLevel(lid).digSpots);
    s.maps = [`${lid}:${spot.id}`];
    audio.loot(3);
    this.chat.push(`You find a treasure map! (${LEVEL_INFO[lid].name})`, C.paper);
    if (!s.flags.mapHint) { s.flags.mapHint = true; this.chat.push("Read it in your Journal [I]. Find the X and dig.", C.dim); }
  }

  private dropChest(x: number, y: number, kind: ChestKind, table: string, drops: Drop[]) {
    const ch = new LootChest(x, y, kind, table, drops);
    this.chests.push(ch);
    this.particles.burst(x, y - 10, 16, { speed: 70, colors: [C.gold2, C.gold3, C.white], max: 0.6, g: 120, light: 5, lightColor: C.gold2 });
    return ch;
  }

  private openChest(ch: LootChest) {
    if (ch.opened) return;
    const s = this.save;
    if (!ch.drops) ch.drops = rollDrops(ch.table, rng, this.dropMods());
    if (ch.kind === "cache") {
      const first = !s.flags["cache_" + ch.cacheId];
      s.flags["cache_" + ch.cacheId] = true;
      this.bountyEvent("cache");
      if (first) {
        const def = this.level.caches.find((c) => c.id === ch.cacheId);
        this.showBanner("SECRET FOUND", def?.name ?? "A hidden cache", RARITY[5].color, false, 3.5);
      }
    }
    ch.opened = true;
    const drops = ch.drops;
    const title = ch.kind === "boss" ? `${this.boss?.title ?? "BOSS"} SPOILS` : ch.kind === "treasure" ? "BURIED TREASURE" : ch.kind === "daily" ? "THE DAILY CHEST" : "SECRET CACHE";
    this.openOverlay(new ChestReveal(title, drops, () => {
      this.claimDrops(drops, ch.x, ch.y);
      this.checkDiary();
    }));
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

  // ===================================================================== diary, daily, sigils
  /** Grant any diary tier that has just been completed. */
  checkDiary() {
    const s = this.save;
    for (const area of DIARY_AREAS) DIARY[area].tiers.forEach((tier, ti) => {
      if (tierClaimed(s, area, ti) || !tierComplete(s, area, ti)) return;
      s.diaryClaimed.push(tierKey(area, ti));
      if (ti === 0) {
        const gold = area === "mines" ? 200 : 150;
        s.bank += gold;
        const face = rng.weighted(RUNE_WEIGHTS);
        s.runes[face] = (s.runes[face] ?? 0) + 1;
      }
      audio.play("levelup");
      this.showBanner(`${DIARY[area].name} ${tier.name} DIARY`, "Complete!", C.gold2, false, 4);
      this.chat.push(`Well done! You have completed the ${tier.name.toLowerCase()} tasks in the ${DIARY[area].name.toLowerCase()} diary.`, C.gold2);
      this.chat.push(`Reward: ${tier.reward}.`, C.gold2);
      this.onGearChanged();
    });
  }

  /** Today's daily contract (the same for everyone), refreshed at local midnight. */
  private refreshDaily() {
    const s = this.save, day = dayKey();
    if (s.dailyDay === day) return;
    s.dailyDay = day;
    s.daily = dailyBounty(day, !!s.flags.minesOpen);
    if (this.mode === "play") this.chat.push("A new daily notice is pinned to the board.", C.gold2);
  }

  onSigilsChanged() {
    this.stats = computeStats(this.save);
    if (this.boss && this.boss.mode === "dormant") {
      // re-seat the dormant boss under the new sigils
      const L = this.level;
      this.boss = L.bossKind === "grimwater" ? new Grimwater(L.arena.bossX, L.arena.bossY) : new Wick(L.arena.bossX, L.arena.bossY);
      const mods = sigilMods(this.save.sigils);
      this.fightSigils = 0;
      if ((this.save.kills[this.boss.table] ?? 0) > 0 && mods.count > 0) { this.boss.applySigils(mods); this.fightSigils = mods.count; }
    }
    this.persist();
  }

  /** A Watcher saw you: the gallery gate slams and the bats come. */
  watcherSaw(w: Watcher) {
    const L = this.level;
    if (!L.gateOpen) return;
    L.setGate(false);
    audio.play("watcher"); audio.play("gate");
    this.shake(3, 0.4);
    this.chat.push("A Watcher sees you! The gate grinds shut. (It opens again when you rest.)", "#e0405a");
    for (const side of [-1, 1]) this.enemies.push(new Bat(w.x + side * 40, w.def.y + 10));
    if (!this.save.flags.watcherHint) { this.save.flags.watcherHint = true; this.chat.push("Time your way past the light, or find a way to look like you belong here.", C.dim); }
  }

  // ===================================================================== interactions
  private interact() {
    const p = this.player, s = this.save, L = this.level;
    this.prompt = null;
    if (p.state !== "normal" || !p.onGround) return;
    type Cand = { d: number; x: number; y: number; text: string; act: () => void };
    const cands: Cand[] = [];
    const near = (x: number, y: number, r: number) => Math.abs(p.cx - x) < r && Math.abs(p.bottom - y) < 20;
    for (const sh of this.shrines) {
      if (near(sh.x, sh.y, 18)) {
        const lit = s.shrines.includes(sh.def.id);
        cands.push({ d: Math.abs(p.cx - sh.x), x: sh.x, y: sh.y - 36, text: lit ? "REST" : "KINDLE", act: () => this.rest(sh) });
      }
    }
    for (const n of this.npcs) if (near(n.x, n.y, 24)) cands.push({ d: Math.abs(p.cx - n.x), x: n.x, y: n.y - 30, text: "TALK", act: () => this.talk(n) });
    for (const sg of this.signs) if (near(sg.x, sg.y, 12)) cands.push({ d: Math.abs(p.cx - sg.x), x: sg.x, y: sg.y - 22, text: "READ", act: () => this.openOverlay(new Dialog("Signpost", sg.def.text.split("\n\n"), null)) });
    const bd = L.board;
    if (near(bd.x, bd.y, 14)) {
      const open = s.bounties.filter((b) => !b.done).length + (s.daily && !s.daily.done ? 1 : 0);
      cands.push({ d: Math.abs(p.cx - bd.x), x: bd.x, y: bd.y - 30, text: open ? `BOUNTIES (${open})` : "BOUNTIES", act: () => this.openOverlay(new BountyBoard()) });
    }
    if (!this.bossActive) {
      const ss = L.sigilStone;
      if (near(ss.x, ss.y, 12)) {
        const bossTable = L.bossKind;
        const on = SIGIL_IDS.filter((k) => s.sigils[k]).length;
        cands.push({ d: Math.abs(p.cx - ss.x), x: ss.x, y: ss.y - 26, text: on ? `SIGILS (${on})` : "SIGILS", act: () => this.openOverlay(new SigilMenu(bossTable === "wick" ? "Wick, the Harvest Warden" : "Grimwater, the Drowned Foreman", (s.kills[bossTable] ?? 0) > 0)) });
      }
      const bc = L.beacon;
      if (bc && near(bc.x, bc.y, 16)) {
        if (!s.flags.minesOpen) {
          const have = s.mats.ember ?? 0;
          cands.push({ d: Math.abs(p.cx - bc.x), x: bc.x, y: bc.y - 36, text: `BEACON (${Math.min(have, BEACON_EMBERS)}/${BEACON_EMBERS} EMBERS)`, act: () => this.lightBeacon() });
        }
      }
      for (const ex of L.exits) {
        if (!near(ex.x, ex.y, 16)) continue;
        if (ex.needs === "beacon" && !s.flags.minesOpen) continue;
        cands.push({ d: Math.abs(p.cx - ex.x), x: ex.x, y: ex.y - 34, text: ex.label, act: () => { audio.play("fog"); this.enterLevel(ex.to); } });
      }
    }
    for (const ch of this.chests) if (!ch.opened && near(ch.x, ch.y, 16)) cands.push({ d: Math.abs(p.cx - ch.x), x: ch.x, y: ch.y - 24, text: ch.label, act: () => this.openChest(ch) });
    const spot = this.mapSpot();
    if (spot && near(spot.x, spot.y, 14)) cands.push({ d: Math.abs(p.cx - spot.x), x: spot.x, y: spot.y - 20, text: "DIG", act: () => this.dig(spot.x, spot.y) });
    const A = L.arena;
    const fogX = A.fogCol * TILE;
    if (L.get(A.fogCol, A.fogBottom) === T.FOG && !this.bossActive && p.cx < fogX && fogX - p.cx < 32) {
      cands.push({ d: fogX - p.cx, x: fogX + 8, y: p.y - 6, text: "ENTER THE FOG", act: () => this.enterFog() });
    }
    if (!cands.length) return;
    cands.sort((a, b) => a.d - b.d);
    const c = cands[0];
    this.prompt = { x: c.x - this.cam.x, y: c.y - this.cam.y, text: c.text };
    if (this.input.pressed("interact")) { this.input.consume("interact"); this.prompt = null; c.act(); }
  }

  /** The dig site of the carried map, if it's in this level. */
  private mapSpot() {
    const mp = this.save.maps[0];
    if (!mp) return null;
    const [lid, id] = mp.split(":");
    if (lid !== this.level.id) return null;
    return this.level.digSpots.find((d) => d.id === id) ?? null;
  }

  private dig(x: number, y: number) {
    const s = this.save;
    s.maps = [];
    audio.play("dig");
    this.shake(2, 0.2);
    this.particles.burst(x, y - 2, 18, { speed: 90, colors: [C.dirt2, C.dirt3, C.stone2], g: 400, max: 0.7, size: 2 });
    s.flags["dug_" + this.level.id] = true;
    this.count("dug");
    this.bountyEvent("dig");
    this.chat.push("X marks the spot. You dig up a buried chest!", C.gold2);
    this.dropChest(x, y, "treasure", "treasure", rollDrops("treasure", rng, this.dropMods()));
    this.checkDiary();
    this.persist();
  }

  private lightBeacon() {
    const s = this.save;
    const have = s.mats.ember ?? 0;
    if (have < BEACON_EMBERS) {
      audio.play("deny");
      this.toast(`The beacon needs ${BEACON_EMBERS} Warden's Embers. Wick carries them.`);
      return;
    }
    s.mats.ember = have - BEACON_EMBERS;
    s.flags.minesOpen = true;
    audio.play("kindle");
    this.flash(C.fire2, 0.5);
    const bc = this.level.beacon!;
    this.particles.burst(bc.x, bc.y - 30, 40, { speed: 90, colors: [C.fire1, C.fire2, C.fire3], max: 1.2, g: -40, drag: 2, light: 8, lightColor: C.fire1 });
    this.showBanner("THE BEACON BURNS", "The mill cellar opens onto the Drowned Mines", C.fire2, true, 4.5);
    this.chat.push("Far below, something answers the light: a bell, tolling under water.", "#6ad0c0");
    // the board learns about the Mines too
    s.bounties = refreshBounties(s.bounties.filter((b) => !b.done), rng, true);
    this.checkDiary();
    this.persist();
  }

  private talk(n: NPC) {
    const lines = n.lines(this);
    this.openOverlay(new Dialog(n.name, lines, (c, x, y) => n.portrait(c, x, y), n.id === "brom" ? (g) => g.openOverlay(new ShopMenu()) : undefined));
    this.checkDiary();
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
    this.applyRestoration();
    this.resetWorld();
    this.persist();
    for (let i = 0; i < 16; i++) this.particles.spawn(sh.x + rng.range(-8, 8), sh.y - 30, { vy: -rng.range(20, 60), vx: rng.range(-10, 10), max: rng.range(0.6, 1.2), color: C.fire2, color2: C.fire0, light: 6, lightColor: C.fire1 });
    this.openOverlay(new RestMenu(id));
    if (s.diceCharge >= DICE_CHARGE) this.openOverlay(new DiceMenu(this, true));
    const before = s.bounties.filter((b) => b.done).length;
    s.bounties = refreshBounties(s.bounties, rng, !!s.flags.minesOpen);
    if (before) this.chat.push(`${before === 1 ? "A new notice is" : "New notices are"} pinned to the board in Hollowmere.`, C.dim);
    if (milestonesFor(s.hope) >= 2) s.runeStock = rng.weighted(RUNE_WEIGHTS);
    this.refreshDaily();
    this.checkDiary();
    this.persist();
  }

  travelTo(id: string) {
    this.overlays = [];
    if (levelOfShrine(id) !== this.level.id) { this.enterLevel(id); return; }
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
    const b = this.boss;
    if (!b) return;
    this.bossActive = true;
    this.bossTrail = b.maxHp;
    b.wake();
    this.fightStart = this.time; this.fightTonics = 0; this.fightHits = 0;
    audio.music(b.music[0]);
    this.showBanner(b.title, b.subtitle, C.cream, true, 3.6);
    if (this.fightSigils) this.chat.push(`${this.fightSigils} sigil${this.fightSigils > 1 ? "s" : ""} bind${this.fightSigils > 1 ? "" : "s"} the ${b.table === "wick" ? "Warden" : "Foreman"}.`, C.blight5);
  }

  onBossPhase2() {
    const b = this.boss;
    audio.music(b?.music[1] ?? "boss2");
    this.flash(C.sick1, 0.4);
    if (b) this.chat.push(b.phase2Text, C.sick1);
  }

  onBossDefeated(b: Boss) {
    const s = this.save;
    const k = b.table;
    s.kills[k] = (s.kills[k] ?? 0) + 1;
    const kc = s.kills[k];
    this.count("bossKills");
    this.chargeDice(DICE_CHARGE);
    const wick = k === "wick";
    this.bountyEvent(wick ? "wick" : "grim");
    if (this.fightTonics === 0) { this.bountyEvent(wick ? "wickNoTonic" : "grimNoTonic"); s.flags["notonic_" + k] = true; }
    if (wick && this.time - this.fightStart < WICK_FAST_SECONDS) this.bountyEvent("wickFast");
    if (this.fightHits === 0) s.flags["flawless_" + k] = true;
    if (this.fightSigils >= 3) s.flags["sigils3_" + k] = true;
    this.addHope(wick ? (kc === 1 ? 10 : 5) : (kc === 1 ? 12 : 6), "boss felled");
    this.bossActive = false;
    this.level.setFog(false);
    this.chat.push(`Your ${wick ? "Wick" : "Grimwater"} kill count is: ${kc}.`, "#e0605a");
    audio.play("victory");
    this.flash(C.white, 0.5);
    this.showBanner(b.deathTitle, "", C.gold2, true, 4.5);
    // pets grow with every boss you fell together
    const pid = s.activePet;
    if (pid) {
      const before = petStage(s.petKc[pid] ?? 0);
      s.petKc[pid] = (s.petKc[pid] ?? 0) + 1;
      const after = petStage(s.petKc[pid]!);
      if (after > before) {
        this.showBanner(PETS[pid].stages[after].toUpperCase(), "Your pet has grown!", RARITY[5].color, false, 4);
        this.chat.push(`Your pet grows into ${PETS[pid].stages[after]}!`, RARITY[5].color);
        this.spawnPet();
        this.onGearChanged();
      }
    }
    const extraGear = this.fightSigils + (this.stats.moon === "harvest" ? 1 : 0);
    const drops = rollDrops(k, rng, this.dropMods({ extraGear, extraShards: this.fightSigils, uniqueRolls: this.fightSigils >= 3 ? 2 : 1 }));
    const gy = this.level.surfaceY(Math.floor(b.cx / TILE), Math.floor(b.y / TILE));
    this.dropChest(clamp(b.cx, this.level.arena.x0 + 24, this.level.arena.x1 - 24), gy, "boss", k, drops);
    if (wick && !s.flags.wickSlain) {
      s.flags.wickSlain = true;
      this.chat.push("Rest at a Hearthstone to face the Warden again.", C.dim);
      this.chat.push("Among his straw: a Warden's Ember, still warm.", C.fire2);
      this.chat.push("The beacon by the mill cellar needs three of them.", C.fire2);
    }
    if (!wick && !s.flags.grimSlain) {
      s.flags.grimSlain = true;
      this.chat.push("The shaft drains. The bell falls silent. For now.", "#6ad0c0");
    }
    this.boss = null;
    for (const e of this.enemies) if ((e instanceof Crow || e instanceof Sludgeling) && !e.dead && !e.rotborn) { e.hp = 0; e.dead = true; e.remove = true; this.particles.burst(e.cx, e.y, 8, { speed: 40, colors: [C.inkSoft, C.blight2], max: 0.5 }); }
    setTimeout(() => { if (this.mode === "play" && !this.bossActive) audio.music(this.level.regionAt(this.player.cx).music); }, 5000);
    this.checkDiary();
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
    this.dailyCheckT += dt;
    if (this.dailyCheckT > 10) { this.dailyCheckT = 0; this.refreshDaily(); }
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
    for (const w of this.watchers) w.update(this, dt);
    for (const ch of this.chests) ch.update(dt);
    this.pet?.update(this, dt);
    this.combat();
    if (this.bossActive) this.floodDamage(dt);
    this.enemies = this.enemies.filter((e) => !e.remove);
    this.separateEnemies();

    // a grown pet gathers gold and shards from further away
    if (this.pet && this.pet.stage >= 2) {
      for (const pk of this.pickups) {
        if (pk.kind === "item" || pk.t < 0.45) continue;
        const dx = p.cx - pk.cx, dy = p.y + 10 - pk.y;
        if (Math.hypot(dx, dy) < 70) { pk.x += Math.sign(dx) * 120 * dt; pk.y += Math.sign(dy) * 120 * dt; }
      }
    }

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

    for (const e of this.enemies) {
      if (!e.rotborn || e.announced || e.dead) continue;
      const sx = e.cx - this.cam.x;
      if (sx > 0 && sx < W) {
        e.announced = true;
        this.chat.push(`A Rotborn ${e.label} rises from the Rot...`, C.blight5);
        audio.play("fog");
      }
    }
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
    const L = this.level;
    const mines = L.theme === "mines";
    const onScreen = (x: number, y: number, m = 40) => x > cx - m && x < cx + W + m && y > cy - m && y < cy + H + m;
    for (const e of this.props.emitters) {
      if (!onScreen(e.x, e.y, 60)) continue;
      if (e.kind === "smoke" && rng.chance(dt * 5)) this.particles.spawn(e.x + rng.range(-1, 1), e.y, { vy: -rng.range(8, 16), vx: rng.range(2, 8), max: rng.range(2, 3.5), color: "#4a4458", color2: "#2e2a3a", size: rng.chance(0.4) ? 2 : 1, wobble: 6 });
      if (e.kind === "ember" && rng.chance(dt * 4)) this.particles.spawn(e.x + rng.range(-5, 5), e.y, { vy: -rng.range(20, 50), vx: rng.range(-8, 8), max: rng.range(0.6, 1.4), color: C.fire2, color2: C.fire0, light: 4, lightColor: C.fire1, wobble: 10 });
      if (e.kind === "drip" && rng.chance(dt * 0.7)) this.particles.spawn(e.x, e.y, { vy: 10, g: 200, max: 1.2, color: C.blight4, light: 4, lightColor: C.blight4 });
    }
    const b = L.blightAt(cx + W / 2);
    if (mines) {
      // water dripping from the ceiling, and drifting motes of drowned light
      if (rng.chance(dt * 4)) {
        const tx = Math.floor((cx + rng.range(0, W)) / TILE);
        for (let ty = Math.floor(cy / TILE); ty < L.h; ty++) {
          if (!L.isSolid(L.get(tx, ty)) && L.isSolid(L.get(tx, ty - 1))) {
            this.particles.spawn(tx * TILE + rng.range(2, 14), ty * TILE + 1, { vy: 5, g: 420, max: 1.1, color: "#6ad0c0", color2: "#2e7a78" });
            if (rng.chance(0.2)) audio.play("drip", 0.5);
            break;
          }
        }
      }
      if (rng.chance(dt * 2)) this.particles.spawn(cx + rng.range(0, W), cy + rng.range(H * 0.2, H * 0.9), { vx: rng.range(-4, 4), vy: -rng.range(2, 6), max: rng.range(3, 6), color: b > 0.6 ? C.blight5 : "#6ad0c0", wobble: 10, light: 5, lightColor: b > 0.6 ? C.blight4 : "#2e7a78" });
    } else {
      // fireflies in healthy fields, rot spores deeper in
      if (rng.chance(dt * 3)) {
        const x = cx + rng.range(0, W), y = cy + rng.range(H * 0.3, H * 0.85);
        if (rng.next() > b) this.particles.spawn(x, y, { vx: rng.range(-6, 6), vy: rng.range(-4, 4), max: rng.range(3, 6), color: "#d8f07a", wobble: 14, light: 7, lightColor: "#c9e06a" });
        else this.particles.spawn(x, y, { vx: rng.range(-4, 4), vy: -rng.range(3, 9), max: rng.range(3, 6), color: C.blight5, color2: C.blight3, wobble: 8, light: 5, lightColor: C.blight4 });
      }
      if (rng.chance(dt * 1.2 * (1 - b))) this.particles.spawn(cx + rng.range(0, W + 60), cy - 4, { vx: -rng.range(8, 20), vy: rng.range(10, 20), max: 8, color: rng.chance(0.5) ? C.straw1 : "#6a4a3a", wobble: 18 });
    }
    // bog bubbles
    if (rng.chance(dt * 6)) {
      const tx = Math.floor((cx + rng.range(0, W)) / TILE);
      for (let ty = 0; ty < L.h; ty++) if (L.get(tx, ty) === T.BOG) {
        this.particles.spawn(tx * TILE + rng.range(2, 14), ty * TILE + 3, { vy: -rng.range(6, 14), max: 0.5, color: mines ? "#b8f0e0" : C.blight5, light: 3, lightColor: mines ? "#2e7a78" : C.blight4 });
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
    const s = this.save;
    const playing = this.mode !== "title";
    const mines = L.theme === "mines";

    this.bg.draw(ctx, camX, camY, t);
    blit(ctx, this.props.canvas, camX, camY);
    if (this.props.millHub) drawMillBlades(ctx, this.props.millHub, camX, camY, t, milestonesFor(s.hope) >= 5 ? 0.7 : 0.12);
    if (L.board.x > 0) drawBoard(ctx, L.board.x, L.board.y, camX, camY, s.bounties.some((b) => !b.done) || !!(s.daily && !s.daily.done));
    if (L.beacon) drawBeacon(ctx, L.beacon.x, L.beacon.y, camX, camY, !!s.flags.minesOpen, t);
    drawSigilStone(ctx, L.sigilStone.x, L.sigilStone.y, camX, camY, SIGIL_IDS.map((k) => !!s.sigils[k]), (s.kills[L.bossKind] ?? 0) > 0, t);
    for (const sh2 of this.shrines) sh2.draw(ctx, camX, camY, s.shrines.includes(sh2.def.id), t);
    for (const sg of this.signs) sg.draw(ctx, camX, camY);
    blit(ctx, this.tiles.tiles, camX, camY);
    drawDynamicTiles(ctx, L, camX, camY, t);
    drawBog(ctx, L, camX, camY, W, t);
    for (const w of this.watchers) w.draw(ctx, camX, camY, t);
    const spot = playing ? this.mapSpot() : null;
    if (spot) drawDigSite(ctx, spot.x, spot.y, camX, camY, t);
    for (const pt of this.pots) pt.draw(ctx, camX, camY);
    for (const ch of this.chests) ch.draw(ctx, camX, camY, t);
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
    this.boss?.drawFront(this, ctx, camX, camY);
    this.particles.draw(ctx, camX, camY, "back");
    blit(ctx, this.tiles.fg, camX, camY);
    drawFog(ctx, L, camX, camY, t);

    // ---- lighting
    this.gatherLights(camX, camY);
    const b = L.blightAt(camX + W / 2);
    if (b > 0.02) {
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = mines ? mix("#ffffff", "#a8b8d0", b) : mix("#ffffff", "#c4acd6", b);
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "source-over";
    }
    let dark = mines ? 0.5 + b * 0.14 : 0.34 + b * 0.18;
    if (this.bossActive && this.boss?.phase === 2) dark += 0.08;
    this.lighting.render(ctx, dark, mines ? "#04060c" : "#07050f", 0.3);
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
    const lg = this.lighting, t = this.time, L = this.level, s = this.save;
    const mines = L.theme === "mines";
    for (const l of this.props.lights) {
      const f = 1 - l.flicker * (0.5 + 0.5 * Math.sin(t * 9 + l.x * 0.7) * Math.sin(t * 5.3 + l.y));
      lg.add(l.x - camX, l.y - camY, l.r * (0.95 + 0.05 * f), l.color, (l.strength ?? 0.9) * f);
    }
    for (const lp of L.lamps) lg.add(lp.x - camX, lp.y - camY, (mines ? 46 : 40) + Math.sin(t * 7 + lp.x) * 2, C.fire1, 0.95);
    for (const sh of this.shrines) {
      const lit = s.shrines.includes(sh.def.id);
      lg.add(sh.x - camX, sh.y - 30 - camY, lit ? 64 + Math.sin(t * 6) * 3 : 18, lit ? C.fire1 : "#6a5a8a", lit ? 1 : 0.5);
    }
    if (L.beacon && s.flags.minesOpen) lg.add(L.beacon.x - camX, L.beacon.y - 32 - camY, 56 + Math.sin(t * 8) * 3, C.fire1, 1);
    if (!mines) lg.add(292 - camX * 0.01, 26 + (camY / Math.max(1, L.pxH - H)) * 6, 40, "#c8b8d8", 0.85);
    const p = this.player;
    const light = this.stats.light;
    if (this.mode !== "title") lg.add(p.cx - camX, p.y + 8 - camY, (mines ? 42 : 34) + light * 30, light ? C.fire2 : "#c8b8a0", light ? 0.9 : mines ? 0.7 : 0.55);
    if (this.pet && this.pet.stage >= 1) lg.add(this.pet.x - camX, this.pet.y - 12 - camY, 26, this.pet.id === "grim" ? "#6ad0c0" : C.fire1, 0.8);
    for (const e of this.enemies) e.lights(this, camX, camY);
    this.boss?.lights(this, camX, camY);
    for (const pr of this.projectiles) pr.lights?.(this, camX, camY);
    for (const w of this.watchers) w.lights(this, camX, camY);
    for (const ch of this.chests) ch.lights(this, camX, camY);
    for (const pk of this.pickups) {
      if (pk.kind === "item" && pk.item) lg.add(pk.cx - camX, pk.y - camY, pk.item.rarity >= 3 ? 30 : 16, RARITY[pk.item.rarity].color, 0.7);
      else if (pk.kind === "gold") lg.add(pk.cx - camX, pk.y + 4 - camY, 8, C.gold2, 0.5);
      else if (pk.kind === "shard") lg.add(pk.cx - camX, pk.y + 2 - camY, 12, C.blight4, 0.7);
    }
    if (this.purse) lg.add(this.purse.x - camX, this.purse.y - 8 - camY, 22, C.gold2, 0.8);
    const spot = this.mapSpot();
    if (spot) lg.add(spot.x - camX, spot.y - 4 - camY, 14, C.gold2, 0.6);
    const A = L.arena;
    if (L.get(A.fogCol, A.fogBottom) === T.FOG) for (let y = A.fogTop + 3; y < A.fogBottom; y += 4) lg.add(A.fogCol * TILE + 8 - camX, y * TILE - camY, 30, "#b9a8d0", 0.6);
    // bog / water glow
    for (let tx = Math.floor(camX / TILE); tx <= Math.floor((camX + W) / TILE); tx++) {
      for (let ty = 0; ty < L.h; ty++) if (L.get(tx, ty) === T.BOG && L.get(tx, ty - 1) !== T.BOG) { lg.add(tx * TILE + 8 - camX, ty * TILE + 4 - camY, 22, mines ? "#2e7a78" : C.blight4, 0.55); break; }
    }
    if (L.spiritSight) for (let tx = Math.floor(camX / TILE); tx <= Math.floor((camX + W) / TILE); tx += 2) for (let ty = 0; ty < L.h; ty++) if (L.get(tx, ty) === T.SPIRIT) lg.add(tx * TILE + 8 - camX, ty * TILE - camY, 20, "#b9a8d0", 0.6);
    for (const n of this.npcs) {
      if (n.id === "brom") lg.add(n.x - 14 - camX, n.y - 12 - camY, 12, C.fire1, n.hammerT > 0.5 && n.hammerT < 0.6 ? 1 : 0);
      if (n.id === "tam") lg.add(n.x + 9 * n.facing - camX, n.y - 12 - camY, 36, C.fire1, 0.9);
    }
    this.particles.lights(lg, camX, camY);
  }
}

function blit(ctx: Ctx, src: HTMLCanvasElement, sx: number, sy: number) {
  const x0 = Math.max(0, sx), y0 = Math.max(0, sy);
  const x1 = Math.min(src.width, sx + W), y1 = Math.min(src.height, sy + H);
  if (x1 <= x0 || y1 <= y0) return;
  ctx.drawImage(src, x0, y0, x1 - x0, y1 - y0, x0 - sx, y0 - sy, x1 - x0, y1 - y0);
}
