import type { WebsiteContent, WebsiteTheme } from "@quercy/core";

export interface CatalogItem {
  name: string;
  description: string | null;
  category: string | null;
  unit: string;
  price: number | null;
}

export interface PublishedSite {
  slug: string;
  domains: string[];
  publishedAt: string | null;
  theme: WebsiteTheme;
  content: WebsiteContent;
  catalog: CatalogItem[];
  imageBase: string;
}

/** Adresse du logiciel (API publique des sites). */
export function apiBase(): string {
  return (process.env.SEBT_API_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Site publié pour ce nom d'hôte ; null s'il n'existe pas (ou n'est pas publié). */
export async function fetchSite(host: string): Promise<PublishedSite | null> {
  const response = await fetch(`${apiBase()}/api/public/sites/${encodeURIComponent(host)}`, {
    // Une publication est visible en moins d'une minute, sans recharger le serveur à chaque visite.
    next: { revalidate: 30, tags: [`site:${host}`] },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`API des sites : ${response.status}`);
  return (await response.json()) as PublishedSite;
}

/** Photo publiée : servie par le logiciel, avec un cache long. */
export function imageUrl(_site: PublishedSite, fileId: string): string {
  return `${apiBase()}/api/public/sites/images/${encodeURIComponent(fileId)}`;
}
