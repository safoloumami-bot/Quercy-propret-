import { timingSafeEqual } from "node:crypto";

import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

/** Appelé par le logiciel à chaque publication : le site se met à jour tout de suite. */
export async function POST(request: Request) {
  const secret = process.env.SITES_REVALIDATE_SECRET ?? "";
  const given = request.headers.get("x-revalidate-secret") ?? "";
  const ok =
    secret.length >= 16 &&
    given.length === secret.length &&
    timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { hosts?: unknown };
  const hosts = Array.isArray(body.hosts)
    ? body.hosts.filter((h): h is string => typeof h === "string").slice(0, 20)
    : [];
  for (const host of hosts) revalidateTag(`site:${host.toLowerCase()}`);
  return NextResponse.json({ revalidated: hosts.length });
}
