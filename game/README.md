# Hollowmere — The Blighted Outskirts & The Drowned Mines

A pixel-art action RPG platformer. It has OldSchool RuneScape's grind and charm, Zelda's simplicity,
Souls-like difficulty and a little Mario bounce.

It's a standalone Vite + TypeScript project with no engine and no asset files. Every sprite, tile,
parallax layer, light, sound effect and music loop is generated in code at runtime.
The production bundle is about 90 KB gzipped.

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

## Level 1 layout: The Blighted Outskirts

Hollowmere (safe hub) → The Wheatfields → Wayside Hearth → The Rotting Orchard → Mill Gate Hearth → Miller's Field (boss).

- **Three parallax layers:** far mountains with a ruined castle, mid hills with village
  silhouettes and the distant mill, and a near treeline. They sit over a dithered sky, with animated
  fog bands, clouds, stars and the moon.
- **The palette shifts from west to east**, from warm dusk in the village to a bruised violet Rot at the mill.
  Tiles are dithered between healthy and blighted variants pixel by pixel.
- **Pixel lighting:** stepped, dithered light pools from lanterns, windows, the forge, Hearthstones,
  fireflies, rot spores, enemy eyes, loot beams and boss fire.
- **Hazards:** bogs, where Zelda-style falls cost 20% HP and return you to your last safe footing, and thorn brambles.

## Level 2: The Drowned Mines

Wick drops **Warden's Embers**. Three of them relight the beacon by the mill cellar in Miller's Field. That opens the way down, and a lift in the Mines brings you back up.

The Mine Mouth → The Flooded Galleries → The Rooted Deep → The Sunken Shaft (boss).

- **A new look.** The tunnels are carved out of solid rock, and every rock tile knows its distance to open air, so rims catch the light and deep rock falls to black. There's wet moss on the floors, stalactites and drips under the ceilings, drowned crystal, and flood water in place of bog.
- **A new background.** Three new parallax layers: a far cavern wall with crystal veins and threads of falling water, pillars and old scaffolds with a few lamps still lit, and a near curtain of stalactites.
- **It's dark.** Light matters down here: Wick's Lantern, the craftable Miner's Lamp, the Diver's Helm and a grown pet all push the dark back.
- **New foes:**
  - Sludgelings: tougher flood-water goo.
  - Cave Bats.
  - Drowned Miners: Husk rules, but with a pick that sticks in the rock, and a helmet lamp you can see coming.
- **Old Tam**, the last lamplighter, has stories and hints.

**Grimwater, the Drowned Foreman** (560 HP, two phases, posture) rang the flood bell the night the seam broke, and never stopped.
- **Pick slam:** a long, honest overhead wind-up. The pick then sticks in the rock for about a second, and he takes 35% extra damage while it's stuck.
- **Chained anchor:** thrown along the floor, out and back. Jump it or roll through it.
- **Bubbles** that drift after you.
- **The flood bell:** the shaft floods for a few seconds. The rot-water slows you and burns steadily, and only the scaffolds stay dry.
- **Phase 2:** ripples of rock follow the pick, the bell rings more often, and he calls up Sludgelings.

## Secrets: Wick's uniques are keys

Each of Wick's uniques opens a secret cache in the Mines. The caches refill every time you rest.

| Secret | Key | How |
| --- | --- | --- |
| The Lamplighter's Cache | Wick's Lantern | Its light makes ghostly ledges solid, all the way up to a high alcove |
| The Root-Bound Cache | Harvest Scythe (or the crafted Warden's Sickle) | Any curved blade cuts the orchard roots that seal a chamber. The roots regrow on rest |
| The Watched Cache | Strawman's Hood | Ceiling Watchers sweep the gallery with light. If they see you, the gate slams shut until you rest, and bats come. In the hood, they see only straw. Without it, you can still time your way past |

## Boss parts and crafting

Bosses drop materials at fixed odds, alongside their normal loot:
- **Wick:** Embers 1–2, Straw 3–6, Button Eye 1/6, Rusted Scythe Blade 1/20.
- **Grimwater:** Chain Links 2–4, Brine Pearl 1/2, Cracked Bell Shard 1/12.

Brom's new **CRAFT** tab turns them into fixed-stat Epic gear and permanent upgrades:

| Recipe | Cost | Result |
| --- | --- | --- |
| Miner's Lamp | 2 Embers, 8 Straw, 60g | Helm that lights the dark |
| Ember Flask | 4 Embers, 12 Straw, 150g | Permanent +1 tonic charge |
| Scarecrow Charm | 10 Straw, 2 Button Eyes, 90g | +8% damage, +10 stamina |
| Warden's Sickle | 1 Blade, 3 Embers, 120g | A scythe: cuts roots |
| Brine Pearl Ring | 2 Pearls, 3 Chain Links, 140g | +15% stamina regen, +4 armour |
| Drowned Mail | 8 Chain Links, 1 Bell Shard, 200g | Heavy body armour |
| Bell-Charm Dice | 2 Bell Shards, 2 Pearls, 250g | Permanent +1 Hearth Dice reroll |

## Boss sigils

A sigil stone stands before each fog gate. Once you've felled that boss, you can switch on any of three sigils:
- **Haste:** the boss is 20% faster.
- **Ash:** the boss has 40% more health.
- **Ruin:** the boss hits 30% harder.

Each active sigil adds a guaranteed gear roll and a shard. With all three, the unique table is rolled twice.

## Loot chests

Bosses, dug-up treasure, secret caches and the Daily Chest all drop a chest. When you open it, face-down cards flip one at a time, cheapest first, so the best drop always lands last. Unopened chests are gathered for you when the world resets, so nothing is lost.

## Treasure maps

Maps drop from foes (about 1/80–1/90), Husks and Miners (1/25–1/30), and bosses and caches (1/5–1/6).
- Each map points to one of ten dig sites across both levels.
- The Journal shows a parchment sketch of the area with an X, plus a clue.
- Stand on the X and dig to get the treasure table: gold, elite gear, shards, runes, and the Cartographer's Compass (1/25).
- You carry one map at a time. Spares sell for 25 gold.

## Pets grow up

Lil' Wick and Lil' Grim (each 1/500) grow with every boss you fell while they follow you:
- **25 kills:** they glow, giving a light of their own.
- **100 kills:** they also gather gold and shards from twice as far away.

## Achievement Diary

Hollowmere and the Drowned Mines each have Easy, Medium and Hard tiers of four tasks. Examples: stomp 10 Blightlings, fell Wick without taking a hit, open all three caches, fell Grimwater with all three sigils.

| Area | Easy | Medium | Hard |
| --- | --- | --- | --- |
| Hollowmere | 150 gold + a rune | Maps drop twice as often | +1 tonic charge |
| Drowned Mines | 200 gold + a rune | Light reaches 25% further | +1 Hearth Dice reroll |

## Daily bounty and weekly Rotmoon

- **The daily bounty.** Every day a 4th notice goes up on the board. It's the same for everyone that day, needs double the usual count, and pays +15 Hope and the Daily Chest.
- **The Rotmoon.** Every week one Rotmoon rules for everyone, and the title screen, the board and the Journal all show which. The possible moons:

| Rotmoon | Effect |
| --- | --- |
| Blood | Rotborn are 1/12 |
| Gilded | +50% gold |
| Hungry | Foes hit 15% harder, gear drops x1.5 |
| Pale | The perfect-dodge window is 0.06s longer |
| Harvest | Bosses drop an extra gear piece |
| Drowned | Maps drop three times as often |

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

**Reading fights beats mashing:**
- **Stamina gates attacks.** Each swing needs its full stamina cost. Empty the bar and you're *winded*: it refills at 60% speed until it's back to 40%.
- **Perfect dodges.** Roll within 0.24s of an attack landing for a **perfect dodge**. You get a moment of slow motion, 30 stamina back, and a riposte: your next swing is a guaranteed double-damage crit that breaks guards.
- **Smoother controls.** You can roll out of a swing's wind-up or recovery. A roll pressed while you're staggered comes out as soon as you regain footing, and hit stun is 0.18s.
- **Husks commit.** Light hits can't interrupt a Husk once it winds up; only your combo finisher or a riposte can. The fork glints 0.2s before the thrust. Then the fork sticks in the dirt for 0.9s, and the Husk takes 50% extra damage while it's stuck and pulling free.
- **Wick has posture.** Perfect dodges and finisher hits fill his posture meter, shown in gold under his health bar. When it's full he kneels for 2.2s and takes double damage.

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
| Sludgeling | 1/16 | 1/100 | 1/10 |
| Cave Bat | 1/20 | — | 1/12 |
| Drowned Miner | 1/6 | 1/20 | 1/5 |
| Grimwater | always (+1 bonus at 1/3) | 3–4 | — |

Rarity odds per gear drop (Common / Uncommon / Rare / Epic / Legendary):

| Source | C | U | R | E | L |
| --- | --- | --- | --- | --- | --- |
| Trash foes | 70% | 23% | 5.8% | 1% | 0.2% |
| Husk, Miner | 55% | 31% | 10.5% | 2.8% | 0.7% |
| Bosses | — | 52% | 34% | 11.5% | 2.5% |

Wick's uniques and pet: Wick's Lantern (1/40), Strawman's Hood (1/60), Harvest Scythe (1/90) and the pet
Lil' Wick (1/500). Grimwater's: Tide Bell (1/40), Diver's Helm (1/60), Foreman's Pick (1/90) and the pet
Lil' Grim (1/500).

Gold Find only scales gold, never rarity, so the loot curve can't run away.

- **Items:** 13 base items across 4 slots (weapon, helm, body, trinket) and 5 weapon types.
  Each weapon type has its own speed, reach and moveset.
- **Rolls:** stats roll within ±10% and scale with rarity. Rarer items get 1–3 affixes, and names are
  generated from them. Legendaries get titles of their own.
- **Gear is visible:** hats, helmets, armour and weapons show on the character.
- **Brom's smithy:** buy basics (including extra tonic flask charges), sell loot to your bank, and
  temper gear from +1 to +5. Tempering costs gold and Blight Shards, and each level adds 10% to base stats.
  It never fails.

## Dice (inspired by Slice & Dice and Balatro)

**Hearth Dice.** You carry three bone dice. Each has six faces and starts as Sword, Shield, Coin, Heart, Blank, Blank.

- **Charging:** slay 12 foes (or kill Wick) to charge the dice.
- **Rolling:** the next time you rest at a Hearthstone, the dice roll. You get 2 rerolls and can lock any dice you want to keep.
- **Duration:** the rolled faces are your buffs until the next roll, even through death.

| Face | Effect |
| --- | --- |
| Sword | +15% damage |
| Shield | +3 armour |
| Coin | +25% gold found |
| Heart | +1 tonic charge |
| Skull | Foes hit 20% harder, gear drops x1.5 |
| Fang (rare) | +2 health on hit |
| Star (rare) | +6% crit |
| Feather (rare) | +8% move speed |
| Moon (rare) | +20 max stamina |

**Combos.** Matching faces combine: a pair counts as 2.5 faces, and a triple counts as 4.5 faces plus a named bonus.

| Triple | Bonus |
| --- | --- |
| Swords: Bloodlust | Kills heal 4 health |
| Shields: Bulwark | Hits don't knock you off balance |
| Coins: Windfall | Every foe drops gold |
| Hearts: Second Wind | Survive one lethal hit |
| Skulls: Death Wish | Foes hit 60% harder, gear drops x3 |
| Blanks: Nothing At All | 60 gold to your bank |

**Runes.** Runes drop at published odds: 1/140–1/150 from small foes, 1/50–1/60 from Husks and Miners, 1/5 from Wick and 1/4 from Grimwater. You inscribe them over a face from the Hearth Dice screen. A replaced face goes back to your runes, unless it was blank.

**Finisher die.** The third hit of your combo rolls a six-sided die tied to your weapon type. The faces are listed in each weapon's tooltip.

| Weapon | Faces |
| --- | --- |
| Sword | - - x1.5 x1.5 x2 REND |
| Axe | - - x1.5 x2 CLEAVE CLEAVE |
| Dagger | - x1.5 x1.5 TWIN TWIN REND |
| Spear | - - x1.5 x2 SKEWER SKEWER |
| Scythe | - - x1.5 x2 REAP REAP |

- **Rend:** the target bleeds for 75% more over 2 seconds.
- **Cleave:** hits nearby foes for 60%.
- **Twin:** strikes again for 70%.
- **Skewer:** x1.5 damage and a huge knockback.
- **Reap:** heals you for 30% of the damage dealt.

## Reasons to keep going

**Bounties.** The notice board by the gate always has three contracts, and at most one of them is a kill contract. Examples:
- Slay Husks.
- Land ripostes.
- Make perfect dodges.
- Stomp Blightlings.
- Roll finisher faces.
- Fell Wick without drinking a tonic, or in under 2:30.
- Slay a Rotborn.

Progress is tracked automatically, and a finished contract pays out on the spot: a rune, shards, banked gold, or a full dice charge. New notices are posted when you rest.

**Hollowmere's Hope.** Bounties, Wick kills (+10 the first time, then +5) and Rotborn kills (+2) raise Hope. The milestones restore the village and grant permanent unlocks. The world art changes the next time you rest.

| Hope | Milestone | Effect |
| --- | --- | --- |
| 10 | The Road Lamps | Lamps relit along the road, +1 Hearth Dice reroll |
| 25 | Brom's Apprentice | Brom sells a fresh rune each rest |
| 45 | The Wheat Recovers | The Rot retreats 30 tiles, +10% gold found |
| 70 | A Brighter Hearth | +1 tonic charge |
| 100 | The Mill Turns | The Rot retreats 70 tiles, the mill spins, and you get the Harvest Crown |

**Rotborn.** Each regular foe has a 1/35 chance to rise as a Rotborn when the world resets. Rotborn have a glowing violet outline, 3x health, hit 30% harder, and Husks get double poise. On top of their normal drops, they always drop a gear piece at elite odds, 1–2 shards, and a rune 1 time in 3.

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
  world/     level data (Outskirts, Mines) and registry, tile physics, pre-rendered props
  entities/  player, enemies (Outskirts foes and their Mines variants), bossBase, Wick and
             Grimwater (+ projectiles, flood), loot chests, Watchers, pickups, NPCs, pets
  systems/   items and affixes, loot tables, crafting, sigils, diary, pets, bounties (daily,
             Rotmoon, Hope), skills and XP curve, derived stats, save, chat
  ui/        HUD, inventory (gear, skills, log, diary, journal), shop/forge/craft, chest reveal,
             sigil stone, notice board, dialogue, title/intro/pause/death
  game.ts    the game loop: world, combat resolution, loot, camera, render pipeline
```

The rendering pipeline draws at 384×216 and scales by whole pixels. The order is: sky → far/mid/near layers +
fog → props → tiles → entities → foreground grass → Rot colour grade → lighting → glowing
particles → vignette → HUD.
