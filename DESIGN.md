# Design System: Elevated Tactile Editorial

## Direction Contract

- **THESIS**: Tactile Swiss-editorial craft meets high-performance systems engineering. Rejecting generic template cards, empty gradient text, and sterile corporate SaaS homogeneity in favor of editorial dignity, tangible physical typography, and living architectural diagrams.
- **OWN-WORLD**: Warm bone ground (`#f9f8f4` light / `#141613` dark) paired with deep charcoal ink (`#1c1e19` / `#f0f2eb`), precision hairline structural grids (`#e2e4dc` / `#2c3029`), and a single, disciplined ember-terracotta accent (`#c24e2b` / `#e87c56`).
- **STORY**: Otis Vickers-Graver is a Senior Full Stack Engineer with genuine end-to-end ownership. The visitor discovers real engineering depth, production-proven business outcomes (ROLI, HAWK), and modern agentic rigor through interactive, inspectable system diagrams.
- **FIRST VIEWPORT**: Full-width architectural masthead. Large-scale humanist display headline with balanced typographic optical kerning, live availability signal, immediate one-line value proposition, direct access to selected work, and an interactive system telemetry glance.
- **FORM**: Elevated Editorial with Interactive Architectural Telemetry. Code-first execution.
- **FINISH**: Unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and clean mechanical audit.

---

## Palette & Color Tokens

### Light Mode (Warm Bone & Ink)
- `--bg`: `#f9f8f4` (tactile warm bone ground)
- `--ink`: `#1a1c17` (deep carbon charcoal, 14.8:1 contrast on `--bg`)
- `--muted`: `#5a5e53` (warm olive-charcoal, 5.2:1 contrast on `--bg`)
- `--border`: `#e2e4dc` (structural hairline border)
- `--panel`: `#ffffff` (crisp elevated paper surface)
- `--subtle`: `#f0f1eb` (subtle resting background for controls)
- `--accent`: `#c24e2b` (ember terracotta, 4.7:1 contrast on `--bg` for large text/interactive badges)
- `--accent-subtle`: `rgba(194, 78, 43, 0.08)`
- `--accent-contrast`: `#ffffff`
- `--selection`: `#e5ead3`

### Dark Mode (Obsidian & Ember)
- `--bg`: `#131512` (rich obsidian)
- `--ink`: `#eff1ea` (warm bone white, 14.2:1 contrast on `--bg`)
- `--muted`: `#9da294` (neutral warm stone, 5.5:1 contrast on `--bg`)
- `--border`: `#292d25` (subtle structural hairline)
- `--panel`: `#1b1e19` (elevated dark slate plate)
- `--subtle`: `#222620` (subtle inset control fill)
- `--accent`: `#ea7e58` (luminous ember terracotta, 5.1:1 contrast on `--bg`)
- `--accent-subtle`: `rgba(234, 126, 88, 0.12)`
- `--accent-contrast`: `#131512`
- `--selection`: `#383f2e`

---

## Typography

- **Display & Body**: Space Grotesk Variable (`--font-sans`), a readable retro-technical grotesk, with `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` as fallback.
- **Code, Architecture & Data**: IBM Plex Mono (`--font-mono`), `ui-monospace, monospace`.
- **Typographic Rules**:
  - Tracking: `-0.025em` for display headlines; `-0.01em` for subheads; `0.02em` for monospace badges. Floor: never tighter than `-0.035em`.
  - Line measure: strictly bounded between `65ch` and `75ch` for longform narrative.
  - Optical rhythm: headings balanced with `text-wrap: balance`.
  - Tabular numerals: `font-variant-numeric: tabular-nums` for dates, metrics, and data readouts.
  - No eyebrows or kickers above headings.

---

## Layout, Elevation & Grid

- **Container Shell**: Max width `1360px`, fluid lateral padding `clamp(24px, 5vw, 64px)`.
- **Elevation Discipline**: Border OR shadow, never ghost cards (no 1px border under heavy blur).
- **Corner Radii**: Clean, subtle `8px` to `12px` for panels and cards; `6px` for interactive pills/buttons. No pill shapes for large containers.
- **Hairline Dividers**: Crisp `1px solid var(--border)`.

---

## Interactive Signature Components

1. **Interactive Architecture Node System**:
   - Visualizes live data pipelines and architectural topologies.
   - Stepper controls to inspect different flows (e.g. CASIO Onboarding vs. Multi-Region Checkout vs. Order History REST API).
   - Node hover inspects services, technologies, latencies, and architectural tradeoffs.
2. **Tactile Controls**:
   - Custom accessible theme toggle with smooth mechanical micro-switch animation.
   - Skip links, custom scrollbar styling, and accessible `:focus-visible` rings (`outline: 2px solid var(--accent); outline-offset: 3px;`).
