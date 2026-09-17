import Link from "next/link";
import { AccentPunctuation } from "@/components/accent-punctuation";
import { profile } from "@/data/profile";
import { projects } from "@/data/projects";

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      className="link-arrow"
      viewBox="0 0 16 16"
      fill="none"
    >
      <path d="M3 8h10m0 0L9 4m4 4-4 4" />
    </svg>
  );
}

export default function Home() {
  return (
    <main id="main" className="shell home-page">
      <div className="home-intro">
        <h1>
          <AccentPunctuation>Hey, I’m Otis.</AccentPunctuation>
        </h1>
        <p>
          <AccentPunctuation>{profile.introduction}</AccentPunctuation>
        </p>
      </div>

      <section id="work" className="work-index" aria-labelledby="work-title">
        <div className="work-index-heading">
          <h2 id="work-title">Projects</h2>
        </div>

        <div className="work-index-list">
          {projects.map((project) => (
            <article className="work-index-item" key={project.slug}>
              <div className="work-index-primary">
                <h3>
                  <Link href={`/work/${project.slug}`}>{project.name}</Link>
                </h3>
                <p className="work-index-role">
                  <AccentPunctuation>{project.role}</AccentPunctuation>
                </p>
                <div className="work-index-meta">
                  <span>{project.year}</span>
                </div>
              </div>

              <div className="work-index-details">
                <p className="work-index-description">
                  <AccentPunctuation>{project.description}</AccentPunctuation>
                </p>

                <ul className="work-index-highlights">
                  {project.homeHighlights.map((highlight) => (
                    <li key={highlight}>
                      <AccentPunctuation>{highlight}</AccentPunctuation>
                    </li>
                  ))}
                </ul>

                <div className="work-index-footer">
                  <ul
                    className="work-index-stack"
                    aria-label="Technologies used"
                  >
                    {project.stack.map((technology) => (
                      <li key={technology}>{technology}</li>
                    ))}
                  </ul>

                  {/* <Link
                    className="case-link"
                    href={`/work/${project.slug}`}
                    aria-label={`Read the ${project.name} case study`}
                  >
                    <span>Read case study</span>
                    <ArrowIcon />
                  </Link> */}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
