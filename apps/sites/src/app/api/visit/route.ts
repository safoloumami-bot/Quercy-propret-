import { NextResponse } from "next/server";

import { apiBase } from "@/lib/api";
import { siteHostOf } from "@/lib/request-site";

/** Relaie une visite au logiciel (statistiques de « Mon site », sans cookie). */
export async function POST(request: Request) {
  const host = siteHostOf(request);
  if (!host) return NextResponse.json({ ok: false }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as { path?: unknown; referrer?: unknown };
  const ip =
    request.headers.get("x-nf-client-connection-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "0.0.0.0";
  try {
    const response = await fetch(
      `${apiBase()}/api/public/sites/${encodeURIComponent(host)}/visit`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: typeof body.path === "string" ? body.path.slice(0, 300) : "/",
          referrer: typeof body.referrer === "string" ? body.referrer.slice(0, 500) : null,
          ip,
          userAgent: request.headers.get("user-agent") ?? "",
        }),
      },
    );
    return NextResponse.json({ ok: response.ok }, { status: response.ok ? 200 : 502 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
