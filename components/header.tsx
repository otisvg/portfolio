import Link from "next/link";
import { profile } from "@/data/profile";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
  return (
    <header className="site-header shell">
      <div className="header-inner">
        <Link href="/" className="wordmark" aria-label={`${profile.name} home`}>
          <span className="wordmark-name">{profile.name}</span>
          <span className="wordmark-role">{profile.title}</span>
        </Link>

        <nav className="header-nav" aria-label="Main navigation">
          <a href="/#work" className="nav-link">
            <span>Work</span>
          </a>
          <a href="/#experience" className="nav-link">
            <span>Experience</span>
          </a>
          <a href="/#about" className="nav-link">
            <span>About</span>
          </a>
          <Link href="/cv" className="nav-link nav-cv">
            <span>CV</span>
            <span className="arrow-cue" aria-hidden="true">↗</span>
          </Link>
          <div className="nav-divider" aria-hidden="true" />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
