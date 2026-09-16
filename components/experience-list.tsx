import { experience } from "@/data/experience";
import { CompanyLogo } from "./company-logo";

export function ExperienceList({ detailed = false }: { detailed?: boolean }) {
  return (
    <div className="experience-list">
      {experience.map((e) => (
        <article key={e.company} className="experience-item">
          <div className="experience-period">{e.period}</div>
          <div className="experience-content">
            <div className="experience-company-row">
              <CompanyLogo name={e.company} size={30} />
              <span className="company-tag" style={{ marginBottom: 0 }}>
                {e.company}
              </span>
            </div>
            <h3>{e.role}</h3>
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
