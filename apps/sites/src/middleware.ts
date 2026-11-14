import { type NextRequest, NextResponse } from "next/server";

import { hostFromSlug, isPlatformHost, requestHost } from "@/lib/hosts";

/**
 * Un seul déploiement sert tous les sites : le nom d'hôte de la requête
 * (dupont-plomberie.sebt.site, dupont-plomberie.fr…) choisit le site. Sur l'adresse technique
 * de l'hébergeur (….netlify.app), c'est le premier segment du chemin (/dupont-plomberie).
 * En local, SITE_DEV_HOST (ou ?site=…) désigne le site à afficher.
 */
export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  if (url.pathname.startsWith("/site/") || url.pathname.startsWith("/api/"))
    return NextResponse.next();
  const header = requestHost(request.headers);
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(header);

  let host = "";
  let rest = url.pathname === "/" ? "" : url.pathname;
  let base = "";
  if (local) {
    host = url.searchParams.get("site") ?? process.env.SITE_DEV_HOST ?? "";
  } else if (isPlatformHost(header)) {
    const [, slug = "", ...tail] = url.pathname.split("/");
    const found = slug ? hostFromSlug(slug) : null;
    if (!found) return NextResponse.next();
    host = found;
    base = `/${slug.toLowerCase()}`;
    rest = tail.length && tail.join("/") ? `/${tail.join("/")}` : "";
  } else {
    host = header.replace(/:\d+$/, "");
  }
  if (!host) return NextResponse.next();

  const target = url.clone();
  target.pathname = `/site/${encodeURIComponent(host)}${rest}`;
  const headers = new Headers(request.headers);
  // Préfixe des liens internes du site (« /dupont » en mode chemin, vide sinon).
  headers.set("x-site-base", base);
  return NextResponse.rewrite(target, { request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|robots.txt).*)"],
};
