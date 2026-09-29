/** The game's palette. Moody dusk tones that slide toward a sickly violet "Rot" further east. */
export const C = {
  ink: "#0b0a12",
  inkSoft: "#17131f",
  black: "#07060d",
  white: "#f4ecd8",
  cream: "#f1e3c2",
  paper: "#d8c8a8",

  // sky
  sky0: "#100d1f", sky1: "#1d1636", sky2: "#35224a", sky3: "#5f3257", sky4: "#9a4a5a", sky5: "#d9795a",
  rot0: "#0a0911", rot1: "#140f1f", rot2: "#221630", rot3: "#34193d", rot4: "#48274a", rot5: "#5e4a4e",
  moon: "#f1e3c2", moonShade: "#c9b894",

  // foliage & earth
  grass0: "#1f3a2e", grass1: "#2f5a3a", grass2: "#3f7a45", grass3: "#6aa04f", grass4: "#a3c46a",
  dirt0: "#231821", dirt1: "#33222b", dirt2: "#46303a", dirt3: "#5d4248",
  stone0: "#25232f", stone1: "#3a3749", stone2: "#57536a", stone3: "#7d7990",
  wood0: "#2e1d1f", wood1: "#4a2f2a", wood2: "#6b4533", wood3: "#8f6443", wood4: "#b08457",
  straw0: "#6e5428", straw1: "#9c7a3a", straw2: "#c9a64a", straw3: "#e6cb72",

  // blight
  blight0: "#1c1224", blight1: "#35203f", blight2: "#523060", blight3: "#7a3b7a", blight4: "#b04f9a", blight5: "#e08ad0",
  sick0: "#4d5a2a", sick1: "#8fb34a", sick2: "#c9e06a",

  // light
  fire0: "#ff7b3a", fire1: "#ffa94d", fire2: "#ffcf7a", fire3: "#fff1c2",

  // characters
  skin0: "#9a5f52", skin1: "#d09a7a", skin2: "#ecc3a0",
  hair: "#4a2c2a",
  scarf0: "#6e1f2e", scarf1: "#b33a3a", scarf2: "#e0604e",
  cloth0: "#23303f", cloth1: "#34506a", cloth2: "#4f7a8f",
  pants: "#2a2638", boots: "#3a2420",
  steel0: "#4e5266", steel1: "#8a90a6", steel2: "#c8cedc", steel3: "#eef1f8",
  gold0: "#8a6420", gold1: "#c9962a", gold2: "#f2cf55", gold3: "#fff2a8",

  // ui
  panel: "#110e1c", panelHi: "#1e1930", border: "#3d3656", borderHi: "#6a5f8a",
  hp: "#c7373f", hpDark: "#6e1a24", stam: "#6cbf5a", stamDark: "#2c5a2a", xp: "#5aa0d8",
  good: "#72d672", bad: "#e0605a", dim: "#8a8298", faint: "#5a5468",
} as const;

export const RARITY = [
  { name: "Common", color: "#c9c6d4" },
  { name: "Uncommon", color: "#5fd36a" },
  { name: "Rare", color: "#4fa3ff" },
  { name: "Epic", color: "#bd72ff" },
  { name: "Legendary", color: "#ff9f2e" },
  { name: "Unique", color: "#f5d76e" },
] as const;
