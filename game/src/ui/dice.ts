import { audio } from "../core/audio";
import { clamp } from "../core/math";
import { rng } from "../core/rng";
import { rect, type Ctx } from "../gfx/canvas";
import { drawText, textWidth, wrap } from "../gfx/font";
import { drawIcon } from "../gfx/icons";
import { C } from "../gfx/palette";
import type { Game } from "../game";
import { bonusLines, DICE_CHARGE, DICE_REROLLS, diceBonus, FACES, FIN, rollDie, type FaceId, type FinFace } from "../systems/dice";
import type { Overlay } from "./menu";
import { hint, panel } from "./widgets";

const BONE = "#e9dcc0", BONE_SHADE = "#bfae8c", BONE_DARK = "#8a7a5e";

/** A bone die with a face icon. `size` 14 (small) or 34 (large). */
export function drawDie(ctx: Ctx, x: number, y: number, size: number, face: FaceId | null, o: { locked?: boolean; selected?: boolean; dim?: boolean } = {}) {
  x = Math.round(x); y = Math.round(y);
  const s = size;
  ctx.globalAlpha = o.dim ? 0.45 : 1;
  rect(ctx, x + 1, y, s - 2, s, C.ink); rect(ctx, x, y + 1, s, s - 2, C.ink);
  rect(ctx, x + 1, y + 1, s - 2, s - 2, BONE_SHADE);
  rect(ctx, x + 1, y + 1, s - 3, s - 3, BONE);
  rect(ctx, x + 2, y + 1, s - 5, 1, "#fff6e0");
  if (face && face !== "blank") {
    const f = FACES[face];
    if (f.rare) { rect(ctx, x + 1, y + s - 2, s - 2, 1, f.color); rect(ctx, x + s - 2, y + 1, 1, s - 2, f.color); }
    const scale = s >= 30 ? 2 : 1;
    const isz = 12 * scale;
    if (f.icon) drawIcon(ctx, f.icon, x + (s - isz) / 2, y + (s - isz) / 2, scale);
  } else if (face === "blank") {
    rect(ctx, x + s / 2 - 1, y + s / 2 - 1, 2, 2, BONE_DARK);
  }
  ctx.globalAlpha = 1;
  if (o.locked) {
    rect(ctx, x - 1, y - 1, s + 2, 1, C.gold2); rect(ctx, x - 1, y + s, s + 2, 1, C.gold2);
    rect(ctx, x - 1, y - 1, 1, s + 2, C.gold2); rect(ctx, x + s, y - 1, 1, s + 2, C.gold2);
  }
  if (o.selected) {
    const c = C.cream, e = s + 3;
    rect(ctx, x - 3, y - 3, 4, 1, c); rect(ctx, x - 3, y - 3, 1, 4, c);
    rect(ctx, x + e - 3, y - 3, 4, 1, c); rect(ctx, x + e, y - 3, 1, 4, c);
    rect(ctx, x - 3, y + e, 4, 1, c); rect(ctx, x - 3, y + e - 3, 1, 4, c);
    rect(ctx, x + e - 3, y + e, 4, 1, c); rect(ctx, x + e, y + e - 3, 1, 4, c);
  }
}

// pip layouts for the small tumbling finisher die
const PIPS = [[[1, 1]], [[0, 0], [2, 2]], [[0, 0], [1, 1], [2, 2]], [[0, 0], [2, 0], [0, 2], [2, 2]], [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]]];

export interface FinFx { x: number; y: number; t: number; face: FinFace; seed: number }

/** Finisher die: tumbles for a beat above the target, then shows its face. */
export function drawFinFx(ctx: Ctx, fx: FinFx, camX: number, camY: number) {
  const landed = fx.t > 0.28;
  const rise = Math.min(fx.t, 0.28) * 30 + Math.max(0, fx.t - 0.6) * 12;
  const x = Math.round(fx.x - camX - 5), y = Math.round(fx.y - camY - rise);
  const a = clamp(1.25 - fx.t, 0, 1);
  ctx.globalAlpha = a;
  const bounce = landed ? 0 : Math.round(Math.abs(Math.sin(fx.t * 40)) * -2);
  rect(ctx, x, y + bounce, 11, 11, C.ink);
  rect(ctx, x + 1, y + 1 + bounce, 9, 9, landed && fx.face !== "blank" ? FIN[fx.face].color : BONE);
  const pips = PIPS[landed ? (fx.face === "blank" ? 0 : 5) : Math.floor(fx.t * 30 + fx.seed) % 6];
  if (!landed || fx.face === "blank") for (const [px, py] of pips) rect(ctx, x + 2 + px * 3, y + 2 + py * 3 + bounce, 1, 1, C.ink);
  else rect(ctx, x + 3, y + 3, 5, 5, C.ink);
  if (landed) {
    const f = FIN[fx.face];
    const pop = fx.t < 0.36 ? 2 : 1;
    drawText(ctx, f.label, x + 5, y - 8 - (pop - 1) * 5, f.color, { align: "center", scale: pop });
  }
  ctx.globalAlpha = 1;
}

// ======================================================================= Hearth Dice screen
const TABS = ["ROLL", "INSCRIBE"];

export class DiceMenu implements Overlay {
  tab = 0;
  faces: FaceId[];
  locked = [false, false, false];
  rerolls = DICE_REROLLS;
  tumble = [0, 0, 0];
  shown: FaceId[];
  cursor = 4;
  /** Inscribe tab: which face cell (0..17) and, when choosing a rune, which rune. */
  cell = 0;
  picking = false;
  runeIdx = 0;
  msg = ""; msgT = 0;
  readonly session: boolean;

  constructor(g: Game, charged: boolean) {
    this.session = charged;
    this.rerolls = g.stats.rerolls;
    const cur = g.save.diceRoll.length === 3 ? g.save.diceRoll : (["blank", "blank", "blank"] as FaceId[]);
    this.faces = [...cur];
    this.shown = [...cur];
    if (charged) { this.throw(g, [0, 1, 2]); this.cursor = 4; }
  }

  private throw(g: Game, which: number[]) {
    for (const i of which) {
      this.faces[i] = rollDie(g.save.dice[i]);
      this.tumble[i] = 0.45 + i * 0.18;
    }
    audio.play("dice");
  }

  private get tumbling() { return this.tumble.some((t) => t > 0); }

  update(g: Game, dt: number) {
    const inp = g.input;
    this.msgT = Math.max(0, this.msgT - dt);
    for (let i = 0; i < 3; i++) {
      if (this.tumble[i] <= 0) continue;
      this.tumble[i] -= dt;
      if (Math.floor((this.tumble[i] + dt) * 16) !== Math.floor(this.tumble[i] * 16)) this.shown[i] = rng.pick(g.save.dice[i]);
      if (this.tumble[i] <= 0) {
        this.tumble[i] = 0; this.shown[i] = this.faces[i];
        audio.play("diceLand");
        if (!this.tumbling) this.announce();
      }
    }
    if (this.tumbling) return;
    if (inp.pressed("tabL") || inp.pressed("tabR")) { this.tab = 1 - this.tab; this.picking = false; audio.play("move"); return; }
    if (this.tab === 0) this.updateRoll(g);
    else this.updateInscribe(g);
  }

  private announce() {
    const b = diceBonus(this.faces);
    if (b.perks.length) audio.loot(4);
    else if (b.combos.length) audio.loot(2);
  }

  private updateRoll(g: Game) {
    const inp = g.input;
    if (!this.session) {
      if (inp.pressed("cancel") || inp.pressed("confirm") || inp.pressed("menu")) { audio.play("close"); g.closeOverlay(); }
      return;
    }
    const prev = this.cursor;
    if (inp.pressed("left")) this.cursor = this.cursor === 4 ? 3 : Math.max(0, this.cursor - 1);
    if (inp.pressed("right")) this.cursor = this.cursor === 3 ? 4 : Math.min(this.cursor < 3 ? 2 : 4, this.cursor + 1);
    if (inp.pressed("down") && this.cursor < 3) this.cursor = this.rerolls > 0 ? 3 : 4;
    if (inp.pressed("up") && this.cursor >= 3) this.cursor = 1;
    if (this.cursor !== prev) audio.play("move");
    if (inp.pressed("cancel")) { this.accept(g); return; }
    if (!inp.pressed("confirm")) return;
    if (this.cursor < 3) {
      if (this.rerolls <= 0) { audio.play("deny"); this.say("No rerolls left. Accept the roll."); return; }
      this.locked[this.cursor] = !this.locked[this.cursor];
      audio.play(this.locked[this.cursor] ? "select" : "move");
    } else if (this.cursor === 3) {
      const free = [0, 1, 2].filter((i) => !this.locked[i]);
      if (this.rerolls <= 0) { audio.play("deny"); this.say("No rerolls left."); }
      else if (!free.length) { audio.play("deny"); this.say("Every die is locked. Unlock one to reroll it."); }
      else { this.rerolls--; this.throw(g, free); if (this.rerolls === 0) this.cursor = 4; }
    } else this.accept(g);
  }

  private accept(g: Game) {
    const s = g.save;
    s.diceRoll = [...this.faces];
    s.diceCharge = 0;
    s.secondWindUsed = false;
    const b = diceBonus(this.faces);
    g.onGearChanged();
    g.player.tonics = s.tonicMax + g.stats.tonicBonus;
    if (b.perks.includes("nothing")) { s.bank += 60; }
    if (b.perks.length) s.flags.triple = true;
    const names = this.faces.map((f) => FACES[f].name).join(", ");
    g.chat.push(`The Hearth Dice show: ${names}.`, C.cream);
    if (b.combos.length) g.chat.push(`${b.combos.join(" + ")}!`, C.gold2);
    if (!s.flags.diceHint) { s.flags.diceHint = true; g.chat.push(`Slay ${DICE_CHARGE} foes to charge the dice again.`, C.dim); }
    audio.play("shrine");
    g.persist();
    g.closeOverlay();
  }

  private runeList(g: Game): FaceId[] {
    return (Object.keys(FACES) as FaceId[]).filter((f) => (g.save.runes[f] ?? 0) > 0);
  }

  private updateInscribe(g: Game) {
    const inp = g.input, s = g.save;
    const runes = this.runeList(g);
    if (this.picking) {
      if (inp.pressed("up") && this.runeIdx > 0) { this.runeIdx--; audio.play("move"); }
      if (inp.pressed("down") && this.runeIdx < runes.length - 1) { this.runeIdx++; audio.play("move"); }
      if (inp.pressed("cancel")) { this.picking = false; audio.play("close"); return; }
      if (inp.pressed("confirm") && runes[this.runeIdx]) {
        const rune = runes[this.runeIdx];
        const d = Math.floor(this.cell / 6), f = this.cell % 6;
        const old = s.dice[d][f];
        s.dice[d][f] = rune;
        s.runes[rune] = (s.runes[rune] ?? 0) - 1;
        if (old !== "blank") s.runes[old] = (s.runes[old] ?? 0) + 1;
        audio.play("forge");
        this.say(`${FACES[rune].name} inscribed on die ${d + 1}.${old !== "blank" ? ` ${FACES[old].name} returns to your runes.` : ""}`);
        this.picking = false;
        g.persist();
      }
      return;
    }
    const prev = this.cell;
    if (inp.pressed("left") && this.cell % 6 > 0) this.cell--;
    if (inp.pressed("right") && this.cell % 6 < 5) this.cell++;
    if (inp.pressed("up") && this.cell >= 6) this.cell -= 6;
    if (inp.pressed("down") && this.cell < 12) this.cell += 6;
    if (this.cell !== prev) audio.play("move");
    if (inp.pressed("cancel") || inp.pressed("menu")) {
      if (this.session) { this.tab = 0; audio.play("move"); } else { audio.play("close"); g.closeOverlay(); }
      return;
    }
    if (inp.pressed("confirm")) {
      if (!runes.length) { audio.play("deny"); this.say("You have no runes. Foes drop them rarely; Wick more often."); }
      else { this.picking = true; this.runeIdx = 0; audio.play("select"); }
    }
  }

  private say(m: string) { this.msg = m; this.msgT = 3; }

  draw(g: Game, ctx: Ctx) {
    const s = g.save;
    panel(ctx, 6, 6, 372, 204, 0.96);
    drawText(ctx, "HEARTH DICE", 14, 12, C.fire2);
    TABS.forEach((t, i) => {
      const x = 110 + i * 60, sel = i === this.tab;
      drawText(ctx, t, x, 12, sel ? C.cream : C.faint);
      if (sel) rect(ctx, x, 19, textWidth(t), 1, C.gold2);
    });
    const charged = s.diceCharge >= DICE_CHARGE;
    const chargeText = this.session ? "ROLLING" : charged ? "CHARGED - REST TO ROLL" : `CHARGE ${s.diceCharge}/${DICE_CHARGE} FOES`;
    drawText(ctx, chargeText, 370, 12, charged || this.session ? C.gold2 : C.dim, { align: "right" });
    rect(ctx, 10, 23, 364, 1, C.border);
    if (this.tab === 0) this.drawRoll(g, ctx);
    else this.drawInscribe(g, ctx);
    if (this.msgT > 0) {
      ctx.globalAlpha = Math.min(1, this.msgT * 2);
      drawText(ctx, this.msg, 14, 199, C.cream);
      ctx.globalAlpha = 1;
    }
  }

  private drawRoll(g: Game, ctx: Ctx) {
    const s = g.save;
    const baseX = 26, y0 = 44;
    for (let i = 0; i < 3; i++) {
      const x = baseX + i * 52;
      const bounce = this.tumble[i] > 0 ? Math.round(-Math.abs(Math.sin(this.tumble[i] * 22)) * 6) : 0;
      drawDie(ctx, x, y0 + bounce, 34, this.shown[i], { locked: this.locked[i], selected: this.session && this.cursor === i && !this.tumbling });
      const label = this.tumble[i] > 0 ? "..." : this.locked[i] ? "LOCKED" : FACES[this.faces[i]].name.toUpperCase();
      drawText(ctx, label, x + 17, y0 + 42, this.locked[i] ? C.gold2 : C.dim, { align: "center" });
    }
    if (this.session) {
      const btn = (x: number, label: string, on: boolean, sel: boolean) => {
        const w = textWidth(label) + 14;
        panel(ctx, x, 110, w, 13, 0.9);
        if (sel) { rect(ctx, x + 1, 111, w - 2, 11, C.panelHi); rect(ctx, x + 1, 111, 1, 11, C.gold2); }
        drawText(ctx, label, x + 7, 114, on ? (sel ? C.cream : C.dim) : C.faint);
        return w;
      };
      const w = btn(26, `REROLL (${this.rerolls})`, this.rerolls > 0, this.cursor === 3 && !this.tumbling);
      btn(26 + w + 8, "ACCEPT", true, this.cursor === 4 && !this.tumbling);
      wrap("Lock the dice you like, reroll the rest. Your buffs last until the next roll, even through death.", 150).forEach((l, i) => drawText(ctx, l, 26, 134 + i * 8, C.faint));
    } else {
      const lines = s.diceRoll.length ? "Your current roll. Slay foes to charge the dice, then rest at any Hearthstone to roll again." : "Slay foes to charge the dice, then rest at any Hearthstone to roll.";
      wrap(lines, 150).forEach((l, i) => drawText(ctx, l, 26, 110 + i * 8, C.faint));
      const pct = clamp(s.diceCharge / DICE_CHARGE, 0, 1);
      rect(ctx, 26, 140, 150, 3, C.inkSoft); rect(ctx, 26, 140, Math.round(150 * pct), 3, C.gold2);
    }
    // effects of the showing roll
    const px = 200;
    panel(ctx, px, 30, 172, 164, 0.85);
    drawText(ctx, this.tumbling ? "ROLLING..." : "THIS ROLL GIVES", px + 8, 37, C.dim);
    if (!this.tumbling) {
      const b = diceBonus(this.faces);
      let y = 50;
      if (b.combos.length) {
        for (const c of b.combos) { drawText(ctx, c.toUpperCase(), px + 8, y, C.gold2); y += 10; }
        y += 2;
      }
      const lines = bonusLines(b);
      if (!lines.length) drawText(ctx, "Nothing this time.", px + 8, y, C.faint);
      for (const l of lines) for (const w of wrap(l, 156)) { drawText(ctx, w, px + 8, y, l.startsWith("Foes") ? C.bad : C.cream); y += 9; }
      const tipY = 160;
      wrap("Pairs count as 2.5 faces. Triples as 4.5, plus a named bonus.", 156).forEach((l, i) => drawText(ctx, l, px + 8, tipY + i * 8, C.faint));
    }
    if (this.session) hint(ctx, 370, 199, [["J", "LOCK / PICK"], ["ESC", "ACCEPT"]], "right");
    else hint(ctx, 370, 199, [["Q/E", "INSCRIBE"], ["ESC", "CLOSE"]], "right");
  }

  private drawInscribe(g: Game, ctx: Ctx) {
    const s = g.save;
    for (let d = 0; d < 3; d++) {
      const y = 36 + d * 26;
      drawText(ctx, `DIE ${d + 1}`, 14, y + 5, C.dim);
      for (let f = 0; f < 6; f++) drawDie(ctx, 50 + f * 21, y, 18, s.dice[d][f], { selected: this.cell === d * 6 + f && !this.picking });
    }
    const face = s.dice[Math.floor(this.cell / 6)][this.cell % 6];
    drawText(ctx, `${FACES[face].name.toUpperCase()}: ${FACES[face].text}`, 14, 118, FACES[face].color);
    wrap("Pick a face, then a rune to inscribe over it. A replaced face goes back to your runes, unless it was blank.", 170).forEach((l, i) => drawText(ctx, l, 14, 132 + i * 8, C.faint));
    const runes = this.runeList(g);
    const px = 200;
    panel(ctx, px, 30, 172, 164, 0.85);
    drawText(ctx, this.picking ? "CHOOSE A RUNE" : "YOUR RUNES", px + 8, 37, this.picking ? C.gold2 : C.dim);
    if (!runes.length) wrap("None yet. Foes drop runes rarely (1/150, husks 1/60). Wick drops one 1 time in 5.", 156).forEach((l, i) => drawText(ctx, l, px + 8, 52 + i * 8, C.faint));
    runes.forEach((r, i) => {
      const y = 50 + i * 13;
      const sel = this.picking && i === this.runeIdx;
      if (sel) { rect(ctx, px + 4, y - 1, 164, 13, C.panelHi); rect(ctx, px + 4, y - 1, 1, 13, C.gold2); }
      drawDie(ctx, px + 8, y - 1, 12, r);
      drawText(ctx, FACES[r].name.toUpperCase(), px + 26, y + 3, sel ? C.cream : C.dim);
      drawText(ctx, `x${s.runes[r]}`, px + 164, y + 3, C.dim, { align: "right" });
    });
    const focus = runes[this.picking ? this.runeIdx : 0];
    if (focus) wrap(FACES[focus].text, 156).forEach((l, i) => drawText(ctx, l, px + 8, 172 + i * 8, FACES[focus].color));
    hint(ctx, 370, 199, this.picking ? [["J", "INSCRIBE"], ["ESC", "BACK"]] : [["J", "CHOOSE FACE"], ["Q/E", "ROLL TAB"]], "right");
  }
}
