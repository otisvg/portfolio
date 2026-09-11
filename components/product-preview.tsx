export function ProductPreview({ type }: { type: string }) {
  return (
    <div
      className={`product-stage ${type}`}
      role="img"
      aria-label={
        type === "orbit"
          ? "Orbit concept: a project workspace with overview, tasks, and progress"
          : type === "notes"
            ? "Fieldnotes concept: a quiet writing workspace with linked notes"
            : "Baseline concept: service health and latency monitoring dashboard"
      }
    >
      {type === "orbit" ? (
        <div className="product-window" aria-hidden="true">
          <aside className="mock-sidebar">
            <b className="product-brand">◉ orbit</b>
            <div className="workspace">
              S &nbsp; Studio workspace <span>⌄</span>
            </div>
            <p>
              ⌕ &nbsp; Search <small>⌘ K</small>
            </p>
            <p>
              ▤ &nbsp; Inbox <small>3</small>
            </p>
            <p>◷ &nbsp; My tasks</p>
            <div className="mock-label">
              WORKSPACE <span>+</span>
            </div>
            <p className="active">▦ &nbsp; Overview</p>
            <p>▱ &nbsp; Projects</p>
            <p>◈ &nbsp; Team</p>
            <div className="mock-label">YOUR PROJECTS</div>
            <p>
              <i className="dot violet" /> Website redesign
            </p>
            <p>
              <i className="dot orange" /> Design system
            </p>
            <p>
              <i className="dot green" /> Mobile experience
            </p>
            <div className="sidebar-bottom">
              AM &nbsp; Alex Morgan <span>⌄</span>
            </div>
          </aside>
          <div className="mock-main">
            <div className="mock-top">
              Workspace <span>/</span> Overview{" "}
              <span className="right">◷ &nbsp; ◉</span>
            </div>
            <div className="mock-title">
              <div>
                <h3>Workspace overview</h3>
                <p>A little clarity for the work ahead.</p>
              </div>
              <span className="mock-button">+ New project</span>
            </div>
            <div className="mock-stats">
              {[
                ["12", "Active projects"],
                ["86", "Tasks completed"],
                ["8", "Team members"],
              ].map(([n, l]) => (
                <div key={l}>
                  <span>{l}</span>
                  <b>
                    {n}
                    <small>↗</small>
                  </b>
                </div>
              ))}
            </div>
            <div className="mock-heading">
              Your projects <span>View all ↗</span>
            </div>
            <div className="mock-projects">
              {[
                [
                  "violet",
                  "Website redesign",
                  "A fresh foundation for what’s next.",
                  "68%",
                  "68",
                ],
                [
                  "orange",
                  "Design system",
                  "One language. Every touchpoint.",
                  "42%",
                  "42",
                ],
                [
                  "green",
                  "Mobile experience",
                  "Good things, in a smaller package.",
                  "85%",
                  "85",
                ],
              ].map(([c, n, d, p, w]) => (
                <div key={n}>
                  <div className={`mock-icon ${c}`}>▦</div>
                  <h4>{n}</h4>
                  <p>{d}</p>
                  <div className="progress-label">
                    Progress <span>{p}</span>
                  </div>
                  <div className="progress">
                    <i style={{ width: w + "%" }} className={c} />
                  </div>
                  <footer>
                    <span className="avatars">● ● ●</span>
                    <span>◷ Jun 24</span>
                  </footer>
                </div>
              ))}
            </div>
            <div className="mock-heading">
              Recent activity <span>All activity ↗</span>
            </div>
            <div className="activity">
              <span className="avatar">JL</span>
              <p>
                <b>Jamie Lee</b> completed <b>Navigation components</b>
                <small>Design system · 12 minutes ago</small>
              </p>
              <span className="completed">✓ Done</span>
            </div>
          </div>
        </div>
      ) : type === "notes" ? (
        <div className="note-window" aria-hidden="true">
          <aside>
            <b>
              fieldnotes<span>✳</span>
            </b>
            <p>⌕ &nbsp; Find a thought</p>
            <p className="active">
              ▤ &nbsp; All notes <span>24</span>
            </p>
            <p>☆ &nbsp; Favorites</p>
            <p>▱ &nbsp; Collections</p>
            <label>COLLECTIONS</label>
            <p>Design & craft</p>
            <p>Things worth keeping</p>
            <p>Everyday observations</p>
          </aside>
          <article>
            <div className="note-meta">
              DESIGN & CRAFT <span>↗ &nbsp; ···</span>
            </div>
            <h3>
              Make room for
              <br />
              the important things.
            </h3>
            <p className="note-date">June 18, 2025 · 4 min read</p>
            <p>
              The best tools disappear. They leave space for the work, the
              thought, the small moment of clarity.
            </p>
            <blockquote>Simplicity is about finding the essential.</blockquote>
            <p>A few things I keep coming back to:</p>
            <p>
              01 &nbsp; Start with a good question.
              <br />
              02 &nbsp; Notice what can be removed.
              <br />
              03 &nbsp; Leave a little room to think.
            </p>
            <div className="note-tags">
              # design &nbsp; # attention &nbsp; # less-but-better
            </div>
          </article>
        </div>
      ) : (
        <div className="metrics-window" aria-hidden="true">
          <header>
            <b>▥ baseline</b>
            <span>Overview &nbsp;&nbsp; Services &nbsp;&nbsp; Incidents</span>
            <small>
              <i className="dot green" /> All systems operational
            </small>
          </header>
          <div className="metrics-body">
            <div className="metrics-title">
              <h3>The big picture.</h3>
              <span>Last 24 hours ⌄</span>
            </div>
            <div className="metric-numbers">
              <div>
                <small>UPTIME</small>
                <strong>
                  99.98<span>%</span>
                </strong>
                <em>↗ 0.02% this week</em>
              </div>
              <div>
                <small>AVG. RESPONSE</small>
                <strong>
                  142<span>ms</span>
                </strong>
                <em>↘ 18ms this week</em>
              </div>
              <div>
                <small>REQUESTS</small>
                <strong>
                  1.24<span>M</span>
                </strong>
                <em>↗ 12.8% this week</em>
              </div>
            </div>
            <div className="chart-label">
              Response time <span>● API &nbsp; ● Edge</span>
            </div>
            <svg className="chart" viewBox="0 0 700 140" fill="none">
              <path
                d="M0 20H700M0 60H700M0 100H700M0 139H700"
                stroke="#ffffff12"
              />
              <path
                d="M0 90 22 87 45 99 68 78 91 83 115 66 138 77 161 83 184 68 208 72 231 58 254 63 278 77 301 63 324 69 347 34 371 59 394 56 417 67 440 49 464 54 487 45 510 61 534 52 557 65 580 40 603 47 627 35 650 45 673 38 700 43"
                stroke="#aeddb0"
                strokeWidth="2"
              />
              <path
                d="M0 117 50 115 100 120 150 109 200 112 250 108 300 115 350 101 400 109 450 103 500 109 550 101 600 105 650 96 700 100"
                stroke="#858fa4"
                strokeWidth="2"
              />
            </svg>
            <div className="chart-axis">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>23:59</span>
            </div>
            <div className="service-row">
              <span>
                <i className="dot green" /> API service
              </span>
              <span>Healthy</span>
              <span>128 ms</span>
              <span>99.99%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
