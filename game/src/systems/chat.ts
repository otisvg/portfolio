/** OSRS-style chatbox: game messages that fade after a while. */
export interface ChatLine { text: string; color: string; t: number }

export class Chat {
  lines: ChatLine[] = [];
  push(text: string, color = "#f1e3c2") {
    this.lines.push({ text, color, t: 0 });
    if (this.lines.length > 6) this.lines.shift();
  }
  update(dt: number) {
    for (const l of this.lines) l.t += dt;
    this.lines = this.lines.filter((l) => l.t < 7);
  }
}
