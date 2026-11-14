import { NextResponse } from "next/server";

import { apiBase } from "@/lib/api";
import { siteHostOf } from "@/lib/request-site";

/** Relaie le formulaire de contact vers le logiciel, pour le site de ce nom d'hôte. */
export async function POST(request: Request) {
  const host = siteHostOf(request);
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
