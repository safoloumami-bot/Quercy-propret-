import { NextResponse } from "next/server";

import { redis } from "@/lib/redis";
import { DEV_MAILBOX_KEY, type DevMail } from "@/server/email/send";
import { devMailboxEnabled } from "@/server/env";

export const dynamic = "force-dynamic";

/**
 * Boîte de réception de développement : derniers emails « envoyés » sans Resend.
 * Active uniquement si ENABLE_DEV_MAILBOX=true ET sans RESEND_API_KEY (404 sinon).
 * Filtre facultatif : ?to=adresse
 */
export async function GET(request: Request) {
  if (!devMailboxEnabled()) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  const to = new URL(request.url).searchParams.get("to")?.toLowerCase();
  if (redis.status === "wait" || redis.status === "end") await redis.connect();
  const raw = await redis.lrange(DEV_MAILBOX_KEY, 0, 99);
  const mails = raw
    .map((r) => JSON.parse(r) as DevMail)
    .filter((m) => !to || m.to.toLowerCase() === to);
  return NextResponse.json({ mails });
}
