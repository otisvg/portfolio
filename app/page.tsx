import Link from "next/link";
import { AccentPunctuation } from "@/components/accent-punctuation";
import { profile } from "@/data/profile";
import { projects, type Project } from "@/data/projects";

function ProjectListItem({ project }: { project: Project }) {
  return (
    <article className="work-index-item">
      <div className="work-index-primary">
        <h4>
          <Link href={`/work/${project.slug}`}>{project.name}</Link>
        </h4>
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
          <ul className="work-index-stack" aria-label="Technologies used">
            {project.stack.map((technology) => (
              <li key={technology}>{technology}</li>
            ))}
          </ul>
        </div>
      </div>
    </article>
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

        {([
          { group: "work", title: "Professional work" },
          { group: "personal", title: "Personal projects" },
        ] as const).map(({ group, title }) => (
          <section className="work-index-group" aria-labelledby={`${group}-projects-title`} key={group}>
            <h3 className="work-index-group-title" id={`${group}-projects-title`}>{title}</h3>
            <div className="work-index-list">
              {projects
                .filter((project) => project.group === group)
                .map((project) => (
                  <ProjectListItem project={project} key={project.slug} />
                ))}
            </div>
          </section>
        ))}
      </section>
    </main>
  );
}
