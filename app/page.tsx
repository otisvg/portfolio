import Link from "next/link";
import Image from "next/image";
import { profile } from "@/data/profile";
import { projects } from "@/data/projects";
import { ExperienceList } from "@/components/experience-list";
import { ProjectVisual } from "@/components/project-visual";

export default function Home() {
  return (
    <main id="main" className="shell">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-status-beacon">
          <span className="beacon-dot" aria-hidden="true" />
          <span>{profile.currentRole} at {profile.company} · Based in {profile.location}</span>
        </div>

        <h1>
          {profile.headline[0]}
          <br />
          <span className="hero-dimmed">{profile.headline[1]}</span>
          <br />
          {profile.headline[2]}
          <span className="accent">.</span>
        </h1>

        <div className="hero-bottom">
          <div>
            <p className="hero-lead">{profile.description}</p>
            <div className="hero-actions">
              <a className="action-primary" href="#work">
                <span>Explore selected work</span>
                <span aria-hidden="true">↓</span>
              </a>
              <Link className="action-secondary" href="/cv">
                <span>Curriculum vitae</span>
                <span aria-hidden="true">↗</span>
              </Link>
              <a
                className="action-secondary"
                href={profile.linkedin}
                target="_blank"
                rel="noreferrer"
              >
                <span>LinkedIn</span>
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>

          <aside className="hero-summary-card" aria-label="Senior profile overview">
            <h3>Senior Profile Glance</h3>
            <div className="hero-stats-grid">
              <div className="stat-item">
                <strong>6+ Years</strong>
                <span>Full-stack systems ownership</span>
              </div>
              <div className="stat-item">
                <strong>ROLI & OLR</strong>
                <span>Commerce & telemetry lead</span>
              </div>
              <div className="stat-item">
                <strong>Agentic AI</strong>
                <span>MCP, skills & daily workflows</span>
              </div>
              <div className="stat-item">
                <strong>UK / UAE</strong>
                <span>Distributed global engineering</span>
              </div>
            </div>
          </aside>
        </div>

        <div className="hero-baseline">
          <span className="mono">
            GOOD SOFTWARE IS A SERIES OF THOUGHTFUL DECISIONS.
          </span>
          <span className="cross" aria-hidden="true">+</span>
        </div>
      </section>

      {/* Selected Work Section */}
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
          Multi-region e-commerce platforms, distributed retail telemetry systems, and practical agentic workflows.
        </p>

        {projects.map((p) => (
          <article className="project" key={p.slug}>
            <div className="project-header-strip">
              <div className="project-badge-group">
                <span className="project-number">{p.number}</span>
                <span className="project-category">{p.category}</span>
              </div>
              <div className="project-meta-right">
                <span>{p.year}</span>
              </div>
            </div>

            {/* Interactive Architecture & Visualizer Stage */}
            <ProjectVisual project={p} />

            <div className="project-info">
              <div>
                <div className="project-name-row">
                  <h3 className="project-title">
                    <Link href={`/work/${p.slug}`}>{p.name}</Link>
                  </h3>
                </div>
                <p className="project-lead-desc">{p.description}</p>
                <div className="project-tech-pills" aria-label="Technologies used">
                  {p.stack.map((t) => (
                    <span key={t} className="tech-pill">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="project-cta-column">
                <div className="project-role-badge">
                  <strong>Role:</strong> {p.role}
                </div>
                <div className="project-external-links">
                  {p.github && (
                    <a href={p.github} target="_blank" rel="noreferrer">
                      <span>Source</span>
                      <span aria-hidden="true">↗</span>
                    </a>
                  )}
                  {p.liveUrl && (
                    <a href={p.liveUrl} target="_blank" rel="noreferrer">
                      <span>Live product</span>
                      <span aria-hidden="true">↗</span>
                    </a>
                  )}
                </div>
                <Link className="case-study-btn" href={`/work/${p.slug}`}>
                  <span>Read case study</span>
                  <span className="btn-arrow" aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* Experience Section */}
      <section id="experience" className="experience-section">
        <div className="section-heading">
          <h2>Work history & leadership</h2>
          <Link className="action-secondary" href="/cv">
            <span>View full CV</span>
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <p className="section-description">
          Six years of progressive engineering leadership, from greenfield product architecture to scaling global commerce.
        </p>
        <ExperienceList detailed={false} />
      </section>

      {/* About Section */}
      <section id="about" className="about-section">
        <div className="section-heading">
          <h2>About & technical practice</h2>
          <span className="mono">{profile.location}</span>
        </div>
        <p className="section-description">
          Engineering approach, daily agentic methodology, and core domain proficiencies.
        </p>

        <div className="about-grid">
          <div className="portrait-wrapper">
            {profile.headshot.src && (
              <figure className="portrait">
                <Image
                  src={profile.headshot.src}
                  alt={profile.headshot.alt}
                  width={700}
                  height={933}
                  sizes="(max-width: 700px) 100vw, 360px"
                  style={{ objectPosition: profile.headshot.position }}
                />
                <figcaption>{profile.name} · {profile.title}</figcaption>
              </figure>
            )}
          </div>

          <div className="about-narrative">
            {profile.about.map((p) => (
              <p key={p}>{p}</p>
            ))}

            <div className="skills-matrix">
              <h3>Technical domains & toolchain</h3>
              <div className="skills-cards-grid">
                {Object.entries(profile.skills).map(([domain, items]) => (
                  <div key={domain} className="skill-category-card">
                    <h4>{domain}</h4>
                    <div className="skill-pills">
                      {items.map((item) => (
                        <span key={item} className="skill-tag">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: "24px" }}>
              <a className="action-secondary" href={profile.cvPdf} download>
                <span>Download verified CV (PDF)</span>
                <span aria-hidden="true">↓</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Banner */}
      <section className="contact-banner">
        <h2>
          Let’s build thoughtful software<span className="accent">.</span>
        </h2>
        <div>
          <a className="contact-email-link" href={`mailto:${profile.email}`}>
            {profile.email} ↗
          </a>
        </div>
        <div className="contact-actions-row">
          <a href={profile.linkedin} target="_blank" rel="noreferrer">
            LinkedIn ↗
          </a>
          {profile.github && (
            <a href={profile.github} target="_blank" rel="noreferrer">
              GitHub ↗
            </a>
          )}
          <Link href="/cv">
            Curriculum vitae ↗
          </Link>
        </div>
      </section>
    </main>
  );
}
