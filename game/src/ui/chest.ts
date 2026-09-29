import { audio } from "../core/audio";
import { H, W } from "../core/constants";
import { clamp } from "../core/math";
import { rect, type Ctx } from "../gfx/canvas";
import { drawText } from "../gfx/font";
import { drawIcon } from "../gfx/icons";
import { C, RARITY } from "../gfx/palette";
import type { Game } from "../game";
import { MATS } from "../systems/crafting";
import { FACES, type FaceId } from "../systems/dice";
import { baseOf, displayName } from "../systems/items";
import type { Drop } from "../systems/loot";
import { PETS } from "../systems/pets";
import { ORES } from "../systems/relics";
import { drawDie } from "./dice";
import type { Overlay } from "./menu";
import { ellipsize, hint, panel } from "./widgets";

export interface DropInfo { icon: string; label: string; color: string; rank: number; face?: FaceId }

/** How a drop looks on a reveal card, and how exciting it is (drives order and sound). */
export function dropInfo(d: Drop): DropInfo {
  switch (d.type) {
    case "gold": return { icon: "coin", label: `${d.amount} GOLD`, color: C.gold2, rank: 0 };
    case "shard": return { icon: "shard", label: d.amount === 1 ? "BLIGHT SHARD" : `${d.amount} BLIGHT SHARDS`, color: C.blight5, rank: 1 };
    case "orb": return { icon: "tonic", label: "HEALTH ORB", color: C.hp, rank: 0 };
    case "mat": {
      const m = MATS[d.id];
      return { icon: m.icon, label: `${d.amount > 1 ? d.amount + "x " : ""}${m.name.toUpperCase()}`, color: m.color, rank: d.id === "blade" || d.id === "bellshard" ? 3 : d.id === "button" || d.id === "pearl" ? 2 : 1 };
    }
    case "rune": return { icon: "star", label: `${FACES[d.face].name.toUpperCase()} RUNE`, color: FACES[d.face].color, rank: FACES[d.face].rare ? 3 : 2, face: d.face };
    case "map": return { icon: "map", label: "TREASURE MAP", color: C.paper, rank: 2 };
    case "item": return { icon: baseOf(d.item).icon, label: displayName(d.item).toUpperCase(), color: RARITY[d.item.rarity].color, rank: d.item.rarity + 1 };
    case "ore": return { icon: ORES[d.id].icon, label: `${d.amount > 1 ? d.amount + "x " : ""}${ORES[d.id].name.toUpperCase()}`, color: ORES[d.id].color, rank: d.id === "gleam" ? 3 : d.id === "silver" ? 2 : 1 };
    case "pet": return { icon: d.pet === "grim" ? "diver" : "pet", label: PETS[d.pet].stages[0].toUpperCase(), color: RARITY[5].color, rank: 8 };
  }
}

/**
 * Opening a chest: face-down cards flip one at a time, cheapest first, so the best drop
 * always lands last. Press to skip ahead, press again to take everything.
 */
export class ChestReveal implements Overlay {
  t = 0;
  shown = 0;
  private nextT = 0.7;
  private flips: number[] = [];
  readonly drops: Drop[];
  constructor(private title: string, drops: Drop[], private onTake: (g: Game) => void) {
    this.drops = [...drops].sort((a, b) => dropInfo(a).rank - dropInfo(b).rank);
    audio.play("chest");
  }
  private get allShown() { return this.shown >= this.drops.length; }
  private flip() {
    const info = dropInfo(this.drops[this.shown]);
    this.flips[this.shown] = this.t;
    this.shown++;
    if (info.rank >= 4) audio.loot(Math.min(5, info.rank - 1));
    else audio.play("reveal", info.rank);
    this.nextT = this.t + (this.shown < this.drops.length && dropInfo(this.drops[this.shown]).rank >= 4 ? 0.9 : 0.4);
  }
  update(g: Game, dt: number) {
    this.t += dt;
    if (!this.allShown && this.t >= this.nextT) this.flip();
    const inp = g.input;
    if (inp.pressed("confirm") || inp.pressed("interact") || inp.pressed("cancel")) {
      if (!this.allShown) { while (!this.allShown) this.flip(); return; }
      audio.play("close");
      g.closeOverlay();
      this.onTake(g);
    }
  }
  draw(_g: Game, ctx: Ctx) {
    ctx.globalAlpha = 0.6; rect(ctx, 0, 0, W, H, C.black); ctx.globalAlpha = 1;
    const n = this.drops.length;
    const cols = Math.min(5, Math.max(1, n)), rows = Math.ceil(n / 5);
    const cw = 68, ch = 50;
    const pw = Math.max(220, cols * (cw + 4) + 16), ph = rows * (ch + 4) + 44;
    const px = Math.round((W - pw) / 2), py = Math.round((H - ph) / 2) - 6;
    panel(ctx, px, py, pw, ph, 0.96);
    drawText(ctx, this.title, W / 2, py + 7, C.gold2, { align: "center" });
    this.drops.forEach((d, i) => {
      const row = Math.floor(i / 5), inRow = row === rows - 1 ? n - row * 5 : 5;
      const col = i % 5;
      const x = Math.round(W / 2 - (inRow * (cw + 4) - 4) / 2 + col * (cw + 4)), y = py + 20 + row * (ch + 4);
      if (i >= this.shown) {
        // face down
        const bob = Math.round(Math.sin(this.t * 5 + i) * 1);
        rect(ctx, x, y + bob, cw, ch, C.border); rect(ctx, x + 1, y + 1 + bob, cw - 2, ch - 2, C.panelHi);
        for (let k = 0; k < 4; k++) rect(ctx, x + 6 + k * 16, y + 6 + bob, 8, ch - 12, "#241e36");
        drawText(ctx, "?", x + cw / 2, y + ch / 2 - 3 + bob, C.faint, { align: "center", scale: 2 });
        return;
      }
      const info = dropInfo(d);
      const age = this.t - (this.flips[i] ?? -9);
      const pop = clamp(1 - age / 0.25, 0, 1);
      rect(ctx, x - pop * 2, y - pop * 2, cw + pop * 4, ch + pop * 4, info.color);
      rect(ctx, x + 1, y + 1, cw - 2, ch - 2, "#171325");
      ctx.globalAlpha = 0.18; rect(ctx, x + 1, y + 1, cw - 2, ch - 2, info.color); ctx.globalAlpha = 1;
      if (info.face) drawDie(ctx, x + cw / 2 - 12, y + 5, 24, info.face);
      else drawIcon(ctx, info.icon, x + cw / 2 - 12, y + 5, 2);
      const words = info.label.split(" ");
      // two short lines under the icon
      let l1 = "", l2 = "";
      for (const w of words) { if ((l1 + " " + w).trim().length <= 13 && !l2) l1 = (l1 + " " + w).trim(); else l2 = (l2 + " " + w).trim(); }
      drawText(ctx, l1, x + cw / 2, y + 32, info.color, { align: "center" });
      if (l2) drawText(ctx, ellipsize(l2, cw - 4), x + cw / 2, y + 40, info.color, { align: "center" });
      if (pop > 0 && info.rank >= 4) {
        ctx.globalAlpha = pop * 0.6; rect(ctx, 0, 0, W, H, info.color); ctx.globalAlpha = 1;
      }
    });
    hint(ctx, W / 2, py + ph - 10, [["J", this.allShown ? "TAKE ALL" : "REVEAL ALL"]], "center");
  }
}
