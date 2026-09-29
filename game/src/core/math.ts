export interface Rect { x: number; y: number; w: number; h: number }

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const approach = (v: number, target: number, delta: number) =>
  v < target ? Math.min(v + delta, target) : Math.max(v - delta, target);
export const smoothstep = (t: number) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
export const sign = (v: number) => (v < 0 ? -1 : v > 0 ? 1 : 0);

export const overlap = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Deterministic integer hash → [0, 1). Used for stable procedural art. */
export function hash(x: number, y: number, s = 0): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 982451653)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Smooth 1D value noise, deterministic. */
export function noise1(x: number, s = 0): number {
  const i = Math.floor(x), f = x - i;
  const a = hash(i, 0, s), b = hash(i + 1, 0, s);
  return lerp(a, b, f * f * (3 - 2 * f));
}

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** Ordered-dither threshold for a pixel, in (0, 1). */
export const bayer = (x: number, y: number) => (BAYER4[((y & 3) << 2) | (x & 3)] + 0.5) / 16;

// ---- colour helpers ----
const cache = new Map<string, [number, number, number]>();
export function rgb(hex: string): [number, number, number] {
  let c = cache.get(hex);
  if (!c) {
    const n = parseInt(hex.slice(1), 16);
    c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    cache.set(hex, c);
  }
  return c;
}
const h2 = (n: number) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, "0");
export function mix(a: string, b: string, t: number): string {
  const A = rgb(a), B = rgb(b);
  return "#" + h2(lerp(A[0], B[0], t)) + h2(lerp(A[1], B[1], t)) + h2(lerp(A[2], B[2], t));
}
/** Pick between two colours per-pixel with an ordered dither, for crisp pixel-art gradients. */
export const ditherMix = (a: string, b: string, t: number, x: number, y: number) => (t > bayer(x, y) ? b : a);
