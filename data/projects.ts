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
    screenshot: "/projects/roli.webp",
    screenshotAlt: "ROLI homepage showing the piano learning experience",
    imageNote: "Current public ROLI homepage, captured September 2026.",
    number: "01",
    name: "ROLI",
    category: "E-COMMERCE / CUSTOMER EXPERIENCE",
    description:
      "Two storefronts. One multi-region platform. A connected journey from discovery to onboarding.",
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
    number: "02",
    name: "HAWK",
    category: "RETAIL / OBSERVABILITY",
    description:
      "A central view of retail point-of-sale systems, helping teams catch issues before customers do.",
    role: "Software Engineer & Team Lead at OLR",
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
    number: "03",
    name: "Agents in practice",
    category: "AI / ENGINEERING WORKFLOW",
    description:
      "Practical tools and a collaborative workshop that turn agentic ideas into useful everyday workflows.",
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
];
