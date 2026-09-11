import Link from "next/link";
import { profile } from "@/data/profile";
import { ThemeToggle } from "./theme-toggle";
export function Header() {
  return (
    <header className="site-header shell">
      <Link href="/" className="wordmark" aria-label={`${profile.name} home`}>
        {profile.name}
        <span className="accent">.</span>
      </Link>
      <nav aria-label="Main navigation">
        <a href="/#work">Work</a>
        <a href="/#experience">Experience</a>
        <a href="/#about">About</a>
        <Link href="/cv">
          CV <span aria-hidden="true">↗</span>
        </Link>
        <ThemeToggle />
      </nav>
    </header>
  );
}
