import { H, W } from "../core/constants";
import { clamp } from "../core/math";
import { rect, type Ctx } from "../gfx/canvas";
import { drawText, textWidth } from "../gfx/font";
import { drawIcon } from "../gfx/icons";
import { C } from "../gfx/palette";
import type { Game } from "../game";
import { POSTURE_MAX } from "../entities/bossBase";
import { BEACON_EMBERS } from "../systems/crafting";
import { taskName } from "../systems/slayer";
import { describe } from "../systems/bounties";
import { DICE_CHARGE } from "../systems/dice";
import { drawDie } from "./dice";
import { bar, panel } from "./widgets";

export interface XpDrop { text: string; color: string; t: number; icon: string }
export interface Floater { text: string; x: number; y: number; vy: number; t: number; color: string; big: boolean }

export function drawHud(g: Game, ctx: Ctx) {
  const p = g.player, s = g.stats;
  // HP & stamina (bars grow with max values, Souls-style)
  const hpW = Math.round(clamp(s.maxHp * 0.85, 70, 170));
  const stW = Math.round(clamp(s.maxStam * 0.7, 60, 130));
  drawIcon(ctx, "heart", 5, 4);
  bar(ctx, 19, 7, hpW, 5, p.hp / s.maxHp, C.hp, C.hpDark, p.hpTrail / s.maxHp);
  drawText(ctx, `${Math.ceil(p.hp)}`, 19 + hpW + 4, 7, C.cream);
  const stCol = p.winded ? (Math.floor(g.time * 6) % 2 ? "#a8743a" : "#7a5230") : p.stam < 16 ? "#bfa35a" : C.stam;
  bar(ctx, 19, 15, stW, 3, Math.max(0, p.stam) / s.maxStam, stCol, C.stamDark);
  if (g.stamFlash > 0) { ctx.globalAlpha = Math.min(1, g.stamFlash * 4); rect(ctx, 18, 14, stW + 2, 1, C.bad); rect(ctx, 18, 18, stW + 2, 1, C.bad); ctx.globalAlpha = 1; }
  // tonic flask charges
  drawIcon(ctx, "tonic", 5, 20);
  const tMax = g.save.tonicMax + s.tonicBonus;
  for (let i = 0; i < tMax; i++) rect(ctx, 19 + i * 5, 25, 4, 4, i < p.tonics ? (i >= g.save.tonicMax ? C.scarf2 : C.hp) : C.hpDark);
  if (g.healFlash > 0) { ctx.globalAlpha = g.healFlash; rect(ctx, 19, 25, tMax * 5, 4, C.cream); ctx.globalAlpha = 1; }

  // Hearth Dice: current faces and charge
  const roll = g.save.diceRoll;
  for (let i = 0; i < 3; i++) drawDie(ctx, 5 + i * 16, 34, 14, roll[i] ?? null, { dim: !roll.length });
  const charged = g.save.diceCharge >= DICE_CHARGE;
  if (charged) {
    if (Math.floor(g.time * 2.5) % 2 === 0) drawText(ctx, "ROLL AT A HEARTH", 55, 39, C.gold2);
  } else {
    rect(ctx, 54, 39, 32, 5, C.ink);
    rect(ctx, 55, 40, 30, 3, C.border);
    rect(ctx, 55, 40, Math.round((30 * g.save.diceCharge) / DICE_CHARGE), 3, C.gold1);
    drawText(ctx, `${g.save.diceCharge}/${DICE_CHARGE}`, 90, 39, C.dim);
  }

  // pinned bounty
  const b = g.save.bounties.find((x) => !x.done) ?? (g.save.daily && !g.save.daily.done ? g.save.daily : undefined);
  if (g.banner) { /* keep the top clear while a title card shows */ }
  else if (b) {
    drawText(ctx, "\u2022", 6, 53, C.gold2);
    drawText(ctx, `${describe(b)}  ${b.have}/${b.need}`, 12, 53, C.dim);
  } else if (g.save.bounties.length) drawText(ctx, "Bounties done. Rest for new notices.", 6, 53, C.faint);
  const st = g.save.slayerTask;
  if (st && !g.banner) {
    const done = st.have >= st.need;
    drawIcon(ctx, "skull", 3, 57);
    drawText(ctx, done ? "Task complete. See Old Tam." : `${taskName(st.target)}  ${st.have}/${st.need}`, 17, 61, done ? C.good : "#b9a8d0");
  }

  // gold (carried) and shards, top right
  let y = 5;
  const gold = `${g.save.gold}`;
  drawText(ctx, gold, W - 20, y + 3, C.gold2, { align: "right" });
  drawIcon(ctx, "coin", W - 17, y);
  if (g.save.shards > 0) {
    y += 13;
    drawText(ctx, `${g.save.shards}`, W - 20, y + 3, C.blight5, { align: "right" });
    drawIcon(ctx, "shard", W - 17, y);
  }
  const embers = g.save.mats.ember ?? 0;
  if (embers > 0 && !g.save.flags.minesOpen) {
    y += 13;
    drawText(ctx, `${Math.min(embers, BEACON_EMBERS)}/${BEACON_EMBERS}`, W - 20, y + 3, C.fire1, { align: "right" });
    drawIcon(ctx, "ember", W - 17, y);
  }
  // OSRS-style XP drops
  for (const d of g.xpDrops) {
    const a = clamp(2.2 - d.t * 1.1, 0, 1);
    const dy = Math.round(64 - d.t * 12);
    ctx.globalAlpha = a;
    const w = textWidth(d.text);
    drawText(ctx, d.text, W - 8, dy, d.color, { align: "right" });
    drawIcon(ctx, d.icon, W - 22 - w, dy - 3);
    ctx.globalAlpha = 1;
  }

  // boss bar
  const boss = g.boss;
  if (boss && g.bossActive) {
    const bw = 240, bx = (W - bw) / 2, by = H - 22;
    drawText(ctx, boss.label.toUpperCase(), bx, by - 9, C.cream, { spacing: 1 });
    bar(ctx, bx, by, bw, 4, Math.max(0, boss.hp) / boss.maxHp, boss.phase === 2 ? "#9a3aa0" : "#a8323a", "#2a1020", g.bossTrail / boss.maxHp, "#e0b060");
    // posture: fills from the centre outward, Sekiro-style
    const pw = Math.round((bw / 2) * (boss.posture / POSTURE_MAX));
    if (pw > 0) {
      const full = boss.mode === "kneel";
      rect(ctx, bx + bw / 2 - pw - 1, by + 6, pw * 2 + 2, 4, C.ink);
      rect(ctx, bx + bw / 2 - pw, by + 7, pw * 2, 2, full ? C.gold3 : C.gold1);
    }
  }

  // chatbox
  const lines = g.chat.lines;
  if (lines.length) {
    const baseY = H - (g.bossActive ? 44 : 12);
    const recent = lines.slice(-3);
    const maxA = Math.max(...recent.map((l) => clamp(7 - l.t, 0, 1)));
    if (maxA > 0.02) {
      const w = Math.min(250, Math.max(...recent.map((l) => textWidth(l.text))) + 10);
      ctx.globalAlpha = 0.55 * maxA;
      rect(ctx, 4, baseY - recent.length * 8 - 3, w, recent.length * 8 + 4, C.panel);
      ctx.globalAlpha = 1;
    }
    recent.forEach((l, i) => {
      const a = clamp(7 - l.t, 0, 1);
      if (a <= 0) return;
      ctx.globalAlpha = a;
      drawText(ctx, l.text, 8, baseY - (recent.length - i) * 8, l.color);
      ctx.globalAlpha = 1;
    });
  }

  // interaction prompt
  if (g.prompt) {
    const { x, y, text } = g.prompt;
    const key = g.input.usingPad ? "↑" : "E";
    const label = `${key}  ${text}`;
    const w = textWidth(label) + 10;
    const px = Math.round(clamp(x - w / 2, 2, W - w - 2)), py = Math.round(y - 14 + Math.sin(g.time * 4) * 1);
    panel(ctx, px, py, w, 11, 0.9);
    rect(ctx, px + 3, py + 2, textWidth(key) + 4, 7, C.cream);
    drawText(ctx, key, px + 5, py + 3, C.ink, { shadow: null });
    drawText(ctx, text, px + textWidth(key) + 10, py + 3, C.cream);
  }
}

export function drawFloaters(g: Game, ctx: Ctx, camX: number, camY: number) {
  for (const f of g.floaters) {
    const a = clamp(1.2 - f.t * 1.4, 0, 1);
    ctx.globalAlpha = a;
    const pop = f.big && f.t < 0.1 ? 2 : 1;
    drawText(ctx, f.text, f.x - camX, f.y - camY, f.color, { align: "center", scale: pop });
    ctx.globalAlpha = 1;
  }
}
