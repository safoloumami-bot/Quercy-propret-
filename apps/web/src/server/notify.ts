import "server-only";

import { prisma } from "@quercy/db";

import { publish } from "./realtime";

/** Crée une notification dans l'application pour chaque destinataire (sauf l'auteur). */
export async function notify(params: {
  organizationId: string;
  userIds: string[];
  actorId: string;
  type: string;
  title: string;
  body?: string;
  url?: string;
}): Promise<void> {
  const recipients = [...new Set(params.userIds)].filter((id) => id !== params.actorId);
  if (recipients.length === 0) return;
  await prisma.notification.createMany({
    data: recipients.map((userId) => ({
      organizationId: params.organizationId,
      userId,
      actorId: params.actorId,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      url: params.url ?? null,
    })),
  });
  for (const userId of recipients)
    await publish(params.organizationId, { type: "notification", userId });
}
