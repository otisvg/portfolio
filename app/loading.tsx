export default function Loading() {
  return (
    <main id="main" className="shell loading-page" aria-busy="true">
      <span className="mono" role="status">
        One moment.
      </span>
      <div className="loading-line" />
    </main>
  );
}
