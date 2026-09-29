/**
 * All sound is synthesised with WebAudio — no asset files. SFX are tiny envelopes;
 * music is a lookahead step-sequencer playing chord-driven chiptune loops.
 */

export type Sfx =
  | "jump" | "djump" | "land" | "swing" | "swingHeavy" | "hit" | "crit" | "hurt" | "roll" | "coin"
  | "levelup" | "death" | "roar" | "slam" | "shrine" | "move" | "select" | "deny" | "forge"
  | "stomp" | "pot" | "heal" | "fog" | "tell" | "caw" | "splat" | "drink" | "purse" | "clink"
  | "throw" | "bog" | "open" | "close" | "victory" | "step" | "hop" | "kindle" | "dice" | "diceLand" | "perfect"
  | "bell" | "splash" | "chest" | "reveal" | "dig" | "sigil" | "watcher" | "gate" | "cut" | "chain" | "drip";

type Wave = OscillatorType;

interface Song {
  bpm: number;
  chords: number[][];
  arp: number[];
  arpWave: Wave;
  arpVol: number;
  arpLen: number;
  bass: string;
  bassWave: Wave;
  bassVol: number;
  drums?: string;
  pad: number;
  lead?: (number | null)[];
  leadVol?: number;
}

const Dm = [50, 53, 57], Bb = [50, 53, 58], Gm = [50, 55, 58], A = [49, 52, 57], C = [52, 55, 60];
const Am = [57, 60, 64], F = [53, 57, 60], Cg = [55, 60, 64], G = [55, 59, 62], Em = [52, 55, 59];
const Cm = [48, 51, 55], Ab = [48, 51, 56], Fm = [48, 53, 56], Gs = [47, 50, 55], Eb = [51, 55, 58];

const SONGS: Record<string, Song> = {
  title: {
    bpm: 62, chords: [Am, F, Cg, G], arp: [0, 1, 2, 4, 2, 1, 0, 1, 0, 1, 2, 4, 5, 4, 2, 1],
    arpWave: "triangle", arpVol: 0.05, arpLen: 0.5, bass: "x.......x.......", bassWave: "triangle", bassVol: 0.07, pad: 0.018,
  },
  village: {
    bpm: 78, chords: [Am, F, Cg, G, Am, F, Em, A], arp: [0, 2, 1, 2, 4, 2, 1, 2, 0, 2, 1, 2, 5, 4, 3, 2],
    arpWave: "triangle", arpVol: 0.045, arpLen: 0.35, bass: "x.......x...x...", bassWave: "triangle", bassVol: 0.07, pad: 0.014,
    lead: [76, null, 74, null, 72, null, 71, 72, null, null, 69, null, null, null, null, null,
      72, null, 71, null, 69, null, 67, 69, null, null, 64, null, null, null, null, null],
    leadVol: 0.025,
  },
  outskirts: {
    bpm: 64, chords: [Dm, Bb, Gm, A], arp: [0, -1, 2, -1, 1, -1, -1, 4, 0, -1, 2, -1, 3, -1, -1, -1],
    arpWave: "square", arpVol: 0.018, arpLen: 0.22, bass: "x...............", bassWave: "sawtooth", bassVol: 0.03, pad: 0.02,
    drums: "..............h.",
  },
  boss: {
    bpm: 134, chords: [Dm, Dm, Bb, C, Dm, Dm, Gm, A], arp: [0, 1, 2, 3, 2, 1, 0, 1, 0, 1, 2, 4, 3, 2, 1, 2],
    arpWave: "square", arpVol: 0.022, arpLen: 0.12, bass: "x.x.x.x.x.x.x.xx", bassWave: "sawtooth", bassVol: 0.045, pad: 0.012,
    drums: "k.h.s.h.k.k.s.hh",
    lead: [74, null, null, 72, null, 74, 77, null, 76, null, null, 74, null, 72, 69, null],
    leadVol: 0.02,
  },
  boss2: {
    bpm: 150, chords: [Dm, Bb, Gm, A, Dm, Bb, C, A], arp: [0, 1, 2, 4, 2, 1, 5, 4, 0, 1, 2, 4, 5, 4, 2, 1],
    arpWave: "square", arpVol: 0.024, arpLen: 0.1, bass: "xxx.x.xxx.x.x.xx", bassWave: "sawtooth", bassVol: 0.05, pad: 0.012,
    drums: "k.hsk.hsk.hsk.ss",
    lead: [81, null, 79, 77, null, 76, 77, null, 74, null, null, 72, 74, null, 69, null],
    leadVol: 0.022,
  },
};

Object.assign(SONGS, {
  mines: {
    bpm: 58, chords: [Cm, Ab, Fm, Gs], arp: [0, -1, -1, 2, -1, -1, 1, -1, -1, -1, 4, -1, -1, 2, -1, -1],
    arpWave: "triangle", arpVol: 0.03, arpLen: 0.6, bass: "x.......x.......", bassWave: "triangle", bassVol: 0.06, pad: 0.016,
    drums: "......h.........",
  },
  grim: {
    bpm: 118, chords: [Cm, Cm, Ab, Gs, Cm, Eb, Fm, Gs], arp: [0, 2, 1, 2, 0, 2, 1, 4, 0, 2, 1, 2, 3, 2, 1, 2],
    arpWave: "square", arpVol: 0.02, arpLen: 0.14, bass: "x..x..x.x..x..x.", bassWave: "sawtooth", bassVol: 0.05, pad: 0.014,
    drums: "k..hs..hk.k.s..h",
    lead: [72, null, null, 75, null, 74, 72, null, 71, null, null, 67, null, 68, 71, null],
    leadVol: 0.02,
  },
  grim2: {
    bpm: 140, chords: [Cm, Ab, Fm, Gs, Cm, Ab, Eb, Gs], arp: [0, 1, 2, 4, 2, 1, 5, 4, 0, 1, 2, 4, 5, 4, 2, 1],
    arpWave: "square", arpVol: 0.024, arpLen: 0.1, bass: "xx.xx.xxx.x.xx.x", bassWave: "sawtooth", bassVol: 0.05, pad: 0.012,
    drums: "k.hsk.hsk.hsk.ss",
    lead: [79, null, 77, 75, null, 74, 75, null, 72, null, null, 71, 72, null, 67, null],
    leadVol: 0.022,
  },
} satisfies Record<string, Song>);

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private noiseBuf!: AudioBuffer;
  muted = false;

  private song: Song | null = null;
  private songName = "";
  private songGain: GainNode | null = null;
  private step = 0;
  private nextTime = 0;

  unlock() {
    if (!this.ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.9;
      this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 1;
      this.musicBus.connect(this.master);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const pending = this.songName;
      this.songName = "";
      if (pending) this.music(pending);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.9, this.ctx.currentTime, 0.05);
    return this.muted;
  }

  // ---------- primitives ----------
  private tone(freq: number, dur: number, o: { type?: Wave; vol?: number; to?: number; delay?: number; attack?: number; bus?: AudioNode; at?: number } = {}) {
    const c = this.ctx; if (!c) return;
    const t = (o.at ?? c.currentTime) + (o.delay ?? 0);
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = o.type ?? "square";
    osc.frequency.setValueAtTime(freq, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + dur);
    const v = o.vol ?? 0.1, a = o.attack ?? 0.004;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(o.bus ?? this.sfxBus);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(dur: number, o: { vol?: number; freq?: number; to?: number; q?: number; delay?: number; type?: BiquadFilterType; bus?: AudioNode; at?: number; attack?: number } = {}) {
    const c = this.ctx; if (!c) return;
    const t = (o.at ?? c.currentTime) + (o.delay ?? 0);
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = o.type ?? "bandpass";
    f.frequency.setValueAtTime(o.freq ?? 1000, t);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    f.Q.value = o.q ?? 1;
    const g = c.createGain();
    const v = o.vol ?? 0.1;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + (o.attack ?? 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(o.bus ?? this.sfxBus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  private arp(notes: number[], gap: number, o: { type?: Wave; vol?: number; len?: number } = {}) {
    notes.forEach((n, i) => this.tone(mtof(n), o.len ?? gap * 1.6, { type: o.type ?? "square", vol: o.vol ?? 0.07, delay: i * gap }));
  }

  // ---------- sfx ----------
  play(name: Sfx, param = 0) {
    if (!this.ctx) return;
    const r = 1 + (Math.random() - 0.5) * 0.08; // subtle pitch variance keeps repeats alive
    switch (name) {
      case "jump": this.tone(260 * r, 0.12, { to: 560, vol: 0.05 }); break;
      case "djump": this.tone(380 * r, 0.12, { to: 820, vol: 0.05 }); this.noise(0.1, { freq: 3000, vol: 0.03 }); break;
      case "land": this.noise(0.07, { freq: 500, vol: 0.08, type: "lowpass" }); break;
      case "swing": this.noise(0.11, { freq: 2200 * r, to: 700, vol: 0.09, q: 2 }); break;
      case "swingHeavy": this.noise(0.18, { freq: 1500 * r, to: 300, vol: 0.12, q: 2 }); break;
      case "hit":
        this.tone(190 * r, 0.09, { to: 60, vol: 0.12 });
        this.noise(0.07, { freq: 2600, vol: 0.09 });
        break;
      case "crit":
        this.tone(170 * r, 0.12, { to: 50, vol: 0.14 });
        this.noise(0.09, { freq: 3200, vol: 0.1 });
        this.tone(1480, 0.08, { type: "triangle", vol: 0.06, delay: 0.02 });
        break;
      case "hurt":
        this.tone(240, 0.22, { type: "sawtooth", to: 80, vol: 0.1 });
        this.noise(0.12, { freq: 900, vol: 0.08 });
        break;
      case "roll": this.noise(0.16, { freq: 700, to: 350, vol: 0.07, type: "lowpass" }); break;
      case "coin":
        this.tone(988, 0.06, { vol: 0.045 });
        this.tone(1319, 0.2, { vol: 0.045, delay: 0.06 });
        break;
      case "levelup":
        this.arp([60, 64, 67, 72, 76, 79, 84], 0.07, { vol: 0.06, len: 0.18 });
        this.tone(mtof(72), 0.7, { type: "triangle", vol: 0.07, delay: 0.5 });
        this.tone(mtof(76), 0.7, { type: "triangle", vol: 0.05, delay: 0.5 });
        this.tone(mtof(79), 0.7, { type: "triangle", vol: 0.05, delay: 0.5 });
        break;
      case "death":
        this.tone(220, 1.4, { type: "sawtooth", to: 40, vol: 0.12 });
        this.tone(110, 1.8, { type: "triangle", to: 30, vol: 0.12 });
        this.noise(1.2, { freq: 400, to: 60, vol: 0.08, type: "lowpass" });
        break;
      case "roar":
        this.noise(1.3, { freq: 260, to: 120, vol: 0.22, q: 3, attack: 0.1 });
        this.tone(70, 1.2, { type: "sawtooth", to: 45, vol: 0.14, attack: 0.1 });
        this.tone(104, 1.1, { type: "sawtooth", to: 60, vol: 0.08, attack: 0.1 });
        break;
      case "slam":
        this.noise(0.4, { freq: 180, vol: 0.25, type: "lowpass" });
        this.tone(80, 0.35, { type: "sine", to: 30, vol: 0.25 });
        break;
      case "shrine":
        [0, 4, 7, 12].forEach((n, i) => this.tone(mtof(64 + n), 1.4, { type: "sine", vol: 0.05, delay: i * 0.09, attack: 0.02 }));
        this.noise(0.8, { freq: 5000, vol: 0.015, attack: 0.2 });
        break;
      case "move": this.tone(660, 0.03, { vol: 0.03 }); break;
      case "select": this.tone(880, 0.05, { vol: 0.04 }); this.tone(1320, 0.07, { vol: 0.04, delay: 0.05 }); break;
      case "deny": this.tone(150, 0.14, { vol: 0.06 }); this.tone(120, 0.14, { vol: 0.06, delay: 0.08 }); break;
      case "open": this.arp([67, 71, 74], 0.04, { vol: 0.035, type: "triangle" }); break;
      case "close": this.arp([74, 71, 67], 0.04, { vol: 0.03, type: "triangle" }); break;
      case "forge":
        this.tone(1760, 0.5, { type: "triangle", vol: 0.07 });
        this.tone(2637, 0.35, { type: "sine", vol: 0.04 });
        this.noise(0.08, { freq: 4000, vol: 0.08 });
        this.tone(1760, 0.4, { type: "triangle", vol: 0.05, delay: 0.25 });
        break;
      case "clink": this.tone(2093 * r, 0.12, { type: "triangle", vol: 0.012 * param }); this.noise(0.03, { freq: 5000, vol: 0.01 * param }); break;
      case "stomp": this.tone(180, 0.1, { to: 520, vol: 0.08 }); this.noise(0.08, { freq: 600, vol: 0.08 }); break;
      case "pot":
        this.noise(0.14, { freq: 3200, vol: 0.1, q: 3 });
        this.tone(520 * r, 0.06, { type: "triangle", vol: 0.05, delay: 0.02 });
        this.tone(780 * r, 0.05, { type: "triangle", vol: 0.04, delay: 0.06 });
        break;
      case "heal": this.tone(392, 0.5, { type: "sine", to: 784, vol: 0.06, attack: 0.05 }); this.tone(587, 0.5, { type: "sine", to: 1175, vol: 0.03, delay: 0.1 }); break;
      case "drink": this.noise(0.25, { freq: 600, vol: 0.06, q: 8, attack: 0.03 }); this.tone(300, 0.15, { type: "sine", to: 200, vol: 0.04, delay: 0.1 }); break;
      case "fog": this.noise(1.0, { freq: 900, to: 2400, vol: 0.08, attack: 0.3 }); break;
      case "tell": this.tone(1568, 0.12, { type: "triangle", vol: 0.05 }); this.tone(2093, 0.18, { type: "sine", vol: 0.03, delay: 0.04 }); break;
      case "caw": this.tone(700 * r, 0.12, { type: "sawtooth", to: 380, vol: 0.05 }); this.noise(0.1, { freq: 1400, vol: 0.05, q: 4 }); break;
      case "splat": this.noise(0.2, { freq: 400, to: 150, vol: 0.12, q: 2 }); this.tone(120, 0.12, { type: "sine", to: 60, vol: 0.08 }); break;
      case "purse": this.arp([72, 76, 79, 84], 0.05, { vol: 0.05 }); break;
      case "throw": this.noise(0.12, { freq: 1200, to: 2600, vol: 0.06 }); break;
      case "bog": this.noise(0.4, { freq: 300, to: 120, vol: 0.14, q: 4 }); this.tone(140, 0.3, { type: "sine", to: 60, vol: 0.08 }); break;
      case "perfect":
        this.tone(900, 0.35, { type: "sine", to: 2400, vol: 0.06, attack: 0.01 });
        this.tone(1350, 0.3, { type: "triangle", to: 3000, vol: 0.03, delay: 0.04 });
        this.noise(0.4, { freq: 6000, vol: 0.03, attack: 0.02 });
        break;
      case "dice":
        for (let i = 0; i < 7; i++) this.noise(0.03, { freq: 2600 + Math.random() * 1500, vol: 0.05, q: 6, delay: i * 0.045 + Math.random() * 0.02 });
        break;
      case "diceLand":
        this.noise(0.05, { freq: 1800 * r, vol: 0.09, q: 5 });
        this.tone(420 * r, 0.06, { type: "triangle", vol: 0.05 });
        break;
      case "step": this.noise(0.035, { freq: 700 * r, vol: 0.018, type: "lowpass" }); break;
      case "hop": this.noise(0.08, { freq: 500 * r, to: 900, vol: 0.03, q: 3 }); break;
      case "kindle":
        this.noise(0.6, { freq: 800, to: 3000, vol: 0.08, attack: 0.05 });
        [0, 7, 12, 16, 19].forEach((n, i) => this.tone(mtof(60 + n), 1.6, { type: "triangle", vol: 0.05, delay: 0.15 + i * 0.1, attack: 0.02 }));
        break;
      case "bell":
        [0, 0.02].forEach((d, i) => this.tone(mtof(i ? 67 : 55), 2.2, { type: "sine", vol: 0.09, delay: d, attack: 0.005 }));
        this.tone(mtof(70), 1.6, { type: "triangle", vol: 0.03, delay: 0.01 });
        this.noise(0.08, { freq: 3000, vol: 0.05 });
        break;
      case "splash": this.noise(0.45, { freq: 1200, to: 300, vol: 0.12, q: 1.5 }); this.tone(220, 0.2, { type: "sine", to: 90, vol: 0.05 }); break;
      case "chest":
        this.noise(0.25, { freq: 500, to: 250, vol: 0.12, type: "lowpass" });
        this.tone(160, 0.3, { type: "square", to: 110, vol: 0.05, delay: 0.05 });
        break;
      case "reveal": this.tone(mtof(60 + param * 3) * r, 0.25, { type: "triangle", vol: 0.06 }); this.noise(0.1, { freq: 4000 + param * 800, vol: 0.03 }); break;
      case "dig": this.noise(0.12, { freq: 400 * r, vol: 0.14, type: "lowpass" }); this.noise(0.05, { freq: 2600, vol: 0.04, delay: 0.03 }); break;
      case "sigil":
        this.tone(110, 1.0, { type: "sawtooth", to: 55, vol: 0.06, attack: 0.05 });
        [0, 6, 12].forEach((n, i) => this.tone(mtof(57 + n), 0.9, { type: "sine", vol: 0.04, delay: i * 0.08 }));
        break;
      case "watcher": this.tone(1100, 0.5, { type: "sine", to: 700, vol: 0.05, attack: 0.05 }); this.tone(1650, 0.5, { type: "sine", to: 1050, vol: 0.03, attack: 0.05 }); break;
      case "gate": this.noise(0.7, { freq: 220, vol: 0.2, type: "lowpass" }); this.tone(70, 0.6, { type: "square", to: 40, vol: 0.06 }); break;
      case "cut": this.noise(0.18, { freq: 2400, to: 500, vol: 0.12, q: 2 }); this.noise(0.25, { freq: 300, vol: 0.1, type: "lowpass", delay: 0.05 }); break;
      case "chain": for (let i = 0; i < 5; i++) this.noise(0.04, { freq: 3500 + i * 300, vol: 0.05, q: 8, delay: i * 0.035 }); break;
      case "drip": this.tone(1400 * r, 0.12, { type: "sine", to: 700, vol: 0.02 * Math.max(0.2, param) }); break;
      case "victory":
        this.arp([62, 65, 69, 74], 0.14, { vol: 0.06, type: "triangle", len: 0.6 });
        this.tone(mtof(74), 1.6, { type: "triangle", vol: 0.06, delay: 0.56 });
        this.tone(mtof(78), 1.6, { type: "triangle", vol: 0.05, delay: 0.56 });
        this.tone(mtof(81), 1.6, { type: "triangle", vol: 0.05, delay: 0.56 });
        break;
    }
  }

  /** Loot pickup chime. Rarer drops get longer, brighter arpeggios. */
  loot(rarity: number) {
    if (!this.ctx) return;
    const sets = [[72, 76], [72, 76, 79], [72, 76, 79, 84], [74, 78, 81, 86, 90], [72, 76, 79, 84, 88, 91, 96], [69, 73, 76, 81, 85, 88, 93]];
    const notes = sets[Math.min(rarity, sets.length - 1)];
    this.arp(notes, rarity >= 4 ? 0.07 : 0.05, { vol: 0.05, type: rarity >= 3 ? "triangle" : "square" });
    if (rarity >= 3) this.noise(0.9, { freq: 6000, vol: 0.02, attack: 0.1, delay: 0.1 });
  }

  // ---------- music ----------
  music(name: string) {
    if (name === this.songName) return;
    this.songName = name;
    const c = this.ctx;
    if (!c) return; // will start on unlock
    if (this.songGain) {
      const old = this.songGain;
      old.gain.setTargetAtTime(0.0001, c.currentTime, 0.4);
      setTimeout(() => old.disconnect(), 2500);
    }
    this.song = SONGS[name] ?? null;
    if (!this.song) { this.songGain = null; return; }
    this.songGain = c.createGain();
    this.songGain.gain.setValueAtTime(0.0001, c.currentTime);
    this.songGain.gain.setTargetAtTime(1, c.currentTime + 0.3, 0.5);
    this.songGain.connect(this.musicBus);
    this.step = 0;
    this.nextTime = c.currentTime + 0.35;
  }

  /** Schedule upcoming music steps. Call every frame. */
  update() {
    const c = this.ctx, s = this.song, bus = this.songGain;
    if (!c || !s || !bus) return;
    const stepDur = 60 / s.bpm / 4;
    if (this.nextTime < c.currentTime - 0.5) this.nextTime = c.currentTime + 0.05; // tab was hidden
    while (this.nextTime < c.currentTime + 0.18) {
      this.scheduleStep(s, this.step, this.nextTime, stepDur, bus);
      this.step++;
      this.nextTime += stepDur;
    }
  }

  private scheduleStep(s: Song, step: number, at: number, sd: number, bus: GainNode) {
    const bar = Math.floor(step / 16) % s.chords.length;
    const chord = s.chords[bar];
    const i = step % 16;
    const idx = s.arp[i];
    if (idx >= 0) {
      const n = chord[idx % 3] + 12 * Math.floor(idx / 3) + 12;
      this.tone(mtof(n), sd * s.arpLen * 8, { type: s.arpWave, vol: s.arpVol, at, bus });
    }
    if (s.bass[i] === "x") this.tone(mtof(chord[0] - 12), sd * 3.5, { type: s.bassWave, vol: s.bassVol, at, bus });
    if (s.drums) {
      const d = s.drums[i];
      if (d === "k") this.tone(130, 0.14, { type: "sine", to: 40, vol: 0.14, at, bus });
      else if (d === "s") this.noise(0.12, { freq: 1800, vol: 0.06, at, bus, q: 0.7 });
      else if (d === "h") this.noise(0.035, { freq: 8000, vol: 0.025, at, bus, type: "highpass" });
    }
    if (i === 0 && s.pad > 0) {
      for (const n of chord) this.tone(mtof(n), sd * 16, { type: "triangle", vol: s.pad, at, bus, attack: sd * 3 });
    }
    if (s.lead && s.leadVol && i % 2 === 0) {
      const li = Math.floor(step / 2) % s.lead.length;
      const n = s.lead[li];
      if (n != null) this.tone(mtof(n), sd * 3, { type: "square", vol: s.leadVol, at, bus, attack: 0.02 });
    }
  }
}

export const audio = new AudioEngine();
