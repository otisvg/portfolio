# Hollowmere — Level 1: The Blighted Outskirts

A pixel-art action RPG platformer. It has OldSchool RuneScape's grind and charm, Zelda's simplicity,
Souls-like difficulty and a little Mario bounce.

It's a standalone Vite + TypeScript project with no engine and no asset files. Every sprite, tile,
parallax layer, light, sound effect and music loop is generated in code at runtime.
The production bundle is about 60 KB gzipped.

```bash
cd game
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in game/dist (relative paths, host anywhere)
npm run typecheck
```

## Controls

| Action | Keyboard | Gamepad |
| --- | --- | --- |
| Move | A / D or ← / → | D-pad / left stick |
| Jump (hold for height, press again mid-air) | Space / Z | A |
| Attack (tap for a 3-hit combo) | J / X | X |
| Dodge roll (invulnerable mid-roll) | K / C / Shift | B |
| Drink tonic | Q | Y |
| Interact / talk / rest | E / W / ↑ | RB / D-pad ↑ |
| Drop through planks | ↓ + Jump | |
| Inventory, skills, collection log | I / Tab | Start |
| Pause · Mute | Esc · M | Back |

## The story (light and environmental)

Hollowmere was a kind village. Then Wick, the scarecrow of Miller's Field, climbed down from
his post. He guarded the wheat for forty years; the Rot found that duty and kept it. The story
is told in a short intro, through three villagers (Elder Maud, Brom the smith, and Pip),
through signposts and graves, and through item flavour text.

## Level layout

Hollowmere (safe hub) → The Wheatfields → Wayside Hearth → The Rotting Orchard → Mill Gate Hearth → Miller's Field (boss).

- **Three parallax layers:** far mountains with a ruined castle, mid hills with village
  silhouettes and the distant mill, and a near treeline. They sit over a dithered sky, with animated
  fog bands, clouds, stars and the moon.
- **The palette shifts from west to east**, from warm dusk in the village to a bruised violet Rot at the mill.
  Tiles are dithered between healthy and blighted variants pixel by pixel.
- **Pixel lighting:** stepped, dithered light pools from lanterns, windows, the forge, Hearthstones,
  fireflies, rot spores, enemy eyes, loot beams and boss fire.
- **Hazards:** bogs, where Zelda-style falls cost 20% HP and return you to your last safe footing, and thorn brambles.

## Combat (Souls-like)

- Stamina governs attacks, rolls and double-jumps.
- The 3-hit combo ends in a heavy finisher and can be cancelled into a roll.
- The roll has invulnerability frames. Rolling through an attack trains Defence.
- Tonics heal over time, but you're slowed while drinking and a hit spills them.
- Every enemy telegraphs its attacks:
  - Husks flash and their pitchfork glints before the thrust.
  - Rotcrows caw before they dive.
  - Wick raises his scythe or crouches before he leaps.
- Hitstop, screen shake, damage numbers and a delayed HP "damage trail".
- You can stomp the little Blightlings, Mario-style.

**Wick, the Harvest Warden** has two phases:
- Scythe sweeps you can jump or roll through.
- Leap slams that send shockwaves along the ground.
- Rot-seed barrages that leave damaging puddles.
- Below 50% HP his head ignites. He gets faster, chains his sweeps and summons crows.

## Death (reclaimable gold)

Resting at a Hearthstone heals you, refills your tonics, banks your carried gold and saves the game.
It also revives every enemy and Wick himself, which is how the boss can be farmed.

If you die, your carried gold stays where you fell as a purse. Die again before reclaiming it and
it's gone. Your gear is always kept.

## Loot (balanced, transparent, no pity)

Every drop is an independent roll at fixed, published odds. The Collection Log shows them in game.

| Source | Gear | Blight Shard | Tonic orb |
| --- | --- | --- | --- |
| Blightling | 1/18 | 1/120 | 1/10 |
| Rotcrow | 1/22 | — | 1/12 |
| Husk | 1/7 | 1/25 | 1/5 |
| Wick | always (+1 bonus at 1/3) | 2–3 | — |

Rarity odds per gear drop (Common / Uncommon / Rare / Epic / Legendary):

| Source | C | U | R | E | L |
| --- | --- | --- | --- | --- | --- |
| Trash foes | 70% | 23% | 5.8% | 1% | 0.2% |
| Husk | 55% | 31% | 10.5% | 2.8% | 0.7% |
| Wick | — | 52% | 34% | 11.5% | 2.5% |

Wick's uniques and pet: Wick's Lantern (1/40), Strawman's Hood (1/60), Harvest Scythe (1/90) and the pet
Lil' Wick (1/500).

Gold Find only scales gold, never rarity, so the loot curve can't run away.

- **Items:** 13 base items across 4 slots (weapon, helm, body, trinket) and 5 weapon types.
  Each weapon type has its own speed, reach and moveset.
- **Rolls:** stats roll within ±10% and scale with rarity. Rarer items get 1–3 affixes, and names are
  generated from them. Legendaries get titles of their own.
- **Gear is visible:** hats, helmets, armour and weapons show on the character.
- **Brom's smithy:** buy basics (including extra tonic flask charges), sell loot to your bank, and
  temper gear from +1 to +5. Tempering costs gold and Blight Shards, and each level adds 10% to base stats.
  It never fails.

## Progression (OSRS-style)

- **Skills:** Attack, Strength, Defence and Hitpoints use the real OSRS XP curve. Hitpoints starts at
  level 10, and a new character is combat level 3.
- **Feedback:** XP drops, and level-up messages in OSRS's own words.
- **Chat:** a chatbox carries lines like "Your Wick kill count is: 12." and
  "You have a funny feeling like you're being followed."
- **Collection Log:** tracks uniques, kill counts, deaths and your best find.
- **Saves:** stored in `localStorage` whenever you rest, change gear, level up or die, and when the tab closes.

## Code map

```
src/
  core/      constants, input (keyboard + gamepad), seeded RNG, WebAudio sfx + music sequencer
  gfx/       palette, bitmap font, icons, sprite compositor (outline/flash), tiles, props,
             three-layer parallax background, lighting, particles, weapons
  world/     level data and builder, tile physics, pre-rendered props
  entities/  player, enemies (Blightling, Rotcrow, Husk, pots), boss (Wick + projectiles),
             pickups, purse, Hearthstones, signs, NPCs, pet
  systems/   items and affixes, loot tables, skills and XP curve, derived stats, save, chat
  ui/        HUD, inventory/skills/collection menus, shop and forge, dialogue, title/intro/pause/death
  game.ts    the game loop: world, combat resolution, loot, camera, render pipeline
```

The rendering pipeline draws at 384×216 and scales by whole pixels. The order is: sky → far/mid/near layers +
fog → props → tiles → entities → foreground grass → Rot colour grade → lighting → glowing
particles → vignette → HUD.
