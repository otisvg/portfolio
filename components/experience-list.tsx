import { experience } from "@/data/experience";
export function ExperienceList({ detailed = false }: { detailed?: boolean }) {
  return (
    <div className="experience-list">
      {experience.map((e) => (
        <article key={e.company}>
          <span className="mono">{e.period}</span>
          <div>
            <h3>{e.role}</h3>
            <span className="company">{e.company}</span>
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
