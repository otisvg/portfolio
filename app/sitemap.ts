import type { MetadataRoute } from "next";
import { profile } from "@/data/profile";
import { projects } from "@/data/projects";
export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/cv", ...projects.map((p) => `/work/${p.slug}`)].map((path) => ({
    url: profile.siteUrl + path,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.8,
  }));
}
