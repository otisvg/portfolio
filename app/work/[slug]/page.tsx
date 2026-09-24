import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { projects } from "@/data/projects";
import { AccentPunctuation } from "@/components/accent-punctuation";
import { ProjectVisual } from "@/components/project-visual";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = projects.find((p) => p.slug === slug);
  return {
    title: p?.name ?? "Project not found",
    description: p?.description,
    openGraph: { title: p?.name, description: p?.description },
    twitter: { title: p?.name, description: p?.description },
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = projects.find((p) => p.slug === slug);
  if (!p) notFound();

  const next =
    projects[
      (projects.findIndex((x) => x.slug === slug) + 1) % projects.length
    ];

  const caseSections = [
    { title: "Context & Domain", text: p.context },
    { title: "Problem & Constraints", text: p.problem },
    { title: "Engineering Approach", text: p.approach },
    { title: "Architecture & Systems Design", text: p.architecture },
    { title: p.group === "personal" ? "Outcome" : "Outcomes & Measured Impact", text: p.outcome },
    { title: "Reflections & Future Improvements", text: p.improve },
  ].filter((sec) => Boolean(sec.text));

  return (
    <main id="main" className="shell case-study">
      <Link className="back-link" href="/#work">
        <span aria-hidden="true">←</span>
        <span>Back to projects</span>
      </Link>

      <header className="case-header">
        <span className="mono">{p.category}</span>
        <h1>
          <AccentPunctuation>{`${p.name}.`}</AccentPunctuation>
        </h1>
        <p>
          <AccentPunctuation>{p.description}</AccentPunctuation>
        </p>
      </header>

      <dl className="case-facts">
        <div>
          <dt>
            <AccentPunctuation>Role & Responsibilities</AccentPunctuation>
          </dt>
          <dd>
            <AccentPunctuation>{p.role}</AccentPunctuation>
          </dd>
        </div>
        <div>
          <dt>Timeline</dt>
          <dd>{p.year}</dd>
        </div>
        <div>
          <dt>Core Tech Stack</dt>
          <dd>{p.stack.join(", ")}</dd>
        </div>
      </dl>

      <div className="project-external-links" style={{ marginBottom: "28px" }}>
        {p.github && (
          <a href={p.github} target="_blank" rel="noreferrer" className="action-secondary">
            <span>View source code</span>
            <span aria-hidden="true">↗</span>
          </a>
        )}
        {p.liveUrl && (
          <a href={p.liveUrl} target="_blank" rel="noreferrer" className="action-secondary">
            <span>Visit live product</span>
            <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>

      {/* Interactive System Architecture & Visualizer Stage */}
      <ProjectVisual project={p} />

      <div className="case-body">
        <aside className="case-aside">
          <h4>
            <AccentPunctuation>Engineering Deep Dive</AccentPunctuation>
          </h4>
          <p>
            <AccentPunctuation>
              Product decisions and structural tradeoffs.
            </AccentPunctuation>
          </p>
          <small>
            <AccentPunctuation>
              {p.imageNote ??
                (p.type === "telemetry"
                  ? "Interactive system flow and architecture topology."
                  : "Operational workflow and component pipeline.")}
            </AccentPunctuation>
          </small>
        </aside>

        <div className="case-sections-flow">
          {caseSections.map((sec) => (
            <section key={sec.title} className="case-narrative-section">
              <h2>
                <AccentPunctuation>{sec.title}</AccentPunctuation>
              </h2>
              <p>
                <AccentPunctuation>{sec.text}</AccentPunctuation>
              </p>
            </section>
          ))}
        </div>
      </div>

      <div className="next-project-card">
        <Link href={`/work/${next.slug}`} className="next-project-link">
          <span className="next-project-label">Next Case Study</span>
          <span className="next-project-title">
            {next.name} <span aria-hidden="true">→</span>
          </span>
        </Link>
        <Link href="/#work" className="action-secondary">
          <span>All projects</span>
          <span aria-hidden="true">↑</span>
        </Link>
      </div>
    </main>
  );
}
