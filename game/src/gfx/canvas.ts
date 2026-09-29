export type Ctx = CanvasRenderingContext2D;

export function makeCanvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

export function px(ctx: Ctx, x: number, y: number, c: string) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
}

export function rect(ctx: Ctx, x: number, y: number, w: number, h: number, c: string) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Bresenham line, `t` px thick (grows downward/rightward). */
export function line(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, c: string, t = 1) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  ctx.fillStyle = c;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    ctx.fillRect(x0, y0, t, t);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

/** Filled pixel ellipse centred on (cx, cy). */
export function disc(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, c: string) {
  ctx.fillStyle = c;
  const rx2 = rx * rx, ry2 = ry * ry;
  for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
    const span = Math.sqrt(Math.max(0, 1 - (y * y) / (ry2 || 1))) * rx;
    if (span <= 0 && Math.abs(y) > ry - 0.01) continue;
    const s = Math.round(span);
    ctx.fillRect(Math.round(cx - s), Math.round(cy + y), s * 2 + 1, 1);
  }
  void rx2;
}

/** Plot a list of points along an angle (for weapons). Returns tip position. */
export function ray(ctx: Ctx, x: number, y: number, ang: number, len: number, c: string, from = 0) {
  const cx = Math.cos(ang), cy = Math.sin(ang);
  ctx.fillStyle = c;
  for (let i = from; i <= len; i++) ctx.fillRect(Math.round(x + cx * i), Math.round(y + cy * i), 1, 1);
  return [Math.round(x + cx * len), Math.round(y + cy * len)] as const;
}

/** Snap an angle to 16 directions so rotated pixel weapons stay clean. */
export const snapAng = (a: number) => Math.round(a / (Math.PI / 8)) * (Math.PI / 8);
