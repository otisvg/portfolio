import Link from "next/link";
import { profile } from "@/data/profile";
import { projects } from "@/data/projects";

function ArrowIcon({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="link-arrow"
      viewBox="0 0 16 16"
      fill="none"
    >
      {diagonal ? (
        <path d="M4 12 12 4m0 0H6m6 0v6" />
      ) : (
        <path d="M3 8h10m0 0L9 4m4 4-4 4" />
      )}
    </svg>
  );
}

export default function Home() {
  return (
    <main id="main" className="shell home-page">
      <section className="home-intro" aria-labelledby="home-title">
        <div className="home-intro-copy">
          <h1 id="home-title">
            Full-stack systems, from architecture to production.
          </h1>
          <p>{profile.summary}</p>

          <div className="home-actions">
            <a className="action-primary" href={`mailto:${profile.email}`}>
              <span>Start a conversation</span>
              <ArrowIcon diagonal />
            </a>
            <Link className="text-link" href="/cv">
              <span>View curriculum vitae</span>
              <ArrowIcon />
            </Link>
          </div>
        </div>

        <aside className="home-facts" aria-label="Profile at a glance">
          <div className="home-current-role">
            <span className="fact-label">Currently</span>
            <strong>
              {profile.currentRole}
              <span> at {profile.company}</span>
            </strong>
          </div>
          <dl>
            <div>
              <dt>Based</dt>
              <dd>{profile.location}</dd>
            </div>
            <div>
              <dt>Focus</dt>
              <dd>Commerce, observability, agentic tooling</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section id="work" className="work-index" aria-labelledby="work-title">
        <div className="work-index-heading">
          <h2 id="work-title">Selected work</h2>
          <p>
            Systems built across customer experience, operational tooling, and
            engineering practice.
          </p>
        </div>

        <div className="work-index-list">
          {projects.map((project) => (
            <article className="work-index-item" key={project.slug}>
              <div className="work-index-meta">
                <span className="work-index-number">{project.number}</span>
                <span>{project.category}</span>
              </div>

              <div className="work-index-content">
                <div className="work-index-title-row">
                  <h3>
                    <Link href={`/work/${project.slug}`}>{project.name}</Link>
                  </h3>
                  <span>{project.year}</span>
                </div>

                <p className="work-index-role">{project.role}</p>
                <p className="work-index-description">{project.description}</p>

                <ul className="work-index-highlights">
                  {project.homeHighlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>

                <div className="work-index-footer">
                  <ul className="work-index-stack" aria-label="Technologies used">
                    {project.stack.map((technology) => (
                      <li key={technology}>{technology}</li>
                    ))}
                  </ul>

                  <Link
                    className="case-link"
                    href={`/work/${project.slug}`}
                    aria-label={`Read the ${project.name} case study`}
                  >
                    <span>Read case study</span>
                    <ArrowIcon />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
