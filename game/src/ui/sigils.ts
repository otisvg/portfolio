import { audio } from "../core/audio";
import { W } from "../core/constants";
import { rect, type Ctx } from "../gfx/canvas";
import { drawText, wrap } from "../gfx/font";
import { drawIcon } from "../gfx/icons";
import { C } from "../gfx/palette";
import type { Game } from "../game";
import { SIGIL_IDS, SIGIL_REWARD, SIGILS } from "../systems/sigils";
import type { Overlay } from "./menu";
import { hint, panel } from "./widgets";

/** The sigil stone: toggle opt-in boss modifiers for better, published rewards. */
export class SigilMenu implements Overlay {
  sel = 0;
  constructor(private bossName: string, private unlocked: boolean) { }
  update(g: Game) {
    const inp = g.input;
    if (inp.pressed("cancel") || inp.pressed("menu")) { audio.play("close"); g.closeOverlay(); g.persist(); return; }
    if (inp.pressed("up") && this.sel > 0) { this.sel--; audio.play("move"); }
    if (inp.pressed("down") && this.sel < SIGIL_IDS.length - 1) { this.sel++; audio.play("move"); }
    if (inp.pressed("confirm") || inp.pressed("interact")) {
      if (!this.unlocked) { audio.play("deny"); return; }
      const id = SIGIL_IDS[this.sel];
      g.save.sigils[id] = !g.save.sigils[id];
      audio.play(g.save.sigils[id] ? "sigil" : "move");
      g.onSigilsChanged();
    }
  }
  draw(g: Game, ctx: Ctx) {
    const x = W / 2 - 110, y = 34, w = 220, h = 140;
    panel(ctx, x, y, w, h, 0.96);
    drawText(ctx, "SIGIL STONE", W / 2, y + 7, C.blight5, { align: "center" });
    drawText(ctx, this.bossName.toUpperCase(), W / 2, y + 17, C.faint, { align: "center" });
    rect(ctx, x + 8, y + 27, w - 16, 1, C.border);
    if (!this.unlocked) {
      wrap("The stone is cold. Fell this boss once and its sigils will answer you.", w - 20).forEach((l, i) => drawText(ctx, l, x + 10, y + 40 + i * 9, C.dim));
      hint(ctx, W / 2, y + h + 6, [["ESC", "LEAVE"]], "center");
      return;
    }
    SIGIL_IDS.forEach((id, i) => {
      const sg = SIGILS[id], on = !!g.save.sigils[id], sel = i === this.sel;
      const yy = y + 33 + i * 22;
      if (sel) { rect(ctx, x + 6, yy - 2, w - 12, 20, C.panelHi); rect(ctx, x + 6, yy - 2, 1, 20, C.gold2); }
      drawIcon(ctx, "sigil", x + 10, yy + 1);
      drawText(ctx, sg.name.toUpperCase(), x + 26, yy, on ? sg.color : sel ? C.cream : C.dim);
      drawText(ctx, sg.effect, x + 26, yy + 9, C.faint);
      drawText(ctx, on ? "ON" : "OFF", x + w - 12, yy, on ? C.good : C.faint, { align: "right" });
    });
    rect(ctx, x + 8, y + 101, w - 16, 1, C.border);
    wrap(SIGIL_REWARD, w - 20).forEach((l, i) => drawText(ctx, l, x + 10, y + 106 + i * 8, C.gold2));
    drawText(ctx, "Sigils apply to bosses you've already felled.", x + 10, y + 126, C.faint);
    hint(ctx, W / 2, y + h + 6, [["J", "TOGGLE"], ["ESC", "DONE"]], "center");
  }
}
