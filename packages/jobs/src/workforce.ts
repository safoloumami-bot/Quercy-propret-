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

/**
 * Contrats à l'année : à la date anniversaire, révision des prix (forfait et prix au passage
 * augmentés du taux prévu) ; à l'échéance, reconduction tacite d'un an ou fin du contrat.
 * Les responsables sont prévenus de chaque changement.
 */
export async function reviseContracts(now: Date = new Date()): Promise<number> {
  const today = utcDay(now);
  const contracts = await prisma.cleaningContract.findMany({
    where: {
      deletedAt: null,
      status: "active",
      OR: [
        { priceRevisionPct: { not: null }, nextRevisionDate: { lte: today } },
        { endDate: { lt: today } },
      ],
    },
  });
  let changed = 0;
  const managersOf = new Map<string, string[]>();
  for (const c of contracts) {
    const messages: string[] = [];
    const data: Record<string, unknown> = {};
    if (c.priceRevisionPct && c.nextRevisionDate && c.nextRevisionDate <= today) {
      const k = 1 + c.priceRevisionPct / 100;
      if (c.monthlyPriceCents) data.monthlyPriceCents = Math.round(c.monthlyPriceCents * k);
      if (c.visitPriceCents) data.visitPriceCents = Math.round(c.visitPriceCents * k);
      const next = new Date(c.nextRevisionDate);
      next.setUTCFullYear(next.getUTCFullYear() + 1);
      data.nextRevisionDate = next;
      messages.push(`Prix révisés de ${c.priceRevisionPct.toLocaleString("fr-FR")} %.`);
    }
    if (c.endDate && c.endDate < today) {
      if (c.tacitRenewal) {
        const end = new Date(c.endDate);
        end.setUTCFullYear(end.getUTCFullYear() + 1);
        data.endDate = end;
        messages.push(
          `Reconduit jusqu'au ${end.toLocaleDateString("fr-FR", { dateStyle: "long", timeZone: "UTC" })}.`,
        );
      } else {
        data.status = "ended";
        messages.push("Arrivé à échéance sans reconduction : contrat terminé.");
      }
    }
    if (!messages.length) continue;
    await prisma.cleaningContract.update({ where: { id: c.id }, data });
    if (!managersOf.has(c.organizationId))
      managersOf.set(c.organizationId, await cleaningManagerIds(c.organizationId));
    const recipients = managersOf.get(c.organizationId)!;
    if (recipients.length)
      await prisma.notification.createMany({
        data: recipients.map((userId) => ({
          organizationId: c.organizationId,
          userId,
          type: "contract.revised",
          title: `Contrat ${c.name}`,
          body: messages.join(" "),
          url: recordPath("cleaningContract", c.id),
        })),
      });
    changed++;
  }
  return changed;
}
