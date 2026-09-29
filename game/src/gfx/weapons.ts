import type { WeaponKind } from "../systems/items";
import { snapAng, type Ctx } from "./canvas";
import { C } from "./palette";

/** Draw a held weapon from the hand at an angle. Angles snap to 16 directions for clean pixels. */
export function drawWeapon(ctx: Ctx, kind: WeaponKind, hx: number, hy: number, angle: number, glint: string | null, time: number) {
  const a = snapAng(angle);
  const dx = Math.cos(a), dy = Math.sin(a);
  const nx = -dy, ny = dx; // perpendicular (the "lower" side when pointing forward)
  const P = (i: number, j: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(hx + dx * i + nx * j), Math.round(hy + dy * i + ny * j), 1, 1);
  };
  let len = 11;
  switch (kind) {
    case "sword":
    case "dagger": {
      len = kind === "sword" ? 12 : 7;
      for (let i = -2; i <= 0; i++) P(i, 0, C.wood1);
      P(-3, 0, C.gold1);
      P(1, -1, C.gold2); P(1, 0, C.gold1); P(1, 1, C.gold2); if (kind === "sword") { P(1, -2, C.gold1); P(1, 2, C.gold1); }
      for (let i = 2; i <= len; i++) { P(i, 0, C.steel2); if (i < len) P(i, 1, C.steel1); }
      P(len + 1, 0, C.steel3);
      break;
    }
    case "axe": {
      len = 13;
      for (let i = -2; i <= len; i++) P(i, 0, i < 2 ? C.wood1 : C.wood2);
      for (let i = len - 4; i <= len; i++) for (let j = 1; j <= 4; j++) {
        if (j === 4 && (i === len - 4 || i === len)) continue;
        P(i, j, j === 4 ? C.steel3 : j === 1 ? C.steel0 : C.steel1);
      }
      P(len - 1, -1, C.steel0); P(len - 2, -1, C.steel0);
      break;
    }
    case "spear": {
      len = 24;
      for (let i = -5; i <= len - 4; i++) P(i, 0, i % 6 === 0 ? C.wood1 : C.wood2);
      for (let j = -2; j <= 2; j++) P(len - 4, j, C.steel1);
      for (const j of [-2, 0, 2]) for (let i = len - 3; i <= len; i++) P(i, j, i === len ? C.steel3 : C.steel2);
      break;
    }
    case "scythe": {
      len = 20;
      for (let i = -5; i <= len; i++) P(i, 0, i % 5 === 0 ? C.wood0 : C.wood1);
      P(4, -1, C.wood2); P(4, 1, C.wood2);
      for (let k = 0; k <= 13; k++) {
        const bi = len - (k * k) / 16, bj = k;
        P(bi, bj, k > 11 ? C.steel3 : C.steel2);
        P(bi - 1, bj, C.steel1);
        if (k < 10) P(bi + 1, bj, C.steel0);
      }
      break;
    }
  }
  if (glint) {
    const g = Math.floor((time * 26) % (len + 20));
    if (g > 1 && g <= len) { P(g, 0, C.white); P(g - 1, 0, glint); }
  }
  // the gripping hand sits on top
  ctx.fillStyle = C.skin1;
  ctx.fillRect(Math.round(hx) - 1, Math.round(hy) - 1, 2, 2);
  return { tipX: hx + dx * (len + 1), tipY: hy + dy * (len + 1), len };
}

/** Pixel slash smear between two angles. */
export function drawSmear(ctx: Ctx, cx: number, cy: number, a0: number, a1: number, r0: number, r1: number, fade: number, color: string) {
  const steps = 18;
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const a = a0 + (a1 - a0) * t;
    const strength = t * fade;
    if (strength < 0.15) continue;
    const inner = r0 + (r1 - r0) * (1 - t) * 0.5;
    for (let r = inner; r <= r1; r += 1) {
      const edge = (r - inner) / (r1 - inner + 0.01);
      ctx.fillStyle = edge > 0.7 && strength > 0.5 ? C.white : color;
      if ((r + s) % 2 === 0 || strength > 0.55) ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1);
    }
  }
}
