import { hostFromSlug, isPlatformHost, requestHost } from "./hosts";

/**
 * Site concerné par une requête faite depuis une de ses pages (formulaire, visite) : nom
 * d'hôte, premier segment du chemin de la page en mode chemin, ou SITE_DEV_HOST en local.
 */
export function siteHostOf(request: Request): string {
  const header = requestHost(request.headers);
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(header);
  const referer = request.headers.get("referer");
  if (local)
    return (
      (referer ? new URL(referer).searchParams.get("site") : null) ??
      process.env.SITE_DEV_HOST ??
      ""
    );
  if (isPlatformHost(header)) {
    const slug = referer ? (new URL(referer).pathname.split("/")[1] ?? "") : "";
    return (slug && hostFromSlug(slug)) || "";
  }
  return header.replace(/:\d+$/, "");
}
