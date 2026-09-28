import { isDailyJob, runDailyJob } from "@quercy/jobs";

import { isCronRequest } from "@/server/cron";
import { env } from "@/server/env";

export const dynamic = "force-dynamic";
export const maxDuration = 26;

/**
 * Tâches quotidiennes sans worker (hébergement Netlify) : appelées chaque matin par la
 * fonction planifiée netlify/functions/daily.mts, avec un jeton secret.
 */
export async function POST(request: Request, { params }: { params: Promise<{ job: string }> }) {
  if (!isCronRequest(request)) return Response.json({ error: "Non autorisé." }, { status: 401 });
  const { job } = await params;
  if (!isDailyJob(job)) return Response.json({ error: "Tâche inconnue." }, { status: 404 });
  const started = Date.now();
  try {
    const result = await runDailyJob(job, env().APP_URL);
    console.info(
      JSON.stringify({ level: "info", msg: "cron.done", job, ms: Date.now() - started }),
    );
    return Response.json({ job, result });
  } catch (error) {
    console.error(
      JSON.stringify({ level: "error", msg: "cron.failed", job, error: String(error) }),
    );
    return Response.json({ job, error: "La tâche a échoué." }, { status: 500 });
  }
}
