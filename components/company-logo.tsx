export function CompanyLogo({
  name,
  size = 40,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const normalized = name.toLowerCase();

  // ROLI: Authentic continuous ribbon wave mark
  if (normalized.includes("roli")) {
    return (
      <div
        className={`company-logo-badge ${className}`}
        style={{ width: size, height: size }}
        aria-label="ROLI logo"
      >
        <svg
          width={size * 0.58}
          height={size * 0.58}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* Continuous expressive soundwave / ribbon loop */}
          <path d="M3 12c2.5-6 6.5-6 9 0s6.5 6 9 0" />
          <path d="M3 16c2.5-6 6.5-6 9 0s6.5 6 9 0" opacity="0.4" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </svg>
      </div>
    );
  }

  // HAWK / OLR: Retail telemetry radar / observability hexagon
  if (normalized.includes("hawk") || normalized.includes("olr")) {
    return (
      <div
        className={`company-logo-badge ${className}`}
        style={{ width: size, height: size }}
        aria-label="OLR / HAWK logo"
      >
        <svg
          width={size * 0.58}
          height={size * 0.58}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* Hexagonal telemetry shield with hawk-eye radar aperture */}
          <path d="M12 2l8 4.5v11L12 22l-8-4.5v-11L12 2z" />
          <circle cx="12" cy="12" r="3.5" />
          <line x1="12" y1="8.5" x2="12" y2="12" />
        </svg>
      </div>
    );
  }

  // Agents in Practice / AI Toolchain: Autonomous multi-agent mesh & MCP node
  if (normalized.includes("agent") || normalized.includes("ai")) {
    return (
      <div
        className={`company-logo-badge ${className}`}
        style={{ width: size, height: size }}
        aria-label="Agentic AI logo"
      >
        <svg
          width={size * 0.58}
          height={size * 0.58}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* Interconnected triangular agent nodes with central spark */}
          <circle cx="12" cy="5" r="2.5" />
          <circle cx="5" cy="18" r="2.5" />
          <circle cx="19" cy="18" r="2.5" />
          <line x1="12" y1="7.5" x2="6.5" y2="16" />
          <line x1="12" y1="7.5" x2="17.5" y2="16" />
          <line x1="7.5" y1="18" x2="16.5" y2="18" />
          <circle cx="12" cy="13" r="1.5" fill="currentColor" />
        </svg>
      </div>
    );
  }

  // Pirical: Legal analytics geometric column
  if (normalized.includes("pirical")) {
    return (
      <div
        className={`company-logo-badge ${className}`}
        style={{ width: size, height: size }}
        aria-label="Pirical logo"
      >
        <svg
          width={size * 0.58}
          height={size * 0.58}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* Data analytics bar matrix & pillar */}
          <rect x="3" y="14" width="4" height="7" rx="1" />
          <rect x="10" y="8" width="4" height="13" rx="1" />
          <rect x="17" y="3" width="4" height="18" rx="1" />
          <path d="M4 10l7-5 7 5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  // Default clean monogram badge
  return (
    <div
      className={`company-logo-badge ${className}`}
      style={{ width: size, height: size }}
      aria-label={`${name} logo`}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: size * 0.36,
          fontWeight: 600,
        }}
      >
        {name.slice(0, 2).toUpperCase()}
      </span>
    </div>
  );
}
