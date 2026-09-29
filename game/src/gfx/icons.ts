import { makeCanvas, type Ctx } from "./canvas";
import { C } from "./palette";

/** 10×10 pixel icons; an ink outline is added automatically to make them 12×12. */
const MAP: Record<string, string> = {
  w: C.steel3, l: C.steel2, s: C.steel1, d: C.steel0,
  b: C.wood3, B: C.wood1, a: C.wood4, A: C.wood2,
  y: C.gold2, Y: C.gold1, o: C.gold0,
  r: C.scarf1, R: C.scarf0, p: C.scarf2,
  c: C.straw2, C: C.straw1, e: C.straw3, E: C.straw0,
  g: C.grass3, G: C.grass1, h: C.grass4,
  v: C.blight4, V: C.blight3, u: C.blight5, U: C.blight2,
  n: C.cloth2, N: C.cloth1, m: C.cloth0,
  k: C.ink, f: C.fire2, F: C.fire1, O: C.fire0,
  t: C.cream, T: C.paper,
  x: C.hp, X: C.hpDark,
  i: C.skin2, I: C.skin1, j: C.skin0,
  q: "#9ad8ff", Q: "#4a7ab0",
  z: "#c9773f", Z: "#7a3f22",
};

const ICONS: Record<string, string[]> = {
  sword: ["........lw", ".......lws", "......lws.", ".....lws..", "....lws...", ".y.lws....", "..yys.....", ".BYy......", "BB..y.....", "B........."],
  blade: ["........lw", ".......lws", "......lws.", ".....lws..", "....lws...", "Y..lws....", ".YYys.....", "..BYY.....", ".BB..Y....", "yB........"],
  axe: ["...Bb.....", "...Bbssl..", "...Bbslllw", "...Bbslllw", "...Bbssl..", "...Bb.....", "...Bb.....", "...Bb.....", "...Bb.....", "...BB....."],
  dagger: ["..........", "........lw", ".......lws", "......lws.", ".....lws..", "..y.lws...", "...ys.....", "..BYy.....", ".B...y....", ".........."],
  fork: ["..s.s.s...", "..s.s.s...", "..s.s.s...", "..sssss...", "....b.....", "....B.....", "....b.....", "....B.....", "....b.....", "....B....."],
  scythe: ["..llllsb..", ".lw....b..", "lw.....b..", "l......B..", ".......b..", ".......b..", ".....BbB..", ".......b..", ".......B..", ".......b.."],
  strawhat: ["..........", "..........", "...eccC...", "..eccccC..", "..RrrrrR..", "ecccccccCC", ".CCCCCCCC.", "..........", "..........", ".........."],
  cap: ["..........", "..........", "...AaaA...", "..AaaaaA..", ".AaaaaaaA.", ".AAAAAAAA.", ".B......B.", ".B......B.", "..........", ".........."],
  helm: ["..........", "...slls...", "..sllwls..", "..slllls..", "..slllls..", "..ssssss..", "dssssssssd", ".dddddddd.", "..........", ".........."],
  hood: ["...AAAA...", "..AaaaaA..", ".AaaAaaaA.", ".AafaafaA.", ".AaaaaaaA.", ".AaBaBaaA.", ".AaaBaBaA.", "..AaaaaA..", "...AAAA...", ".........."],
  tunic: ["..NN..NN..", ".NnnNNnnN.", "NnnnnnnnnN", "Nn.nnnn.nN", "...nnnn...", "...nnnn...", "...BYBB...", "...nnnn...", "...NNNN...", ".........."],
  gambeson: ["..AA..AA..", ".AaaAAaaA.", "AaaaaaaaaA", "Aa.aAaa.aA", "...aaaa...", "...aAaa...", "...BYBB...", "...aaAa...", "...AAAA...", ".........."],
  mail: ["..ss..ss..", ".slsddlss.", "slsdsdsdss", "sd.lsds.ds", "...dsds...", "...sdsd...", "...BYBB...", "...dsds...", "...ssss...", ".........."],
  ring: ["....uu....", "...uvvu...", "....VV....", "..ZzzzzZ..", ".Zz....zZ.", ".z......z.", ".z......z.", ".Zz....zZ.", "..ZzzzzZ..", ".........."],
  charm: ["...B..B...", "....BB....", "...tttt...", "..tttttt..", "..tkttkt..", "..tttttt..", "...tTTt...", "...tktk...", "..........", ".........."],
  clover: ["..gg..gg..", ".ghgg.ghg.", ".gggg.ggg.", "..ggGGgg..", "...GGGG...", "..ggGGgg..", ".ghgg.ggg.", ".gggg..gg.", "....G.....", ".....G...."],
  lantern: ["....dd....", "...d..d...", "...dddd...", "..dffffd..", "..dfFFfd..", "..dFOOFd..", "..dffffd..", "..dddddd..", "...dddd...", ".........."],
  coin: ["...YYYY...", "..YyyyyY..", ".Yyeyyyyo.", ".YyyYYyyo.", ".YyyYyyyo.", ".YyyYYyyo.", ".Yyyyyyyo.", "..oyyyyo..", "...oooo...", ".........."],
  shard: [".....u....", "....uvV...", "....uvV...", "...uvvVV..", "..uuvvVV..", "..uvvvVU..", "...vvVU...", "...VVUU...", "....UU....", ".........."],
  tonic: ["....AA....", "....qQ....", "....qQ....", "...qqqQ...", "..qpxxxQ..", "..qxxxxQ..", "..qxxxXQ..", "..QxXXXQ..", "...QQQQ...", ".........."],
  heart: [".xxx.xxx..", "xppxxxxxX.", "xpxxxxxxX.", "xxxxxxxxX.", ".xxxxxxX..", "..xxxxX...", "...xxX....", "....X.....", "..........", ".........."],
  fist: ["..........", "...iiii...", "..iiIiIi..", "..iIiIiIi.", "..iiiiiiI.", ".iiiiiiiI.", ".IiiiiiiI.", "..IiiiIj..", "...rrrr...", "...RRRR..."],
  shield: ["dsssssssd.", "slwllNnNs.", "sllllnNns.", "sllllNnNs.", "sllllnNns.", ".slllNns..", ".sslllss..", "..sllls...", "...sss....", "....s....."],
  pet: ["...BBBB...", "..BBBBBB..", "BBBBBBBBBB", "..aaaaaa..", "..afaafa..", "..aaaaaa..", "..aBaBaa..", "...aaaa...", "..c.cc.c..", ".........."],
  skull: ["..tttttt..", ".tttttttt.", ".tkkttkkt.", ".tkkttkkt.", ".tttkkttt.", "..tttttt..", "..tTtTtT..", "...tTtT...", "..........", ".........."],
  purse: ["...BAAB...", "....BB....", "...aAAa...", "..aaaaaa..", ".aaayyaaa.", ".aaayYaaA.", ".AaaaaaaA.", "..AAAAAA..", "..........", ".........."],
  fang: ["..........", "tttttttttt", "tTttttttTt", ".tt....tt.", ".tt....tt.", ".tT....tT.", "..v....v..", "..u....u..", "..........", ".........."],
  star: ["....y.....", "....y.....", "...yyy....", "yyyyeyyyy.", ".yyyyyyy..", "..yyyyy...", "..yy.yy...", ".yy...yy..", ".y.....y..", ".........."],
  feather: ["........qq", ".......qqQ", "......qqQ.", ".....qqQ..", "....qqQ...", "...qqQ....", "..qqQ.....", "..qQ......", ".b........", "b........."],
  moonface: ["...TTT....", "..ttT.....", ".ttt......", ".ttt......", ".ttt......", ".ttt......", ".tttT.....", "..tttTT...", "...ttt....", ".........."],
  crate: ["..........", ".AAAAAAAA.", ".AaBaaBaA.", ".AaaBBaaA.", ".AaaBBaaA.", ".AaBaaBaA.", ".AAAAAAAA.", "..........", "..........", ".........."],
};

export type IconName = keyof typeof ICONS;

const built = new Map<string, HTMLCanvasElement>();
const ghosts = new Map<string, HTMLCanvasElement>();

function build(name: string): HTMLCanvasElement {
  const rows = ICONS[name] ?? ICONS.skull;
  const [c, ctx] = makeCanvas(12, 12);
  const solid = (x: number, y: number) => y >= 0 && y < 10 && x >= 0 && x < 10 && rows[y][x] !== ".";
  ctx.fillStyle = C.ink;
  for (let y = -1; y <= 10; y++)
    for (let x = -1; x <= 10; x++)
      if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) ctx.fillRect(x + 1, y + 1, 1, 1);
  for (let y = 0; y < 10; y++)
    for (let x = 0; x < 10; x++) {
      const ch = rows[y][x];
      if (ch === ".") continue;
      ctx.fillStyle = MAP[ch] ?? "#f0f";
      ctx.fillRect(x + 1, y + 1, 1, 1);
    }
  return c;
}

export function icon(name: string): HTMLCanvasElement {
  let c = built.get(name);
  if (!c) built.set(name, (c = build(name)));
  return c;
}

/** Flat single-colour version, used for empty equipment slots. */
function ghost(name: string, color: string): HTMLCanvasElement {
  const key = name + color;
  let g = ghosts.get(key);
  if (!g) {
    const [c, ctx] = makeCanvas(12, 12);
    ctx.drawImage(icon(name), 0, 0);
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 12, 12);
    ghosts.set(key, (g = c));
  }
  return g;
}

export function drawIcon(ctx: Ctx, name: string, x: number, y: number, scale = 1) {
  ctx.drawImage(icon(name), Math.round(x), Math.round(y), 12 * scale, 12 * scale);
}

export function drawGhost(ctx: Ctx, name: string, x: number, y: number, color: string = C.faint) {
  ctx.drawImage(ghost(name, color), Math.round(x), Math.round(y));
}
