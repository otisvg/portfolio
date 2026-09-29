import { H, STEP, W } from "./core/constants";
import { Game } from "./game";

const canvas = document.getElementById("game") as HTMLCanvasElement;

/** Scale by whole pixels so the art stays crisp; fall back to fractional only on tiny screens. */
function resize() {
  // Fit the canvas's container (the page, or an embedding frame's stage element).
  const host = canvas.parentElement;
  const aw = host && host !== document.body ? host.clientWidth : window.innerWidth;
  const ah = host && host !== document.body ? host.clientHeight : window.innerHeight;
  const s = Math.min(aw / W, ah / H);
  const scale = s >= 1 ? Math.floor(s) : s;
  canvas.style.width = `${Math.floor(W * scale)}px`;
  canvas.style.height = `${Math.floor(H * scale)}px`;
}
window.addEventListener("resize", resize);
if (canvas.parentElement && "ResizeObserver" in window) new ResizeObserver(resize).observe(canvas.parentElement);
resize();
canvas.focus();
canvas.addEventListener("pointerdown", () => canvas.focus());

const game = new Game(canvas);
// Never lose a run to a closed tab.
window.addEventListener("beforeunload", () => game.persist());
document.addEventListener("visibilitychange", () => { if (document.hidden) game.persist(); });
(window as unknown as { hollowmere: Game }).hollowmere = game;

let last = performance.now();
let acc = 0;
function frame(now: number) {
  acc += Math.min(0.1, (now - last) / 1000);
  last = now;
  let steps = 0;
  while (acc >= STEP && steps < 5) {
    game.update(STEP);
    acc -= STEP;
    steps++;
  }
  game.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
