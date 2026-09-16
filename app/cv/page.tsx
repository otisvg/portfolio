import type { Metadata } from "next";
import Link from "next/link";
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
      <div className="cv-top-bar">
        <Link href="/" className="back-link" style={{ marginBottom: 0 }}>
          <span aria-hidden="true">←</span>
          <span>Return home</span>
        </Link>
        <div className="cv-action-buttons">
          <PrintButton />
          <a className="download-button" href={profile.cvPdf} download>
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" x2="12" y1="15" y2="3" />
            </svg>
            <span>Download verified PDF</span>
          </a>
        </div>
      </div>

      <header className="cv-masthead">
        <h1>
          {profile.name}
          <span className="accent">.</span>
        </h1>
        <p className="cv-role">{profile.title}</p>
        <div className="cv-contact-details">
          <span>{profile.location}</span>
          <span aria-hidden="true">·</span>
          <a href={`mailto:${profile.email}`}>{profile.email}</a>
          <span aria-hidden="true">·</span>
          <a href={profile.linkedin} target="_blank" rel="noreferrer">
            LinkedIn ↗
          </a>
          {profile.github && (
            <>
              <span aria-hidden="true">·</span>
              <a href={profile.github} target="_blank" rel="noreferrer">
                GitHub ↗
              </a>
            </>
          )}
        </div>
      </header>

      <section className="cv-section">
        <h2>Executive summary</h2>
        <p>{profile.summary}</p>
      </section>

      <section className="cv-section">
        <h2>Professional experience</h2>
        <ExperienceList detailed />
      </section>

      <section className="cv-section">
        <h2>Technical profile & toolchain</h2>
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
      </section>

      <section className="cv-section">
        <h2>Education & intensive study</h2>
        {profile.education.map((e) => (
          <div className="education-item" key={e.school}>
            <span className="education-period">{e.period}</span>
            <div>
              <h3>{e.degree}</h3>
              <p className="education-school">{e.school}</p>
              <p>{e.detail}</p>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
