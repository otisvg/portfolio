import { audio } from "../core/audio";
import { H, W } from "../core/constants";
import { clamp } from "../core/math";
import { rect, type Ctx } from "../gfx/canvas";
import { drawText, textWidth, wrap } from "../gfx/font";
import { C } from "../gfx/palette";
import type { Game } from "../game";
import { hasSave } from "../systems/save";
import { InventoryMenu, type Overlay } from "./menu";
import { hint, panel } from "./widgets";

// ======================================================================= Banners
export interface Banner { title: string; sub: string; t: number; dur: number; color: string; big: boolean; region?: boolean }

export function drawBanner(ctx: Ctx, b: Banner) {
  const fadeIn = clamp(b.t / 0.6, 0, 1), fadeOut = clamp((b.dur - b.t) / 0.8, 0, 1);
  const a = Math.min(fadeIn, fadeOut);
  if (a <= 0) return;
  const y = b.big ? 84 : 52;
  ctx.globalAlpha = a * 0.75;
  // a soft dark band behind the text
  for (let yy = -14; yy <= 22; yy++) {
    const k = 1 - Math.abs(yy - 4) / 20;
    ctx.globalAlpha = a * 0.6 * k;
    rect(ctx, 0, y + yy, W, 1, C.black);
  }
  ctx.globalAlpha = a;
  const spacing = Math.round(1 + fadeIn * 2);
  drawText(ctx, b.title, W / 2, y, b.color, { align: "center", scale: 2, spacing });
  const lw = Math.round((textWidth(b.title) * 2 + b.title.length * spacing * 2) * 0.55 * fadeIn);
  rect(ctx, Math.round(W / 2 - lw), y + 14, lw * 2, 1, b.color);
  if (b.sub) drawText(ctx, b.sub, W / 2, y + 18, C.dim, { align: "center" });
  ctx.globalAlpha = 1;
}

// ======================================================================= Title
export class TitleScreen {
  sel = 0;
  t = 0;
  confirmNew = false;
  options(): string[] {
    return hasSave() ? ["CONTINUE", this.confirmNew ? "ERASE SAVE & START?" : "NEW GAME", "SOUND"] : ["NEW GAME", "SOUND"];
  }
  update(g: Game, dt: number) {
    this.t += dt;
    const inp = g.input, opts = this.options();
    if (inp.pressed("up")) { this.sel = (this.sel + opts.length - 1) % opts.length; this.confirmNew = false; audio.play("move"); }
    if (inp.pressed("down")) { this.sel = (this.sel + 1) % opts.length; this.confirmNew = false; audio.play("move"); }
    if (inp.pressed("confirm") || inp.pressed("interact")) {
      const o = opts[this.sel];
      if (o === "CONTINUE") { audio.play("select"); g.startGame(false); }
      else if (o === "NEW GAME" && hasSave()) { this.confirmNew = true; audio.play("deny"); }
      else if (o === "NEW GAME" || o.startsWith("ERASE")) { audio.play("select"); g.startGame(true); }
      else if (o === "SOUND") { audio.toggleMute(); audio.play("select"); }
    }
  }
  draw(g: Game, ctx: Ctx) {
    const a = clamp(this.t / 1.2, 0, 1);
    ctx.globalAlpha = 0.45;
    rect(ctx, 0, 0, W, H, C.black);
    ctx.globalAlpha = a;
    // title with a warm under-glow
    const ty = 44;
    drawText(ctx, "HOLLOWMERE", W / 2 + 1, ty + 2, C.scarf0, { align: "center", scale: 4, spacing: 1, shadow: null });
    drawText(ctx, "HOLLOWMERE", W / 2, ty, C.cream, { align: "center", scale: 4, spacing: 1, shadow: C.ink });
    rect(ctx, W / 2 - 90, ty + 26, 180, 1, C.gold1);
    drawText(ctx, "LEVEL 1  -  THE BLIGHTED OUTSKIRTS", W / 2, ty + 32, C.gold2, { align: "center" });
    const opts = this.options();
    opts.forEach((o, i) => {
      const y = 118 + i * 14;
      const sel = i === this.sel;
      const label = o === "SOUND" ? `SOUND: ${audio.muted ? "OFF" : "ON"}` : o;
      if (sel) {
        const w = textWidth(label) + 16;
        panel(ctx, W / 2 - w / 2, y - 4, w, 13, 0.8);
        drawText(ctx, ">", W / 2 - w / 2 + 3 + (Math.floor(this.t * 3) % 2), y, C.gold2);
      }
      drawText(ctx, label, W / 2, y, sel ? C.cream : C.dim, { align: "center" });
    });
    drawText(ctx, "A PIXEL ACTION RPG", W / 2, H - 22, C.faint, { align: "center" });
    drawText(ctx, g.input.usingPad ? "A TO SELECT" : "ENTER / SPACE TO SELECT", W / 2, H - 13, C.faint, { align: "center" });
    ctx.globalAlpha = 1;
  }
}

// ======================================================================= Intro crawl
const INTRO = [
  "Hollowmere was a kind village.\nGood bread. Better ale.",
  "Then the old scarecrow in Miller's Field\nclimbed down from his post.",
  "Now the Rot creeps in from the fields,\nand the Hearth burns lower every night.",
  "You are no hero.\n\nBut you are here.",
];

export class IntroScreen {
  i = 0; t = 0;
  update(g: Game, dt: number) {
    this.t += dt;
    const inp = g.input;
    if (inp.pressed("cancel") || inp.pressed("pause")) { g.finishIntro(); return; }
    if (inp.pressed("confirm") || inp.pressed("interact") || this.t > 5.5) {
      if (this.t < 0.6) { this.t = 0.6; return; }
      this.i++; this.t = 0;
      if (this.i >= INTRO.length) g.finishIntro();
    }
  }
  draw(_g: Game, ctx: Ctx) {
    rect(ctx, 0, 0, W, H, C.black);
    const text = INTRO[Math.min(this.i, INTRO.length - 1)];
    const a = Math.min(clamp(this.t / 0.8, 0, 1), clamp((5.5 - this.t) / 0.6, 0, 1));
    ctx.globalAlpha = a;
    const lines = text.split("\n");
    lines.forEach((l, k) => drawText(ctx, l, W / 2, H / 2 - lines.length * 6 + k * 12, C.cream, { align: "center" }));
    ctx.globalAlpha = 1;
    // embers drifting up
    for (let k = 0; k < 18; k++) {
      const x = (k * 53 + Math.sin(this.t + k) * 10 + 400) % W;
      const y = H - ((this.t * (12 + (k % 5) * 4) + k * 37) % H);
      rect(ctx, Math.round(x), Math.round(y), 1, 1, k % 3 ? C.fire1 : C.fire2);
    }
    drawText(ctx, "ESC TO SKIP", W - 8, H - 12, C.faint, { align: "right" });
  }
}

// ======================================================================= Rest / travel
export class RestMenu implements Overlay {
  sel = 0; t = 0;
  constructor(private here: string) { }
  update(g: Game, dt: number) {
    this.t += dt;
    const inp = g.input;
    const opts = this.options(g);
    if (inp.pressed("up") && this.sel > 0) { this.sel--; audio.play("move"); }
    if (inp.pressed("down") && this.sel < opts.length - 1) { this.sel++; audio.play("move"); }
    if (inp.pressed("menu")) { g.openOverlay(new InventoryMenu()); return; }
    if (inp.pressed("cancel")) { this.leave(g); return; }
    if (inp.pressed("confirm") || inp.pressed("interact")) {
      const o = opts[this.sel];
      if (o.id === "rise") this.leave(g);
      else if (o.id === "gear") g.openOverlay(new InventoryMenu());
      else if (o.id !== this.here) { audio.play("fog"); g.travelTo(o.id); }
      else audio.play("deny");
    }
  }
  private leave(g: Game) { audio.play("close"); g.closeOverlay(); g.player.state = "normal"; }
  options(g: Game) {
    const out: { id: string; label: string }[] = [];
    for (const sh of g.level.shrines) if (g.save.shrines.includes(sh.id)) out.push({ id: sh.id, label: sh.name.toUpperCase() });
    out.push({ id: "gear", label: "GEAR & SKILLS" });
    out.push({ id: "rise", label: "RISE" });
    return out;
  }
  draw(g: Game, ctx: Ctx) {
    const opts = this.options(g);
    const h = 40 + opts.length * 13;
    const x = W / 2 - 80, y = 36;
    panel(ctx, x, y, 160, h, 0.94);
    drawText(ctx, "THE HEARTH BURNS", W / 2, y + 7, C.fire2, { align: "center" });
    drawText(ctx, "Health and tonics restored. Foes revived.", W / 2, y + 17, C.faint, { align: "center" });
    rect(ctx, x + 8, y + 27, 144, 1, C.border);
    drawText(ctx, "TRAVEL", x + 10, y + 31, C.faint);
    opts.forEach((o, i) => {
      const yy = y + 42 + i * 13 - (o.id === "gear" || o.id === "rise" ? 0 : 0);
      const sel = i === this.sel, here = o.id === this.here;
      if (sel) { rect(ctx, x + 6, yy - 3, 148, 11, C.panelHi); rect(ctx, x + 6, yy - 3, 1, 11, C.gold2); }
      drawText(ctx, o.label + (here ? "  (HERE)" : ""), x + 12, yy, here ? C.faint : sel ? C.cream : C.dim);
    });
    hint(ctx, W / 2, y + h + 6, [["J", "SELECT"], ["ESC", "RISE"]], "center");
  }
}

// ======================================================================= Pause
export class PauseMenu implements Overlay {
  sel = 0;
  opts = ["RESUME", "INVENTORY", "CONTROLS", "SOUND", "SAVE & QUIT TO TITLE"];
  update(g: Game) {
    const inp = g.input;
    if (inp.pressed("up") && this.sel > 0) { this.sel--; audio.play("move"); }
    if (inp.pressed("down") && this.sel < this.opts.length - 1) { this.sel++; audio.play("move"); }
    if (inp.pressed("pause") || inp.pressed("cancel")) { audio.play("close"); g.closeOverlay(); return; }
    if (inp.pressed("confirm")) {
      const o = this.opts[this.sel];
      if (o === "RESUME") { audio.play("close"); g.closeOverlay(); }
      else if (o === "INVENTORY") { g.openOverlay(new InventoryMenu(0)); }
      else if (o === "CONTROLS") { g.openOverlay(new InventoryMenu(3)); }
      else if (o === "SOUND") { audio.toggleMute(); audio.play("select"); }
      else { g.persist(); g.toTitle(); }
    }
  }
  draw(_g: Game, ctx: Ctx) {
    ctx.globalAlpha = 0.5; rect(ctx, 0, 0, W, H, C.black); ctx.globalAlpha = 1;
    const x = W / 2 - 70, y = 60;
    panel(ctx, x, y, 140, 88, 0.95);
    drawText(ctx, "PAUSED", W / 2, y + 7, C.cream, { align: "center", scale: 2 });
    this.opts.forEach((o, i) => {
      const yy = y + 26 + i * 12, sel = i === this.sel;
      const label = o === "SOUND" ? `SOUND: ${audio.muted ? "OFF" : "ON"}` : o;
      if (sel) { rect(ctx, x + 6, yy - 3, 128, 11, C.panelHi); rect(ctx, x + 6, yy - 3, 1, 11, C.gold2); }
      drawText(ctx, label, W / 2, yy, sel ? C.cream : C.dim, { align: "center" });
    });
  }
}

// ======================================================================= Death
export function drawDeath(ctx: Ctx, t: number, lostPurse: boolean) {
  const a = clamp(t / 1.2, 0, 1);
  ctx.globalAlpha = a * 0.75;
  rect(ctx, 0, 0, W, H, "#0a0205");
  for (let yy = -16; yy <= 16; yy++) {
    ctx.globalAlpha = a * 0.7 * (1 - Math.abs(yy) / 17);
    rect(ctx, 0, H / 2 - 8 + yy, W, 1, "#1a0508");
  }
  ctx.globalAlpha = clamp((t - 0.3) / 1.2, 0, 1);
  const sp = Math.round(1 + Math.min(t, 2) * 0.6);
  drawText(ctx, "YOU PERISHED", W / 2, H / 2 - 13, "#b02a2a", { align: "center", scale: 3, spacing: sp, shadow: "#2a0508" });
  ctx.globalAlpha = clamp((t - 1.4) / 0.8, 0, 1);
  const sub = lostPurse ? "Your purse lies where you fell. Fetch it before you fall again." : "The Hearth calls you back.";
  wrap(sub, 300).forEach((l, i) => drawText(ctx, l, W / 2, H / 2 + 20 + i * 9, C.dim, { align: "center" }));
  ctx.globalAlpha = 1;
}
