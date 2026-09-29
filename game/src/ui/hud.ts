import { H, W } from "../core/constants";
import { clamp } from "../core/math";
import { rect, type Ctx } from "../gfx/canvas";
import { drawText, textWidth } from "../gfx/font";
import { drawIcon } from "../gfx/icons";
import { C } from "../gfx/palette";
import type { Game } from "../game";
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
  bar(ctx, 19, 15, stW, 3, Math.max(0, p.stam) / s.maxStam, p.stam < 15 ? "#bfa35a" : C.stam, C.stamDark);
  // tonic flask charges
  drawIcon(ctx, "tonic", 5, 20);
  for (let i = 0; i < g.save.tonicMax; i++) rect(ctx, 19 + i * 5, 25, 4, 4, i < p.tonics ? C.hp : C.hpDark);
  if (g.healFlash > 0) { ctx.globalAlpha = g.healFlash; rect(ctx, 19, 25, g.save.tonicMax * 5, 4, C.cream); ctx.globalAlpha = 1; }

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
