import "server-only";

import { DAILY_JOBS, runDailyJob } from "@quercy/jobs";
import { prisma } from "@quercy/db";

import { env } from "./env";

/** Heure (UTC) à partir de laquelle les tâches du jour peuvent partir : 6 h ou 7 h à Paris. */
const START_HOUR_UTC = 5;
const KEY = "daily-jobs";

/**
 * Hébergement sans tâche planifiée (Render) : le signal de réveil, envoyé toutes les
 * 10 minutes, lance aussi les tâches quotidiennes une seule fois par jour. Une seule instance
 * gagne la journée (mise à jour conditionnelle en base), les autres ne font rien.
 */
export async function claimDailyRun(now: Date = new Date()): Promise<boolean> {
  if (now.getUTCHours() < START_HOUR_UTC) return false;
  const today = now.toISOString().slice(0, 10);
  const rows = await prisma.$queryRaw<{ key: string }[]>`
    INSERT INTO platform_state ("key", "value", "updatedAt") VALUES (${KEY}, ${today}, now())
    ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = now()
    WHERE platform_state."value" < EXCLUDED."value"
    RETURNING "key"`;
  return rows.length > 0;
}

export async function maybeRunDailyJobs(): Promise<void> {
  try {
    if (!(await claimDailyRun())) return;
    for (const job of DAILY_JOBS) {
      const started = Date.now();
      try {
        await runDailyJob(job, env().APP_URL);
        console.info(
          JSON.stringify({ level: "info", msg: "cron.done", job, ms: Date.now() - started }),
        );
      } catch (error) {
        console.error(
          JSON.stringify({ level: "error", msg: "cron.failed", job, error: String(error) }),
        );
      }
    }
  } catch (error) {
    console.error(
      JSON.stringify({ level: "error", msg: "cron.claim_failed", error: String(error) }),
    );
  }
}
