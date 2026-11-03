import { NextResponse } from "next/server";

import { apiBase } from "@/lib/api";

/** Relaie le formulaire de contact vers le logiciel, pour le site de ce nom d'hôte. */
export async function POST(request: Request) {
  const header = (
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    ""
  ).toLowerCase();
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(header);
  const referer = request.headers.get("referer");
  const host = local
    ? ((referer ? new URL(referer).searchParams.get("site") : null) ??
      process.env.SITE_DEV_HOST ??
      "")
    : header.replace(/:\d+$/, "");
  if (!host) return NextResponse.json({ error: "Site introuvable." }, { status: 404 });
  try {
    const response = await fetch(
      `${apiBase()}/api/public/sites/${encodeURIComponent(host)}/contact`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": request.headers.get("x-forwarded-for") ?? "",
        },
        body: await request.text(),
      },
    );
    return NextResponse.json(await response.json().catch(() => ({})), { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "Envoi impossible pour le moment. Appelez-nous ou réessayez plus tard." },
      { status: 502 },
    );
  }
}
