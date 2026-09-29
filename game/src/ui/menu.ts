import { audio } from "../core/audio";
import { rect, type Ctx } from "../gfx/canvas";
import { drawText, textWidth, wrap } from "../gfx/font";
import { drawGhost, drawIcon } from "../gfx/icons";
import { C, RARITY } from "../gfx/palette";
import type { Game } from "../game";
import { baseOf, BASES, displayName, score, SLOTS, type Item, type Slot } from "../systems/items";
import { fmtRate, RARITY_WEIGHTS, TABLES } from "../systems/loot";
import { INV_SIZE } from "../systems/save";
import { combatLevel, levelForXp, SKILL_INFO, SKILLS, xpForLevel } from "../systems/skills";
import { bar, ellipsize, hint, itemLines, panel, slotBox } from "./widgets";

export interface Overlay {
  update(g: Game, dt: number): void;
  draw(g: Game, ctx: Ctx): void;
}

const TABS = ["GEAR", "SKILLS", "COLLECTION", "HELP"];
const SLOT_GHOST: Record<Slot, string> = { weapon: "sword", helm: "cap", body: "tunic", trinket: "ring" };
const COLS = 7;

/** Inventory navigation shared by the pack and the smith's sell tab. */
export function gridNav(g: Game, idx: number, cols: number, size: number) {
  const inp = g.input;
  let n = idx;
  if (inp.pressed("left") && idx % cols > 0) n--;
  if (inp.pressed("right") && idx % cols < cols - 1 && idx + 1 < size) n++;
  if (inp.pressed("up") && idx - cols >= 0) n -= cols;
  if (inp.pressed("down") && idx + cols < size) n += cols;
  if (n !== idx) audio.play("move");
  return n;
}

export class InventoryMenu implements Overlay {
  tab = 0;
  area: "eq" | "inv" = "inv";
  idx = 0;
  eq = 0;
  dropArm = -1;

  constructor(tab = 0) { this.tab = tab; }

  update(g: Game) {
    const inp = g.input;
    if (inp.pressed("menu") || inp.pressed("cancel") || inp.pressed("pause")) { audio.play("close"); g.closeOverlay(); return; }
    if (inp.pressed("tabL")) { this.tab = (this.tab + TABS.length - 1) % TABS.length; audio.play("move"); }
    if (inp.pressed("tabR")) { this.tab = (this.tab + 1) % TABS.length; audio.play("move"); }
    if (this.tab !== 0) return;
    const s = g.save;
    if (this.area === "inv") {
      if (inp.pressed("left") && this.idx % COLS === 0) { this.area = "eq"; this.eq = Math.min(3, Math.floor(this.idx / COLS)); audio.play("move"); this.dropArm = -1; return; }
      const n = gridNav(g, this.idx, COLS, INV_SIZE);
      if (n !== this.idx) { this.idx = n; this.dropArm = -1; }
      const it = s.inv[this.idx];
      if (inp.pressed("confirm") && it) {
        g.equipFromInv(this.idx);
      } else if (inp.pressed("drop") && it) {
        if (this.dropArm === this.idx) {
          s.inv[this.idx] = null; this.dropArm = -1;
          g.chat.push(`You discard the ${displayName(it)}.`, C.dim);
          audio.play("pot"); g.persist();
        } else { this.dropArm = this.idx; audio.play("deny"); }
      }
    } else {
      if (inp.pressed("up") && this.eq > 0) { this.eq--; audio.play("move"); }
      if (inp.pressed("down") && this.eq < 3) { this.eq++; audio.play("move"); }
      if (inp.pressed("right")) { this.area = "inv"; this.idx = this.eq * COLS; audio.play("move"); }
      if (inp.pressed("confirm")) g.unequip(SLOTS[this.eq]);
    }
  }

  draw(g: Game, ctx: Ctx) {
    panel(ctx, 6, 6, 372, 204, 0.96);
    TABS.forEach((t, i) => {
      const x = 14 + i * 64;
      const sel = i === this.tab;
      drawText(ctx, t, x, 12, sel ? C.cream : C.faint);
      if (sel) rect(ctx, x, 19, textWidth(t), 1, C.gold2);
    });
    drawText(ctx, "Q / E", 370, 12, C.faint, { align: "right" });
    rect(ctx, 10, 23, 364, 1, C.border);
    if (this.tab === 0) this.drawGear(g, ctx);
    else if (this.tab === 1) drawSkills(g, ctx);
    else if (this.tab === 2) drawCollection(g, ctx);
    else drawHelp(ctx);
  }

  private drawGear(g: Game, ctx: Ctx) {
    const s = g.save, st = g.stats;
    drawText(ctx, "EQUIPPED", 14, 28, C.dim);
    SLOTS.forEach((slot, i) => {
      const y = 37 + i * 20;
      const it = s.eq[slot];
      slotBox(ctx, 14, y, it, this.area === "eq" && this.eq === i, SLOT_GHOST[slot]);
      if (it) {
        drawText(ctx, ellipsize(displayName(it), 100), 34, y + 2, RARITY[it.rarity].color);
        drawText(ctx, slot.toUpperCase(), 34, y + 10, C.faint);
      } else drawText(ctx, `NO ${slot.toUpperCase()}`, 34, y + 5, C.faint);
    });
    // derived stats
    const y0 = 120;
    const rows: [string, string][] = [
      ["HP", `${st.maxHp}`], ["STAM", `${st.maxStam}`],
      ["ARMR", `${st.armour}`], ["BLOCK", `${Math.round(st.dr * 100)}%`],
      ["DMG", `${Math.round(st.dmg[0] * st.dmgMult)}-${Math.round(st.dmg[1] * st.dmgMult)}`], ["CRIT", `${Math.round(st.crit * 100)}%`],
      ["SPEED", `${Math.round(st.atkSpeed * 100)}%`], ["GOLD", `+${st.goldFind}%`],
    ];
    rows.forEach(([k, v], i) => {
      const x = 14 + (i % 2) * 68, y = y0 + Math.floor(i / 2) * 9;
      drawText(ctx, k, x, y, C.faint);
      drawText(ctx, v, x + 58, y, C.cream, { align: "right" });
    });
    rect(ctx, 14, 160, 126, 1, C.border);
    drawIcon(ctx, "coin", 12, 165); drawText(ctx, `${s.gold}`, 26, 168, C.gold2);
    drawText(ctx, `BANK ${s.bank}`, 60, 168, C.gold1);
    drawIcon(ctx, "shard", 12, 179); drawText(ctx, `${s.shards} BLIGHT SHARDS`, 26, 182, C.blight5);
    drawText(ctx, `COMBAT LV ${combatLevel(st.levels)}`, 14, 196, C.dim);

    // pack
    const used = s.inv.filter(Boolean).length;
    drawText(ctx, `PACK  ${used}/${INV_SIZE}`, 148, 28, C.dim);
    for (let i = 0; i < INV_SIZE; i++) {
      const x = 148 + (i % COLS) * 18, y = 37 + Math.floor(i / COLS) * 18;
      const it = s.inv[i];
      const eqd = it ? s.eq[baseOf(it).slot] : null;
      slotBox(ctx, x, y, it, this.area === "inv" && this.idx === i, undefined, !!it && (!eqd || score(it) > score(eqd)));
    }
    // details of the highlighted item
    const sel: Item | null = this.area === "inv" ? s.inv[this.idx] : s.eq[SLOTS[this.eq]];
    const tx = 148, ty = 113, tw = 224;
    if (sel) {
      const cmp = this.area === "inv" ? s.eq[baseOf(sel).slot] : null;
      const lines = itemLines(sel, cmp, tw - 10);
      const maxLines = 10;
      const shown = lines.length > maxLines ? [...lines.slice(0, maxLines - 1), lines[lines.length - 1]] : lines;
      panel(ctx, tx, ty, tw, shown.length * 8 + 8, 0.9);
      rect(ctx, tx + 2, ty + 2, tw - 4, 1, RARITY[sel.rarity].color);
      shown.forEach((l, i) => drawText(ctx, l.text, tx + 5, ty + 5 + i * 8, l.color));
      if (this.area === "inv" && cmp) drawText(ctx, "VS EQUIPPED", tx + tw - 5, ty + 5, C.faint, { align: "right" });
    } else {
      drawText(ctx, "Empty slot.", tx + 4, ty + 4, C.faint);
    }
    const acts: [string, string][] = this.area === "inv" ? [["J", "EQUIP"], ["F", this.dropArm === this.idx ? "CONFIRM DROP" : "DROP"]] : [["J", "UNEQUIP"]];
    hint(ctx, 370, 199, acts, "right");
  }
}

// ------------------------------------------------------------------ skills
function drawSkills(g: Game, ctx: Ctx) {
  const s = g.save;
  SKILLS.forEach((sk, i) => {
    const info = SKILL_INFO[sk];
    const xp = s.xp[sk], lvl = levelForXp(xp);
    const cur = xpForLevel(lvl), next = xpForLevel(lvl + 1);
    const y = 30 + i * 42;
    panel(ctx, 12, y, 236, 38, 0.8);
    drawIcon(ctx, info.icon, 18, y + 7, 2);
    drawText(ctx, info.name.toUpperCase(), 46, y + 6, info.color);
    drawText(ctx, `${lvl}`, 222, y + 5, C.cream, { scale: 2, align: "right" });
    drawText(ctx, "/99", 224, y + 10, C.faint);
    drawText(ctx, info.perk(lvl), 46, y + 15, C.dim);
    const frac = lvl >= 99 ? 1 : (xp - cur) / (next - cur);
    bar(ctx, 46, y + 25, 194, 2, frac, info.color, C.inkSoft);
    drawText(ctx, lvl >= 99 ? `${Math.floor(xp)} XP` : `${Math.floor(xp)} / ${next} XP`, 240, y + 29, C.faint, { align: "right" });
  });
  const lv = g.stats.levels;
  panel(ctx, 256, 32, 116, 98, 0.8);
  drawText(ctx, "COMBAT LEVEL", 314, 40, C.dim, { align: "center" });
  drawText(ctx, `${combatLevel(lv)}`, 314, 50, C.gold2, { align: "center", scale: 3 });
  drawText(ctx, "TOTAL LEVEL", 314, 74, C.dim, { align: "center" });
  drawText(ctx, `${lv.attack + lv.strength + lv.defence + lv.hitpoints}`, 314, 84, C.cream, { align: "center", scale: 2 });
  drawText(ctx, `DEATHS  ${s.deaths}`, 314, 104, C.faint, { align: "center" });
  const mins = Math.floor(s.playTime / 60);
  drawText(ctx, `PLAYED  ${Math.floor(mins / 60)}H ${mins % 60}M`, 314, 114, C.faint, { align: "center" });
  const tip = wrap("Hitting things trains Attack, Strength and Hitpoints. Taking hits, or rolling through them, trains Defence.", 108);
  tip.forEach((l, i) => drawText(ctx, l, 258, 140 + i * 8, C.faint));
}

// ------------------------------------------------------------------ collection log
function drawCollection(g: Game, ctx: Ctx) {
  const s = g.save;
  const kc = s.kills.wick ?? 0;
  panel(ctx, 12, 30, 180, 104, 0.8);
  drawText(ctx, "WICK, THE HARVEST WARDEN", 18, 36, C.gold2);
  drawIcon(ctx, "skull", 16, 44);
  drawText(ctx, `KILL COUNT: ${kc}`, 31, 47, C.cream);
  const t = TABLES.wick;
  const uniques = [...(t.uniques ?? []).map((u) => ({ id: u.id, icon: BASES[u.id].icon, name: BASES[u.id].name, rate: u.rate })), { id: "pet", icon: "pet", name: "Lil' Wick (pet)", rate: t.pet! }];
  uniques.forEach((u, i) => {
    const y = 60 + i * 18;
    const n = u.id === "pet" ? (s.pet ? 1 : 0) : s.log[u.id] ?? 0;
    rect(ctx, 18, y, 16, 16, C.border); rect(ctx, 19, y + 1, 14, 14, "#141120");
    if (n > 0) drawIcon(ctx, u.icon, 20, y + 2); else drawGhost(ctx, u.icon, 20, y + 2, "#2a2438");
    drawText(ctx, n > 0 ? u.name : "???", 40, y + 2, n > 0 ? RARITY[5].color : C.faint);
    drawText(ctx, `${fmtRate(u.rate)}${n > 1 ? `  x${n}` : ""}`, 40, y + 10, C.faint);
  });
  const found = uniques.filter((u) => (u.id === "pet" ? s.pet : (s.log[u.id] ?? 0) > 0)).length;
  drawText(ctx, `${found}/${uniques.length}`, 186, 36, found === uniques.length ? C.good : C.dim, { align: "right" });

  // kill counts
  panel(ctx, 198, 30, 174, 58, 0.8);
  drawText(ctx, "SLAIN", 204, 36, C.dim);
  (["blightling", "crow", "husk"] as const).forEach((k, i) => {
    drawText(ctx, TABLES[k].name.toUpperCase(), 204, 47 + i * 10, C.cream);
    drawText(ctx, `${s.kills[k] ?? 0}`, 366, 47 + i * 10, C.cream, { align: "right" });
  });
  drawText(ctx, `BEST FIND`, 204, 77, C.dim);
  drawText(ctx, RARITY[s.bestRarity].name.toUpperCase(), 366, 77, RARITY[s.bestRarity].color, { align: "right" });

  // published odds
  panel(ctx, 198, 92, 174, 110, 0.8);
  drawText(ctx, "DROP RATES", 204, 98, C.dim);
  drawText(ctx, "GEAR", 300, 98, C.faint, { align: "right" }); drawText(ctx, "SHARD", 340, 98, C.faint, { align: "right" }); drawText(ctx, "TONIC", 368, 98, C.faint, { align: "right" });
  (["blightling", "crow", "husk", "wick"] as const).forEach((k, i) => {
    const tb = TABLES[k];
    const y = 108 + i * 9;
    drawText(ctx, k === "wick" ? "WICK" : tb.name.toUpperCase(), 204, y, C.cream);
    drawText(ctx, tb.gear === 1 ? "ALWAYS" : tb.gear ? fmtRate(tb.gear) : "-", 300, y, C.cream, { align: "right" });
    drawText(ctx, tb.shards ? `${tb.shards[0]}-${tb.shards[1]}` : tb.shard ? fmtRate(tb.shard) : "-", 340, y, C.cream, { align: "right" });
    drawText(ctx, tb.orb ? fmtRate(tb.orb) : "-", 368, y, C.cream, { align: "right" });
  });
  drawText(ctx, "RARITY ODDS PER GEAR DROP", 204, 148, C.dim);
  const rows: [string, readonly number[]][] = [["FOES", RARITY_WEIGHTS.trash], ["HUSK", RARITY_WEIGHTS.elite], ["WICK", RARITY_WEIGHTS.boss]];
  rows.forEach(([name, w], i) => {
    const y = 158 + i * 9;
    drawText(ctx, name, 204, y, C.cream);
    const total = w.reduce((a, b) => a + b, 0);
    w.forEach((v, r) => {
      const pct = (v / total) * 100;
      drawText(ctx, pct === 0 ? "-" : pct < 1 ? pct.toFixed(1) : `${Math.round(pct)}`, 250 + r * 26, y, RARITY[r].color, { align: "right" });
    });
  });
  drawText(ctx, "% C / U / R / E / L. NO PITY, NO LIES.", 204, 188, C.faint);
  const lines = wrap("Every drop is an independent roll. Gold Find raises gold, never rarity.", 170);
  lines.forEach((l, i) => drawText(ctx, l, 16, 142 + i * 8, C.faint));
}

// ------------------------------------------------------------------ help
function drawHelp(ctx: Ctx) {
  const rows: [string, string][] = [
    ["MOVE", "A D  /  ARROWS"],
    ["JUMP", "SPACE / Z   HOLD FOR HEIGHT, AGAIN IN MID-AIR"],
    ["ATTACK", "J / X   TAP FOR A 3-HIT COMBO"],
    ["ROLL", "K / C / SHIFT   INVULNERABLE MID-ROLL"],
    ["TONIC", "Q   HEALS OVER TIME. YOU'RE SLOWED WHILE DRINKING"],
    ["INTERACT", "E / W / UP"],
    ["DROP DOWN", "DOWN + JUMP ON PLANKS"],
    ["INVENTORY", "I / TAB"],
    ["PAUSE / MUTE", "ESC  /  M"],
    ["GAMEPAD", "A JUMP  X ATTACK  B ROLL  Y TONIC  RB INTERACT"],
  ];
  rows.forEach(([k, v], i) => {
    drawText(ctx, k, 16, 32 + i * 11, C.gold2);
    drawText(ctx, v, 96, 32 + i * 11, C.cream);
  });
  const tips = [
    "Attacks, rolls and double-jumps cost stamina. Out of stamina, out of options.",
    "Resting at a Hearthstone heals you, refills tonics and banks your gold... and revives every foe.",
    "Die and your carried gold stays where you fell. Die again before reclaiming it and it's gone.",
  ];
  let y = 148;
  for (const t of tips) for (const l of wrap(t, 350)) { drawText(ctx, l, 16, y, C.dim); y += 8; }
}
