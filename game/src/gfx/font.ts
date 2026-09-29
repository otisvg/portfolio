import { makeCanvas, type Ctx } from "./canvas";
import { C } from "./palette";

/** Hand-drawn 5px-tall variable-width pixel font. Lowercase renders as uppercase. */
const G: Record<string, string> = {
  A: ".XX.|X..X|XXXX|X..X|X..X", B: "XXX.|X..X|XXX.|X..X|XXX.", C: ".XXX|X...|X...|X...|.XXX",
  D: "XXX.|X..X|X..X|X..X|XXX.", E: "XXXX|X...|XXX.|X...|XXXX", F: "XXXX|X...|XXX.|X...|X...",
  G: ".XXX|X...|X.XX|X..X|.XXX", H: "X..X|X..X|XXXX|X..X|X..X", I: "XXX|.X.|.X.|.X.|XXX",
  J: "..XX|...X|...X|X..X|.XX.", K: "X..X|X.X.|XX..|X.X.|X..X", L: "X...|X...|X...|X...|XXXX",
  M: "X...X|XX.XX|X.X.X|X...X|X...X", N: "X..X|XX.X|X.XX|X..X|X..X", O: ".XX.|X..X|X..X|X..X|.XX.",
  P: "XXX.|X..X|XXX.|X...|X...", Q: ".XX.|X..X|X..X|X.X.|.X.X", R: "XXX.|X..X|XXX.|X.X.|X..X",
  S: ".XXX|X...|.XX.|...X|XXX.", T: "XXXXX|..X..|..X..|..X..|..X..", U: "X..X|X..X|X..X|X..X|.XX.",
  V: "X...X|X...X|.X.X.|.X.X.|..X..", W: "X...X|X...X|X.X.X|XX.XX|X...X", X: "X...X|.X.X.|..X..|.X.X.|X...X",
  Y: "X...X|.X.X.|..X..|..X..|..X..", Z: "XXXX|...X|..X.|.X..|XXXX",
  "0": ".XX.|X.XX|X..X|XX.X|.XX.", "1": ".X.|XX.|.X.|.X.|XXX", "2": "XXX.|...X|.XX.|X...|XXXX",
  "3": "XXX.|...X|.XX.|...X|XXX.", "4": "X..X|X..X|XXXX|...X|...X", "5": "XXXX|X...|XXX.|...X|XXX.",
  "6": ".XX.|X...|XXX.|X..X|.XX.", "7": "XXXX|...X|..X.|.X..|.X..", "8": ".XX.|X..X|.XX.|X..X|.XX.",
  "9": ".XX.|X..X|.XXX|...X|.XX.",
  " ": "..|..|..|..|..", ".": ".|.|.|.|X", ",": ".|.|.|X|X", "!": "X|X|X|.|X", "?": "XXX.|...X|.XX.|....|.X..",
  ":": ".|X|.|X|.", ";": ".|X|.|X|X", "'": "X|X|.|.|.", '"': "X.X|X.X|...|...|...", "-": "...|...|XXX|...|...",
  "+": "...|.X.|XXX|.X.|...", "/": "...X|..X.|.X..|.X..|X...", "(": ".X|X.|X.|X.|.X", ")": "X.|.X|.X|.X|X.",
  "%": "X..X|...X|..X.|.X..|X..X", "*": "X.X|.X.|X.X|...|...", "<": "..X|.X.|X..|.X.|..X", ">": "X..|.X.|..X|.X.|X..",
  "=": "...|XXX|...|XXX|...", "[": "XX|X.|X.|X.|XX", "]": "XX|.X|.X|.X|XX", "_": "....|....|....|....|XXXX",
  "#": ".X.X.|XXXXX|.X.X.|XXXXX|.X.X.", "&": ".X..|X.X.|.X.X|X.X.|.X.X", "^": ".X.|X.X|...|...|...",
  "|": "X|X|X|X|X", "~": "....|.X.X|X.X.|....|....",
  // arrow glyphs (mapped from unicode below)
  "↑": ".X.|XXX|.X.|.X.|.X.", "↓": ".X.|.X.|.X.|XXX|.X.", "→": "..X.|XXXX|..X.|....|....", "←": ".X..|XXXX|.X..|....|....",
  "•": "..|XX|XX|..|..", "×": "...|X.X|.X.|X.X|...",
};

const GH = 5;
interface Glyph { x: number; w: number }
const glyphs = new Map<string, Glyph>();
let atlas: HTMLCanvasElement | null = null;
const tinted = new Map<string, HTMLCanvasElement>();

function build() {
  let total = 0;
  for (const k in G) total += G[k].split("|")[0].length + 1;
  const [c, ctx] = makeCanvas(total, GH);
  ctx.fillStyle = "#fff";
  let x = 0;
  for (const k in G) {
    const rows = G[k].split("|");
    const w = rows[0].length;
    rows.forEach((row, y) => { for (let i = 0; i < w; i++) if (row[i] === "X") ctx.fillRect(x + i, y, 1, 1); });
    glyphs.set(k, { x, w });
    x += w + 1;
  }
  atlas = c;
}

function atlasFor(color: string) {
  if (!atlas) build();
  let t = tinted.get(color);
  if (!t) {
    const [c, ctx] = makeCanvas(atlas!.width, GH);
    ctx.drawImage(atlas!, 0, 0);
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, c.width, c.height);
    tinted.set(color, (t = c));
  }
  return t;
}

const glyph = (ch: string) => {
  if (!atlas) build();
  return glyphs.get(ch) ?? glyphs.get(ch.toUpperCase()) ?? glyphs.get("?")!;
};

export const LINE_H = 7;

export function textWidth(s: string, scale = 1) {
  let w = 0;
  for (const ch of s) w += glyph(ch).w + 1;
  return Math.max(0, w - 1) * scale;
}

export interface TextOpts { scale?: number; align?: "left" | "center" | "right"; shadow?: string | null; spacing?: number }

export function drawText(ctx: Ctx, s: string, x: number, y: number, color: string, o: TextOpts = {}) {
  const scale = o.scale ?? 1, sp = o.spacing ?? 0;
  const w = textWidth(s, scale) + Math.max(0, [...s].length - 1) * sp * scale;
  let cx = Math.round(o.align === "center" ? x - w / 2 : o.align === "right" ? x - w : x);
  const cy = Math.round(y);
  const shadow = o.shadow === undefined ? C.ink : o.shadow;
  const img = atlasFor(color);
  const sh = shadow ? atlasFor(shadow) : null;
  for (const ch of s) {
    const g = glyph(ch);
    if (sh) ctx.drawImage(sh, g.x, 0, g.w, GH, cx + scale, cy + scale, g.w * scale, GH * scale);
    ctx.drawImage(img, g.x, 0, g.w, GH, cx, cy, g.w * scale, GH * scale);
    cx += (g.w + 1 + sp) * scale;
  }
  return w;
}

/** Word-wrap to a pixel width. Honours explicit "\n". */
export function wrap(s: string, maxW: number, scale = 1): string[] {
  const out: string[] = [];
  for (const para of s.split("\n")) {
    let line = "";
    for (const word of para.split(" ")) {
      const test = line ? line + " " + word : word;
      if (textWidth(test, scale) > maxW && line) { out.push(line); line = word; }
      else line = test;
    }
    out.push(line);
  }
  return out;
}
