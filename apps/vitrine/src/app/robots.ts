import type { MetadataRoute } from "next";
import { marque } from "@/config/marque";

// Les pages de démonstration (/app, /connexion, /inscription) renvoient au logiciel : pas à indexer.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/app", "/connexion", "/inscription"] }],
    sitemap: `${marque.urlSite}/sitemap.xml`,
    host: marque.urlSite,
  };
}
