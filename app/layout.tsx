import type { Metadata } from "next";
import { profile } from "@/data/profile";
import { Header } from "@/components/header";
import localFont from "next/font/local";
const inter = localFont({
  src: "../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  variable: "--font-sans",
  display: "swap",
  weight: "100 900",
});
const mono = localFont({
  src: "../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2",
  variable: "--font-mono",
  display: "swap",
  weight: "400",
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
      <body className={`${inter.variable} ${mono.variable}`}>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Header />
        {children}
        <footer className="site-footer shell">
          <span>
            © {new Date().getFullYear()}{" "}
            <span className="footer-mark">{profile.initials}.</span>
          </span>
        </footer>
      </body>
    </html>
  );
}
