import "server-only";

import { type AutomationTrigger, type EntityKey, eventName } from "@quercy/core";
import { type Prisma, prisma } from "@quercy/db";
import { deliverWebhook } from "@quercy/jobs";
import { Queue } from "bullmq";
import IORedis from "ioredis";

export const WEBHOOK_QUEUE = "webhooks";

let queue: Queue | null = null;
function webhookQueue(): Queue {
  queue ??= new Queue(WEBHOOK_QUEUE, {
    connection: new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: null,
    }),
  });
  return queue;
}

/**
 * Crée une livraison par webhook abonné et la confie au worker (nouvelles tentatives incluses),
 * ou la livre tout de suite quand aucun Redis n'est configuré.
 */
export async function enqueueDeliveries(
  organizationId: string,
  event: string,
  data: unknown,
  onlyWebhookId?: string,
): Promise<number> {
  const hooks = await prisma.webhook.findMany({
    where: {
      organizationId,
      ...(onlyWebhookId ? { id: onlyWebhookId } : { active: true, events: { has: event } }),
    },
    select: { id: true },
  });
  for (const hook of hooks) {
    const delivery = await prisma.webhookDelivery.create({
      data: {
        webhookId: hook.id,
        event,
        payload: {
          event,
          occurredAt: new Date().toISOString(),
          organizationId,
          data,
        } as Prisma.InputJsonValue,
      },
    });
    // Sans Redis (hébergement Netlify) : livraison immédiate, une seule tentative.
    if (!process.env.REDIS_URL) {
      await deliverWebhook(delivery.id).catch(() => undefined);
      continue;
    }
    try {
      await webhookQueue().add(
        "deliver",
        { deliveryId: delivery.id },
        {
          attempts: 5,
          backoff: { type: "exponential", delay: 30_000 },
          removeOnComplete: 500,
          removeOnFail: 1000,
        },
      );
    } catch (error) {
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: { status: "failed", error: "File d'attente indisponible." },
      });
      console.error(
        JSON.stringify({ level: "error", msg: "webhook.enqueue", error: String(error) }),
      );
    }
  }
  return hooks.length;
}

export function webhookEvent(entity: EntityKey, trigger: AutomationTrigger) {
  return eventName(entity, trigger);
}
