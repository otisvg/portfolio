import { AccentPunctuation } from "@/components/accent-punctuation";

export default function Loading() {
  return (
    <main id="main" className="shell loading-page" aria-busy="true">
      <span className="mono" role="status">
        <AccentPunctuation>One moment.</AccentPunctuation>
      </span>
      <div className="loading-line" />
    </main>
  );
}
