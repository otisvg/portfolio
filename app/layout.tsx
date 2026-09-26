import type { Metadata } from "next";
import { profile } from "@/data/profile";
import { Header } from "@/components/header";
import { ContactWidget } from "@/components/contact-widget";
import { AccentPunctuation } from "@/components/accent-punctuation";
import localFont from "next/font/local";
const sans = localFont({
  src: "../node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2",
  variable: "--font-sans",
  display: "swap",
  weight: "300 700",
});
const mono = localFont({
  src: [
    {
      path: "../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-mono",
  display: "swap",
});
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(profile.siteUrl),
  title: {
    default: `${profile.name} — ${profile.title}`,
    template: `%s — ${profile.name}`,
  },
  description: profile.description,
  openGraph: {
    title: `${profile.name} — ${profile.title}`,
    description: profile.description,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `${profile.name} — ${profile.title}`,
    description: profile.description,
  },
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');document.documentElement.dataset.theme=t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch{}`,
          }}
        />
      </head>
      <body className={`${sans.variable} ${mono.variable}`}>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Header />
        {children}
        <footer className="site-footer">
          <div className="shell">
            <section className="cta" aria-labelledby="cta-title">
              <h2 id="cta-title">
                <AccentPunctuation>Let’s talk.</AccentPunctuation>
              </h2>
              <p>
                <AccentPunctuation>
                  Have a role, project, or idea in mind? I’d love to hear about it.
                </AccentPunctuation>
              </p>
              <div className="cta-actions">
                <a className="btn btn--primary btn--lg" href={`mailto:${profile.email}`}>
                  {profile.email}
                </a>
                <a className="btn btn--ghost" href={profile.linkedin} target="_blank" rel="noreferrer">
                  LinkedIn <span aria-hidden="true">↗</span>
                </a>
                <a className="btn btn--ghost" href={profile.github} target="_blank" rel="noreferrer">
                  GitHub <span aria-hidden="true">↗</span>
                </a>
                <a className="btn btn--ghost" href={profile.cvPdf} download>
                  Download CV <span aria-hidden="true">↓</span>
                </a>
              </div>
            </section>
            <div className="footer-base">
              <span>
                © {new Date().getFullYear()}{" "}
                <span className="footer-mark">
                  {profile.initials}
                  <AccentPunctuation>.</AccentPunctuation>
                </span>
              </span>
              <a href="#main" className="text-link">
                Back to top <span aria-hidden="true">↑</span>
              </a>
            </div>
          </div>
        </footer>
        <ContactWidget endpoint={profile.contactFormEndpoint} />
      </body>
    </html>
  );
}
