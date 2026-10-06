import {
  DOCUMENT_ALERT_DAYS,
  WORKER_DOCUMENT_KINDS,
  addDays,
  documentAlertLevel,
  labelOf,
  utcDay,
} from "@quercy/core";
import { prisma } from "@quercy/db";

import { cleaningManagerIds } from "./anomalies";

/**
 * Attestations des intervenants (URSSAF, assurance…) : une alerte aux responsables 30 jours
 * avant l'expiration, puis une à l'expiration. Chaque niveau n'est signalé qu'une fois.
 */
export async function alertWorkerDocuments(now: Date = new Date()): Promise<number> {
  const today = utcDay(now);
  const docs = await prisma.workerDocument.findMany({
    where: { expiresAt: { not: null, lte: addDays(today, DOCUMENT_ALERT_DAYS) } },
    include: { profile: { select: { user: { select: { name: true } } } } },
  });
  let sent = 0;
  const managersOf = new Map<string, string[]>();
  for (const doc of docs) {
    const level = documentAlertLevel(doc.expiresAt, today);
    if (!level || doc.alertLevel === level) continue;
    if (!managersOf.has(doc.organizationId))
      managersOf.set(doc.organizationId, await cleaningManagerIds(doc.organizationId));
    const recipients = managersOf.get(doc.organizationId)!;
    const what = `${labelOf(WORKER_DOCUMENT_KINDS, doc.kind)} de ${doc.profile.user.name}`;
    const when = doc.expiresAt!.toLocaleDateString("fr-FR", { dateStyle: "long", timeZone: "UTC" });
    if (recipients.length)
      await prisma.notification.createMany({
        data: recipients.map((userId) => ({
          organizationId: doc.organizationId,
          userId,
          type: "worker.document_expiring",
          title: level === "expired" ? `${what} : expirée` : `${what} : expire bientôt`,
          body: level === "expired" ? `Expirée depuis le ${when}.` : `Expire le ${when}.`,
          url: "/nettoyage/intervenants",
        })),
      });
    await prisma.workerDocument.update({
      where: { id: doc.id },
      data: { alertLevel: level, alertedAt: now },
    });
    sent++;
  }
  return sent;
}
