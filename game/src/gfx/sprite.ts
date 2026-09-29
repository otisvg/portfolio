import { makeCanvas, type Ctx } from "./canvas";
import { C } from "./palette";

/**
 * Characters are drawn procedurally each frame into a scratch buffer (always facing right,
 * feet anchored at the bottom-centre), then composited with a 1px ink outline, optional
 * flip and hit-flash. This gives hand-pixelled looking sprites with smooth, pose-driven animation.
 */
export class SpriteBuf {
  readonly c: HTMLCanvasElement;
  readonly ctx: Ctx;
  private sil: HTMLCanvasElement;
  private silCtx: Ctx;
  /** Anchor inside the buffer (feet centre). */
  readonly ax: number;
  readonly ay: number;

  constructor(readonly w: number, readonly h: number, below = 4) {
    [this.c, this.ctx] = makeCanvas(w, h);
    [this.sil, this.silCtx] = makeCanvas(w, h);
    this.ax = Math.floor(w / 2);
    this.ay = h - below;
  }

  begin(): Ctx {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.globalAlpha = 1;
    this.ctx.clearRect(0, 0, this.w, this.h);
    this.ctx.translate(this.ax, this.ay);
    return this.ctx;
  }

  private silhouette(color: string) {
    const s = this.silCtx;
    s.globalCompositeOperation = "source-over";
    s.clearRect(0, 0, this.w, this.h);
    s.drawImage(this.c, 0, 0);
    s.globalCompositeOperation = "source-in";
    s.fillStyle = color;
    s.fillRect(0, 0, this.w, this.h);
    s.globalCompositeOperation = "source-over";
    return this.sil;
  }

  /** Composite onto `dst` so the anchor lands at world-screen (x, y). */
  end(dst: Ctx, x: number, y: number, o: { flip?: boolean; outline?: string | null; flash?: number; alpha?: number; flashColor?: string } = {}) {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    x = Math.round(x); y = Math.round(y);
    dst.save();
    dst.globalAlpha = o.alpha ?? 1;
    dst.translate(x, y);
    if (o.flip) dst.scale(-1, 1);
    const ox = -this.ax, oy = -this.ay;
    const outline = o.outline === undefined ? C.ink : o.outline;
    if (outline) {
      const sil = this.silhouette(outline);
      dst.drawImage(sil, ox - 1, oy);
      dst.drawImage(sil, ox + 1, oy);
      dst.drawImage(sil, ox, oy - 1);
      dst.drawImage(sil, ox, oy + 1);
    }
    dst.drawImage(this.c, ox, oy);
    if (o.flash && o.flash > 0) {
      dst.globalAlpha = (o.alpha ?? 1) * Math.min(1, o.flash);
      dst.drawImage(this.silhouette(o.flashColor ?? "#ffffff"), ox, oy);
    }
    dst.restore();
  }
}

/** Soft dithered ground shadow. */
export function shadow(ctx: Ctx, cx: number, groundY: number, w: number, a = 0.35) {
  ctx.globalAlpha = a;
  ctx.fillStyle = C.ink;
  const x = Math.round(cx - w / 2), y = Math.round(groundY) - 1;
  ctx.fillRect(x + 1, y, w - 2, 1);
  ctx.fillRect(x + 2, y + 1, w - 4, 1);
  ctx.globalAlpha = 1;
}
