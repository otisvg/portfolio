export type Project = {
  slug: string;
  group: "work" | "personal";
  number: string;
  name: string;
  category: string;
  description: string;
  homeHighlights: readonly string[];
  role: string;
  year: string;
  stack: readonly string[];
  type: string;
  context: string;
  problem: string;
  approach: string;
  architecture: string;
  outcome: string;
  improve?: string;
  screenshot?: string;
  screenshotAlt?: string;
  imageNote?: string;
  github?: string;
  liveUrl?: string;
  diagram: readonly string[];
  diagramDetail: string;
};
export const projects: readonly Project[] = [
  {
    slug: "roli",
    group: "work",
    screenshot: "/projects/roli.webp",
    screenshotAlt: "ROLI homepage showing the piano learning experience",
    imageNote: "Current public ROLI homepage, captured September 2026.",
    number: "01",
    name: "ROLI",
    category: "E-COMMERCE / CUSTOMER EXPERIENCE",
    description:
      "Two storefronts. One multi-region platform. A connected journey from discovery to onboarding.",
    homeHighlights: [
      "Unified multi-region storefronts",
      "Launched Japan and CASIO onboarding",
      "Cut end-to-end test time by 80%",
    ],
    role: "Senior Full Stack Engineer",
    year: "2023 — present",
    stack: ["TypeScript", "React", "Next.js", "Node.js", "Shopify", "MongoDB"],
    type: "commerce",
    liveUrl: "https://roli.com",
    diagram: ["Discover", "Purchase", "Onboard"],
    diagramDetail: "Multi-region storefront · Payments · Customer accounts",
    context:
      "At ROLI, I’ve taken broad engineering ownership of roli.com, shaping the experience from product discovery through purchase and onboarding. The work spans day-to-day product improvements, international expansion, launches, and partnerships.",
    problem:
      "Two storefronts needed to become one multi-region application. The customer journey also depended on reliable payment integrations, localised checkout, account services, and onboarding flows across markets.",
    approach:
      "I worked across Next.js, React, and Node.js to translate designs into polished interfaces and connect them to the services behind the purchase journey. I led the Japanese market rollout and delivered multi-step onboarding for the CASIO partnership, connecting technical decisions with usability, maintainability, and commercial priorities.",
    architecture:
      "The platform uses TypeScript, React, Next.js, and Node.js. Self-service order history is backed by Express and MongoDB REST APIs. Commerce integrations include Shopify, Stripe, Klarna, and PayPal, with a data access layer and error handling around payment flows. Edge-based location detection supports localised experiences.",
    outcome:
      "The work brought two storefronts into a unified multi-region application, supported expansion into Japan, and delivered onboarding for the CASIO partnership. Self-service order history reduced support tickets for order lookups. Parallelising the Cypress end-to-end suite reduced test duration by 80%.",
  },
  {
    slug: "hawk",
    group: "work",
    number: "02",
    name: "HAWK",
    category: "RETAIL / OBSERVABILITY",
    description:
      "A central view of retail point-of-sale systems, helping teams catch issues before customers do.",
    homeHighlights: [
      "Built from zero to production",
      "Led and mentored four engineers",
      "Automated distributed retail alerts",
    ],
    role: "Software Engineer & Team Lead",
    year: "2021 — 2022",
    stack: ["React", "Next.js", "Node.js", "InfluxDB", "AWS", "Terraform"],
    type: "telemetry",
    diagram: ["Store systems", "Telemetry & APIs", "Dashboards & alerts"],
    diagramDetail: "React / Next.js · Node.js · InfluxDB · Kapacitor",
    context:
      "At OLR, I built HAWK from the ground up: a monitoring platform that gives retailers a central view of their point-of-sale systems. I worked directly with senior leadership and clients to take the product from an initial idea into production.",
    problem:
      "Support teams needed to see the health of distributed retail systems and catch issues before they affected store operations and customers. The product had to turn incoming telemetry into a useful operational view.",
    approach:
      "I worked with enterprise clients and product managers to define requirements, scope deliverables, and set milestones. Alongside hands-on development, I led and mentored four engineers, ran planning and code reviews, and managed staging and production deployments.",
    architecture:
      "React and Next.js provide operational dashboards, with Node.js REST APIs and InfluxDB for telemetry. The API layer includes session-token authentication, OpenAPI documentation, and queries tuned for InfluxDB and SQL. Kapacitor and PowerShell support distributed alerts. Cloud deployment uses AWS, Terraform, Jenkins, and Nginx.",
    outcome:
      "HAWK reached production and gave retail support teams a shared view of point-of-sale systems, with automated alerts to detect failures before client outages. I owned delivery across the frontend, backend services, and deployment while supporting a team of four engineers.",
  },
  {
    slug: "agentic-workflows",
    group: "work",
    number: "03",
    name: "Agents in practice",
    category: "AI / ENGINEERING WORKFLOW",
    description:
      "Practical tools and a collaborative workshop that turn agentic ideas into useful everyday workflows.",
    homeHighlights: [
      "Runs as a collaborative ROLI workshop",
      "Applied across planning, code, and tests",
      "Built around review and verification",
    ],
    role: "Workshop lead & hands-on engineer",
    year: "Ongoing",
    stack: [
      "Claude Code",
      "Cursor",
      "GitHub Copilot",
      "Codex",
      "MCP",
      "Agent skills",
    ],
    type: "agents",
    diagram: ["Define the task", "Build with agents", "Review & verify"],
    diagramDetail:
      "Planning · Research · Implementation · Tests · Documentation",
    context:
      "I use agentic tools daily for planning, research, refactoring, feature development, and tests. At ROLI, I also lead a collaborative AI workshop where developers discuss ideas and build tools to improve their workflow.",
    problem:
      "Useful automation has to fit real engineering work. Faster implementation is valuable only when the resulting code remains readable, secure, documented, and thoroughly reviewed.",
    approach:
      "I work hands-on with Claude Code, Cursor, GitHub Copilot, and Codex, alongside MCP servers, agent skills, and sub-agent workflows. The workshop gives developers a place to explore ideas together and apply them to concrete tasks.",
    architecture:
      "The work includes a command-line tool using Claude and GitHub Copilot APIs for sprint ticket creation, account provisioning, and pull requests. MCP servers, agent skills, and sub-agent workflows are part of my broader practice; I keep code review and verification central to the process.",
    outcome:
      "Workshop results include automatically generated CMS image metadata, generated test criteria for tickets, and the identification of performance and refactoring opportunities. Personal AI projects include an automated expense tracker and an educational learning tracker.",
  },
  {
    slug: "pocket-circuit",
    group: "personal",
    number: "04",
    name: "Pocket Circuit",
    category: "PERSONAL / MUSIC SOFTWARE",
    description:
      "A 16-pad browser sampler and beat looper with a playable demo kit, waveform slicing, and local saving.",
    homeHighlights: [
      "Playable demo kit with no setup",
      "Sample slicing and pad assignment",
      "Patterns and audio saved in the browser",
    ],
    role: "Creator & frontend engineer",
    year: "2026",
    stack: ["Next.js", "React", "TypeScript", "Web Audio API", "IndexedDB"],
    type: "sampler",
    imageNote: "Interactive map of sound input, waveform editing, and browser playback.",
    diagram: ["Choose sounds", "Play & record", "Save locally"],
    diagramDetail: "Web Audio scheduling · Waveform editing · IndexedDB",
    context:
      "Pocket Circuit is a personal browser-based sampler and beat looper. It starts with a synthesized kit so someone can play immediately, then lets them import audio, slice a waveform, assign sounds to pads, and record patterns.",
    problem:
      "A sampler should feel playable on first use without requiring an account, a backend, or a folder of audio files. Imported sounds and recorded patterns also need to remain available when the browser reloads.",
    approach:
      "I built a 16-pad interface around a ready-to-play demo kit, keyboard and pointer input, waveform-based sample editing, and a two-bar sequencer. Local file import and a user-controlled tab-audio capture flow feed the same slicer; tab capture depends on the browser's sharing permission.",
    architecture:
      "A gesture-activated Web Audio engine handles synthesis, playback, and effects. The transport schedules events against AudioContext time using a short look-ahead window, while IndexedDB stores project state and imported audio. The waveform is drawn from decoded samples.",
    outcome:
      "The result is a responsive, browser-local instrument that supports immediate demo playback, imported samples, recorded loops, and restoration of saved projects. Audio capture and codec support remain dependent on the browser and the user's permissions.",
  },
  {
    slug: "hearth",
    group: "personal",
    number: "05",
    name: "Hearth",
    category: "PERSONAL / EDUCATION",
    description:
      "A calm homeschool planner for one learner, bringing the week, learning resources, and progress into one place.",
    homeHighlights: [
      "Weekly planning and learner checklist",
      "Knowledge bank, journal, and reports",
      "Works offline without an account",
    ],
    role: "Creator & full-stack engineer",
    year: "2026",
    stack: ["React", "Vite", "Express", "PostgreSQL", "localStorage"],
    type: "education",
    imageNote: "Interactive map of weekly planning and learning records.",
    diagram: ["Plan the week", "Complete activities", "Review progress"],
    diagramDetail: "React planner · Local-first data · Optional account sync",
    context:
      "Hearth is a personal app for planning and tracking one learner's homeschool week. It gives parents a dashboard and calendar, while a focused learner view turns the day's activities into a simple checklist.",
    problem:
      "Weekly tasks, learning materials, and evidence of progress can become scattered. The app needed to support everyday planning and record-keeping without making an account a prerequisite.",
    approach:
      "I brought planning, a learner checklist, linked resources, a dated learning journal, and print-ready reports into one interface. The calendar supports moving tasks through the week and carrying unfinished work forward.",
    architecture:
      "The React and Vite client works offline with browser localStorage. Optional email/password accounts use an Express API and PostgreSQL for synced records; local data can move into an account when a user signs in. The subscription flow is an optional scaffold that requires Stripe configuration.",
    outcome:
      "Hearth provides a usable offline planning flow alongside optional account-backed storage. Parents can review subject progress, learning days, and instructional hours, and print a report for their records.",
  },
  {
    slug: "ktt2-song-finder",
    group: "personal",
    number: "06",
    name: "KTT2 Song Finder",
    category: "PERSONAL / MUSIC DISCOVERY",
    description:
      "Finds song mentions in KTT2 Music conversations and turns reviewed Spotify matches into private playlists.",
    homeHighlights: [
      "Scans recent music threads",
      "Rules first, optional AI for informal mentions",
      "Review before Spotify playlist export",
    ],
    role: "Creator & full-stack engineer",
    year: "2026",
    stack: ["React", "TypeScript", "Express", "SQLite", "Spotify API", "OpenAI API"],
    type: "music-discovery",
    imageNote: "Interactive map of thread collection, song extraction, and Spotify review.",
    diagram: ["Read KTT2", "Extract songs", "Review & export"],
    diagramDetail: "Thread crawler · Song extraction · Spotify matching",
    context:
      "KTT2 Song Finder is a local web app for turning music recommendations in KTT2 threads into a private Spotify playlist. A scan reads recent conversations and presents candidate tracks for review.",
    problem:
      "Recommendations in discussion threads are easy to miss and hard to collect. Song names appear in different formats, and a fuzzy Spotify result should not silently become a playlist track.",
    approach:
      "I built a crawler for recent threads and replies, removed quoted text, extracted explicit Spotify links and artist-title patterns, and used an optional OpenAI fallback for less structured mentions. Clear matches can be accepted automatically; uncertain results remain reviewable before export.",
    architecture:
      "A React and TypeScript frontend talks to an Express API. SQLite stores scans, posts, mentions, and resumable jobs. The worker handles collection, extraction, and Spotify matching in stages; Spotify OAuth is used to create a private playlist after review. The app runs locally and needs user-provided Spotify credentials.",
    outcome:
      "The local workflow can scan conversations, preserve partial results when a stage fails, and turn selected matches into a private playlist. It identifies itself to the source site, limits request frequency, and stops on access challenges.",
  },
];
