"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  };

  return (
    <button
      type="button"
      className="theme-toggle-btn"
      role="switch"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      aria-checked={dark}
      title={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={toggleTheme}
    >
      <span className="toggle-track">
        <span className={`toggle-thumb ${dark ? "dark" : "light"}`}>
          {mounted && dark ? (
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2m0 16v2M2 12h2m16 0h2m-3.5-6.5L18 7m-12 10 1.5-1.5m0-9L6 8m12 10-1.5-1.5" />
            </svg>
          )}
        </span>
      </span>
    </button>
  );
}
