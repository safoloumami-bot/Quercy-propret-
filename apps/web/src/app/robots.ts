import type { MetadataRoute } from "next";

// Le logiciel est privé (comptes clients) : rien à indexer, la vitrine s'en charge.
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
