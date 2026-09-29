import { rect, type Ctx } from "../gfx/canvas";
import { drawText, LINE_H, textWidth, wrap } from "../gfx/font";
import { drawGhost, drawIcon } from "../gfx/icons";
import { C, RARITY } from "../gfx/palette";
import { FIN, FINISHER } from "../systems/dice";
import { AFFIXES, allAffixes, baseOf, displayName, itemStats, sellValue, type Item } from "../systems/items";
import { SETS, setOf } from "../systems/sets";

export function panel(ctx: Ctx, x: number, y: number, w: number, h: number, alpha = 0.94) {
  ctx.globalAlpha = alpha;
  rect(ctx, x + 1, y, w - 2, h, C.panel);
  rect(ctx, x, y + 1, w, h - 2, C.panel);
  ctx.globalAlpha = 1;
  // border with notched corners
  rect(ctx, x + 2, y, w - 4, 1, C.border); rect(ctx, x + 2, y + h - 1, w - 4, 1, C.border);
  rect(ctx, x, y + 2, 1, h - 4, C.border); rect(ctx, x + w - 1, y + 2, 1, h - 4, C.border);
  rect(ctx, x + 1, y + 1, 1, 1, C.border); rect(ctx, x + w - 2, y + 1, 1, 1, C.border);
  rect(ctx, x + 1, y + h - 2, 1, 1, C.border); rect(ctx, x + w - 2, y + h - 2, 1, 1, C.border);
  rect(ctx, x + 2, y + 1, w - 4, 1, C.panelHi);
}

export function bar(ctx: Ctx, x: number, y: number, w: number, h: number, frac: number, fg: string, bg: string, trail = 0, trailColor: string = C.cream) {
  rect(ctx, x - 1, y - 1, w + 2, h + 2, C.ink);
  rect(ctx, x, y, w, h, bg);
  if (trail > frac) rect(ctx, x, y, Math.round(w * Math.min(1, trail)), h, trailColor);
  const fw = Math.round(w * Math.max(0, Math.min(1, frac)));
  rect(ctx, x, y, fw, h, fg);
  if (fw > 1 && h > 2) { ctx.globalAlpha = 0.35; rect(ctx, x, y, fw, 1, "#ffffff"); ctx.globalAlpha = 1; }
}

export function slotBox(ctx: Ctx, x: number, y: number, item: Item | null, selected: boolean, ghost?: string, upgrade = false) {
  rect(ctx, x, y, 16, 16, selected ? C.borderHi : C.border);
  rect(ctx, x + 1, y + 1, 14, 14, item ? "#1a1528" : "#141120");
  if (item) {
    const col = RARITY[item.rarity].color;
    if (item.rarity > 0) { ctx.globalAlpha = 0.25; rect(ctx, x + 1, y + 1, 14, 14, col); ctx.globalAlpha = 1; rect(ctx, x + 1, y + 14, 14, 1, col); }
    drawIcon(ctx, baseOf(item).icon, x + 2, y + 2);
    if (item.plus) drawText(ctx, "+" + item.plus, x + 15, y + 1, C.gold2, { align: "right" });
    if (upgrade) { rect(ctx, x + 12, y + 9, 3, 1, C.good); rect(ctx, x + 13, y + 8, 1, 3, C.good); rect(ctx, x + 11, y + 10, 1, 1, C.good); rect(ctx, x + 15, y + 10, 1, 1, C.good); }
  } else if (ghost) drawGhost(ctx, ghost, x + 2, y + 2);
  if (selected) {
    rect(ctx, x - 1, y - 1, 3, 1, C.cream); rect(ctx, x - 1, y - 1, 1, 3, C.cream);
    rect(ctx, x + 14, y - 1, 3, 1, C.cream); rect(ctx, x + 16, y - 1, 1, 3, C.cream);
    rect(ctx, x - 1, y + 16, 3, 1, C.cream); rect(ctx, x - 1, y + 14, 1, 3, C.cream);
    rect(ctx, x + 14, y + 16, 3, 1, C.cream); rect(ctx, x + 16, y + 14, 1, 3, C.cream);
  }
}

export interface Line { text: string; color: string }

const SLOT_NAME = { weapon: "Weapon", helm: "Helm", body: "Body", trinket: "Trinket" };
const KIND_NAME = { sword: "Sword", axe: "Axe", dagger: "Dagger", spear: "Spear", scythe: "Scythe" };

export function itemLines(it: Item, compare: Item | null, maxW: number, showValue = true): Line[] {
  const b = baseOf(it), s = itemStats(it);
  const out: Line[] = [];
  const rname = RARITY[it.rarity].name;
  out.push({ text: displayName(it), color: RARITY[it.rarity].color });
  out.push({ text: `${rname} ${b.kind ? KIND_NAME[b.kind] : SLOT_NAME[b.slot]}`, color: C.dim });
  const cs = compare ? itemStats(compare) : null;
  const diff = (a: number, bv: number | undefined) => {
    if (bv === undefined || !compare) return "";
    const d = Math.round((a - bv) * 10) / 10;
    return d === 0 ? "" : d > 0 ? `  (+${d})` : `  (${d})`;
  };
  const dcol = (a: number, bv: number | undefined) => (!compare || bv === undefined || a === bv ? C.cream : a > bv ? C.good : C.bad);
  if (s.dmg) {
    const avg = (s.dmg[0] + s.dmg[1]) / 2, cavg = cs?.dmg ? (cs.dmg[0] + cs.dmg[1]) / 2 : undefined;
    out.push({ text: `Damage ${s.dmg[0]}-${s.dmg[1]}${diff(avg, cavg)}`, color: dcol(avg, cavg) });
    out.push({ text: `Speed ${Math.round((b.speed ?? 1) * 100)}%   Reach ${b.reach}`, color: C.dim });
    if (b.kind) out.push({ text: `Finisher die: ${FINISHER[b.kind].map((f) => FIN[f].label).join(" ")}`, color: C.dim });
  }
  if (s.def || cs?.def) out.push({ text: `Armour ${s.def}${diff(s.def, cs?.def)}`, color: dcol(s.def, cs?.def) });
  if (s.hp || cs?.hp) out.push({ text: `Health +${s.hp}${diff(s.hp, cs?.hp)}`, color: dcol(s.hp, cs?.hp) });
  for (const a of b.implicit ?? []) out.push({ text: AFFIXES[a.t].label(a.v), color: C.gold2 });
  for (const a of it.affixes) out.push({ text: AFFIXES[a.t].label(a.v), color: "#9ab8ff" });
  const set = setOf(b.id);
  if (set) {
    const S = SETS[set];
    out.push({ text: S.name, color: RARITY[6].color });
    for (const l of wrap(`2: ${S.two}`, maxW)) out.push({ text: l, color: "#8ad6b8" });
    for (const l of wrap(`4: ${S.four}`, maxW)) out.push({ text: l, color: "#8ad6b8" });
  }
  for (const l of wrap(b.lore, maxW)) out.push({ text: l, color: C.faint });
  if (showValue) out.push({ text: `Sells for ${sellValue(it)} gold`, color: C.gold1 });
  void allAffixes;
  return out;
}

export function drawLines(ctx: Ctx, lines: Line[], x: number, y: number, lh = LINE_H + 1) {
  lines.forEach((l, i) => drawText(ctx, l.text, x, y + i * lh, l.color));
}

export function tooltip(ctx: Ctx, it: Item, compare: Item | null, x: number, y: number, w: number) {
  const lines = itemLines(it, compare, w - 10);
  const h = lines.length * (LINE_H + 1) + 8;
  panel(ctx, x, y, w, h, 0.97);
  rect(ctx, x + 2, y + 2, w - 4, 1, RARITY[it.rarity].color);
  drawLines(ctx, lines, x + 5, y + 5);
  return h;
}

export function hint(ctx: Ctx, x: number, y: number, parts: [string, string][], align: "left" | "right" | "center" = "left") {
  const s = parts.map(([k, v]) => `[${k}] ${v}`).join("   ");
  const w = textWidth(s);
  const sx = align === "right" ? x - w : align === "center" ? x - w / 2 : x;
  let cx = sx;
  for (const [k, v] of parts) {
    cx += drawText(ctx, `[${k}]`, cx, y, C.cream) + 4;
    cx += drawText(ctx, v, cx, y, C.dim) + 12;
  }
}

export function ellipsize(s: string, w: number) {
  if (textWidth(s) <= w) return s;
  while (s.length > 1 && textWidth(s + "..") > w) s = s.slice(0, -1);
  return s + "..";
}
