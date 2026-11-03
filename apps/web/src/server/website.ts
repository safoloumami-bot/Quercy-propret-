import "server-only";

import {
  type WebsiteContent,
  type WebsiteTheme,
  normalizeText,
  websiteContentSchema,
  websiteFileIds,
  websiteThemeSchema,
} from "@quercy/core";
import { prisma } from "@quercy/db";

import { env } from "./env";

export function parseContent(raw: unknown): WebsiteContent | null {
  const parsed = websiteContentSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function parseTheme(raw: unknown): WebsiteTheme {
  return websiteThemeSchema.parse(raw && typeof raw === "object" ? raw : {});
}

/** Adresse publique par défaut d'un site. */
export function siteUrl(slug: string): string {
  return `https://${slug}.${env().SITES_DOMAIN}`;
}

/** Adresse proposée à partir du nom (« Dupont Plomberie » → dupont-plomberie), libre. */
export async function availableSlug(name: string): Promise<string> {
  const base =
    normalizeText(name)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 36) || "mon-site";
  const padded = base.length < 3 ? `${base}-site` : base;
  for (let i = 0; i < 20; i++) {
    const slug = i === 0 ? padded : `${padded}-${i + 1}`;
    if (!(await prisma.website.findUnique({ where: { slug }, select: { id: true } }))) return slug;
  }
  return `${padded}-${Date.now().toString(36)}`;
}

/** Site publié correspondant à un nom d'hôte (sous-domaine ou domaine personnel). */
export async function findPublishedSite(host: string) {
  const h = host.toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
  const suffix = `.${env().SITES_DOMAIN}`;
  const bare = h.startsWith("www.") ? h.slice(4) : h;
  const site = h.endsWith(suffix)
    ? await prisma.website.findUnique({ where: { slug: h.slice(0, -suffix.length) } })
    : await prisma.website.findFirst({ where: { domains: { hasSome: [h, bare, `www.${bare}`] } } });
  if (!site?.published) return null;
  const content = parseContent(site.published);
  if (!content) return null;
  return { site, content, theme: parseTheme(site.theme) };
}

/** Une image n'est servie publiquement que si le site publié l'utilise. */
export async function publicImage(fileId: string) {
  const file = await prisma.storedFile.findUnique({ where: { id: fileId } });
  if (!file || file.deletedAt || file.entityType !== "website") return null;
  const site = await prisma.website.findUnique({
    where: { organizationId: file.organizationId },
    select: { published: true },
  });
  const content = site?.published ? parseContent(site.published) : null;
  if (!content || !websiteFileIds(content).includes(fileId)) return null;
  return file;
}
