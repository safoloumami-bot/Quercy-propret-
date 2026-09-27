import "server-only";

import Redis from "ioredis";

import { redis } from "@/lib/redis";

/** Événements temps réel diffusés aux navigateurs d'un espace (Server-Sent Events). */
export type RealtimeEvent =
  | { type: "record.changed"; entity: string; ids: string[]; actorId: string }
  | { type: "comment.changed"; entity: string; id: string; actorId: string }
  | { type: "notification"; userId: string };

export function orgChannel(organizationId: string) {
  return `realtime:org:${organizationId}`;
}

/** Publie un événement (au mieux : l'absence de Redis ne bloque jamais l'action). */
export async function publish(organizationId: string, event: RealtimeEvent): Promise<void> {
  try {
    if (redis.status === "wait" || redis.status === "end") await redis.connect();
    await redis.publish(orgChannel(organizationId), JSON.stringify(event));
  } catch (error) {
    console.error(
      JSON.stringify({ level: "warn", msg: "realtime.publish_failed", error: String(error) }),
    );
  }
}

/** Connexion Redis dédiée à un abonnement (une connexion abonnée ne peut rien faire d'autre). */
export function subscriber(): Redis {
  return new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null,
  });
}

const PRESENCE_TTL_SECONDS = 45;

/** Présence sur une fiche : battement toutes les 20 s, visible 45 s. Renvoie les personnes présentes. */
export async function heartbeat(
  organizationId: string,
  key: string,
  user: { id: string; name: string },
): Promise<{ id: string; name: string }[]> {
  const hash = `presence:${organizationId}:${key}`;
  const now = Date.now();
  try {
    if (redis.status === "wait" || redis.status === "end") await redis.connect();
    await redis.hset(hash, user.id, JSON.stringify({ name: user.name, at: now }));
    await redis.expire(hash, PRESENCE_TTL_SECONDS * 2);
    const all = await redis.hgetall(hash);
    const present: { id: string; name: string }[] = [];
    for (const [id, raw] of Object.entries(all)) {
      const entry = JSON.parse(raw) as { name: string; at: number };
      if (now - entry.at <= PRESENCE_TTL_SECONDS * 1000) present.push({ id, name: entry.name });
      else await redis.hdel(hash, id);
    }
    return present;
  } catch {
    return [{ id: user.id, name: user.name }];
  }
}
