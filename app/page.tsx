import Image from "next/image";
import Link from "next/link";
import { ViewTransition } from "react";
import { AccentPunctuation } from "@/components/accent-punctuation";
import { ProjectArt } from "@/components/project-art";
import { journey } from "@/data/experience";
import { profile } from "@/data/profile";
import { projects, type Project } from "@/data/projects";

function ProjectCard({
  project,
  featured = false,
}: {
  project: Project;
  featured?: boolean;
}) {
  const isWork = project.group === "work";
  return (
    <article
      className={`card card--${project.slug}${featured ? " card--featured" : ""} reveal`}
    >
      <ViewTransition name={`art-${project.slug}`} share="morph" default="none">
        <ProjectArt project={project} />
      </ViewTransition>
      <div className="card-body">
        <p className="card-meta">
          {isWork ? `${project.role} · ${project.year}` : project.stack.slice(0, 3).join(" · ")}
        </p>
        <h3 className="card-title">
          <Link href={`/work/${project.slug}`} className="card-link">
            {project.name}
          </Link>
        </h3>
        <p className="card-desc">
          <AccentPunctuation>{project.description}</AccentPunctuation>
        </p>
        {isWork && (
          <ul className="card-points">
            {project.homeHighlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        )}
        <span className="card-cta" aria-hidden="true">
          {isWork ? "Read the case study" : "How it works"}
          <span className="card-arrow">→</span>
        </span>
      </div>
    </article>
  );
}

export default function Home() {
  const [featured, ...work] = projects.filter((p) => p.group === "work");
  const personal = projects.filter((p) => p.group === "personal");

  return (
    <main id="main" className="home">
      <section className="shell hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <h1 id="hero-title" className="hero-title">
            <AccentPunctuation>Hey, I’m Otis.</AccentPunctuation>
          </h1>
          <p className="hero-lead">
            <AccentPunctuation>{profile.intro}</AccentPunctuation>
          </p>
          <p className="hero-now">
            <span className="live-dot" aria-hidden="true" />
            <span>
              Currently {profile.title} at{" "}
              <a href="https://roli.com" target="_blank" rel="noreferrer">
                {profile.company}
              </a>
            </span>
          </p>
          <div className="hero-actions">
            <a className="btn btn--primary" href="#work">
              See my work <span aria-hidden="true">↓</span>
            </a>
            <Link className="btn btn--ghost" href="/cv">
              Read my CV
            </Link>
          </div>
        </div>

        <figure className="hero-portrait">
          <div className="hero-photo">
            <Image
              src={profile.headshot.src}
              alt={profile.headshot.alt}
              width={700}
              height={933}
              priority
              sizes="(max-width: 900px) 70vw, 400px"
              style={{ objectPosition: profile.headshot.position }}
            />
          </div>
          <figcaption className="sticker">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 14.5s4.5-4.2 4.5-7.8a4.5 4.5 0 0 0-9 0c0 3.6 4.5 7.8 4.5 7.8Z" />
              <circle cx="8" cy="6.6" r="1.6" />
            </svg>
            {profile.location}
          </figcaption>
        </figure>
      </section>

      <section className="shell stats" aria-label="At a glance">
        <ul>
          {profile.stats.map((stat) => (
            <li key={stat.label}>
              <span className="stat-value">
                {stat.value}
                {stat.unit && <small>{stat.unit}</small>}
              </span>
              <span className="stat-label">{stat.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section id="work" className="shell section" aria-labelledby="work-title">
        <header className="section-head">
          <h2 id="work-title">
            <AccentPunctuation>Selected work.</AccentPunctuation>
          </h2>
          <p>
            <AccentPunctuation>
              Products I’ve built and shipped with teams at ROLI and OLR.
            </AccentPunctuation>
          </p>
        </header>
        <div className="work-grid">
          <ProjectCard project={featured} featured />
          {work.map((project) => (
            <ProjectCard project={project} key={project.slug} />
          ))}
        </div>
      </section>

      <section id="side-projects" className="shell section" aria-labelledby="side-title">
        <header className="section-head">
          <h2 id="side-title">
            <AccentPunctuation>Side projects.</AccentPunctuation>
          </h2>
          <p>
            <AccentPunctuation>
              Things I make outside work, mostly around music and learning.
            </AccentPunctuation>
          </p>
        </header>
        <div className="side-grid">
          {personal.map((project) => (
            <ProjectCard project={project} key={project.slug} />
          ))}
        </div>
      </section>

      <section className="shell section" aria-labelledby="journey-title">
        <header className="section-head">
          <h2 id="journey-title">
            <AccentPunctuation>Where I’ve been.</AccentPunctuation>
          </h2>
          <Link href="/cv" className="text-link">
            Full CV <span aria-hidden="true">→</span>
          </Link>
        </header>
        <ol className="journey">
          {journey.map((step) => (
            <li key={step.place} className="reveal">
              <span className="journey-years">{step.years}</span>
              <div>
                <h3>
                  {step.place} <span>{step.role}</span>
                </h3>
                <p>
                  <AccentPunctuation>{step.line}</AccentPunctuation>
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
