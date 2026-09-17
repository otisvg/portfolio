import Link from "next/link";
import { AccentPunctuation } from "@/components/accent-punctuation";
export default function NotFound() {
  return (
    <main id="main" className="shell not-found">
      <span className="mono">404 / A WRONG TURN</span>
      <h1>
        <AccentPunctuation>Nothing here.</AccentPunctuation>
        <br />
        <AccentPunctuation>Plenty to explore.</AccentPunctuation>
      </h1>
      <p>
        <AccentPunctuation>
          This page may have moved, or the address isn’t quite right.
        </AccentPunctuation>
      </p>
      <Link href="/" className="underlined">
        Back to the good stuff <span>↗</span>
      </Link>
    </main>
  );
}
