import {
  DOCUMENT_ALERT_DAYS,
  WORKER_DOCUMENT_KINDS,
  addDays,
  documentAlertLevel,
  labelOf,
  recordPath,
  utcDay,
  vehicleDues,
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

/**
 * Échéances des véhicules (contrôle technique, entretien à la date ou au kilométrage,
 * assurance, fin de contrat) : une alerte aux responsables par échéance, une seule fois
 * (clé retenue sur le véhicule).
 */
export async function alertVehicleDues(now: Date = new Date()): Promise<number> {
  const today = utcDay(now);
  const vehicles = await prisma.vehicle.findMany({
    where: { deletedAt: null, status: { not: "sold" } },
  });
  let sent = 0;
  const managersOf = new Map<string, string[]>();
  for (const v of vehicles) {
    const fresh = vehicleDues(v, today).filter((d) => !v.alertKeys.includes(d.key));
    if (!fresh.length) continue;
    if (!managersOf.has(v.organizationId))
      managersOf.set(v.organizationId, await cleaningManagerIds(v.organizationId));
    const recipients = managersOf.get(v.organizationId)!;
    const name = `${v.plate}${v.model ? ` (${v.model})` : ""}`;
    if (recipients.length)
      await prisma.notification.createMany({
        data: fresh.flatMap((due) =>
          recipients.map((userId) => ({
            organizationId: v.organizationId,
            userId,
            type: "vehicle.due",
            title: `${due.label} : ${name}`,
            body: due.date
              ? `${due.overdue ? "Dépassé depuis le" : "Prévu le"} ${due.date.toLocaleDateString(
                  "fr-FR",
                  { dateStyle: "long", timeZone: "UTC" },
                )}.`
              : `Kilométrage atteint (${(v.mileage ?? 0).toLocaleString("fr-FR")} km).`,
            url: recordPath("vehicle", v.id),
          })),
        ),
      });
    await prisma.vehicle.update({
      where: { id: v.id },
      // On ne garde que les clés encore d'actualité (une nouvelle date réarme l'alerte).
      data: { alertKeys: vehicleDues(v, today).map((d) => d.key) },
    });
    sent += fresh.length;
  }
  return sent;
}
