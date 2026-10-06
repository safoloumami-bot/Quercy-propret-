import { addDays, contractOccurrences, utcDay } from "@quercy/core";
import { prisma } from "@quercy/db";

import { recordInterventionEvents } from "./events";

/** Horizon de planification : interventions créées pour les 3 prochaines semaines. */
export const PLANNING_HORIZON_DAYS = 21;
/** Une intervention encore « planifiée » 2 jours après sa date passe « non réalisée ». */
const MISSED_AFTER_DAYS = 2;

export interface CleaningDailyResult {
  contracts: number;
  created: number;
  missed: number;
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
  const planned = await generateInterventions({ now });
  const forgotten = await prisma.intervention.findMany({
    where: {
      deletedAt: null,
      status: "planned",
      date: { lt: addDays(utcDay(now), -MISSED_AFTER_DAYS) },
    },
    select: { id: true, organizationId: true },
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
  return { ...planned, missed: missed.count };
}
