import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { projects } from "@/data/projects";
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
  return (
    <main id="main" className="shell case-study">
      <Link className="back-link mono" href="/#work">
        ← BACK TO SELECTED WORK
      </Link>
      <header className="case-header">
        <span className="mono">
          {p.number} / {p.category}
        </span>
        <h1>
          {p.name}
          <span className="accent">.</span>
        </h1>
        <p>{p.description}</p>
      </header>
      <dl className="case-facts">
        <div>
          <dt>ROLE</dt>
          <dd>{p.role}</dd>
        </div>
        <div>
          <dt>YEAR</dt>
          <dd>{p.year}</dd>
        </div>
        <div>
          <dt>STACK</dt>
          <dd>{p.stack.join(", ")}</dd>
        </div>
      </dl>
      <div className="project-external">
        {p.github && (
          <a href={p.github} target="_blank" rel="noreferrer">
            Source ↗
          </a>
        )}
        {p.liveUrl && (
          <a href={p.liveUrl} target="_blank" rel="noreferrer">
            Live product ↗
          </a>
        )}
      </div>
      <ProjectVisual project={p} />
      <div className="case-body">
        <aside>
          <span className="mono">A CLOSER LOOK</span>
          <p>
            Product decisions.
            <br />
            Engineering tradeoffs.
          </p>
          <small>Illustrative concept project</small>
        </aside>
        <div>
          {[
            ["01", "Context", p.context],
            ["02", "Problem", p.problem],
            ["03", "Approach", p.approach],
            ["04", "Architecture", p.architecture],
            ["05", "Outcome", p.outcome],
            ["06", "What I’d improve", p.improve],
          ].map(([n, title, text]) => (
            <section key={n}>
              <span className="mono">{n}</span>
              <h2>{title}</h2>
              <p>{text}</p>
              {title === "Architecture" && (
                <div className="architecture">
                  <span>Interface</span>
                  <b>→</b>
                  <span>Service layer</span>
                  <b>→</b>
                  <span>Data & events</span>
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
      <Link href={`/work/${next.slug}`} className="next-project">
        <span className="mono">NEXT PROJECT</span>
        <strong>
          {next.name} <span>↗</span>
        </strong>
      </Link>
    </main>
  );
}
