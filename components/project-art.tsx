import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import type { Project } from "@/data/projects";

/**
 * Illustrative artwork for each project. Everything except the ROLI capture is
 * a decorative CSS/SVG sketch of how the product works, not a screenshot.
 * The resting state is the finished frame, so reduced motion loses nothing.
 */
export function ProjectArt({
  project,
  size = "card",
}: {
  project: Project;
  size?: "card" | "hero";
}) {
  const isHero = size === "hero";
  const scene = project.screenshot ? captureScene : scenes[project.slug];
  return (
    <div
      className={`art art--${project.slug} art--${size}${project.screenshot ? " art--capture" : ""}`}
      aria-hidden={project.screenshot && isHero ? undefined : true}
    >
      {scene?.(project, isHero) ?? null}
    </div>
  );
}

const vars = (values: Record<string, number | string>) =>
  values as CSSProperties;

type Scene = (project: Project, isHero: boolean) => ReactNode;

/** A real capture in a browser frame, used whenever a project has a screenshot. */
const captureScene: Scene = (project, isHero) => {
  const [first, second] = project.artLabels ?? [];
  return (
    <div className="art-scene art-browser">
      <div className="art-browser-bar">
        <span />
        <span />
        <span />
        <span className="art-browser-url">
          {project.liveUrl ? new URL(project.liveUrl).hostname : project.name}
        </span>
      </div>
      <div className="art-browser-view">
        <Image
          src={project.screenshot!}
          alt={isHero ? (project.screenshotAlt ?? "") : ""}
          width={1440}
          height={900}
          sizes={isHero ? "(max-width: 900px) 92vw, 1100px" : "(max-width: 900px) 92vw, 720px"}
          priority={isHero}
        />
      </div>
      {first && (
        <span className="art-chip art-chip--a" aria-hidden="true">
          {first}
        </span>
      )}
      {second && (
        <span className="art-chip art-chip--b" aria-hidden="true">
          {second}
        </span>
      )}
    </div>
  );
};

const scenes: Record<string, Scene> = {

  hawk: () => {
    const cols = 10;
    const rows = 4;
    const alert = { r: 1, c: 6 };
    return (
      <div className="art-scene">
        <svg className="art-hawk" viewBox="0 0 320 200" role="presentation">
          <rect className="hawk-panel" x="12" y="12" width="296" height="176" rx="14" />
          <circle className="hawk-live" cx="32" cy="34" r="4" />
          <rect className="hawk-label" x="44" y="30" width="64" height="8" rx="4" />
          <rect className="hawk-label hawk-label--faint" x="236" y="30" width="52" height="8" rx="4" />
          <path className="hawk-grid" d="M28 92 H292" />
          <path
            className="hawk-line"
            pathLength={1}
            d="M28 80 H92 L100 72 L108 88 L116 56 L124 96 L132 80 H200 L208 74 L216 86 L224 80 H292"
          />
          {Array.from({ length: rows * cols }, (_, i) => {
            const r = Math.floor(i / cols);
            const c = i % cols;
            const isAlert = r === alert.r && c === alert.c;
            const cx = 42 + c * 26;
            const cy = 116 + r * 18;
            return isAlert ? (
              <g key={i}>
                <circle className="hawk-ring" cx={cx} cy={cy} r="5" />
                <circle className="hawk-dot hawk-dot--alert" cx={cx} cy={cy} r="5" />
              </g>
            ) : (
              <circle
                key={i}
                className="hawk-dot"
                cx={cx}
                cy={cy}
                r="5"
                style={vars({ "--i": (i * 7) % 23 })}
              />
            );
          })}
        </svg>
      </div>
    );
  },

  "agentic-workflows": () => (
    <div className="art-scene art-term">
      <div className="art-term-bar">
        <span />
        <span />
        <span />
        <span className="art-term-title">agent session</span>
      </div>
      <div className="art-term-body">
        <p style={vars({ "--i": 0 })}>
          <span className="t-prompt">›</span> <span className="t-cmd">define</span>{" "}
          <span className="t-dim">scope · constraints · done-when</span>
        </p>
        <p style={vars({ "--i": 1 })}>
          <span className="t-prompt">›</span> <span className="t-cmd">build</span>{" "}
          <span className="t-dim">agents · MCP · skills</span>
        </p>
        <p style={vars({ "--i": 2 })}>
          <span className="t-prompt">›</span> <span className="t-cmd">verify</span>{" "}
          <span className="t-ok">✓</span> <span className="t-dim">types</span>{" "}
          <span className="t-ok">✓</span> <span className="t-dim">tests</span>{" "}
          <span className="t-ok">✓</span> <span className="t-dim">review</span>
        </p>
        <p style={vars({ "--i": 3 })}>
          <span className="t-prompt">›</span> <span className="t-cursor" />
        </p>
      </div>
    </div>
  ),

  "pocket-circuit": () => {
    // Pad index → sequencer step (0–7). Pads without a step stay idle.
    const hits: Record<number, number> = { 12: 0, 5: 1, 14: 2, 2: 3, 9: 4, 7: 5, 13: 6, 0: 7 };
    const wave = [
      4, 7, 12, 9, 16, 22, 14, 8, 5, 10, 18, 26, 20, 12, 7, 4, 6, 11, 19, 24, 15, 9,
      6, 3, 8, 14, 21, 17, 10, 6, 4, 2,
    ];
    return (
      <div className="art-scene art-sampler">
        <div className="art-sampler-screen">
          {wave.map((h, i) => (
            <span
              key={i}
              className={i >= 10 && i < 20 ? "is-sliced" : undefined}
              style={vars({ "--h": h })}
            />
          ))}
          <span className="art-sampler-head" />
        </div>
        <div className="art-sampler-pads">
          {Array.from({ length: 16 }, (_, i) => (
            <span
              key={i}
              className={`pad pad--row${Math.floor(i / 4)}${i in hits ? " pad--hit" : ""}`}
              style={i in hits ? vars({ "--step": hits[i] }) : undefined}
            />
          ))}
        </div>
      </div>
    );
  },

  hearth: () => {
    const week: { day: string; tasks: number[] }[] = [
      { day: "Mon", tasks: [78, 56, 66] },
      { day: "Tue", tasks: [62, 84] },
      { day: "Wed", tasks: [70, 52, 80] },
      { day: "Thu", tasks: [88, 60] },
      { day: "Fri", tasks: [58, 74] },
    ];
    let n = 0;
    return (
      <div className="art-scene art-week">
        {week.map(({ day, tasks }) => (
          <div className="art-week-day" key={day}>
            <span className="art-week-label">{day}</span>
            {tasks.map((w, j) => (
              <span className="art-week-task" key={j} style={vars({ "--i": n++, "--w": w })}>
                <span className="art-week-check" />
                <span className="art-week-bar" />
              </span>
            ))}
          </div>
        ))}
      </div>
    );
  },

  "ktt2-song-finder": () => (
    <div className="art-scene art-ktt">
      <div className="art-ktt-thread">
        {[0, 1, 2].map((i) => (
          <div className="art-ktt-post" key={i} style={vars({ "--i": i })}>
            <span className="art-ktt-avatar" />
            <span className="art-ktt-lines">
              <span style={vars({ "--w": [82, 64, 74][i] })} />
              <span className="art-ktt-mention">
                <span aria-hidden="true">♪</span>
                <span style={vars({ "--w": [52, 64, 44][i] })} />
              </span>
            </span>
          </div>
        ))}
      </div>
      <div className="art-ktt-list">
        <span className="art-ktt-list-head" />
        {[0, 1, 2].map((i) => (
          <div className="art-ktt-track" key={i} style={vars({ "--i": i })}>
            <span className="art-ktt-cover" />
            <span className="art-ktt-meta">
              <span style={vars({ "--w": [70, 56, 80][i] })} />
              <span style={vars({ "--w": [44, 60, 36][i] })} />
            </span>
            {i === 0 && (
              <span className="art-ktt-eq">
                <span />
                <span />
                <span />
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  ),
};
