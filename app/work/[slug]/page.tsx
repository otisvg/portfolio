import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { projects } from "@/data/projects";
import { AccentPunctuation } from "@/components/accent-punctuation";
import { ProjectArt } from "@/components/project-art";

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
  const index = projects.findIndex((x) => x.slug === slug);
  const p = projects[index];
  if (!p) notFound();

  const next = projects[(index + 1) % projects.length];
  const backHref = p.group === "work" ? "/#work" : "/#side-projects";

  const story = [
    { label: "The challenge", text: p.problem },
    { label: "What I did", text: p.approach },
    { label: "Under the hood", text: p.architecture },
    { label: p.group === "personal" ? "Where it landed" : "The result", text: p.outcome },
    { label: "What I’d improve", text: p.improve },
  ].filter((section) => Boolean(section.text));

  return (
    <main id="main" className="case">
      <div className="shell">
        <Link className="back-link" href={backHref}>
          <span aria-hidden="true">←</span> All work
        </Link>

        <header className="case-hero">
          <h1>
            <AccentPunctuation>{`${p.name}.`}</AccentPunctuation>
          </h1>
          <p className="case-lede">
            <AccentPunctuation>{p.description}</AccentPunctuation>
          </p>
          <dl className="case-facts">
            <div>
              <dt>Role</dt>
              <dd>{p.role}</dd>
            </div>
            <div>
              <dt>When</dt>
              <dd>{p.year}</dd>
            </div>
            <div>
              <dt>Built with</dt>
              <dd>{p.stack.join(", ")}</dd>
            </div>
          </dl>
          {(p.liveUrl || p.github) && (
            <div className="case-links">
              {p.liveUrl && (
                <a href={p.liveUrl} target="_blank" rel="noreferrer" className="btn btn--ghost">
                  Visit {new URL(p.liveUrl).hostname} <span aria-hidden="true">↗</span>
                </a>
              )}
              {p.github && (
                <a href={p.github} target="_blank" rel="noreferrer" className="btn btn--ghost">
                  View source <span aria-hidden="true">↗</span>
                </a>
              )}
            </div>
          )}
        </header>

        <figure className="case-art">
          <ViewTransition name={`art-${p.slug}`} share="morph" default="none">
            <ProjectArt project={p} size="hero" />
          </ViewTransition>
          {p.imageNote && (
            <figcaption>
              <AccentPunctuation>{p.imageNote}</AccentPunctuation>
            </figcaption>
          )}
        </figure>

        <section className="case-intro" aria-label="Overview">
          <p className="case-context">
            <AccentPunctuation>{p.context}</AccentPunctuation>
          </p>
          <ul className="case-glance" aria-label="Highlights">
            {p.homeHighlights.map((highlight, i) => (
              <li key={highlight} className="reveal">
                <span className="case-glance-num" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {highlight}
              </li>
            ))}
          </ul>
        </section>

        <section className="case-flow" aria-labelledby="flow-title">
          <h2 id="flow-title">
            <AccentPunctuation>How it works.</AccentPunctuation>
          </h2>
          <ol>
            {p.flow.map((step, i) => (
              <li key={step.title} className="reveal">
                <span className="case-flow-num" aria-hidden="true">
                  {i + 1}
                </span>
                <h3>{step.title}</h3>
                <p>
                  <AccentPunctuation>{step.detail}</AccentPunctuation>
                </p>
              </li>
            ))}
          </ol>
        </section>

        <div className="case-story">
          {story.map((section) => (
            <section key={section.label} className="reveal">
              <h2>{section.label}</h2>
              <p>
                <AccentPunctuation>{section.text}</AccentPunctuation>
              </p>
            </section>
          ))}
        </div>

        <nav className="case-next" aria-label="Next project">
          <Link href={`/work/${next.slug}`} className={`next-card tone--${next.slug}`}>
            <span className="next-label">Next project</span>
            <span className="next-title">
              {next.name} <span className="card-arrow" aria-hidden="true">→</span>
            </span>
            <span className="next-desc">
              <AccentPunctuation>{next.description}</AccentPunctuation>
            </span>
          </Link>
        </nav>
      </div>
    </main>
  );
}
