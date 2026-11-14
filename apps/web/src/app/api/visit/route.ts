import { NextResponse } from "next/server";
import { z } from "zod";

import { clientIp, recordView } from "@/server/analytics/visits";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ path: z.string().max(300), referrer: z.string().max(500).nullish() });

/** Page du logiciel ouverte (statistiques d'usage de l'administration, sans cookie). */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const ok = await recordView({
    kind: "app",
    organizationId: null,
    path: parsed.data.path,
    referrer: parsed.data.referrer,
    ownHost: new URL(request.url).hostname,
    ip: clientIp(request.headers),
    userAgent: request.headers.get("user-agent") ?? "",
  });
  return NextResponse.json({ ok });
}
