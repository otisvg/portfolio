import type { Ctx } from "../gfx/canvas";
import type { Game } from "../game";
import type { SigilMods } from "../systems/sigils";
import { Enemy } from "./enemies";

export const POSTURE_MAX = 100;
export const KNEEL_T = 2.2;

/**
 * Shared shape for every boss: a dormant state until the fight starts, two phases,
 * a Sekiro-style posture meter, sigil modifiers, and presentation data (title card,
 * music, death banner).
 */
export abstract class Boss extends Enemy {
  abstract mode: string;
  phase = 1;
  /** Posture fills from perfect dodges and finishers; full = the boss kneels, open to punishment. */
  posture = 0;
  postureT = 0;
  homeX: number; homeY: number;
  /** Sigil of Haste. */
  speedMult = 1;
  abstract readonly title: string;
  abstract readonly subtitle: string;
  abstract readonly deathTitle: string;
  abstract readonly phase2Text: string;
  abstract readonly music: [string, string];

  constructor(cx: number, gy: number, w: number, h: number, hp: number) {
    super(cx, gy, w, h, hp);
    this.isBoss = true;
    this.homeX = cx; this.homeY = gy;
    this.facing = -1;
  }

  get awake() { return this.mode !== "dormant"; }
  abstract get invulnerable(): boolean;
  abstract wake(): void;

  applySigils(m: SigilMods) {
    this.hp = this.maxHp = Math.round(this.maxHp * m.hp);
    this.dmgMult *= m.dmg;
    this.speedMult = m.speed;
  }

  update(g: Game, dt: number) { super.update(g, dt * this.speedMult); }

  addPosture(n: number, _g: Game) {
    if (!this.awake || this.invulnerable || this.mode === "kneel") return;
    this.posture = Math.min(100, this.posture + n);
    this.postureT = 0;
  }
  vulnMult(): number { return this.mode === "kneel" ? 2 : 1; }

  /** Flood-water surface (px) while the arena is flooded, or null. */
  waterY(): number | null { return null; }
  /** Drawn over the player and foes (e.g. flood water). */
  drawFront(_g: Game, _ctx: Ctx, _camX: number, _camY: number) { }
}
