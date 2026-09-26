# Design System: Warm Editorial, Brought to Life

## Direction

- **THESIS**: A calm editorial base (warm bone, deep ink, one ember accent) with each project given its own colour and a small living illustration. Pages are short, scannable, and end with a clear next step.
- **STORY**: Otis builds web products end to end. A visitor should get that in one sentence, see four proof points, then pick a project that looks and moves like the thing it is.
- **FIRST VIEWPORT**: “Hey, I’m Otis.”, a one-line intro, the current role with a live dot, two actions (work, CV), and a tilted portrait on an ember card. Proof numbers sit directly beneath.
- **SIMPLICITY RULES**: One idea per block. Homepage cards show a one-line description and at most three short highlights. Tech stacks live on case studies. Case studies use the same order every time: title, artwork, context + highlights, three-step “How it works”, short labelled sections, next project.

---

## Palette & Color Tokens

### Core (light / dark)
- `--bg`: `#f8f7f2` / `#121411`
- `--ink`: `#191b16` / `#eef0e9`
- `--muted`: `#5a5e53` / `#a1a698`
- `--border`: `#dedfd7` / `#2a2d26`
- `--panel`: `#ffffff` / `#1a1d17`
- `--subtle`: `#f0f1ea` / `#21241e`
- `--accent`: `#b84826` / `#ea7e58`. The light value was darkened from `#c24e2b` so small accent text passes WCAG AA on every light surface: 4.9:1 on `--bg`, 5.3:1 on `--panel`, and 4.6:1 on `--subtle`.
- `--cta-bg`: `#1c1e19` / `#1b1e18`. The closing “Let’s talk” block stays dark in both themes.

### Project tints
Each project owns one muted tile colour (`--<project>-tile`) and a matching ink, applied through `.art--<slug>` and `.tone--<slug>`. Light values are soft pastels; dark values are deep versions of the same hue. The Agents tile is dark in both themes because it frames a terminal.

| Project | Light tile | Dark tile |
|---|---|---|
| ROLI | mauve `#ebe1ea` | `#282030` |
| HAWK | sage `#dde7dd` | `#17231c` |
| Agents in practice | ink `#23261f` | `#0b0d0a` |
| Pocket Circuit | peach `#f4dfd1` | `#33211a` |
| Hearth | oat `#efe6cd` | `#29251a` |
| KTT2 Song Finder | periwinkle `#dfe3f2` | `#1a1d30` |

The ember accent stays the only interface accent. Tints are for artwork and the next-project tile only.

---

## Typography

- **Display & body**: Space Grotesk Variable (`--font-sans`). Display headings are weight 600 with tracking between `-0.035em` and `-0.05em`.
- **Metadata**: IBM Plex Mono (`--font-mono`) for dates, roles on cards, and small labels only.
- Scale: hero and closing headings reach `136px`; section headings `64px`; card titles `40px`, or `72px` on the featured card. Body copy is 16–17px, and lead text 21–30px.
- Sentence-ending full stops use `--accent` (`AccentPunctuation`).
- `text-wrap: balance` on headings, `pretty` on paragraphs.

---

## Layout & Shape

- **Shell**: max width `1280px`, side padding `clamp(20px, 5vw, 64px)`.
- **Radii**: cards `20px`, art heroes and the next-project tile `28px`, closing block `32px`, buttons and chips fully rounded.
- **Elevation**: cards rest on a hairline border and gain `--shadow-lg` plus a 4px lift on hover. Tiles carry a faint inner ring so dark tiles never melt into a dark page.
- **Homepage grid**: ROLI spans the full width (art | text), then HAWK and Agents side by side, then three side projects. On narrow screens everything stacks into a single column.

---

## Motion

All motion is CSS-only and progressive. Nothing depends on JavaScript to become visible.

1. **Hero entrance**: staggered rise of heading, lead, status and actions; the portrait straightens on hover.
2. **Project artwork** (`components/project-art.tsx`): ambient loops such as HAWK’s heartbeat and alert ping, the agent terminal typing define → build → verify, Pocket Circuit’s pads playing a beat under a moving playhead, Hearth’s week being ticked off, and KTT2 mentions lighting up as tracks join a playlist. Each resting state is the finished frame.
3. **Scroll reveal**: `.reveal` elements rise in using `animation-timeline: view()` inside `@supports`, so unsupported browsers show them immediately.
4. **Shared-element morph**: `<ViewTransition name="art-<slug>" share="morph">` wraps the artwork on both the card and the case study, so it grows into place when a card is opened.
5. `prefers-reduced-motion: reduce` switches off every animation and view transition.

---

## Accessibility & Honesty

- One `h1` per page and a sequential heading order. Each card is a single link, named by its title; the “Read the case study” cue is `aria-hidden`.
- Artwork is decorative (`aria-hidden`), except a screenshot on a case study, which keeps its alt text.
- Illustrations contain no metrics or claims. Every number on the site (6 years, 80%, 2 storefronts, 4 engineers) comes from the CV.
- Verified with axe-core (WCAG 2 A/AA + best practice) on the homepage, case studies and CV, in both themes, at 1440px and 390px.
- There is no root `loading.tsx`. Large pages would otherwise be exported with their content hidden behind a Suspense boundary that needs JavaScript to reveal.
