/** Seeded PRNG (mulberry32). Gameplay uses the shared `rng`; art uses fixed seeds so it is stable. */
export class RNG {
  private s: number;
  constructor(seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0) {
    this.s = seed >>> 0 || 1;
  }
  next(): number {
    this.s = (this.s + 0x6d2b79f5) | 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a: number, b: number) { return a + (b - a) * this.next(); }
  /** Inclusive integer range. */
  int(a: number, b: number) { return Math.floor(this.range(a, b + 1)); }
  chance(p: number) { return this.next() < p; }
  /** True with probability 1/n — reads like an OSRS drop rate. */
  oneIn(n: number) { return this.next() * n < 1; }
  pick<T>(a: readonly T[]): T { return a[Math.floor(this.next() * a.length)]; }
  sign() { return this.next() < 0.5 ? -1 : 1; }
  weighted<T>(entries: readonly (readonly [T, number])[]): T {
    let total = 0;
    for (const [, w] of entries) total += w;
    let r = this.next() * total;
    for (const [v, w] of entries) { if ((r -= w) < 0) return v; }
    return entries[entries.length - 1][0];
  }
}

export const rng = new RNG();
