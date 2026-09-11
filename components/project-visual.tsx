import Image from "next/image";
import type { Project } from "@/data/projects";
import { ProductPreview } from "./product-preview";
export function ProjectVisual({ project }: { project: Project }) {
  return project.screenshot ? (
    <div className="screenshot-stage">
      <Image
        src={project.screenshot}
        alt={project.screenshotAlt ?? `${project.name} product interface`}
        width={2400}
        height={950}
        sizes="(max-width: 700px) 100vw, 1200px"
      />
    </div>
  ) : (
    <ProductPreview type={project.type} />
  );
}
