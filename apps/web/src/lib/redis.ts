import "server-only";

import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis?: Redis };

function createClient(): Redis {
  return new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 2_000,
    enableOfflineQueue: false,
  });
}

/** Client Redis partagé (cache, files d'attente). */
export const redis = globalForRedis.redis ?? createClient();
if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

/**
 * Vérifie la connexion Redis et renvoie la latence en millisecondes. Redis est facultatif
 * (hébergement serverless) : sans REDIS_URL en production, rien à vérifier.
 */
export async function checkRedis(): Promise<{
  ok: boolean;
  latencyMs: number;
  configured?: boolean;
  error?: string;
}> {
  if (!process.env.REDIS_URL && process.env.NODE_ENV === "production")
    return { ok: true, latencyMs: 0, configured: false };
  const start = performance.now();
  try {
    if (redis.status === "wait" || redis.status === "end") await redis.connect();
    await redis.ping();
    return { ok: true, latencyMs: Math.round(performance.now() - start) };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Math.round(performance.now() - start),
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}
