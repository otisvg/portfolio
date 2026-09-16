import { experience } from "@/data/experience";

export function ExperienceList({ detailed = false }: { detailed?: boolean }) {
  return (
    <div className="experience-list">
      {experience.map((e) => (
        <article key={e.company} className="experience-item">
          <div className="experience-period">{e.period}</div>
          <div className="experience-content">
            <h3>{e.role}</h3>
            <span className="company-tag">{e.company}</span>
            <p>{e.detail}</p>
            {detailed && (
              <ul className="experience-highlights">
                {e.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
