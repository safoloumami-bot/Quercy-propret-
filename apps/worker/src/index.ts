import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

import { purgeTrash } from "./jobs/purge-trash";

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

const worker = new Worker(
  MAINTENANCE_QUEUE,
  async (job) => {
    switch (job.name) {
      case "purge-trash":
        return purgeTrash();
      default:
        throw new Error(`Tâche inconnue : ${job.name}`);
    }
  },
  { connection, concurrency: 2 },
);

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

console.info(JSON.stringify({ level: "info", msg: "worker.ready", queues: [MAINTENANCE_QUEUE] }));

async function shutdown() {
  await worker.close();
  await queue.close();
  await connection.quit();
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
