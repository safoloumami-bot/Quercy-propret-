import { maybeRunDailyJobs } from "@/server/daily-on-ping";
import { env } from "@/server/env";

export const dynamic = "force-dynamic";

/**
 * Réponse immédiate : garde le serveur éveillé (fonction planifiée Netlify reveil.mts, ou
 * flux GitHub « Réveil » pour Render). Sur Render (RUN_DAILY_ON_PING=1), lance aussi les
 * tâches quotidiennes une fois par jour, en arrière-plan.
 */
export function GET() {
  if (env().RUN_DAILY_ON_PING) void maybeRunDailyJobs();
  return new Response("ok", { headers: { "cache-control": "no-store" } });
}
