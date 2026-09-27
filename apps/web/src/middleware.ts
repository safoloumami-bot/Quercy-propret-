import { type NextRequest, NextResponse } from "next/server";

/** Pages accessibles sans être connecté. */
const PUBLIC_PREFIXES = [
  "/connexion",
  "/inscription",
  "/mot-de-passe-oublie",
  "/reinitialiser",
  "/invitation",
  "/api",
];

/** Cookie de session Better Auth (préfixé « __Secure- » en HTTPS). */
const SESSION_COOKIES = ["better-auth.session_token", "__Secure-better-auth.session_token"];

/**
 * Filtre rapide : sans cookie de session, redirection vers la connexion.
 * La session est ensuite réellement vérifiée côté serveur à chaque rendu et appel d'API.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }
  if (!SESSION_COOKIES.some((name) => request.cookies.has(name))) {
    const url = new URL("/connexion", request.url);
    if (pathname !== "/") url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|icon.png|apple-icon.png|brand/|favicon.ico|robots.txt).*)",
  ],
};
