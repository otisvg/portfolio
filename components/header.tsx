import Link from "next/link";
import Image from "next/image";
import { profile } from "@/data/profile";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
  return (
    <header className="site-header shell">
      <div className="header-inner">
        <Link href="/" className="wordmark" aria-label={`${profile.name} home`}>
          {profile.headshot.src && (
            <div className="wordmark-photo-wrapper">
              <div className="wordmark-photo-frame">
                <Image
                  src={profile.headshot.src}
                  alt=""
                  width={64}
                  height={64}
                  priority
                  className="wordmark-photo"
                  style={{ objectPosition: profile.headshot.position }}
                />
              </div>
            </div>
          )}
          <div className="wordmark-text">
            <span className="wordmark-name">{profile.name}</span>
            <span className="wordmark-role">{profile.title}</span>
          </div>
        </Link>

        <nav className="header-nav" aria-label="Main navigation">
          <a href="/#work" className="nav-link">
            <span>Work</span>
          </a>
          <a
            href="/otis-vickers-graver-cv.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link nav-cv"
            aria-label="Open CV PDF in a new tab"
          >
            <span>CV</span>
            <svg aria-hidden="true" className="nav-arrow" viewBox="0 0 16 16" fill="none">
              <path d="M4 12 12 4m0 0H6m6 0v6" />
            </svg>
          </a>
          <a
            href={profile.github}
            target="_blank"
            rel="noreferrer"
            className="nav-link nav-github"
            aria-label="GitHub Profile"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
              <path d="M9 18c-4.51 2-5-2-7-2" />
            </svg>
            <span>GitHub</span>
          </a>
          <div className="nav-divider" aria-hidden="true" />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
