import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="shell not-found">
      <span className="mono">404 / A WRONG TURN</span>
      <h1>
        Nothing here.
        <br />
        Plenty to explore<span className="accent">.</span>
      </h1>
      <p>This page may have moved, or the address isn’t quite right.</p>
      <Link href="/" className="underlined">
        Back to the good stuff <span>↗</span>
      </Link>
    </main>
  );
}
