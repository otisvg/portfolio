import Link from "next/link";
import Image from "next/image";
import { profile } from "@/data/profile";
import { projects } from "@/data/projects";
import { ExperienceList } from "@/components/experience-list";
import { ProjectVisual } from "@/components/project-visual";
export default function Home() {
  return (
    <main id="main" className="shell">
      <section className="hero">
        <h1>
          {profile.headline[0]}
          <br />
          <span>{profile.headline[1]}</span>
          <br />
          {profile.headline[2]}
          <span className="accent">.</span>
        </h1>
        <div className="hero-bottom">
          <div>
            <p>{profile.description}</p>
            <div className="hero-links">
              <a className="underlined" href="#work">
                Explore selected work <span>↓</span>
              </a>
              <a href={profile.linkedin} target="_blank" rel="noreferrer">
                LinkedIn <span>↗</span>
              </a>
            </div>
          </div>
          <div className="status">
            <span className="status-dot" />
            <div>
              {profile.currentRole} at {profile.company}
              <small>Based in {profile.location}</small>
            </div>
          </div>
        </div>
        <div className="hero-baseline">
          <span className="mono">
            GOOD SOFTWARE IS A SERIES OF THOUGHTFUL DECISIONS.
          </span>
          <span className="cross">+</span>
        </div>
      </section>
      <section id="work" className="work">
        <div className="section-heading">
          <h2>
            Selected work
            <span className="sup">
              ({String(projects.length).padStart(2, "0")})
            </span>
          </h2>
          <span className="mono">2021 — PRESENT</span>
        </div>
        <p className="section-description">
          E-commerce, retail systems, and practical AI.
        </p>
        {projects.map((p) => (
          <article className="project" key={p.slug}>
            <Link
              href={`/work/${p.slug}`}
              className="project-image-link"
              aria-label={`Read the ${p.name} case study`}
            >
              <ProjectVisual project={p} />
              <span className="image-open" aria-hidden="true">
                ↗
              </span>
            </Link>
            <div className="project-info">
              <span className="project-number mono">{p.number} /</span>
              <div className="project-copy">
                <div className="project-name">
                  <h3>
                    <Link href={`/work/${p.slug}`}>{p.name}</Link>
                  </h3>
                  <span className="mono">{p.category}</span>
                </div>
                <p>{p.description}</p>
                <span className="project-role">
                  {p.role} · {p.year}
                </span>
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
                <div className="tech mono">{p.stack.join(" / ")}</div>
              </div>
              <Link className="case-link underlined" href={`/work/${p.slug}`}>
                View case study <span>↗</span>
              </Link>
            </div>
          </article>
        ))}
      </section>
      <section id="experience" className="text-section experience-section">
        <div className="section-intro">
          <h2>
            Good work.
            <br />
            Good people.
          </h2>
          <a className="underlined" href="/cv">
            View full CV <span>↗</span>
          </a>
        </div>
        <ExperienceList />
      </section>
      <section id="about" className="text-section about-section">
        <div className="section-intro">
          <h2>
            Engineer by trade.
            <br />
            Curious by default.
          </h2>
          <span className="about-location mono">{profile.location}</span>
          {profile.headshot.src && (
            <figure className="portrait">
              <Image
                src={profile.headshot.src}
                alt={profile.headshot.alt}
                width={700}
                height={933}
                sizes="(max-width: 700px) 70vw, 320px"
                style={{ objectPosition: profile.headshot.position }}
              />
              <figcaption>{profile.name}</figcaption>
            </figure>
          )}
        </div>
        <div className="about-copy">
          {profile.about.map((p) => (
            <p key={p}>{p}</p>
          ))}
          <div className="skills-grid">
            {Object.entries(profile.skills).map(([k, v]) => (
              <div key={k}>
                <h3>{k}</h3>
                <p>{v.join(", ")}</p>
              </div>
            ))}
          </div>
          <a className="underlined" href={profile.cvPdf} download>
            Download CV <span>↓</span>
          </a>
        </div>
      </section>
      <section className="contact">
        <h2>
          Let’s make it happen<span className="accent">.</span>
        </h2>
        <a className="email underlined" href={`mailto:${profile.email}`}>
          {profile.email} ↗
        </a>
        <div className="socials">
          {profile.github && (
            <a href={profile.github} target="_blank" rel="noreferrer">
              GitHub ↗
            </a>
          )}
          <a href={profile.linkedin} target="_blank" rel="noreferrer">
            LinkedIn ↗
          </a>
        </div>
      </section>
    </main>
  );
}
