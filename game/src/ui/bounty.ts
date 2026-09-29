import { audio } from "../core/audio";
import { rect, type Ctx } from "../gfx/canvas";
import { drawText, wrap } from "../gfx/font";
import { drawIcon } from "../gfx/icons";
import { C } from "../gfx/palette";
import type { Game } from "../game";
import { describe, HOPE_MAX, MILESTONES, milestonesFor, MOONS, rewardText, type Bounty } from "../systems/bounties";
import { FACES } from "../systems/dice";
import { drawDie } from "./dice";
import type { Overlay } from "./menu";
import { bar, ellipsize, hint, panel } from "./widgets";

/**
 * The notice board: open contracts (plus today's daily) on the left; Hollowmere's Hope,
 * its milestones and this week's Rotmoon on the right.
 */
export class BountyBoard implements Overlay {
  update(g: Game) {
    const inp = g.input;
    if (inp.pressed("cancel") || inp.pressed("confirm") || inp.pressed("interact") || inp.pressed("menu")) { audio.play("close"); g.closeOverlay(); }
  }

  draw(g: Game, ctx: Ctx) {
    const s = g.save;
    panel(ctx, 6, 6, 372, 204, 0.96);
    drawText(ctx, "NOTICE BOARD", 14, 12, C.gold2);
    drawText(ctx, `${s.bountiesDone} COMPLETED`, 196, 12, C.faint, { align: "right" });
    rect(ctx, 10, 23, 364, 1, C.border);

    const list: Bounty[] = [...(s.daily ? [s.daily] : []), ...s.bounties];
    list.slice(0, 4).forEach((b, i) => {
      const y = 28 + i * 43;
      panel(ctx, 12, y, 188, 40, b.done ? 0.5 : 0.85);
      rect(ctx, 14, y + 2, 2, 36, b.done ? C.good : b.daily ? C.gold2 : b.hope >= 8 ? C.fire1 : C.gold1);
      if (b.daily) { drawText(ctx, "DAILY", 194, y + 4, C.gold2, { align: "right" }); }
      drawText(ctx, ellipsize(describe(b).toUpperCase(), b.daily ? 146 : 170), 20, y + 4, b.done ? C.dim : C.cream);
      bar(ctx, 20, y + 15, 110, 3, b.have / b.need, b.done ? C.good : b.daily ? C.gold2 : C.gold1, C.inkSoft);
      drawText(ctx, `${b.have}/${b.need}`, 136, y + 14, C.dim);
      const r = b.reward;
      if (r.type === "rune") drawDie(ctx, 19, y + 24, 12, r.face);
      else if (r.type === "charge") drawDie(ctx, 19, y + 24, 12, "sword");
      else drawIcon(ctx, r.type === "shards" ? "shard" : r.type === "chest" ? "chest" : "coin", 18, y + 24);
      drawText(ctx, rewardText(b.reward, (f) => FACES[f].name), 33, y + 27, b.done ? C.faint : b.daily ? C.gold2 : C.cream);
      drawText(ctx, `+${b.hope} HOPE`, 194, y + 27, C.fire2, { align: "right" });
      if (b.done) drawText(ctx, "DONE", b.daily ? 164 : 194, y + 4, C.good, { align: "right" });
    });

    // Hope
    const px = 204, bw = 154;
    panel(ctx, px, 28, 168, 124, 0.85);
    drawText(ctx, "HOLLOWMERE'S HOPE", px + 8, 35, C.fire2);
    drawText(ctx, `${s.hope}/${HOPE_MAX}`, px + 160, 35, C.cream, { align: "right" });
    bar(ctx, px + 8, 46, bw, 4, s.hope / HOPE_MAX, C.fire1, C.inkSoft);
    for (const m of MILESTONES) rect(ctx, px + 8 + Math.round((bw * m.hope) / HOPE_MAX) - 1, 44, 1, 8, C.cream);
    const reached = milestonesFor(s.hope);
    MILESTONES.forEach((m, i) => {
      const got = i < reached, nx = i === reached;
      const y = 57 + i * 9;
      drawText(ctx, `${m.hope}`, px + 8, y, got ? C.good : nx ? C.gold2 : C.faint);
      drawText(ctx, m.title.toUpperCase(), px + 26, y, got ? C.good : nx ? C.cream : C.faint);
    });
    const next = MILESTONES[reached];
    rect(ctx, px + 8, 104, bw, 1, C.border);
    drawText(ctx, next ? `NEXT AT ${next.hope} HOPE` : "HOLLOWMERE IS WHOLE AGAIN", px + 8, 108, C.gold2);
    if (next) wrap(next.text, bw).slice(0, 2).forEach((l, k) => drawText(ctx, l, px + 8, 118 + k * 8, C.cream));
    drawText(ctx, "Bounties, bosses and Rotborn raise Hope.", px + 8, 140, C.faint);

    // Rotmoon
    const moon = MOONS[g.stats.moon];
    panel(ctx, px, 155, 168, 36, 0.85);
    drawIcon(ctx, "moonface", px + 6, 160);
    drawText(ctx, `THIS WEEK: ${moon.name.toUpperCase()}`, px + 22, 162, moon.color);
    wrap(moon.effect, 150).slice(0, 2).forEach((l, k) => drawText(ctx, l, px + 8, 173 + k * 8, C.dim));
    drawText(ctx, "The daily notice is the same for everyone.", 14, 199, C.faint);
    hint(ctx, 370, 199, [["ESC", "CLOSE"]], "right");
  }
}
