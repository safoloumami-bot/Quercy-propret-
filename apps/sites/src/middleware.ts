import { type NextRequest, NextResponse } from "next/server";

/**
 * Un seul déploiement sert tous les sites : le nom d'hôte de la requête
 * (dupont-plomberie.sebt.site, dupont-plomberie.fr…) choisit le site.
 * En local, SITE_DEV_HOST (ou ?site=…) désigne le site à afficher.
 */
export function middleware(request: NextRequest) {
  const url = request.nextUrl;
  if (url.pathname.startsWith("/site/") || url.pathname.startsWith("/api/"))
    return NextResponse.next();
  const header = (
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    ""
  ).toLowerCase();
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(header);
  const host = local
    ? (url.searchParams.get("site") ?? process.env.SITE_DEV_HOST ?? "")
    : header.replace(/:\d+$/, "");
  if (!host) return NextResponse.next();
  const target = url.clone();
  target.pathname = `/site/${encodeURIComponent(host)}${url.pathname === "/" ? "" : url.pathname}`;
  return NextResponse.rewrite(target);
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|robots.txt).*)"],
};
