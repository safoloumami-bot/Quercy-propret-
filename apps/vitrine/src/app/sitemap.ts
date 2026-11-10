import type { MetadataRoute } from "next";
import { marque } from "@/config/marque";

const pages: { chemin: string; priorite: number }[] = [
  { chemin: "", priorite: 1 },
  { chemin: "/tarifs", priorite: 0.9 },
  { chemin: "/sites", priorite: 0.8 },
  { chemin: "/sites/tarifs", priorite: 0.7 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const maintenant = new Date();
  return pages.map((p) => ({
    url: `${marque.urlSite}${p.chemin || "/"}`,
    lastModified: maintenant,
    changeFrequency: "weekly",
    priority: p.priorite,
  }));
}
