# A considered portfolio

A complete Next.js App Router portfolio with TypeScript, Tailwind CSS, self-hosted Inter and IBM Plex Mono, and static export. Server Components render the content; the theme toggle and print action are the only application client components. No Framer Motion dependency is needed for the restrained CSS interactions.

## Replace the sample content

**Start in `data/`.** Otis Vickers-Graver is the supplied owner name. The employers, education, career history, biography, location, and projects remain illustrative placeholders, not verified claims about the owner. The profile links currently lead to the GitHub and LinkedIn homepages; replace them with your own accounts. The contact email uses the reserved example.com domain. Project case studies label their outcomes as illustrative rather than inventing metrics.

- `data/profile.ts`: name, initials, title, three-line headline, intro, location, availability, current role, email, social URLs, site URL, CV PDF path, biography, education, and grouped skills.
- Headshot: add the supplied portrait to `public/` and set `profile.headshot.src`, `alt`, and `position`. Until a real photo is supplied, no placeholder portrait is displayed.
- `data/experience.ts`: chronological roles and descriptions.
- `data/projects.ts`: project metadata and all six case-study sections. Add optional `github` and `liveUrl` fields to display external links. Omit them when no real destination exists.
- For a real screenshot, put an optimized WebP/AVIF in `public/projects/`, then set `screenshot: '/projects/your-project.webp'` and `screenshotAlt`. The supplied WebP images are captures of purpose-built HTML/CSS concept mockups. With no screenshot, the original mockup is displayed. Screenshots use Next Image with explicit dimensions; static hosting does not run a dynamic image optimizer, so compress source files before adding them.
- Replace `public/otis-vickers-graver-cv.pdf` with your PDF, or use `/cv` → Print CV → Save as PDF after updating content. Set `profile.cvPdf` to the new path. The supplied PDF is a snapshot, not regenerated automatically when content changes.
- Update `public/favicon.svg` and the footer mark for your own initials.

`app/globals.css` owns the visual system, including both themes, responsive breakpoints, reduced motion, focus states, and print styles. There are no external font requests, analytics, forms, or third-party runtime services.

## Local development

```sh
npm ci
npm run dev
```

## Verification and production build

```sh
npm run typecheck
npm run build
```

The production output is `out/`. Serve it using a static host that resolves directory `index.html` files and uses `404.html` as the not-found document. Site metadata and sitemap URLs derive from `profile.siteUrl`; update that value when assigning a custom domain.

Routes: `/`, `/work/orbit/`, `/work/fieldnotes/`, `/work/baseline/`, `/cv/`, `/sitemap.xml`, `/robots.txt`, and a custom 404. Project routes are generated automatically from the project data.

The theme preference is device-local and persisted in localStorage, falling back to the operating-system preference. All informational content remains readable without JavaScript.
