# Otis Vickers-Graver — portfolio

Next.js App Router, TypeScript, Tailwind CSS, self-hosted Inter and IBM Plex Mono, and a static export. Content is based on the owner's supplied CV and notes (September 2026).

## Content

- `data/profile.ts`: identity, contact links, summary, biography, portrait, skills, and education. The six-year experience summary follows the owner's newer notes; the original CV says over five years.
- `data/experience.ts`: dated roles, concise homepage descriptions, and detailed HTML CV highlights.
- `data/projects.ts`: ROLI, HAWK, and agentic-workflow case studies. All claims are grounded in the supplied material. No invented metrics or unconfirmed personal reflections are included.
- `public/otis-vickers-graver-cv.pdf`: byte-for-byte copy of the owner's supplied PDF, downloaded from the CV actions. The HTML CV is a concise web adaptation and includes newer notes.
- `public/otis-headshot.webp`: optimized copy of the supplied headshot. Adjust `profile.headshot.position` for its crop.
- GitHub is intentionally omitted until the owner supplies a profile URL. LinkedIn and email use the supplied CV.

Work visuals are labelled system/workflow diagrams where no actual screenshot was supplied. Add an optimized image to `public/projects/` and set a project's `screenshot`, `screenshotAlt`, and `imageNote` to use a real capture. The ROLI visual is a capture of https://roli.com/us from September 2026, with its dismissible promotional banner closed; the product link points to the public site. No confidential work images or source links are inferred.

## Development

```sh
npm ci
npm run dev
npm run typecheck
npm run build
```

The production output is `out/`. Use a static host with directory index resolution and `404.html` fallback. Metadata and sitemap URLs derive from `profile.siteUrl`.

The project-local Impeccable skill is excluded from version control. `app/globals.css` holds the visual system, responsive rules, and print styles. Server Components render the content; the theme toggle and print button are the only application client components. The theme preference is stored locally and defaults to the OS preference. Content remains readable without JavaScript.
