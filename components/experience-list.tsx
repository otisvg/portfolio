import { experience } from "@/data/experience";
export function ExperienceList() {
  return (
    <div className="experience-list">
      {experience.map((e) => (
        <article key={e.company}>
          <span className="mono">{e.period}</span>
          <div>
            <h3>{e.role}</h3>
            <span className="company">{e.company}</span>
            <p>{e.detail}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
