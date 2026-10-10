import { checkDatabase } from "@quercy/db";
import { NextResponse } from "next/server";

import { checkRedis } from "@/lib/redis";

export const dynamic = "force-dynamic";

/** Page de santé : état de la base et de Redis (200 si tout va bien, 503 sinon). */
export async function GET() {
  const [database, redis] = await Promise.all([checkDatabase(), checkRedis()]);
  const ok = database.ok && redis.ok;
  if (!ok)
    console.error(JSON.stringify({ level: "error", msg: "health.degraded", database, redis }));
  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      version: process.env.npm_package_version ?? "0.1.0",
      time: new Date().toISOString(),
      checks: {
        database: { ok: database.ok, latencyMs: database.latencyMs },
        redis: { ok: redis.ok, latencyMs: redis.latencyMs, configured: redis.configured ?? true },
      },
    },
    { status: ok ? 200 : 503 },
  );
}
