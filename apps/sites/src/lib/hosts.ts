/**
 * Adresses des sites.
 *
 * - Mode normal : le nom d'hôte choisit le site (dupont.sebt.site, dupont-plomberie.fr).
 * - Mode chemin : tant qu'aucun domaine n'est branché, le déploiement est servi sur son
 *   adresse technique (sebt-sites.netlify.app) et le premier segment du chemin désigne le
 *   site : sebt-sites.netlify.app/dupont → dupont.<SITES_DOMAIN>.
 */

/** Domaine des adresses par défaut (même valeur que SITES_DOMAIN du logiciel). */
export function sitesDomain(): string {
  return (process.env.SITES_DOMAIN ?? "sebt.site").toLowerCase();
}

/** Adresse technique de l'hébergeur : le site se choisit par le chemin. */
export function isPlatformHost(host: string): boolean {
  const h = host.replace(/:\d+$/, "").toLowerCase();
  const own = process.env.SITES_PLATFORM_HOST?.toLowerCase();
  return (own ? h === own : false) || h.endsWith(".netlify.app") || h.endsWith(".vercel.app");
}

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/** « dupont » → « dupont.sebt.site » ; null si ce n'est pas une adresse de site valide. */
export function hostFromSlug(slug: string): string | null {
  const s = slug.toLowerCase();
  return SLUG.test(s) ? `${s}.${sitesDomain()}` : null;
}

/** Nom d'hôte de la requête (derrière un proxy, l'hôte d'origine). */
export function requestHost(headers: Headers): string {
  return (headers.get("x-forwarded-host") ?? headers.get("host") ?? "").toLowerCase();
}
