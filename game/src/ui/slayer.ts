import { audio } from "../core/audio";
import { rect, type Ctx } from "../gfx/canvas";
import { drawText, wrap } from "../gfx/font";
import { drawIcon } from "../gfx/icons";
import { C } from "../gfx/palette";
import type { Game } from "../game";
import { levelForXp } from "../systems/skills";
import { SLAYER_SHOP, SLAYER_TASKS, SUPERIOR_RATE, taskName, taskPoints } from "../systems/slayer";
import type { Overlay } from "./menu";
import { bar, hint, panel } from "./widgets";

/** Old Tam's Slayer desk: your assignment on the left, his shop on the right. */
export class SlayerMenu implements Overlay {
  sel = 0;
  msg = ""; msgT = 0;
  update(g: Game, dt: number) {
    const inp = g.input;
    this.msgT = Math.max(0, this.msgT - dt);
    const n = SLAYER_SHOP.length + 1;
    if (inp.pressed("cancel") || inp.pressed("menu")) { audio.play("close"); g.closeOverlay(); g.persist(); return; }
    if (inp.pressed("up") && this.sel > 0) { this.sel--; audio.play("move"); }
    if (inp.pressed("down") && this.sel < n - 1) { this.sel++; audio.play("move"); }
    if (!(inp.pressed("confirm") || inp.pressed("interact"))) return;
    const s = g.save;
    if (this.sel === 0) {
      if (s.slayerTask && s.slayerTask.have < s.slayerTask.need) { audio.play("deny"); this.say("Finish the job first. Or pay for a skip."); return; }
      g.assignSlayerTask(); audio.play("select"); this.say("Off you go, then.");
      return;
    }
    const item = SLAYER_SHOP[this.sel - 1];
    if (item.kind === "unlock" && s.slayerUnlocks.includes(item.id)) { audio.play("deny"); this.say("You've already got that one."); return; }
    if (s.slayerPts < item.cost) { audio.play("deny"); this.say("Not enough Slayer points."); return; }
    if ((item.id === "skip" || item.id === "block") && !s.slayerTask) { audio.play("deny"); this.say("You don't have a task."); return; }
    if (item.id === "block" && s.slayerBlocked.length >= 2) { audio.play("deny"); this.say("You can only block two."); return; }
    if (item.id === "helm" && !g.giveItem(g.makeSlayerHelm())) { audio.play("deny"); this.say("Your pack is full."); return; }
    s.slayerPts -= item.cost;
    if (item.kind === "unlock") s.slayerUnlocks.push(item.id);
    else if (item.id === "skip") g.assignSlayerTask();
    else if (item.id === "block") { s.slayerBlocked.push(s.slayerTask!.target); g.assignSlayerTask(); }
    else if (item.id === "charge") g.chargeDice(99);
    else if (item.id === "rune") g.giveRandomRune();
    audio.play("purse");
    this.say(`${item.name}. Pleasure doing business.`);
    g.persist();
  }
  private say(m: string) { this.msg = m; this.msgT = 2.5; }

  draw(g: Game, ctx: Ctx) {
    const s = g.save;
    panel(ctx, 6, 6, 372, 204, 0.96);
    drawText(ctx, "OLD TAM'S SLAYER DESK", 14, 12, C.gold2);
    drawText(ctx, `${s.slayerPts} POINTS`, 370, 12, C.cream, { align: "right" });
    rect(ctx, 10, 23, 364, 1, C.border);
    // assignment
    const lvl = levelForXp(s.xp.slayer ?? 0);
    panel(ctx, 12, 28, 150, 170, 0.85);
    drawIcon(ctx, "skull", 16, 32);
    drawText(ctx, `SLAYER LEVEL ${lvl}`, 32, 35, "#b9a8d0");
    const t = s.slayerTask;
    const sel0 = this.sel === 0;
    if (sel0) { rect(ctx, 14, 46, 146, 44, C.panelHi); rect(ctx, 14, 46, 1, 44, C.gold2); }
    if (t) {
      const done = t.have >= t.need;
      drawText(ctx, "YOUR TASK", 20, 50, C.dim);
      wrap(`${t.need} ${taskName(t.target)}`, 136).slice(0, 2).forEach((l, i) => drawText(ctx, l.toUpperCase(), 20, 60 + i * 8, done ? C.good : C.cream));
      bar(ctx, 20, 80, 100, 3, t.have / t.need, done ? C.good : "#b9a8d0", C.inkSoft);
      drawText(ctx, `${t.have}/${t.need}`, 126, 79, C.dim);
      if (done) drawText(ctx, "[J] NEW TASK", 20, 86, C.gold2);
    } else {
      drawText(ctx, "NO TASK", 20, 52, C.dim);
      drawText(ctx, "[J] GET A TASK", 20, 64, C.gold2);
    }
    drawText(ctx, `TASKS DONE: ${s.slayerDone}`, 20, 98, C.dim);
    drawText(ctx, `NEXT TASK: ${taskPoints(s.slayerDone + 1)} PTS`, 20, 108, C.gold1);
    wrap("Every 10th task pays 50 points, every 50th pays 150.", 136).forEach((l, i) => drawText(ctx, l, 20, 120 + i * 8, C.faint));
    const avail = SLAYER_TASKS.filter((d) => lvl >= d.level).length;
    drawText(ctx, `FOES YOU QUALIFY FOR: ${avail}/${SLAYER_TASKS.length}`, 20, 146, C.faint);
    if (s.slayerBlocked.length) wrap(`BLOCKED: ${s.slayerBlocked.map(taskName).join(", ")}`, 136).slice(0, 2).forEach((l, i) => drawText(ctx, l, 20, 158 + i * 8, C.bad));
    drawText(ctx, s.slayerUnlocks.includes("superior") ? `SUPERIORS: 1/${SUPERIOR_RATE} ON TASK` : "SUPERIORS: LOCKED", 20, 182, s.slayerUnlocks.includes("superior") ? C.gold2 : C.faint);
    // shop
    SLAYER_SHOP.forEach((it, i) => {
      const y = 28 + i * 19, sel = this.sel === i + 1;
      const owned = it.kind === "unlock" && s.slayerUnlocks.includes(it.id);
      if (sel) { rect(ctx, 168, y - 1, 204, 18, C.panelHi); rect(ctx, 168, y - 1, 1, 18, C.gold2); }
      drawIcon(ctx, it.icon, 172, y + 2);
      drawText(ctx, it.name.toUpperCase(), 188, y + 1, owned ? C.good : sel ? C.cream : C.dim);
      drawText(ctx, it.desc, 188, y + 9, C.faint);
      drawText(ctx, owned ? "OWNED" : `${it.cost}`, 368, y + 1, owned ? C.good : s.slayerPts >= it.cost ? C.gold2 : C.bad, { align: "right" });
    });
    if (this.msgT > 0) { ctx.globalAlpha = Math.min(1, this.msgT * 2); drawText(ctx, this.msg, 14, 199, C.cream); ctx.globalAlpha = 1; }
    else hint(ctx, 370, 199, [["J", "SELECT"], ["ESC", "LEAVE"]], "right");
  }
}
