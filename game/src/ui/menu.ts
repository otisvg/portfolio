import { audio } from "../core/audio";
import { rect, type Ctx } from "../gfx/canvas";
import { drawText, textWidth, wrap } from "../gfx/font";
import { drawGhost, drawIcon } from "../gfx/icons";
import { C, RARITY } from "../gfx/palette";
import type { Game } from "../game";
import { baseOf, BASES, displayName, score, SLOTS, type Item, type Slot } from "../systems/items";
import { fmtRate, RARITY_WEIGHTS, ROTBORN_RATE, TABLES } from "../systems/loot";
import { describe, MOONS } from "../systems/bounties";
import { LORE } from "../systems/lore";
import { ORE_IDS, ORES, RELIC_IDS, RELICS, relicSlots } from "../systems/relics";
import { SETS } from "../systems/sets";
import { Dialog } from "./dialog";
import { MAT_IDS, MATS } from "../systems/crafting";
import { DIARY, DIARY_AREAS, tierClaimed, tierComplete, type DiaryArea } from "../systems/diary";
import { PET_PERKS, PET_STAGE_KC, petStage, PETS } from "../systems/pets";
import { T, type Level, type LevelId } from "../world/level";
import { getLevel, LEVEL_INFO } from "../world/levels";
import { INV_SIZE } from "../systems/save";
import { combatLevel, levelForXp, SKILL_INFO, SKILLS, xpForLevel } from "../systems/skills";
import { bar, ellipsize, hint, itemLines, panel, slotBox } from "./widgets";

export interface Overlay {
  update(g: Game, dt: number): void;
  draw(g: Game, ctx: Ctx): void;
}

const TABS = ["GEAR", "SKILLS", "LOG", "DIARY", "JOURNAL", "RELICS", "HELP"];
export const HELP_TAB = 6;
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
  /** Collection log page (Wick, Grimwater, treasure) and diary area. */
  page = 0;
  area2 = 0;
  loreSel = 0;
  relicSel = 0;

  constructor(tab = 0) { this.tab = tab; }

  update(g: Game) {
    const inp = g.input;
    if (inp.pressed("menu") || inp.pressed("cancel") || inp.pressed("pause")) { audio.play("close"); g.closeOverlay(); return; }
    if (inp.pressed("tabL")) { this.tab = (this.tab + TABS.length - 1) % TABS.length; audio.play("move"); }
    if (inp.pressed("tabR")) { this.tab = (this.tab + 1) % TABS.length; audio.play("move"); }
    if (this.tab === 2) {
      const n = LOG_PAGES.length + 1;
      if (inp.pressed("right")) { this.page = (this.page + 1) % n; audio.play("move"); }
      if (inp.pressed("left")) { this.page = (this.page + n - 1) % n; audio.play("move"); }
      if (this.page === LOG_PAGES.length) {
        if (inp.pressed("down") && this.loreSel < LORE.length - 1) { this.loreSel++; audio.play("move"); }
        if (inp.pressed("up") && this.loreSel > 0) { this.loreSel--; audio.play("move"); }
        const pg = LORE[this.loreSel];
        if (inp.pressed("confirm") && g.save.lore.includes(pg.id)) g.openOverlay(new Dialog(pg.title, pg.text, null));
      }
    }
    if (this.tab === 5) {
      if (inp.pressed("down") && this.relicSel < RELIC_IDS.length - 1) { this.relicSel++; audio.play("move"); }
      if (inp.pressed("up") && this.relicSel > 0) { this.relicSel--; audio.play("move"); }
      if (inp.pressed("confirm")) g.toggleRelic(RELIC_IDS[this.relicSel]);
    }
    if (this.tab === 3 && (inp.pressed("left") || inp.pressed("right") || inp.pressed("up") || inp.pressed("down"))) { this.area2 = 1 - this.area2; audio.play("move"); }
    if (this.tab === 4 && inp.pressed("confirm")) g.cyclePet();
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
      const x = 14 + i * 50;
      const sel = i === this.tab;
      drawText(ctx, t, x, 12, sel ? C.cream : C.faint);
      if (sel) rect(ctx, x, 19, textWidth(t), 1, C.gold2);
    });
    drawText(ctx, "Q / E", 370, 12, C.faint, { align: "right" });
    rect(ctx, 10, 23, 364, 1, C.border);
    if (this.tab === 0) this.drawGear(g, ctx);
    else if (this.tab === 1) drawSkills(g, ctx);
    else if (this.tab === 2) { if (this.page === LOG_PAGES.length) drawLore(g, ctx, this.loreSel); else drawCollection(g, ctx, this.page); }
    else if (this.tab === 5) drawRelics(g, ctx, this.relicSel);
    else if (this.tab === 3) drawDiary(g, ctx, DIARY_AREAS[this.area2]);
    else if (this.tab === 4) drawJournal(g, ctx);
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
    const xp = s.xp[sk] ?? 0, lvl = levelForXp(xp);
    const cur = xpForLevel(lvl), next = xpForLevel(lvl + 1);
    const y = 27 + i * 25;
    panel(ctx, 12, y, 236, 23, 0.8);
    drawIcon(ctx, info.icon, 16, y + 5);
    drawText(ctx, info.name.toUpperCase(), 32, y + 4, info.color);
    drawText(ctx, `${lvl}`, 222, y + 4, C.cream, { align: "right" });
    drawText(ctx, "/99", 224, y + 4, C.faint);
    drawText(ctx, ellipsize(info.perk(lvl), 124), 88, y + 4, C.dim);
    const frac = lvl >= 99 ? 1 : (xp - cur) / (next - cur);
    bar(ctx, 32, y + 14, 150, 2, frac, info.color, C.inkSoft);
    drawText(ctx, lvl >= 99 ? `${Math.floor(xp)} XP` : `${Math.floor(xp)}/${next}`, 240, y + 13, C.faint, { align: "right" });
  });
  const lv = g.stats.levels;
  panel(ctx, 256, 32, 116, 98, 0.8);
  drawText(ctx, "COMBAT LEVEL", 314, 40, C.dim, { align: "center" });
  drawText(ctx, `${combatLevel(lv)}`, 314, 50, C.gold2, { align: "center", scale: 3 });
  drawText(ctx, "TOTAL LEVEL", 314, 74, C.dim, { align: "center" });
  drawText(ctx, `${SKILLS.reduce((a, k) => a + lv[k], 0)}`, 314, 84, C.cream, { align: "center", scale: 2 });
  drawText(ctx, `DEATHS  ${s.deaths}`, 314, 104, C.faint, { align: "center" });
  const mins = Math.floor(s.playTime / 60);
  drawText(ctx, `PLAYED  ${Math.floor(mins / 60)}H ${mins % 60}M`, 314, 114, C.faint, { align: "center" });
  const tip = wrap("Hitting things trains Attack, Strength and Hitpoints; taking or rolling through hits trains Defence. Old Tam hands out Slayer tasks. Mine veins in the Deep; Brom teaches Smithing.", 108);
  tip.forEach((l, i) => drawText(ctx, l, 258, 138 + i * 8, C.faint));
}

// ------------------------------------------------------------------ collection log
const LOG_PAGES = [
  { boss: "wick", title: "WICK, THE HARVEST WARDEN", foes: ["blightling", "crow", "husk", "rotborn"], rates: ["blightling", "crow", "husk", "wick", "rotborn"] },
  { boss: "grimwater", title: "GRIMWATER, THE DROWNED FOREMAN", foes: ["sludgeling", "bat", "miner", "rotborn"], rates: ["sludgeling", "bat", "miner", "grimwater", "rotborn"] },
  { boss: "treasure", title: "TREASURE & CACHES", foes: [], rates: ["treasure", "cache", "daily"] },
];

function drawCollection(g: Game, ctx: Ctx, page: number) {
  const s = g.save;
  const pg = LOG_PAGES[page];
  const t = TABLES[pg.boss];
  panel(ctx, 12, 30, 180, 104, 0.8);
  drawText(ctx, ellipsize(pg.title, 150), 18, 36, C.gold2);
  drawText(ctx, `${page + 1}/${LOG_PAGES.length + 1}`, 186, 36, C.faint, { align: "right" });
  drawIcon(ctx, page === 2 ? "chest" : "skull", 16, 44);
  const count = page === 2 ? (s.c.dug ?? 0) : s.kills[pg.boss] ?? 0;
  drawText(ctx, page === 2 ? `TREASURES DUG: ${count}` : `KILL COUNT: ${count}`, 31, 47, C.cream);
  type Row = { id: string; icon: string; name: string; rate: string; n: number };
  const rows: Row[] = (t.uniques ?? []).map((u) => ({ id: u.id, icon: BASES[u.id].icon, name: BASES[u.id].name, rate: fmtRate(u.rate), n: s.log[u.id] ?? 0 }));
  if (t.pet && t.petId) rows.push({ id: "pet", icon: t.petId === "grim" ? "diver" : "pet", name: `${PETS[t.petId].stages[0]} (pet)`, rate: fmtRate(t.pet), n: s.pets.includes(t.petId) ? 1 : 0 });
  if (page === 2) for (const [id, name] of [["lantern", "Lamplighter's"], ["scythe", "Root-Bound"], ["hood", "Watched"], ["diver", "Sunken Crypt"], ["tide", "Bell-Drained"], ["seam", "Old Seam"]]) rows.push({ id, icon: "chest", name, rate: "SECRET", n: s.flags["cache_" + id] ? 1 : 0 });
  const set = page === 0 ? SETS.warden : page === 1 ? SETS.foreman : null;
  if (set) for (const pid of set.pieces) rows.push({ id: pid, icon: BASES[pid].icon, name: BASES[pid].name, rate: "SET", n: s.log[pid] ?? 0 });
  const compact = rows.length > 4;
  rows.forEach((u, i) => {
    if (compact) {
      // two columns of small entries
      const x = 16 + (i % 2) * 88, y = 58 + Math.floor(i / 2) * 15;
      if (u.n > 0) drawIcon(ctx, u.icon, x, y); else drawGhost(ctx, u.icon, x, y, "#2a2438");
      drawText(ctx, ellipsize(u.n > 0 ? u.name : "???", 70), x + 14, y + 1, u.n > 0 ? (u.rate === "SET" ? RARITY[6].color : RARITY[5].color) : C.faint);
      drawText(ctx, u.rate, x + 14, y + 8, C.faint);
      return;
    }
    const y = 60 + i * 18;
    rect(ctx, 18, y, 16, 16, C.border); rect(ctx, 19, y + 1, 14, 14, "#141120");
    if (u.n > 0) drawIcon(ctx, u.icon, 20, y + 2); else drawGhost(ctx, u.icon, 20, y + 2, "#2a2438");
    drawText(ctx, u.n > 0 ? u.name : "???", 40, y + 2, u.n > 0 ? RARITY[5].color : C.faint);
    drawText(ctx, `${u.rate}${u.n > 1 ? `  x${u.n}` : ""}`, 40, y + 10, C.faint);
  });
  const found = rows.filter((u) => u.n > 0).length;
  drawText(ctx, `${found}/${rows.length}`, 186, 47, found === rows.length ? C.good : C.dim, { align: "right" });

  // kill counts
  panel(ctx, 198, 30, 174, 58, 0.8);
  if (pg.foes.length) {
    drawText(ctx, "SLAIN", 204, 36, C.dim);
    pg.foes.forEach((k, i) => {
      drawText(ctx, TABLES[k].name.toUpperCase(), 204, 46 + i * 8, k === "rotborn" ? C.blight5 : C.cream);
      drawText(ctx, `${s.kills[k] ?? 0}`, 366, 46 + i * 8, C.cream, { align: "right" });
    });
  } else {
    drawText(ctx, "TREASURE MAPS", 204, 36, C.dim);
    wrap(`Foes 1/80-1/90, Husks and Miners 1/25-1/30, bosses and caches 1/5-1/6. Your odds now: x${g.stats.mapMult}.`, 164).forEach((l, i) => drawText(ctx, l, 204, 46 + i * 8, C.cream));
  }
  drawText(ctx, `BEST FIND`, 204, 79, C.dim);
  drawText(ctx, RARITY[s.bestRarity].name.toUpperCase(), 366, 79, RARITY[s.bestRarity].color, { align: "right" });

  // published odds
  panel(ctx, 198, 92, 174, 110, 0.8);
  drawText(ctx, "DROP RATES", 204, 98, C.dim);
  drawText(ctx, "GEAR", 282, 98, C.faint, { align: "right" }); drawText(ctx, "SHARD", 312, 98, C.faint, { align: "right" }); drawText(ctx, "TONIC", 340, 98, C.faint, { align: "right" }); drawText(ctx, "RUNE", 368, 98, C.faint, { align: "right" });
  pg.rates.forEach((k, i) => {
    const tb = TABLES[k];
    const y = 107 + i * 8;
    const name = ({ rotborn: "ROTBORN", wick: "WICK", grimwater: "GRIM", miner: "MINER", sludgeling: "SLUDGE", treasure: "TREASURE", cache: "CACHE", daily: "DAILY" } as Record<string, string>)[k] ?? tb.name.toUpperCase();
    drawText(ctx, name, 204, y, k === "rotborn" ? C.blight5 : C.cream);
    drawText(ctx, tb.gear === 1 ? "ALWAYS" : tb.gear ? fmtRate(tb.gear) : "-", 282, y, C.cream, { align: "right" });
    drawText(ctx, tb.shards ? `${tb.shards[0]}-${tb.shards[1]}` : tb.shard ? fmtRate(tb.shard) : "-", 312, y, C.cream, { align: "right" });
    drawText(ctx, tb.orb ? fmtRate(tb.orb) : "-", 340, y, C.cream, { align: "right" });
    drawText(ctx, tb.rune ? fmtRate(tb.rune) : "-", 368, y, C.cream, { align: "right" });
  });
  drawText(ctx, "RARITY ODDS PER GEAR DROP", 204, 148, C.dim);
  const rr: [string, readonly number[]][] = [["FOES", RARITY_WEIGHTS.trash], ["ELITE", RARITY_WEIGHTS.elite], ["BOSS", RARITY_WEIGHTS.boss]];
  rr.forEach(([name, w], i) => {
    const y = 158 + i * 9;
    drawText(ctx, name, 204, y, C.cream);
    const total = w.reduce((a, b) => a + b, 0);
    w.forEach((v, r) => {
      const pct = (v / total) * 100;
      drawText(ctx, pct === 0 ? "-" : pct < 1 ? pct.toFixed(1) : `${Math.round(pct)}`, 250 + r * 26, y, RARITY[r].color, { align: "right" });
    });
  });
  drawText(ctx, "% C / U / R / E / L. NO PITY, NO LIES.", 204, 188, C.faint);
  const extra = page === 0 ? "Warden's set: Husks 1/100, Wick 1/12, Superiors 1/8. Wick also drops Embers, Straw, Button Eyes (1/6), a Blade (1/20)."
    : page === 1 ? "Foreman's set: Miners 1/90, Grimwater 1/10, Superiors 1/8. Grimwater also drops Chain, Pearls (1/2), Bell Shards (1/12)."
      : "Caches refill whenever you rest. Treasure is dug up where a map's X lies.";
  wrap(extra, 176).forEach((l, i) => drawText(ctx, l, 14, 140 + i * 8, C.faint));
  if (page < 2) drawText(ctx, `Rotborn: 1/${ROTBORN_RATE} per foe, each rest.`, 14, 180, C.blight5);
  drawText(ctx, "LEFT / RIGHT: PAGE", 14, 196, C.faint);
}

// ------------------------------------------------------------------ lore pages
function drawLore(g: Game, ctx: Ctx, sel: number) {
  const s = g.save;
  drawText(ctx, `LORE  ${s.lore.length}/${LORE.length}`, 14, 29, C.gold2);
  drawText(ctx, `${LOG_PAGES.length + 1}/${LOG_PAGES.length + 1}`, 370, 29, C.faint, { align: "right" });
  LORE.forEach((p, i) => {
    const got = s.lore.includes(p.id);
    const x = 14 + (i >= 6 ? 182 : 0), y = 42 + (i % 6) * 14;
    if (i === sel) { rect(ctx, x - 2, y - 3, 178, 12, C.panelHi); rect(ctx, x - 2, y - 3, 1, 12, C.gold2); }
    drawIcon(ctx, "page", x, y - 3);
    drawText(ctx, got ? p.title.toUpperCase() : "???", x + 14, y, got ? C.cream : C.faint);
  });
  drawText(ctx, "THE OUTSKIRTS", 14, 36, C.faint); drawText(ctx, "THE DROWNED MINES", 196, 36, C.faint);
  const p = LORE[sel];
  panel(ctx, 12, 128, 360, 60, 0.8);
  if (s.lore.includes(p.id)) wrap(p.text.join(" "), 348).slice(0, 6).forEach((l, i) => drawText(ctx, l, 18, 134 + i * 8, C.dim));
  else drawText(ctx, "Not found yet. Loose pages lie in both levels, some in secret places.", 18, 134, C.faint);
  drawText(ctx, "UP / DOWN: PAGE   J: READ   LEFT / RIGHT: LOG", 14, 196, C.faint);
}

// ------------------------------------------------------------------ relics
function drawRelics(g: Game, ctx: Ctx, sel: number) {
  const s = g.save;
  const smith = g.stats.levels.smithing, slots = relicSlots(smith);
  drawText(ctx, `RELIC SLOTS ${s.relicEq.length}/${slots}`, 14, 29, C.gold2);
  drawText(ctx, smith >= 30 ? "" : "A third slot opens at Smithing 30.", 370, 29, C.faint, { align: "right" });
  RELIC_IDS.forEach((id, i) => {
    const r = RELICS[id], tier = s.relics[id] ?? 0, worn = s.relicEq.includes(id);
    const y = 40 + i * 20;
    if (i === sel) { rect(ctx, 12, y - 2, 360, 19, C.panelHi); rect(ctx, 12, y - 2, 1, 19, C.gold2); }
    if (tier) drawIcon(ctx, "relic", 16, y + 1); else drawGhost(ctx, "relic", 16, y + 1, "#2a2438");
    drawText(ctx, r.name.toUpperCase(), 32, y + 1, tier ? r.color : C.faint);
    drawText(ctx, tier ? `TIER ${"I".repeat(tier)}` : `FORGE AT BROM'S (SMITHING ${r.level})`, tier ? 150 : 150, y + 1, tier ? C.gold2 : C.faint);
    if (worn) drawText(ctx, "WORN", 366, y + 1, C.good, { align: "right" });
    drawText(ctx, r.effect(Math.max(1, tier)), 32, y + 9, tier ? C.dim : C.faint);
  });
  hint(ctx, 370, 199, [["J", "WEAR / REMOVE"]], "right");
}

// ------------------------------------------------------------------ achievement diary
function drawDiary(g: Game, ctx: Ctx, area: DiaryArea) {
  const s = g.save, d = DIARY[area];
  DIARY_AREAS.forEach((a, i) => {
    const x = 14 + i * 110, sel = a === area;
    drawText(ctx, DIARY[a].name, x, 29, sel ? C.gold2 : C.faint);
    if (sel) rect(ctx, x, 36, textWidth(DIARY[a].name), 1, C.gold2);
  });
  drawText(ctx, "LEFT / RIGHT: AREA", 370, 29, C.faint, { align: "right" });
  d.tiers.forEach((tier, ti) => {
    const y = 42 + ti * 54;
    const done = tierComplete(s, area, ti), claimed = tierClaimed(s, area, ti);
    panel(ctx, 12, y, 360, 51, 0.8);
    const n = tier.tasks.filter((t) => t.done(s)).length;
    drawText(ctx, tier.name, 18, y + 5, done ? C.good : C.cream);
    drawText(ctx, `${n}/${tier.tasks.length}`, 60, y + 5, done ? C.good : C.dim);
    drawText(ctx, `REWARD: ${tier.reward}`, 366, y + 5, claimed ? C.good : C.gold2, { align: "right" });
    tier.tasks.forEach((t, k) => {
      const ok = t.done(s);
      const tx = 18 + (k % 2) * 176, ty = y + 17 + Math.floor(k / 2) * 16;
      rect(ctx, tx, ty, 7, 7, C.border); rect(ctx, tx + 1, ty + 1, 5, 5, ok ? C.good : "#141120");
      wrap(t.text, 160).slice(0, 2).forEach((l, li) => drawText(ctx, l, tx + 11, ty + li * 7 - (li ? 0 : 0), ok ? C.dim : C.cream));
    });
  });
}

// ------------------------------------------------------------------ journal
function drawJournal(g: Game, ctx: Ctx) {
  const s = g.save;
  // materials
  panel(ctx, 12, 28, 176, 82, 0.8);
  drawText(ctx, "PARTS & ORE", 18, 34, C.dim);
  const rows: { icon: string; name: string; color: string; n: number }[] = [
    ...MAT_IDS.map((m) => ({ icon: MATS[m].icon, name: MATS[m].name, color: MATS[m].color, n: s.mats[m] ?? 0 })),
    ...ORE_IDS.map((o) => ({ icon: ORES[o].icon, name: ORES[o].name, color: ORES[o].color, n: s.ore[o] ?? 0 })),
  ];
  rows.forEach((r, i) => {
    const x = 18 + (i % 2) * 86, y = 44 + Math.floor(i / 2) * 13;
    if (r.n > 0) drawIcon(ctx, r.icon, x, y - 3); else drawGhost(ctx, r.icon, x, y - 3, "#2a2438");
    drawText(ctx, ellipsize(r.name, 56), x + 14, y, r.n > 0 ? r.color : C.faint);
    drawText(ctx, `${r.n}`, x + 82, y, r.n > 0 ? C.cream : C.faint, { align: "right" });
  });
  // pets
  panel(ctx, 12, 114, 176, 88, 0.8);
  drawText(ctx, "PETS", 18, 120, C.dim);
  if (!s.pets.length) wrap("No pets yet. Each boss has a 1 in 500 chance to leave a little friend behind.", 164).forEach((l, i) => drawText(ctx, l, 18, 132 + i * 8, C.faint));
  s.pets.forEach((id, i) => {
    const y = 132 + i * 30, kc = s.petKc[id] ?? 0, st = petStage(kc);
    const active = s.activePet === id;
    drawIcon(ctx, id === "grim" ? "diver" : "pet", 18, y - 2);
    drawText(ctx, PETS[id].stages[st].toUpperCase(), 34, y, active ? RARITY[5].color : C.dim);
    if (active) drawText(ctx, "FOLLOWING", 182, y, C.good, { align: "right" });
    drawText(ctx, PET_PERKS[st], 34, y + 8, C.faint);
    const next = PET_STAGE_KC[st + 1];
    drawText(ctx, next ? `${kc}/${next} boss kills to grow` : `${kc} boss kills together`, 34, y + 16, C.faint);
  });
  if (s.pets.length > 1) drawText(ctx, "[J] SWAP PET", 182, 120, C.cream, { align: "right" });

  // treasure map
  panel(ctx, 194, 28, 178, 108, 0.8);
  drawText(ctx, "TREASURE MAP", 200, 34, C.dim);
  const mp = s.maps[0];
  if (mp) {
    const [lid, spotId] = mp.split(":") as [LevelId, string];
    const L = getLevel(lid);
    const spot = L.digSpots.find((d) => d.id === spotId);
    drawText(ctx, LEVEL_INFO[lid].short, 366, 34, C.gold2, { align: "right" });
    if (spot) {
      drawMiniMap(ctx, L, spot.x, spot.y, 200, 44, 166, 54, g.time);
      wrap(spot.clue, 166).slice(0, 3).forEach((l, i) => drawText(ctx, l, 200, 104 + i * 8, C.cream));
    }
  } else wrap("You carry no map. Foes, caches and bosses sometimes drop one. Find the X and dig ([E]) for buried treasure.", 166).forEach((l, i) => drawText(ctx, l, 200, 46 + i * 8, C.faint));

  // this week and today
  panel(ctx, 194, 140, 178, 62, 0.8);
  const moon = MOONS[g.stats.moon];
  drawIcon(ctx, "moonface", 198, 144);
  drawText(ctx, moon.name.toUpperCase(), 214, 147, moon.color);
  wrap(moon.effect, 166).slice(0, 2).forEach((l, i) => drawText(ctx, l, 200, 157 + i * 8, C.dim));
  if (s.daily) {
    drawText(ctx, "TODAY:", 200, 177, C.gold2);
    drawText(ctx, ellipsize(describe(s.daily), 132), 234, 177, s.daily.done ? C.good : C.cream);
    drawText(ctx, s.daily.done ? "DONE. A new daily tomorrow." : `${s.daily.have}/${s.daily.need}  for the Daily Chest`, 200, 187, C.faint);
  }
}

/** A parchment sketch of the level around a map's X. */
function drawMiniMap(ctx: Ctx, L: Level, wx: number, wy: number, x: number, y: number, w: number, h: number, time: number) {
  const s = 3;
  const cols = Math.floor(w / s), rows = Math.floor(h / s);
  const tx0 = Math.floor(wx / 16) - Math.floor(cols / 2), ty0 = Math.floor(wy / 16) - Math.floor(rows * 0.6);
  rect(ctx, x - 1, y - 1, w + 2, h + 2, "#5a4630");
  rect(ctx, x, y, w, h, "#d8c8a8");
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const t = L.get(tx0 + i, ty0 + j);
    let c: string | null = null;
    if (L.isSolid(t) && t !== T.FOG) c = (i + j) % 2 ? "#8a6a4a" : "#7a5c40";
    else if (t === T.BOG) c = "#6a8aa0";
    else if (L.isOneWay(t) || t === T.PLANK || t === T.BRANCH) c = "#9a7a5a";
    if (c) rect(ctx, x + i * s, y + j * s, s, s, c);
  }
  const mx = x + (Math.floor(wx / 16) - tx0) * s + 1, my = y + (Math.floor(wy / 16) - ty0) * s - 3;
  if (Math.floor(time * 2) % 2 === 0) {
    for (let k = -2; k <= 2; k++) { rect(ctx, mx + k, my + k, 1, 1, C.hp); rect(ctx, mx + k, my - k, 1, 1, C.hp); }
  }
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
    drawText(ctx, k, 16, 30 + i * 9, C.gold2);
    drawText(ctx, v, 96, 30 + i * 9, C.cream);
  });
  const tips = [
    "Attacks need stamina. Empty the bar and you're winded: it refills slowly until it's back to 40%.",
    "Roll just as a blow lands for a PERFECT dodge: slow motion, stamina back, and a guaranteed counter.",
    "Resting heals, refills tonics, banks gold and revives every foe. Slay 12 foes to charge the Hearth Dice.",
    "Wick drops Embers. Light the beacon at the mill with three of them to open the way to the Drowned Mines.",
    "In the Mines, Old Tam hands out Slayer tasks. Mine ore veins and have Brom forge it into Relics.",
  ];
  let y = 124;
  for (const t of tips) for (const l of wrap(t, 350)) { drawText(ctx, l, 16, y, C.dim); y += 8; }
}
