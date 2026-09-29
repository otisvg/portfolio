export type Action =
  | "left" | "right" | "up" | "down"
  | "jump" | "attack" | "roll" | "heal" | "interact"
  | "menu" | "pause" | "confirm" | "cancel" | "tabL" | "tabR" | "drop" | "mute";

const KEYMAP: Record<string, Action[]> = {
  ArrowLeft: ["left"], KeyA: ["left"],
  ArrowRight: ["right"], KeyD: ["right"],
  ArrowUp: ["up", "interact"], KeyW: ["up", "interact"],
  ArrowDown: ["down"], KeyS: ["down"],
  Space: ["jump", "confirm"], KeyZ: ["jump", "confirm"],
  KeyJ: ["attack", "confirm"], KeyX: ["attack", "confirm"],
  KeyK: ["roll", "cancel"], KeyC: ["roll", "cancel"], ShiftLeft: ["roll"], ShiftRight: ["roll"],
  KeyQ: ["heal", "tabL"], KeyE: ["interact", "tabR"],
  Enter: ["confirm"], NumpadEnter: ["confirm"],
  Escape: ["pause", "cancel"], Backspace: ["cancel"],
  Tab: ["menu"], KeyI: ["menu"],
  KeyF: ["drop"], KeyM: ["mute"],
};

// Standard gamepad layout.
const PADMAP: [number, Action[]][] = [
  [0, ["jump", "confirm"]], [1, ["roll", "cancel"]], [2, ["attack"]], [3, ["heal"]],
  [4, ["tabL"]], [5, ["tabR", "interact"]], [9, ["menu"]], [8, ["pause"]],
  [12, ["up", "interact"]], [13, ["down"]], [14, ["left"]], [15, ["right"]],
];

const REPEATABLE = new Set<Action>(["left", "right", "up", "down"]);

export class Input {
  private held = new Map<Action, Set<string>>();
  private queue = new Set<Action>();
  private now = new Set<Action>();
  private padHeld = new Set<Action>();
  private padPrev = new Set<Action>();
  private anyQueued = false;
  anyPressed = false;
  usingPad = false;
  onFirstGesture: (() => void) | null = null;

  constructor(target: Window) {
    target.addEventListener("keydown", (e) => {
      this.gesture();
      const acts = KEYMAP[e.code];
      if (acts) e.preventDefault();
      this.usingPad = false;
      if (e.repeat) {
        if (acts) for (const a of acts) if (REPEATABLE.has(a)) this.queue.add(a);
        return;
      }
      this.anyQueued = true;
      if (!acts) return;
      for (const a of acts) {
        let s = this.held.get(a);
        if (!s) this.held.set(a, (s = new Set()));
        s.add(e.code);
        this.queue.add(a);
      }
    });
    target.addEventListener("keyup", (e) => {
      const acts = KEYMAP[e.code];
      if (!acts) return;
      for (const a of acts) this.held.get(a)?.delete(e.code);
    });
    target.addEventListener("blur", () => this.held.clear());
    target.addEventListener("pointerdown", () => { this.gesture(); this.anyQueued = true; });
  }

  private gesture() {
    if (this.onFirstGesture) { const f = this.onFirstGesture; this.onFirstGesture = null; f(); }
  }

  /** Call once at the start of every fixed update. */
  step() {
    const pads = typeof navigator !== "undefined" && navigator.getGamepads ? navigator.getGamepads() : [];
    const cur = new Set<Action>();
    for (const p of pads) {
      if (!p) continue;
      for (const [i, acts] of PADMAP) if (p.buttons[i]?.pressed) for (const a of acts) cur.add(a);
      const ax = p.axes[0] ?? 0, ay = p.axes[1] ?? 0;
      if (ax < -0.45) cur.add("left");
      if (ax > 0.45) cur.add("right");
      if (ay < -0.6) { cur.add("up"); cur.add("interact"); }
      if (ay > 0.6) cur.add("down");
    }
    for (const a of cur) if (!this.padPrev.has(a)) { this.queue.add(a); this.anyQueued = true; this.usingPad = true; this.gesture(); }
    this.padPrev = cur;
    this.padHeld = cur;
    this.now = this.queue;
    this.queue = new Set();
    this.anyPressed = this.anyQueued;
    this.anyQueued = false;
  }

  isHeld(a: Action) { return (this.held.get(a)?.size ?? 0) > 0 || this.padHeld.has(a); }
  pressed(a: Action) { return this.now.has(a); }
  /** Mark an action as handled so nothing else this step reacts to it. */
  consume(a: Action) { this.now.delete(a); }
  consumeAll() { this.now.clear(); this.anyPressed = false; }
}
