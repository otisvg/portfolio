"use client";
export function PrintButton() {
  return (
    <button className="plain-button underlined" onClick={() => window.print()}>
      Print CV <span>↗</span>
    </button>
  );
}
