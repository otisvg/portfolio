import { audio } from "../core/audio";
import { rect, type Ctx } from "../gfx/canvas";
import { drawText, wrap } from "../gfx/font";
import { drawIcon } from "../gfx/icons";
import { C } from "../gfx/palette";
import type { Game } from "../game";
import { describe, HOPE_MAX, MILESTONES, milestonesFor, rewardText } from "../systems/bounties";
import { FACES } from "../systems/dice";
import { drawDie } from "./dice";
import type { Overlay } from "./menu";
import { bar, hint, panel } from "./widgets";

/** The notice board: open contracts on the left, Hollowmere's Hope and its milestones on the right. */
export class BountyBoard implements Overlay {
  update(g: Game) {
    const inp = g.input;
    if (inp.pressed("cancel") || inp.pressed("confirm") || inp.pressed("interact") || inp.pressed("menu")) { audio.play("close"); g.closeOverlay(); }
  }

  draw(g: Game, ctx: Ctx) {
    const s = g.save;
    panel(ctx, 6, 6, 372, 204, 0.96);
    drawText(ctx, "NOTICE BOARD", 14, 12, C.gold2);
    drawText(ctx, `${s.bountiesDone} COMPLETED`, 190, 12, C.faint, { align: "right" });
    rect(ctx, 10, 23, 364, 1, C.border);

    s.bounties.forEach((b, i) => {
      const y = 30 + i * 54;
      panel(ctx, 12, y, 184, 50, b.done ? 0.5 : 0.85);
      rect(ctx, 14, y + 2, 2, 46, b.done ? C.good : b.hope >= 8 ? C.fire1 : C.gold1);
      wrap(describe(b), 170).slice(0, 2).forEach((l, k) => drawText(ctx, l.toUpperCase(), 20, y + 5 + k * 8, b.done ? C.dim : C.cream));
      bar(ctx, 20, y + 24, 110, 3, b.have / b.need, b.done ? C.good : C.gold1, C.inkSoft);
      drawText(ctx, `${b.have}/${b.need}`, 136, y + 23, C.dim);
      const r = b.reward;
      if (r.type === "rune") drawDie(ctx, 19, y + 33, 12, r.face);
      else if (r.type === "charge") drawDie(ctx, 19, y + 33, 12, "sword");
      else drawIcon(ctx, r.type === "shards" ? "shard" : "coin", 18, y + 32);
      drawText(ctx, rewardText(b.reward, (f) => FACES[f].name), 33, y + 36, b.done ? C.faint : C.cream);
      drawText(ctx, `+${b.hope} HOPE`, 190, y + 36, C.fire2, { align: "right" });
      if (b.done) drawText(ctx, "DONE", 190, y + 5, C.good, { align: "right" });
    });

    // Hope
    const px = 202;
    panel(ctx, px, 30, 170, 158, 0.85);
    drawText(ctx, "HOLLOWMERE'S HOPE", px + 8, 37, C.fire2);
    drawText(ctx, `${s.hope}/${HOPE_MAX}`, px + 162, 37, C.cream, { align: "right" });
    const bw = 154;
    bar(ctx, px + 8, 48, bw, 4, s.hope / HOPE_MAX, C.fire1, C.inkSoft);
    for (const m of MILESTONES) rect(ctx, px + 8 + Math.round((bw * m.hope) / HOPE_MAX) - 1, 46, 1, 8, C.cream);
    const reached = milestonesFor(s.hope);
    MILESTONES.forEach((m, i) => {
      const got = i < reached, next = i === reached;
      const y = 60 + i * 10;
      drawText(ctx, `${m.hope}`, px + 8, y, got ? C.good : next ? C.gold2 : C.faint);
      drawText(ctx, m.title.toUpperCase() + (got ? "  \u2022" : ""), px + 26, y, got ? C.good : next ? C.cream : C.faint);
    });
    const next = MILESTONES[reached];
    rect(ctx, px + 8, 112, bw, 1, C.border);
    drawText(ctx, next ? `NEXT AT ${next.hope} HOPE` : "HOLLOWMERE IS WHOLE AGAIN", px + 8, 117, C.gold2);
    if (next) wrap(next.text, bw).forEach((l, k) => drawText(ctx, l, px + 8, 127 + k * 8, C.cream));
    wrap("Bounties, Wick and Rotborn raise Hope. New notices are posted when you rest.", bw).forEach((l, k) => drawText(ctx, l, px + 8, 158 + k * 8, C.faint));
    hint(ctx, 370, 199, [["ESC", "CLOSE"]], "right");
  }
}
