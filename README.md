# Otis Vickers-Graver — portfolio

Next.js App Router, TypeScript, Tailwind CSS, self-hosted Space Grotesk and IBM Plex Mono, and a static export. Content is based on the owner's supplied CV and notes (September 2026).

## Content

- `data/profile.ts`: identity, contact links, the short homepage intro and at-a-glance stats, CV summary, portrait, skills, and education. The six-year experience summary follows the owner's newer notes; the original CV says over five years.
- `data/experience.ts`: dated roles and detailed HTML CV highlights, plus `journey`, the short career timeline on the homepage.
- `data/projects.ts`: professional case studies for ROLI, HAWK, and agentic workflows, plus personal projects for Pocket Circuit, Hearth, and KTT2 Song Finder. Each project has three plain-language `flow` steps for its “How it works” strip. Personal-project descriptions are grounded in their local source and README files; no public demo or source link is assumed for a private or local-only project.
- `public/otis-vickers-graver-cv.pdf`: byte-for-byte copy of the owner's supplied PDF, downloaded from the CV actions. The HTML CV is a concise web adaptation and includes newer notes.
- `public/otis-headshot.webp`: optimized copy of the supplied headshot. Adjust `profile.headshot.position` for its crop.
- GitHub, LinkedIn, and email appear in the header, the closing contact block on every page, and the CV.

Project artwork lives in `components/project-art.tsx`. Apart from the ROLI capture, each piece is an illustrative CSS/SVG sketch of how the product works, not a screenshot, and it carries no metrics. Each project has a tint in `app/globals.css` (`--<project>-tile`). To use a real capture instead, add an optimized image to `public/projects/` and set a project's `screenshot`, `screenshotAlt`, and `imageNote` to use a real capture. The ROLI visual is a capture of https://roli.com/us from September 2026, with its dismissible promotional banner closed; the product link points to the public site. No confidential work images or source links are inferred.

## Development

```sh
npm ci
npm run dev
npm run typecheck
npm run build
```

The production output is `out/`. Use a static host with directory index resolution and `404.html` fallback. Metadata and sitemap URLs derive from `profile.siteUrl`.

The project-local Impeccable skill is excluded from version control. `app/globals.css` holds the visual system, responsive rules, and print styles. Server Components render the content, including the project artwork, which animates with CSS alone. The theme toggle, print button, and contact widget are the only client components. The theme preference is stored locally and defaults to the OS preference. Content remains readable without JavaScript.
