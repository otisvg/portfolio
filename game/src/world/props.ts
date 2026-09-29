import { bayer, hash, mix } from "../core/math";
import { RNG } from "../core/rng";
import { disc, line, makeCanvas, ray, type Ctx } from "../gfx/canvas";
import { drawText } from "../gfx/font";
import { C } from "../gfx/palette";
import type { Level, PropDef } from "./level";

export interface StaticLight { x: number; y: number; r: number; color: string; flicker: number; strength?: number }
export interface Emitter { x: number; y: number; kind: "smoke" | "ember" | "drip" }
export interface PropLayer {
  canvas: HTMLCanvasElement;
  lights: StaticLight[];
  emitters: Emitter[];
  millHub: { x: number; y: number } | null;
}

type R = (x: number, y: number, w: number, h: number, c: string) => void;

export function renderProps(L: Level): PropLayer {
  const [canvas, ctx] = makeCanvas(L.pxW, L.pxH);
  const lights: StaticLight[] = [];
  const emitters: Emitter[] = [];
  let millHub: { x: number; y: number } | null = null;
  const r: R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const p = (x: number, y: number, c: string) => r(x, y, 1, 1, c);

  const order = (k: string) => (k === "mill" ? 0 : k === "tree" || k === "deadtree" || k === "blighttree" ? 1 : 2);
  const props = [...L.props].sort((a, b) => order(a.kind) - order(b.kind));

  for (const d of props) {
    const g = new RNG(Math.floor(d.x * 13 + d.v * 7 + 1));
    switch (d.kind) {
      case "house": house(d, g); break;
      case "smithy": smithy(d); break;
      case "well": well(d); break;
      case "lamp": lamp(d); break;
      case "gate": gate(d); break;
      case "fence": fence(d, g); break;
      case "wheat": wheat(d, g); break;
      case "scarecrow": scarecrow(d); break;
      case "tree": tree(d, g); break;
      case "deadtree": deadTree(d, g, false); break;
      case "blighttree": deadTree(d, g, true); break;
      case "grave": grave(d); break;
      case "mill": mill(d); break;
      case "post": post(d); break;
    }
  }
  return { canvas, lights, emitters, millHub };

  // ------------------------------------------------------------------ props
  function house(d: PropDef, g: RNG) {
    const w = 56 + d.v * 4, x = d.x, y = d.y;
    const wallH = 28, wallTop = y - wallH;
    const plaster = [C.paper, "#b9a58c", "#c8b39a"][d.v % 3];
    const plasterShade = mix(plaster, C.dirt2, 0.45);
    // foundation
    for (let yy = y - 6; yy < y; yy++) for (let xx = x; xx < x + w; xx++) {
      const off = (Math.floor((yy - y) / 3) & 1) * 3;
      p(xx, yy, (xx + off) % 6 === 0 || (yy - y) % 3 === 0 ? C.stone0 : hash(xx >> 1, yy, 3) > 0.6 ? C.stone2 : C.stone1);
    }
    // walls
    for (let yy = wallTop; yy < y - 6; yy++) for (let xx = x + 1; xx < x + w - 1; xx++) {
      const shade = (xx - x) / w * 0.5 + (yy - wallTop) / wallH * 0.3;
      p(xx, yy, shade > bayer(xx, yy) + 0.25 ? plasterShade : plaster);
    }
    // timber frame
    const beam = C.wood1;
    r(x, wallTop, 3, wallH - 6, beam); r(x + w - 3, wallTop, 3, wallH - 6, beam);
    r(x + (w >> 1) - 1, wallTop, 3, wallH - 6, beam);
    r(x, wallTop + 11, w, 2, beam); r(x, y - 8, w, 2, beam);
    line(ctx, x + 3, wallTop + 11, x + 14, wallTop, beam, 2);
    line(ctx, x + w - 4, wallTop + 11, x + w - 15, wallTop, beam, 2);
    // windows
    const wins = [x + 8, x + w - 17];
    for (const wx of wins) {
      const wy = wallTop + 13;
      r(wx - 1, wy - 1, 11, 10, C.wood0);
      for (let yy = 0; yy < 8; yy++) for (let xx = 0; xx < 9; xx++) p(wx + xx, wy + yy, (xx + yy) / 16 > bayer(xx, yy) ? C.fire1 : C.fire2);
      r(wx + 4, wy, 1, 8, C.wood0); r(wx, wy + 3, 9, 1, C.wood0);
      r(wx - 2, wy + 8, 13, 2, C.wood2);
      lights.push({ x: wx + 4, y: wy + 4, r: 22, color: C.fire1, flicker: 0.15 });
    }
    // door
    const dx = x + (w >> 1) - 5, dh = 16;
    r(dx - 1, y - 6 - dh - 1, 12, dh + 1, C.wood0);
    for (let yy = 0; yy < dh; yy++) for (let xx = 0; xx < 10; xx++) {
      if (yy < 2 && (xx < 2 - yy || xx > 7 + yy)) continue;
      p(dx + xx, y - 6 - dh + yy, xx % 3 === 0 ? C.wood1 : yy < dh / 2 ? C.wood3 : C.wood2);
    }
    p(dx + 7, y - 14, C.gold2);
    // roof (thatch)
    const roofH = 24, over = 5, ridge = Math.round(w * 0.28);
    const straws = [C.straw0, C.straw1, "#8a6a34", C.straw2];
    for (let yy = 0; yy < roofH; yy++) {
      const t = yy / roofH;
      const half = Math.round(ridge / 2 + t * (w / 2 + over - ridge / 2));
      const cx = x + w / 2;
      for (let xx = -half; xx < half; xx++) {
        const X = Math.round(cx + xx), Y = wallTop - roofH + yy + 2;
        const n = hash(X >> 1, Y, 50 + d.v);
        let c = straws[yy % 3 === 0 ? 0 : n > 0.66 ? 3 : n > 0.3 ? 1 : 2];
        if (xx < -half + 2 || yy === roofH - 1) c = C.wood0;
        if (xx > half - 3 && yy > 3) c = C.straw0;
        if (hash(X >> 1, Y, 9) > 0.965) c = C.grass1; // moss
        p(X, Y, c);
      }
    }
    // chimney
    const chx = x + w - 16 - g.int(0, 6);
    r(chx, wallTop - roofH - 4, 7, 14, C.stone1);
    r(chx, wallTop - roofH - 4, 7, 2, C.stone2);
    r(chx + 5, wallTop - roofH - 2, 2, 12, C.stone0);
    emitters.push({ x: chx + 3, y: wallTop - roofH - 5, kind: "smoke" });
  }

  function smithy(d: PropDef) {
    const x = d.x, y = d.y, w = 88;
    // back wall planks
    for (let yy = y - 36; yy < y; yy++) for (let xx = x + 2; xx < x + w - 2; xx++) {
      p(xx, yy, xx % 7 === 0 ? C.wood0 : hash(xx, yy >> 2, 60) > 0.7 ? C.wood2 : C.wood1);
    }
    // posts
    r(x, y - 40, 4, 40, C.wood2); r(x + w - 4, y - 40, 4, 40, C.wood2);
    r(x + 1, y - 40, 1, 40, C.wood3); r(x + w - 3, y - 40, 1, 40, C.wood3);
    // slanted shingle roof
    for (let yy = 0; yy < 14; yy++) {
      const Y = y - 54 + yy;
      for (let xx = -6 + yy; xx < w + 6 - (13 - yy) * 0; xx++) {
        const X = x + xx;
        const row = Math.floor(yy / 3);
        const sh = (X + row * 3) % 6 === 0 || yy % 3 === 2;
        p(X, Y, sh ? C.stone0 : hash(X >> 1, row, 61) > 0.5 ? "#4a3a52" : "#3d3046");
      }
    }
    r(x - 6, y - 41, w + 12, 1, C.ink);
    // forge: brick box with glowing mouth
    const fx = x + 6, fy = y - 22;
    for (let yy = fy; yy < y; yy++) for (let xx = fx; xx < fx + 24; xx++) {
      const off = (Math.floor((yy - fy) / 3) & 1) * 3;
      p(xx, yy, (xx - fx + off) % 6 === 0 || (yy - fy) % 3 === 0 ? "#3a1f22" : hash(xx, yy, 62) > 0.5 ? "#7a3a30" : "#6a2f2a");
    }
    for (let yy = 0; yy < 8; yy++) for (let xx = 0; xx < 14; xx++) {
      if (yy < 2 && (xx < 2 || xx > 11)) continue;
      const hot = 1 - yy / 10 + hash(xx, yy, 63) * 0.3;
      p(fx + 5 + xx, fy + 8 + yy, hot > 0.95 ? C.fire3 : hot > 0.7 ? C.fire2 : hot > 0.45 ? C.fire1 : C.fire0);
    }
    // forge chimney
    r(fx + 7, y - 70, 10, 48, "#5a2a28"); r(fx + 7, y - 70, 10, 2, "#7a3a30"); r(fx + 15, y - 68, 2, 46, "#3a1f22");
    emitters.push({ x: fx + 12, y: y - 72, kind: "smoke" });
    emitters.push({ x: fx + 12, y: fy + 10, kind: "ember" });
    lights.push({ x: fx + 12, y: fy + 12, r: 44, color: C.fire0, flicker: 0.35, strength: 1 });
    // anvil on a stump
    const ax = x + 44;
    r(ax + 2, y - 8, 8, 8, C.wood2); r(ax + 2, y - 8, 8, 1, C.wood3);
    r(ax - 1, y - 12, 14, 4, C.steel1); r(ax - 3, y - 12, 4, 2, C.steel1); r(ax - 1, y - 12, 14, 1, C.steel2);
    r(ax + 3, y - 9, 6, 1, C.steel0);
    // tools on the wall
    line(ctx, x + 60, y - 32, x + 60, y - 22, C.wood3); r(x + 58, y - 33, 5, 3, C.steel1);
    line(ctx, x + 68, y - 32, x + 72, y - 22, C.steel0); line(ctx, x + 72, y - 32, x + 68, y - 22, C.steel0);
    r(x + 76, y - 30, 6, 6, C.steel0); r(x + 77, y - 29, 4, 4, C.stone0);
    // hanging sign
    r(x + w - 18, y - 38, 1, 4, C.wood0); r(x + w - 8, y - 38, 1, 4, C.wood0);
    r(x + w - 21, y - 34, 16, 9, C.wood2); r(x + w - 21, y - 34, 16, 1, C.wood3);
    r(x + w - 17, y - 31, 8, 2, C.steel1); r(x + w - 15, y - 29, 4, 2, C.steel1);
  }

  function well(d: PropDef) {
    const x = d.x, y = d.y;
    r(x + 1, y - 34, 2, 34, C.wood2); r(x + 21, y - 34, 2, 34, C.wood2);
    for (let yy = 0; yy < 7; yy++) { const hw = 4 + yy * 2; r(x + 12 - hw, y - 42 + yy, hw * 2, 1, yy === 6 ? C.wood0 : yy % 2 ? C.wood1 : C.wood2); }
    r(x + 2, y - 30, 20, 1, C.wood1);
    line(ctx, x + 12, y - 30, x + 12, y - 20, C.paper);
    r(x + 10, y - 20, 5, 4, C.wood2); r(x + 10, y - 20, 5, 1, C.steel1);
    for (let yy = y - 12; yy < y; yy++) for (let xx = x - 1; xx < x + 25; xx++) {
      const off = (Math.floor((yy - y) / 3) & 1) * 3;
      p(xx, yy, (xx + off) % 6 === 0 || (yy - y) % 3 === 0 ? C.stone0 : yy === y - 12 ? C.stone3 : C.stone2);
    }
  }

  function lamp(d: PropDef) {
    const x = d.x + 7, y = d.y;
    r(x - 2, y - 3, 6, 3, C.stone1);
    r(x, y - 30, 2, 28, C.steel0); r(x + 1, y - 30, 1, 28, C.stone2);
    r(x - 3, y - 33, 8, 2, C.steel0);
    r(x - 2, y - 31, 6, 7, C.steel0);
    r(x - 1, y - 30, 4, 5, C.fire2); r(x, y - 29, 2, 3, C.fire3);
    r(x - 2, y - 24, 6, 1, C.steel0);
  }

  function gate(d: PropDef) {
    const x = d.x - 4, y = d.y;
    for (const px of [x, x + 44]) { r(px, y - 44, 4, 44, C.wood2); r(px + 1, y - 44, 1, 44, C.wood3); r(px + 3, y - 44, 1, 44, C.wood0); }
    r(x - 4, y - 48, 56, 4, C.wood2); r(x - 4, y - 48, 56, 1, C.wood3); r(x - 4, y - 45, 56, 1, C.wood0);
    r(x + 8, y - 44, 1, 3, C.wood0); r(x + 39, y - 44, 1, 3, C.wood0);
    r(x + 3, y - 41, 42, 9, C.wood1); r(x + 3, y - 41, 42, 1, C.wood3); r(x + 3, y - 33, 42, 1, C.wood0);
    drawText(ctx, "OUTSKIRTS", x + 24, y - 39, C.paper, { align: "center", shadow: C.wood0 });
    // hanging lantern
    r(x + 49, y - 44, 1, 5, C.steel0); r(x + 47, y - 39, 5, 6, C.steel0); r(x + 48, y - 38, 3, 4, C.fire2);
    lights.push({ x: x + 49, y: y - 36, r: 30, color: C.fire1, flicker: 0.25 });
  }

  function fence(d: PropDef, g: RNG) {
    const len = d.v * 16;
    for (let xx = 0; xx < len; xx += 12) {
      const tilt = g.int(-1, 1);
      r(d.x + xx + tilt, d.y - 14, 3, 14, C.wood2); r(d.x + xx + tilt, d.y - 14, 3, 1, C.wood3); r(d.x + xx + 2 + tilt, d.y - 13, 1, 13, C.wood0);
    }
    for (const ry of [d.y - 11, d.y - 6]) for (let xx = 0; xx < len; xx++) {
      if (hash(d.x + xx >> 3, ry, 70) > 0.85) continue; // broken rails
      p(d.x + xx, ry, C.wood3); p(d.x + xx, ry + 1, C.wood1);
    }
  }

  function wheat(d: PropDef, g: RNG) {
    const len = d.v * 16;
    for (let xx = 0; xx < len; xx++) {
      if (g.next() < 0.35) continue;
      const X = d.x + xx;
      const b = L.blightAt(X);
      const dead = b > bayer(X, 3) * 1.2;
      const h = 8 + Math.floor(g.next() * 9) - (dead ? 4 : 0);
      const lean = g.int(-1, 1);
      for (let k = 0; k < h; k++) p(X + (k > h * 0.6 ? lean : 0), d.y - k - 1, dead ? (k % 4 ? "#5a4f5e" : "#3f3542") : k % 5 === 0 ? C.straw0 : C.straw1);
      if (!dead) { p(X + lean, d.y - h - 1, C.straw3); p(X + lean, d.y - h - 2, C.straw2); p(X + lean, d.y - h, C.straw2); }
      else p(X + lean, d.y - h - 1, "#7a6e7a");
    }
  }

  function scarecrow(d: PropDef) {
    const x = d.x + 8, y = d.y;
    r(x - 1, y - 40, 3, 40, C.wood1); r(x, y - 40, 1, 40, C.wood2);
    r(x - 14, y - 32, 29, 3, C.wood1); r(x - 14, y - 32, 29, 1, C.wood2);
    // coat
    for (let yy = 0; yy < 16; yy++) { const hw = 5 + (yy > 10 ? yy - 10 : 0); r(x - hw, y - 31 + yy, hw * 2 + 1, 1, yy % 5 === 4 ? C.cloth0 : C.cloth1); }
    for (let k = 0; k < 5; k++) p(x - 6 + k * 3, y - 15, C.straw2);
    r(x - 14, y - 30, 4, 2, C.straw2); r(x + 11, y - 30, 4, 2, C.straw2);
    // head
    disc(ctx, x, y - 38, 4, 4, "#9a8055");
    p(x - 2, y - 39, C.ink); p(x + 2, y - 39, C.ink); r(x - 2, y - 36, 5, 1, C.wood0);
    r(x - 7, y - 42, 15, 1, C.wood1); r(x - 3, y - 46, 7, 4, C.wood1); r(x - 3, y - 43, 7, 1, C.scarf0);
  }

  function tree(d: PropDef, g: RNG) {
    const x = d.x + 8, y = d.y;
    const b = L.blightAt(x);
    const trunkH = 76;
    for (let yy = 0; yy < trunkH; yy++) {
      const w = 8 + (yy < 6 ? 6 - yy : 0);
      for (let xx = -w / 2; xx < w / 2; xx++) {
        const X = Math.round(x + xx), Y = y - yy - 1;
        p(X, Y, xx < -w / 2 + 2 ? C.wood0 : hash(X, Y >> 1, 80) > 0.7 ? C.wood2 : C.wood1);
      }
    }
    // canopy: clustered discs, lit from the moon (upper right)
    const leaves = [C.grass0, C.grass1, C.grass2, C.grass3];
    const rot = [C.blight0, C.blight1, C.blight2, C.blight3];
    const cy = y - trunkH - 10;
    const blobs: [number, number, number][] = [];
    for (let i = 0; i < 9; i++) blobs.push([x + g.int(-26, 26), cy + g.int(-18, 14), g.int(10, 16)]);
    const [cc, cctx] = makeCanvas(90, 80);
    for (const [bx, by, br] of blobs) disc(cctx, bx - x + 45, by - cy + 40, br, br * 0.85, "#fff");
    const img = cctx.getImageData(0, 0, 90, 80).data;
    for (let yy = 0; yy < 80; yy++) for (let xx = 0; xx < 90; xx++) {
      if (!img[(yy * 90 + xx) * 4 + 3]) continue;
      const X = x - 45 + xx, Y = cy - 40 + yy;
      const lit = (xx - 30) / 90 - (yy - 30) / 80 + hash(X >> 1, Y >> 1, 81) * 0.35;
      const i = lit > 0.55 ? 3 : lit > 0.25 ? 2 : lit > -0.1 ? 1 : 0;
      p(X, Y, b > bayer(X, Y) + 0.2 ? rot[i] : leaves[i]);
    }
    void cc;
  }

  function deadTree(d: PropDef, g: RNG, blighted: boolean) {
    const x = d.x + 8, y = d.y;
    const dark = blighted ? "#2a1a30" : "#2a2230", mid = blighted ? "#3f2848" : "#3a2f45";
    const tips: [number, number][] = [];
    const branch = (bx: number, by: number, ang: number, len: number, th: number, depth: number) => {
      const ex = bx + Math.cos(ang) * len, ey = by + Math.sin(ang) * len;
      line(ctx, bx, by, ex, ey, dark, Math.max(1, th));
      if (th > 1) line(ctx, bx + 1, by, ex + 1, ey, mid, 1);
      if (depth <= 0 || len < 5) { tips.push([ex, ey]); return; }
      const n = g.int(2, 3);
      for (let i = 0; i < n; i++) branch(ex, ey, ang + g.range(-0.8, 0.8), len * g.range(0.55, 0.75), th - 1, depth - 1);
    };
    const h = blighted ? 60 : 48;
    r(x - 3, y - 6, 7, 6, dark);
    branch(x, y, -Math.PI / 2 + g.range(-0.1, 0.1), h, blighted ? 5 : 4, 4);
    if (blighted) {
      for (const [tx, ty] of tips) {
        if (g.next() < 0.45) {
          disc(ctx, tx, ty, 2, 2, C.blight3); p(tx, ty, C.blight5); p(tx - 1, ty - 1, C.blight4);
          if (g.next() < 0.4) lights.push({ x: tx, y: ty, r: 12, color: C.blight4, flicker: 0.3 });
          if (g.next() < 0.3) emitters.push({ x: tx, y: ty + 2, kind: "drip" });
        }
      }
    }
  }

  function grave(d: PropDef) {
    const x = d.x + 4, y = d.y;
    if (d.v === 1) {
      r(x + 3, y - 16, 3, 16, C.wood1); r(x - 1, y - 12, 11, 3, C.wood1); r(x + 3, y - 16, 1, 16, C.wood2);
    } else {
      const tilt = d.v === 2 ? 1 : 0;
      for (let yy = 0; yy < 14; yy++) for (let xx = 0; xx < 10; xx++) {
        if (yy < 3 && (xx < 3 - yy || xx > 6 + yy)) continue;
        const X = x + xx + (tilt && yy < 7 ? 1 : 0), Y = y - 14 + yy;
        p(X, Y, xx === 0 ? C.stone3 : xx > 7 ? C.stone0 : hash(X, Y, 90) > 0.85 ? C.grass1 : C.stone2);
      }
      r(x + 3, y - 10, 4, 1, C.stone0); r(x + 4, y - 12, 2, 5, C.stone0);
    }
    r(x - 2, y - 1, 14, 1, C.dirt2);
  }

  function mill(d: PropDef) {
    const x = d.x, y = d.y, h = 150;
    for (let yy = 0; yy < h; yy++) {
      const t = yy / h;
      const hw = Math.round(36 - t * 12);
      const cx = x + 40;
      for (let xx = -hw; xx < hw; xx++) {
        const X = cx + xx, Y = y - yy - 1;
        const row = Math.floor(yy / 4), off = (row & 1) * 4;
        const mortar = yy % 4 === 3 || (X + off) % 9 === 0;
        const shade = (xx + hw) / (hw * 2);
        let c = mortar ? "#1e1c28" : shade > 0.7 ? "#2d2a3a" : hash(X >> 2, row, 91) > 0.5 ? "#3a3749" : "#34313f";
        if (shade < 0.15 && !mortar) c = "#4a4660";
        if (hash(X >> 1, Y >> 1, 92) > 0.93) c = C.blight1;
        p(X, Y, c);
      }
    }
    // cap
    for (let yy = 0; yy < 22; yy++) {
      const hw = Math.round(4 + yy * 1.3);
      for (let xx = -hw; xx <= hw; xx++) p(x + 40 + xx, y - h - 22 + yy, xx < -hw + 2 ? C.wood0 : (xx + yy) % 5 === 0 ? C.wood1 : C.wood2);
    }
    // door and windows
    for (let yy = 0; yy < 22; yy++) for (let xx = 0; xx < 14; xx++) {
      if (yy < 4 && (xx < 4 - yy || xx > 9 + yy)) continue;
      p(x + 33 + xx, y - 22 + yy, xx % 4 === 0 ? C.ink : "#1a1320");
    }
    r(x + 30, y - 70, 6, 9, C.ink); r(x + 45, y - 104, 6, 9, C.ink);
    r(x + 38, y - 128, 5, 8, C.blight3); r(x + 39, y - 127, 3, 6, C.blight5);
    lights.push({ x: x + 40, y: y - 124, r: 26, color: C.blight4, flicker: 0.4, strength: 1 });
    r(x + 34, y - h - 4, 12, 10, C.wood1);
    millHub = { x: x + 40, y: y - h + 1 };
  }

  function post(d: PropDef) {
    const x = d.x + 8, y = d.y;
    r(x - 3, y - 80, 7, 80, C.wood1); r(x - 2, y - 80, 2, 80, C.wood2); r(x + 3, y - 80, 1, 80, C.wood0);
    r(x - 28, y - 66, 57, 5, C.wood1); r(x - 28, y - 66, 57, 1, C.wood2); r(x - 28, y - 62, 57, 1, C.wood0);
    for (const rx of [x - 24, x + 22]) { line(ctx, rx, y - 61, rx - 1, y - 52, C.paper); line(ctx, rx + 2, y - 61, rx + 3, y - 55, C.paper); }
    r(x - 6, y - 6, 13, 6, C.dirt2);
  }
}

/** Slowly turning, half-broken mill sails. */
export function drawMillBlades(ctx: Ctx, hub: { x: number; y: number }, camX: number, camY: number, time: number) {
  const hx = hub.x - camX, hy = hub.y - camY;
  if (hx < -120 || hx > 520) return;
  const base = time * 0.12;
  for (let i = 0; i < 4; i++) {
    const a = base + (i * Math.PI) / 2;
    const len = i === 2 ? 30 : 62;
    ray(ctx, hx, hy, a, len, C.wood1);
    ray(ctx, hx + 1, hy, a, len, C.wood0);
    // lattice sail
    const ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca;
    for (let k = 14; k < len; k += 4) {
      if (i === 1 && k > 40) break;
      const bx = hx + ca * k, by = hy + sa * k;
      ray(ctx, bx, by, Math.atan2(ny, nx), 10, k % 8 === 2 ? C.wood2 : "#3a2a30");
    }
  }
  ctx.fillStyle = C.wood2; ctx.fillRect(Math.round(hx) - 2, Math.round(hy) - 2, 5, 5);
  ctx.fillStyle = C.steel1; ctx.fillRect(Math.round(hx) - 1, Math.round(hy) - 1, 2, 2);
}
