import { audio } from "../core/audio";
import { rect, type Ctx } from "../gfx/canvas";
import { drawText, textWidth, wrap } from "../gfx/font";
import { drawIcon } from "../gfx/icons";
import { C, RARITY } from "../gfx/palette";
import type { Game } from "../game";
import { baseOf, BASES, displayName, FORGE_MAX, forgeCost, itemStats, makeCrafted, rollItem, sellValue, SLOTS, type Item } from "../systems/items";
import { canCraft, MATS, RECIPES, type MatId, type Recipe } from "../systems/crafting";
import { FACES } from "../systems/dice";
import { INV_SIZE } from "../systems/save";
import { gridNav, type Overlay } from "./menu";
import { ellipsize, hint, itemLines, panel, slotBox } from "./widgets";

const TABS = ["BUY", "SELL", "FORGE", "CRAFT"];

interface Ware { name: string; icon: string; price: number | null; desc: string; buy: (g: Game) => boolean }

function wares(g: Game): Ware[] {
  const s = g.save;
  const gear = (base: string, price: number, desc: string): Ware => ({
    name: BASE_NAME(base), icon: ICON(base), price, desc,
    buy: (g2) => g2.giveItem(rollItem(base, 0)),
  });
  const flaskPrice = s.tonicMax === 3 ? 150 : s.tonicMax === 4 ? 420 : null;
  return [
    {
      name: "Tonic Flask +1", icon: "tonic", price: flaskPrice,
      desc: flaskPrice ? `Carry one more tonic. (${s.tonicMax} > ${s.tonicMax + 1})` : "Your flask can't hold any more.",
      buy: (g2) => { g2.save.tonicMax++; g2.player.tonics++; return true; },
    },
    gear("village_blade", 60, "An honest sword. Brom's own work."),
    gear("leather_cap", 35, "Better than nothing. Barely."),
    gear("gambeson", 80, "Quilted, warm, surprisingly stab-proof."),
    gear("wood_axe", 95, "Slow, but it hits like a falling tree."),
    gear("copper_ring", 45, "Plain copper. Rolls one random blessing."),
    ...(s.runeStock ? [{
      name: `${FACES[s.runeStock].name} Rune`, icon: FACES[s.runeStock].icon ?? "star", price: FACES[s.runeStock].rare ? 220 : 120,
      desc: `From the apprentice. ${FACES[s.runeStock].text}.`,
      buy: (g2: Game) => { const f = g2.save.runeStock!; g2.save.runes[f] = (g2.save.runes[f] ?? 0) + 1; g2.save.runeStock = null; return true; },
    }] : []),
  ];
}
const BASE_NAME = (id: string) => BASES[id].name;
const onceFlag = (r: Recipe) => (r.id === "ember_flask" ? "emberFlask" : r.id === "bell_charm" ? "bellCharm" : "made_" + r.id);
const ICON = (id: string) => BASES[id].icon;

export class ShopMenu implements Overlay {
  tab = 0;
  sel = 0;
  arm = -1;
  msg = ""; msgT = 0;

  update(g: Game, dt: number) {
    const inp = g.input;
    this.msgT = Math.max(0, this.msgT - dt);
    if (inp.pressed("cancel") || inp.pressed("menu") || inp.pressed("pause")) { audio.play("close"); g.closeOverlay(); g.persist(); return; }
    if (inp.pressed("tabL")) { this.tab = (this.tab + TABS.length - 1) % TABS.length; this.sel = 0; this.arm = -1; audio.play("move"); }
    if (inp.pressed("tabR")) { this.tab = (this.tab + 1) % TABS.length; this.sel = 0; this.arm = -1; audio.play("move"); }

    if (this.tab === 0) {
      const list = wares(g);
      this.vnav(g, list.length);
      if (inp.pressed("confirm")) {
        const w = list[this.sel];
        if (w.price === null) { audio.play("deny"); this.say("Sold out."); }
        else if (!g.canAfford(w.price)) { audio.play("deny"); this.say("You can't afford that."); }
        else if (w.buy(g)) { g.spend(w.price); audio.play("coin"); this.say(`Bought ${w.name}.`); g.persist(); }
        else { audio.play("deny"); this.say("Your pack is full."); }
      }
    } else if (this.tab === 1) {
      const n = gridNav(g, this.sel, 7, INV_SIZE);
      if (n !== this.sel) { this.sel = n; this.arm = -1; }
      const it = g.save.inv[this.sel];
      if (inp.pressed("confirm") && it) {
        if (it.rarity >= 2 && this.arm !== this.sel) { this.arm = this.sel; audio.play("deny"); this.say("Press again to sell. Are you sure?"); }
        else {
          const v = sellValue(it);
          g.save.inv[this.sel] = null; g.save.bank += v; this.arm = -1;
          audio.play("coin"); this.say(`Sold for ${v} gold (to bank).`);
          g.persist();
        }
      }
    } else if (this.tab === 3) {
      this.vnav(g, RECIPES.length);
      if (inp.pressed("confirm")) {
        const rc = RECIPES[this.sel];
        const s = g.save;
        if (rc.once && s.flags[onceFlag(rc)]) { audio.play("deny"); this.say("Already done. Brom won't do it twice."); }
        else if (!canCraft(s.mats, rc)) { audio.play("deny"); this.say("You're missing parts. Bosses drop them."); }
        else if (!g.canAfford(rc.gold)) { audio.play("deny"); this.say("Not enough gold."); }
        else if (rc.item && !g.giveItem(makeCrafted(rc.item))) { audio.play("deny"); this.say("Your pack is full."); }
        else {
          for (const [m, n] of Object.entries(rc.cost) as [MatId, number][]) s.mats[m] = (s.mats[m] ?? 0) - n;
          g.spend(rc.gold);
          if (rc.once) s.flags[onceFlag(rc)] = true;
          s.flags.crafted = true;
          audio.play("forge");
          this.say(rc.item ? `${rc.name}! Brom hands it over, still warm.` : `${rc.name}. Brom nods: done.`);
          g.onGearChanged(); g.persist(); g.checkDiary();
        }
      }
    } else {
      const list = this.forgeList(g);
      this.vnav(g, list.length);
      if (inp.pressed("confirm") && list[this.sel]) {
        const it = list[this.sel];
        const cost = forgeCost(it);
        if (it.plus >= FORGE_MAX) { audio.play("deny"); this.say("It can't take any more temper."); }
        else if (g.save.shards < cost.shards) { audio.play("deny"); this.say("Not enough Blight Shards."); }
        else if (!g.canAfford(cost.gold)) { audio.play("deny"); this.say("Not enough gold."); }
        else {
          g.spend(cost.gold); g.save.shards -= cost.shards; it.plus++;
          g.save.flags.tempered = true; g.checkDiary();
          audio.play("forge"); this.say(`${displayName(it)}! Brom grins.`);
          g.onGearChanged(); g.persist();
        }
      }
    }
  }

  private vnav(g: Game, n: number) {
    const inp = g.input;
    if (inp.pressed("up") && this.sel > 0) { this.sel--; audio.play("move"); }
    if (inp.pressed("down") && this.sel < n - 1) { this.sel++; audio.play("move"); }
    this.sel = Math.max(0, Math.min(this.sel, n - 1));
  }
  private say(m: string) { this.msg = m; this.msgT = 2.5; }

  forgeList(g: Game): Item[] {
    const out: Item[] = [];
    for (const sl of SLOTS) { const it = g.save.eq[sl]; if (it) out.push(it); }
    for (const it of g.save.inv) if (it) out.push(it);
    return out;
  }

  draw(g: Game, ctx: Ctx) {
    const s = g.save;
    panel(ctx, 6, 6, 372, 204, 0.96);
    drawText(ctx, "BROM'S SMITHY", 14, 12, C.gold2);
    TABS.forEach((t, i) => {
      const x = 96 + i * 40, sel = i === this.tab;
      drawText(ctx, t, x, 12, sel ? C.cream : C.faint);
      if (sel) rect(ctx, x, 19, textWidth(t), 1, C.gold2);
    });
    drawIcon(ctx, "coin", 262, 8); drawText(ctx, `${s.bank + s.gold}`, 276, 12, C.gold2);
    drawIcon(ctx, "shard", 318, 8); drawText(ctx, `${s.shards}`, 332, 12, C.blight5);
    rect(ctx, 10, 23, 364, 1, C.border);

    if (this.tab === 0) {
      wares(g).forEach((w, i) => {
        const y = 30 + i * 22, sel = i === this.sel;
        if (sel) { rect(ctx, 12, y - 2, 238, 20, C.panelHi); rect(ctx, 12, y - 2, 1, 20, C.gold2); }
        drawIcon(ctx, w.icon, 16, y + 1);
        drawText(ctx, w.name, 34, y + 1, sel ? C.cream : C.dim);
        drawText(ctx, w.desc, 34, y + 9, C.faint);
        drawText(ctx, w.price === null ? "-" : `${w.price}G`, 246, y + 1, w.price !== null && g.canAfford(w.price) ? C.gold2 : C.bad, { align: "right" });
      });
      const quip = wrap("\"Everything here's Common. The good stuff you'll have to pry off the Rot yourself.\"", 110);
      quip.forEach((l, i) => drawText(ctx, l, 260, 34 + i * 8, C.dim));
      hint(ctx, 370, 199, [["J", "BUY"], ["Q/E", "TABS"], ["ESC", "LEAVE"]], "right");
    } else if (this.tab === 1) {
      for (let i = 0; i < INV_SIZE; i++) slotBox(ctx, 14 + (i % 7) * 18, 30 + Math.floor(i / 7) * 18, s.inv[i], i === this.sel);
      const it = s.inv[this.sel];
      if (it) {
        const lines = itemLines(it, s.eq[baseOf(it).slot], 220).slice(0, 12);
        panel(ctx, 146, 28, 226, lines.length * 8 + 8, 0.9);
        rect(ctx, 148, 30, 222, 1, RARITY[it.rarity].color);
        lines.forEach((l, i) => drawText(ctx, l.text, 151, 33 + i * 8, l.color));
      }
      drawText(ctx, "Gold from sales goes straight to your bank.", 14, 108, C.faint);
      hint(ctx, 370, 199, [["J", this.arm === this.sel ? "CONFIRM" : "SELL"], ["Q/E", "TABS"], ["ESC", "LEAVE"]], "right");
    } else if (this.tab === 3) {
      RECIPES.forEach((rc, i) => {
        const y = 28 + i * 23, sel = i === this.sel;
        const done = rc.once && s.flags[onceFlag(rc)];
        if (sel) { rect(ctx, 12, y - 1, 238, 22, C.panelHi); rect(ctx, 12, y - 1, 1, 22, C.gold2); }
        drawIcon(ctx, rc.icon, 16, y + 3);
        drawText(ctx, rc.name, 34, y + 1, done ? C.faint : rc.item ? RARITY[3].color : C.gold2);
        let cx = 34;
        for (const [m, n] of Object.entries(rc.cost) as [MatId, number][]) {
          const have = s.mats[m] ?? 0;
          drawIcon(ctx, MATS[m].icon, cx - 1, y + 8);
          cx += 12 + drawText(ctx, `${Math.min(have, 99)}/${n}`, cx + 11, y + 11, have >= n ? C.cream : C.bad) + 4;
        }
        drawText(ctx, done ? "DONE" : `${rc.gold}G`, 246, y + 1, done ? C.good : g.canAfford(rc.gold) ? C.gold2 : C.bad, { align: "right" });
      });
      const rc = RECIPES[this.sel];
      panel(ctx, 256, 28, 116, 164, 0.9);
      if (rc.item) {
        const lines = itemLines(makeCrafted(rc.item), null, 106, false).slice(0, 17);
        lines.forEach((l, i) => drawText(ctx, l.text, 261, 33 + i * 8, l.color));
      } else wrap(`${rc.name}. ${rc.desc}`, 106).forEach((l, i) => drawText(ctx, l, 261, 34 + i * 8, i === 0 ? C.gold2 : C.cream));
      hint(ctx, 370, 199, [["J", "CRAFT"], ["Q/E", "TABS"], ["ESC", "LEAVE"]], "right");
    } else {
      const list = this.forgeList(g);
      if (!list.length) drawText(ctx, "Nothing to temper.", 14, 32, C.faint);
      const start = Math.max(0, Math.min(this.sel - 3, list.length - 8));
      list.slice(start, start + 8).forEach((it, k) => {
        const i = start + k, y = 30 + k * 20, sel = i === this.sel;
        if (sel) { rect(ctx, 12, y - 2, 226, 18, C.panelHi); rect(ctx, 12, y - 2, 1, 18, C.gold2); }
        slotBox(ctx, 16, y - 1, it, false);
        drawText(ctx, ellipsize(displayName(it), 120), 36, y + 1, RARITY[it.rarity].color);
        const equipped = SLOTS.some((sl) => s.eq[sl] === it);
        if (equipped) drawText(ctx, "EQUIPPED", 36, y + 9, C.faint);
        if (it.plus >= FORGE_MAX) drawText(ctx, "MAX", 234, y + 4, C.gold2, { align: "right" });
        else {
          const c = forgeCost(it);
          drawText(ctx, `${c.gold}G`, 200, y + 1, g.canAfford(c.gold) ? C.gold2 : C.bad, { align: "right" });
          drawText(ctx, `${c.shards} SHARD${c.shards > 1 ? "S" : ""}`, 234, y + 9, s.shards >= c.shards ? C.blight5 : C.bad, { align: "right" });
        }
      });
      const it = list[this.sel];
      if (it) {
        panel(ctx, 246, 28, 126, 100, 0.9);
        drawText(ctx, "TEMPERING", 252, 34, C.dim);
        drawText(ctx, `+${it.plus} > +${Math.min(FORGE_MAX, it.plus + 1)}`, 252, 44, C.gold2, { scale: 2 });
        const now = itemStats(it);
        const next = itemStats({ ...it, plus: Math.min(FORGE_MAX, it.plus + 1) });
        let y = 62;
        if (now.dmg && next.dmg) { drawText(ctx, `DMG ${now.dmg[0]}-${now.dmg[1]} > ${next.dmg[0]}-${next.dmg[1]}`, 252, y, C.cream); y += 9; }
        if (now.def || next.def) { drawText(ctx, `ARMOUR ${now.def} > ${next.def}`, 252, y, C.cream); y += 9; }
        if (now.hp || next.hp) { drawText(ctx, `HEALTH ${now.hp} > ${next.hp}`, 252, y, C.cream); y += 9; }
        wrap("Each temper adds 10% to base stats. Shards come from the Rot, mostly from Wick.", 114).forEach((l, i) => drawText(ctx, l, 252, 96 + i * 8, C.faint));
      }
      hint(ctx, 370, 199, [["J", "TEMPER"], ["Q/E", "TABS"], ["ESC", "LEAVE"]], "right");
    }
    if (this.msgT > 0) {
      ctx.globalAlpha = Math.min(1, this.msgT * 2);
      drawText(ctx, this.msg, 14, 199, C.cream);
      ctx.globalAlpha = 1;
    }
  }
}
