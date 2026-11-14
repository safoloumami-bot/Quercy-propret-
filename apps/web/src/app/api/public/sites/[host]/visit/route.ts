import { NextResponse } from "next/server";
import { z } from "zod";

import { recordView } from "@/server/analytics/visits";
import { findPublishedSite } from "@/server/website";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  path: z.string().max(300).default("/"),
  referrer: z.string().max(500).nullish(),
  ip: z.string().max(64).default("0.0.0.0"),
  userAgent: z.string().max(400).default(""),
});

/**
 * Visite d'un site d'entreprise, relayée par l'application des sites (sans cookie). Sert
 * uniquement aux statistiques de « Mon site » et de l'administration.
 */
export async function POST(request: Request, { params }: { params: Promise<{ host: string }> }) {
  const host = decodeURIComponent((await params).host);
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const found = await findPublishedSite(host);
  if (!found) return NextResponse.json({ ok: false }, { status: 404 });
  const ok = await recordView({
    kind: "site",
    organizationId: found.site.organizationId,
    path: parsed.data.path,
    referrer: parsed.data.referrer,
    ownHost: host,
    ip: parsed.data.ip,
    userAgent: parsed.data.userAgent,
  });
  return NextResponse.json({ ok });
}
