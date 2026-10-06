import {
  addDays,
  contractOccurrences,
  contractSlotKey,
  detectPointageAnomalies,
  utcDay,
} from "@quercy/core";
import { prisma } from "@quercy/db";

import { type AnomalyInput, reportAnomalies } from "./anomalies";
import { recordInterventionEvents } from "./events";
import { alertVehicleDues, alertWorkerDocuments } from "./workforce";
import { generateSeriesInterventions } from "./recurrence";

/** Horizon de planification : interventions créées pour les 3 prochaines semaines. */
export const PLANNING_HORIZON_DAYS = 21;
/** Une intervention encore « planifiée » 2 jours après sa date passe « non réalisée ». */
const MISSED_AFTER_DAYS = 2;

export interface CleaningDailyResult {
  contracts: number;
  created: number;
  missed: number;
  anomalies: number;
  documentAlerts: number;
  vehicleAlerts: number;
}

/**
 * Crée les interventions des contrats d'entretien en cours jusqu'à l'horizon, sans doublon
 * (une intervention par contrat et par jour). Limité à un espace ou à des contrats si demandé.
 */
export async function generateInterventions(
  options: { organizationId?: string; contractIds?: string[]; now?: Date; days?: number } = {},
): Promise<{ contracts: number; created: number }> {
  const today = utcDay(options.now ?? new Date());
  const horizon = addDays(today, options.days ?? PLANNING_HORIZON_DAYS);
  const contracts = await prisma.cleaningContract.findMany({
    where: {
      deletedAt: null,
      status: "active",
      ...(options.organizationId ? { organizationId: options.organizationId } : {}),
      ...(options.contractIds ? { id: { in: options.contractIds } } : {}),
      site: { deletedAt: null },
      // Un contrat dont une prestation a une série active est planifié par ses séries.
      serviceLines: { none: { series: { some: { status: "active" } } } },
    },
    include: { site: { select: { name: true, companyId: true } } },
  });
  let created = 0;
  for (const contract of contracts) {
    const days = contractOccurrences(contract, today, horizon);
    if (days.length > 0) {
      const result = await prisma.intervention.createMany({
        data: days.map((date) => ({
          organizationId: contract.organizationId,
          title: `Entretien — ${contract.site.name}`,
          siteId: contract.siteId,
          contractId: contract.id,
          companyId: contract.companyId ?? contract.site.companyId,
          ownerId: contract.agentId,
          date,
          startTime: contract.startTime,
          durationMinutes: contract.durationMinutes,
          slotKey: contractSlotKey(contract.id, date),
        })),
        skipDuplicates: true,
      });
      created += result.count;
    }
    await prisma.cleaningContract.update({
      where: { id: contract.id },
      data: { generatedUntil: horizon },
    });
  }
  return { contracts: contracts.length, created };
}

/** Tâche quotidienne : planning des contrats et interventions oubliées. */
export async function runCleaningDaily(now: Date = new Date()): Promise<CleaningDailyResult> {
  const legacy = await generateInterventions({ now });
  const fromSeries = await generateSeriesInterventions({ now });
  const planned = {
    contracts: legacy.contracts + fromSeries.series,
    created: legacy.created + fromSeries.created,
  };
  const forgotten = await prisma.intervention.findMany({
    where: {
      deletedAt: null,
      status: "planned",
      date: { lt: addDays(utcDay(now), -MISSED_AFTER_DAYS) },
    },
    select: { id: true, organizationId: true, siteId: true, title: true, date: true },
  });
  const missed = await prisma.intervention.updateMany({
    where: { id: { in: forgotten.map((i) => i.id) }, status: "planned" },
    data: { status: "missed" },
  });
  await recordInterventionEvents(
    forgotten.map((i) => ({
      organizationId: i.organizationId,
      interventionId: i.id,
      type: "missed" as const,
      metadata: { source: "tâche quotidienne" },
    })),
  );
  const anomalies = await detectAnomalies(now, forgotten);
  const documentAlerts = await alertWorkerDocuments(now);
  const vehicleAlerts = await alertVehicleDues(now);
  return { ...planned, missed: missed.count, anomalies, documentAlerts, vehicleAlerts };
}

/** Fenêtre de rattrapage des anomalies de pointage (pointages synchronisés en retard). */
const DETECTION_WINDOW_DAYS = 3;

/**
 * Anomalies automatiques : passages non réalisés, pointages hors créneau ou de durée
 * anormale, contrôles qualité non conformes. Sans doublon (clé par intervention ou contrôle).
 */
export async function detectAnomalies(
  now: Date,
  missedVisits: {
    id: string;
    organizationId: string;
    siteId: string | null;
    title: string;
    date: Date;
  }[] = [],
  options: { organizationId?: string } = {},
): Promise<number> {
  const since = addDays(utcDay(now), -DETECTION_WINDOW_DAYS);
  const org = options.organizationId ? { organizationId: options.organizationId } : {};
  const inputs: AnomalyInput[] = missedVisits.map((i) => ({
    organizationId: i.organizationId,
    type: "missed_visit",
    source: "system",
    siteId: i.siteId,
    interventionId: i.id,
    comment: `${i.title} — prévu le ${i.date.toISOString().slice(0, 10)}, jamais pointé.`,
    severity: "high",
    dedupeKey: `manque:${i.id}`,
  }));
  const pointed = await prisma.intervention.findMany({
    where: { ...org, deletedAt: null, checkInAt: { gte: since } },
    select: {
      id: true,
      organizationId: true,
      siteId: true,
      date: true,
      startTime: true,
      durationMinutes: true,
      checkInAt: true,
      checkOutAt: true,
      series: { select: { timezone: true } },
    },
  });
  for (const i of pointed)
    for (const found of detectPointageAnomalies(i, i.series?.timezone ?? "Europe/Paris"))
      inputs.push({
        organizationId: i.organizationId,
        source: "system",
        siteId: i.siteId,
        interventionId: i.id,
        ...found,
      });
  const failed = await prisma.inspection.findMany({
    where: { ...org, deletedAt: null, result: "non_compliant", date: { gte: since } },
    select: { id: true, organizationId: true, siteId: true, title: true, score: true },
  });
  for (const c of failed)
    inputs.push({
      organizationId: c.organizationId,
      type: "inspection_failed",
      source: "inspection",
      siteId: c.siteId,
      comment: `${c.title} — note ${c.score ?? 0} %.`,
      severity: "high",
      dedupeKey: `controle:${c.id}`,
    });
  const reported = await reportAnomalies(inputs);
  return reported.filter((r) => r.created).length;
}
