import { WEBHOOK_QUEUE, deliverWebhook, isDailyJob, runDailyJob } from "@quercy/jobs";
import { closeMailer } from "@quercy/mailer";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

/**
 * Worker Quercy : tâches planifiées et en file d'attente (BullMQ sur Redis).
 * Se déploie séparément de l'application web (Railway, Fly…), en une ou plusieurs instances.
 */
const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});
export const MAINTENANCE_QUEUE = "maintenance";

const queue = new Queue(MAINTENANCE_QUEUE, { connection });

// Planification idempotente : chaque démarrage met à jour la même tâche récurrente.
await queue.upsertJobScheduler(
  "purge-trash-daily",
  { pattern: "15 3 * * *", tz: "Europe/Paris" },
  {
    name: "purge-trash",
    opts: {
      removeOnComplete: 100,
      removeOnFail: 500,
      attempts: 3,
      backoff: { type: "exponential", delay: 60_000 },
    },
  },
);

// Ventes : factures récurrentes, retards, expiration des devis et relances, chaque matin.
await queue.upsertJobScheduler(
  "sales-daily",
  { pattern: "0 7 * * *", tz: "Europe/Paris" },
  {
    name: "sales-daily",
    opts: {
      removeOnComplete: 100,
      removeOnFail: 500,
      attempts: 3,
      backoff: { type: "exponential", delay: 300_000 },
    },
  },
);

// Rapports programmés (lundi pour l'hebdomadaire, 1er du mois pour le mensuel).
await queue.upsertJobScheduler(
  "reports-daily",
  { pattern: "30 7 * * *", tz: "Europe/Paris" },
  {
    name: "reports-daily",
    opts: {
      removeOnComplete: 100,
      removeOnFail: 500,
      attempts: 3,
      backoff: { type: "exponential", delay: 300_000 },
    },
  },
);

/** URL publique de l'application (liens des emails envoyés par le worker). */
const appUrl =
  process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const worker = new Worker(
  MAINTENANCE_QUEUE,
  async (job) => {
    if (!isDailyJob(job.name)) throw new Error(`Tâche inconnue : ${job.name}`);
    return runDailyJob(job.name, appUrl);
  },
  { connection, concurrency: 2 },
);

// Webhooks sortants : livraisons signées, avec nouvelles tentatives.
const webhookWorker = new Worker(
  WEBHOOK_QUEUE,
  async (job) => deliverWebhook((job.data as { deliveryId: string }).deliveryId),
  { connection, concurrency: 5 },
);
webhookWorker.on("failed", (job, error) => {
  console.error(
    JSON.stringify({ level: "warn", msg: "webhook.failed", id: job?.id, error: error.message }),
  );
});

worker.on("completed", (job, result) => {
  console.info(
    JSON.stringify({ level: "info", msg: "job.completed", job: job.name, id: job.id, result }),
  );
});
worker.on("failed", (job, error) => {
  console.error(
    JSON.stringify({
      level: "error",
      msg: "job.failed",
      job: job?.name,
      id: job?.id,
      error: error.message,
    }),
  );
});

console.info(
  JSON.stringify({
    level: "info",
    msg: "worker.ready",
    queues: [MAINTENANCE_QUEUE, WEBHOOK_QUEUE],
  }),
);

async function shutdown() {
  await worker.close();
  await webhookWorker.close();
  await queue.close();
  await connection.quit();
  await closeMailer();
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
