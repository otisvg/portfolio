import type { Metadata } from "next";
import { profile } from "@/data/profile";
import { ExperienceList } from "@/components/experience-list";
import { PrintButton } from "@/components/print-button";
export const metadata: Metadata = {
  title: "Curriculum vitae",
  description: `Experience, education, and technical profile of ${profile.name}.`,
};
export default function CV() {
  return (
    <main id="main" className="shell cv-page">
      <div className="cv-actions">
        <span className="mono">CURRICULUM VITAE</span>
        <div>
          <PrintButton />
          <a className="download-button" href={profile.cvPdf} download>
            Download PDF ↗
          </a>
        </div>
      </div>
      <header className="cv-header">
        <h1>
          {profile.name}
          <span className="accent">.</span>
        </h1>
        <p>{profile.title}</p>
        <div>
          {profile.location} <span>·</span>{" "}
          <a href={`mailto:${profile.email}`}>{profile.email}</a>
        </div>
      </header>
      <section className="cv-section">
        <h2>Summary</h2>
        <p>{profile.about[0]}</p>
      </section>
      <section className="cv-section">
        <h2>Experience</h2>
        <ExperienceList />
      </section>
      <section className="cv-section">
        <h2>Technical profile</h2>
        <div className="skills-grid">
          {Object.entries(profile.skills).map(([k, v]) => (
            <div key={k}>
              <h3>{k}</h3>
              <p>{v.join(", ")}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="cv-section">
        <h2>Education</h2>
        <div className="education">
          <span className="mono">{profile.education.period}</span>
          <div>
            <h3>{profile.education.degree}</h3>
            <p>{profile.education.school}</p>
          </div>
        </div>
      </section>
      <section className="cv-section cv-contact">
        <h2>Contact</h2>
        <a href={`mailto:${profile.email}`}>{profile.email}</a>
        <a href={profile.github}>GitHub ↗</a>
        <a href={profile.linkedin}>LinkedIn ↗</a>
      </section>
    </main>
  );
}
