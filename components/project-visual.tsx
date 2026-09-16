import Image from "next/image";
import type { Project } from "@/data/projects";
export function ProjectVisual({ project }: { project: Project }) {
  if (project.screenshot)
    return (
      <div className="screenshot-stage">
        <Image
          src={project.screenshot}
          alt={project.screenshotAlt ?? `${project.name} website`}
          width={1440}
          height={900}
          sizes="(max-width: 700px) 100vw, 1200px"
        />
      </div>
    );
  return (
    <div className={`work-diagram ${project.type}`}>
      <div className="diagram-title">
        <strong>{project.name}</strong>
        <span>
          {project.type === "telemetry" ? "System overview" : "Working process"}
        </span>
      </div>
      <div className="diagram-flow">
        {project.diagram.map((step, i) => (
          <div key={step}>
            <span className="diagram-step">{step}</span>
            {i < project.diagram.length - 1 && (
              <span className="diagram-arrow" aria-hidden="true">
                →
              </span>
            )}
          </div>
        ))}
      </div>
      <p>{project.diagramDetail}</p>
    </div>
  );
}
