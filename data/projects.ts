export type Project = {
  slug: string;
  number: string;
  name: string;
  category: string;
  description: string;
  role: string;
  year: string;
  stack: readonly string[];
  type: string;
  context: string;
  problem: string;
  approach: string;
  architecture: string;
  outcome: string;
  improve: string;
  screenshot?: string;
  screenshotAlt?: string;
  github?: string;
  liveUrl?: string;
};

export const projects: readonly Project[] = [
  {
    slug: "orbit",
    screenshot: "/projects/orbit.webp",
    number: "01",
    name: "Orbit",
    category: "PRODUCTIVITY / SAAS",
    description: "A calmer place for teams to plan, build, and move forward.",
    role: "Product design & full-stack engineering",
    year: "2026",
    stack: ["Next.js", "TypeScript", "PostgreSQL", "Redis"],
    type: "orbit",
    context:
      "Orbit is a concept workspace for small product teams. It brings projects, milestones, and everyday decisions into one focused view.",
    problem:
      "Planning tools often create more work than they remove. The challenge was to make a shared workspace feel immediate without hiding the complexity of permissions and concurrent edits.",
    approach:
      "I started with the weekly planning workflow, then built a small set of reusable views around it. Optimistic updates keep everyday actions quick, with clear recovery when a write fails.",
    architecture:
      "A Next.js application talks to a typed service layer backed by PostgreSQL. Workspace-scoped authorization is checked on every operation. Redis supports ephemeral presence, while a durable event log keeps the source of truth in the database.",
    outcome:
      "The prototype connects planning, ownership, and progress in one coherent workflow. This is a sample case study; production adoption and performance metrics have not been measured.",
    improve:
      "I would test conflict recovery with real teams and add keyboard-driven bulk actions before broadening the feature set.",
  },
  {
    slug: "fieldnotes",
    screenshot: "/projects/fieldnotes.webp",
    number: "02",
    name: "Fieldnotes",
    category: "KNOWLEDGE / WEB APP",
    description:
      "A quiet home for good ideas. Capture now, connect the dots later.",
    role: "Full-stack engineering",
    year: "2025",
    stack: ["React", "Node.js", "PostgreSQL"],
    type: "notes",
    context:
      "Fieldnotes explores a personal knowledge tool that makes collecting ideas as easy as finding them again.",
    problem:
      "Rigid folder structures ask people to organize an idea before they understand it. Search and flexible relationships needed to do more of the work.",
    approach:
      "I designed a distraction-free writing flow, automatic local drafts, and lightweight topic links. Full-text search provides useful results before a user finishes typing.",
    architecture:
      "The editor keeps a local draft and syncs changes through an idempotent API. PostgreSQL full-text indexes power search; stable document identifiers keep backlinks resilient to title changes.",
    outcome:
      "The concept demonstrates capture, retrieval, and linked notes without a heavy organizational system. All screens shown are illustrative product mockups.",
    improve:
      "I would validate offline merge behavior and add a plain-text export so users can always take their writing with them.",
  },
  {
    slug: "baseline",
    screenshot: "/projects/baseline.webp",
    number: "03",
    name: "Baseline",
    category: "DEVELOPER TOOLS / OPEN SOURCE",
    description: "Less noise. More signal. Infrastructure health at a glance.",
    role: "Architecture & full-stack engineering",
    year: "2025",
    stack: ["TypeScript", "Python", "Redis", "Docker"],
    type: "metrics",
    context:
      "Baseline is a monitoring dashboard concept for developers who need a clear answer to a simple question: is everything healthy?",
    problem:
      "A wall of charts can hide what matters. The product needed to summarize service health while leaving a direct path to the underlying evidence.",
    approach:
      "I separated service state from individual measurements and designed the overview around exceptions. A consistent time window makes cross-service comparisons meaningful.",
    architecture:
      "A Python ingestion service validates events before queuing them. Aggregated time buckets are cached in Redis and exposed through a read API. The UI explicitly distinguishes stale data from healthy services.",
    outcome:
      "The sample interface makes latency, uptime, and deployment context readable in one view. No production availability claims are implied by the demonstration data.",
    improve:
      "I would stress-test backpressure and define retention policies before connecting production workloads.",
  },
];
