"use client";

import { useState } from "react";
import Image from "next/image";
import { AccentPunctuation } from "./accent-punctuation";
import type { Project } from "@/data/projects";
import { architectureFlows, type ArchitectureNode } from "@/data/architecture-flows";

export function ProjectVisual({ project }: { project: Project }) {
  const flows = architectureFlows[project.slug];
  const [activeFlowIndex, setActiveFlowIndex] = useState(0);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"architecture" | "screenshot">(
    project.screenshot ? "screenshot" : "architecture"
  );
  const [isSimulating, setIsSimulating] = useState(false);

  const currentFlow = flows ? flows[activeFlowIndex] : null;
  const nodes = currentFlow ? currentFlow.nodes : [];
  const selectedNode = nodes.find((n) => n.id === activeNodeId) ?? nodes[0];

  const handleStepSimulation = () => {
    if (!nodes.length) return;
    setIsSimulating(true);
    const currentIndex = nodes.findIndex((n) => n.id === (activeNodeId ?? nodes[0].id));
    const nextIndex = (currentIndex + 1) % nodes.length;
    setActiveNodeId(nodes[nextIndex].id);
    setTimeout(() => setIsSimulating(false), 600);
  };

  return (
    <div className="project-visual-container">
      {/* Top bar with View Mode Switcher and Flow Tabs */}
      <div className="visual-controls-bar">
        <div className="visual-left-controls">
          {project.screenshot && (
            <div className="view-mode-toggle" role="tablist" aria-label="Visual view mode">
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "screenshot"}
                className={`mode-btn ${viewMode === "screenshot" ? "active" : ""}`}
                onClick={() => setViewMode("screenshot")}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                  <circle cx="9" cy="9" r="2"/>
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                </svg>
                <span>Storefront capture</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "architecture"}
                className={`mode-btn ${viewMode === "architecture" ? "active" : ""}`}
                onClick={() => setViewMode("architecture")}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect width="7" height="7" x="3" y="3" rx="1"/>
                  <rect width="7" height="7" x="14" y="3" rx="1"/>
                  <rect width="7" height="7" x="14" y="14" rx="1"/>
                  <rect width="7" height="7" x="3" y="14" rx="1"/>
                </svg>
                <span>System architecture</span>
              </button>
            </div>
          )}

          {viewMode === "architecture" && flows && flows.length > 1 && (
            <div className="flow-tabs" role="tablist" aria-label="Architecture flows">
              {flows.map((flow, idx) => (
                <button
                  key={flow.id}
                  type="button"
                  role="tab"
                  aria-selected={activeFlowIndex === idx}
                  className={`flow-tab-btn ${activeFlowIndex === idx ? "active" : ""}`}
                  onClick={() => {
                    setActiveFlowIndex(idx);
                    setActiveNodeId(flow.nodes[0]?.id ?? null);
                  }}
                >
                  <span>{flow.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {viewMode === "architecture" && nodes.length > 0 && (
          <div className="visual-right-actions">
            <button
              type="button"
              className={`simulate-btn ${isSimulating ? "pulsing" : ""}`}
              onClick={handleStepSimulation}
              aria-label="Step to next service node in architecture"
            >
              <span className="play-icon" aria-hidden="true">▶</span>
              <span>Step flow</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Visual Stage */}
      {viewMode === "screenshot" && project.screenshot ? (
        <div className="screenshot-stage">
          <Image
            src={project.screenshot}
            alt={project.screenshotAlt ?? `${project.name} website`}
            width={1440}
            height={900}
            sizes="(max-width: 700px) 100vw, 1200px"
            priority={false}
          />
          {project.imageNote && (
            <div className="screenshot-caption">
              <span className="caption-dot" aria-hidden="true" />
              <span>
                <AccentPunctuation>{project.imageNote}</AccentPunctuation>
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="architecture-stage">
          {currentFlow && (
            <div className="flow-meta">
              <span className="flow-badge">Architecture Blueprint</span>
              <p className="flow-description">
                <AccentPunctuation>{currentFlow.description}</AccentPunctuation>
              </p>
            </div>
          )}

          {/* Connected Pipeline Nodes */}
          <div className="architecture-grid" role="region" aria-label="Architecture pipeline nodes">
            {nodes.map((node, index) => {
              const isSelected = (activeNodeId ?? nodes[0]?.id) === node.id;
              return (
                <div key={node.id} className="node-wrapper">
                  <button
                    type="button"
                    className={`arch-node ${isSelected ? "selected" : ""}`}
                    onClick={() => setActiveNodeId(node.id)}
                    aria-label={`Inspect ${node.label} (${node.sub})`}
                    aria-expanded={isSelected}
                  >
                    <div className="node-header">
                      <span className="node-badge">{node.badge}</span>
                      {node.metric && <span className="node-metric">{node.metric}</span>}
                    </div>
                    <div className="node-body">
                      <strong className="node-title">{node.label}</strong>
                      <span className="node-sub">{node.sub}</span>
                    </div>
                    <div className="node-footer">
                      <span className="node-tech">{node.tech}</span>
                      <span className="inspect-cue" aria-hidden="true">
                        {isSelected ? "●" : "○"}
                      </span>
                    </div>
                  </button>

                  {/* Flow connector line between nodes */}
                  {index < nodes.length - 1 && (
                    <div className="flow-connector" aria-hidden="true">
                      <div className="connector-line">
                        <div className="connector-pulse" />
                      </div>
                      <span className="connector-arrow">→</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Node Deep Dive Inspector Card */}
          {selectedNode && (
            <div className="node-inspector" role="status" aria-live="polite">
              <div className="inspector-head">
                <div className="inspector-identity">
                  <span className="inspector-badge">{selectedNode.badge} · {selectedNode.tech}</span>
                  <h4 className="inspector-title">{selectedNode.label}</h4>
                </div>
                {selectedNode.metric && (
                  <div className="inspector-stat">
                    <span className="stat-label">Measurement</span>
                    <strong className="stat-value">{selectedNode.metric}</strong>
                  </div>
                )}
              </div>

              <div className="inspector-content">
                <div className="inspector-block">
                  <span className="block-label">
                    <AccentPunctuation>Function & Responsibilities</AccentPunctuation>
                  </span>
                  <p>
                    <AccentPunctuation>{selectedNode.detail}</AccentPunctuation>
                  </p>
                </div>
                <div className="inspector-block tradeoff">
                  <span className="block-label">Architecture Tradeoff</span>
                  <p>
                    <AccentPunctuation>{selectedNode.tradeoff}</AccentPunctuation>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
