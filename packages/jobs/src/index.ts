import { runDailySales } from "@quercy/documents";
import { dispatchScheduledReports } from "@quercy/reports";

import { runCleaningDaily } from "./cleaning";
import { purgeTrash } from "./purge-trash";

export {
  PLANNING_HORIZON_DAYS,
  detectAnomalies,
  generateInterventions,
  runCleaningDaily,
  type CleaningDailyResult,
} from "./cleaning";
export { purgeTrash, TRASH_RETENTION_DAYS, type PurgeResult } from "./purge-trash";
export {
  SERIES_HORIZON_DAYS,
  clearUntouchedFuture,
  generateSeriesInterventions,
  type SeriesGenerationResult,
} from "./recurrence";
export {
  recordInterventionEvent,
  recordInterventionEvents,
  type InterventionEventInput,
} from "./events";
export {
  cleaningManagerIds,
  reportAnomalies,
  type AnomalyInput,
  type ReportedAnomaly,
} from "./anomalies";
export { WEBHOOK_QUEUE, decryptSecret, deliverWebhook, signPayload } from "./webhooks";

/** Tâches quotidiennes : lancées par le worker (BullMQ) ou par la route planifiée (Netlify). */
export const DAILY_JOBS = [
  "purge-trash",
  "sales-daily",
  "reports-daily",
  "cleaning-daily",
] as const;
export type DailyJob = (typeof DAILY_JOBS)[number];

export function isDailyJob(value: string): value is DailyJob {
  return (DAILY_JOBS as readonly string[]).includes(value);
}

/**
 * Exécute une tâche quotidienne.
 * - purge-trash : suppression définitive de la corbeille (plus de 30 jours) ;
 * - sales-daily : factures récurrentes, passage en retard, devis expirés, relances ;
 * - reports-daily : envoi des rapports programmés ;
 * - cleaning-daily : interventions des contrats d'entretien, passages oubliés.
 * `appUrl` sert aux liens des e-mails.
 */
export async function runDailyJob(job: DailyJob, appUrl: string): Promise<unknown> {
  switch (job) {
    case "purge-trash":
      return purgeTrash();
    case "sales-daily":
      return runDailySales(appUrl);
    case "reports-daily":
      return dispatchScheduledReports(appUrl);
    case "cleaning-daily":
      return runCleaningDaily();
  }
}
