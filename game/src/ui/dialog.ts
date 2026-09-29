import { audio } from "../core/audio";
import { H, W } from "../core/constants";
import { makeCanvas, rect, type Ctx } from "../gfx/canvas";
import { drawText, wrap } from "../gfx/font";
import { C } from "../gfx/palette";
import type { Game } from "../game";
import type { Overlay } from "./menu";
import { panel } from "./widgets";

const [pc, pctx] = makeCanvas(32, 30);

/** Typewriter dialogue box with an optional 2× portrait. */
export class Dialog implements Overlay {
  i = 0;
  chars = 0;
  constructor(
    private name: string,
    private lines: string[],
    private portrait: ((ctx: Ctx, x: number, y: number) => void) | null,
    private onDone?: (g: Game) => void,
  ) { }

  update(g: Game, dt: number) {
    const inp = g.input;
    const line = this.lines[this.i];
    const before = Math.floor(this.chars);
    this.chars = Math.min(line.length, this.chars + dt * 75);
    if (Math.floor(this.chars) !== before && Math.floor(this.chars) % 3 === 0 && line[Math.floor(this.chars)] !== " ") audio.play("move");
    const next = inp.pressed("confirm") || inp.pressed("interact");
    if (next) {
      if (this.chars < line.length) this.chars = line.length;
      else if (this.i < this.lines.length - 1) { this.i++; this.chars = 0; }
      else this.finish(g);
    } else if (inp.pressed("cancel")) this.finish(g);
  }

  private finish(g: Game) {
    g.closeOverlay();
    this.onDone?.(g);
  }

  draw(_g: Game, ctx: Ctx) {
    const x = 20, y = H - 66, w = W - 40, h = 58;
    panel(ctx, x, y, w, h, 0.96);
    let tx = x + 8;
    if (this.portrait) {
      rect(ctx, x + 5, y + 5, 48, 48, C.border);
      rect(ctx, x + 6, y + 6, 46, 46, C.inkSoft);
      pctx.clearRect(0, 0, 32, 30);
      this.portrait(pctx, 16, 36);
      ctx.save();
      ctx.beginPath(); ctx.rect(x + 6, y + 6, 46, 46); ctx.clip();
      ctx.drawImage(pc, 0, 0, 32, 30, x - 3, y + 2, 64, 60);
      ctx.restore();
      tx = x + 60;
    }
    drawText(ctx, this.name.toUpperCase(), tx, y + 7, C.gold2);
    const line = this.lines[this.i];
    const shown = line.slice(0, Math.floor(this.chars));
    const full = wrap(line, w - (tx - x) - 10);
    let remaining = shown.length;
    full.forEach((l, k) => {
      if (remaining <= 0) return;
      const part = l.slice(0, remaining);
      remaining -= l.length + 1;
      drawText(ctx, part, tx, y + 19 + k * 9, C.cream);
    });
    if (this.chars >= line.length && Math.floor(performance.now() / 350) % 2 === 0) {
      drawText(ctx, this.i < this.lines.length - 1 ? "↓" : "•", x + w - 10, y + h - 11, C.gold2);
    }
    drawText(ctx, `${this.i + 1}/${this.lines.length}`, x + w - 16, y + 7, C.faint, { align: "right" });
  }
}
