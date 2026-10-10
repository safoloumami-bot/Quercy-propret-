import {
  type HolidayCalendar,
  type HolidayPolicy,
  addDays,
  occurrences,
  parseDay,
  recurrenceRuleSchema,
  seriesSlotKey,
  todayIn,
} from "@quercy/core";
import { prisma } from "@quercy/db";

/** Horizon de génération des séries : trois mois glissants. */
export const SERIES_HORIZON_DAYS = 92;

export interface SeriesGenerationResult {
  series: number;
  created: number;
}

/**
 * Crée les interventions des séries **actives** jusqu'à l'horizon. Idempotent : chaque passage
 * porte la clé de créneau (série + jour prévu par la règle), une seconde génération ne crée
 * rien. Une série proposée (import, en attente de validation) ne génère jamais rien.
 */
export async function generateSeriesInterventions(
  options: { organizationId?: string; seriesIds?: string[]; now?: Date; days?: number } = {},
): Promise<SeriesGenerationResult> {
  const series = await prisma.recurrenceSeries.findMany({
    where: {
      status: "active",
      ...(options.organizationId ? { organizationId: options.organizationId } : {}),
      ...(options.seriesIds ? { id: { in: options.seriesIds } } : {}),
      serviceLine: { status: "active", site: { deletedAt: null } },
    },
    include: {
      versions: true,
      serviceLine: {
        include: {
          site: { select: { name: true, companyId: true, closures: true } },
          contract: { select: { companyId: true, status: true, endDate: true } },
        },
      },
    },
  });
  let created = 0;
  for (const s of series) {
    const line = s.serviceLine;
    if (line.contract.status !== "active") continue;
    const today = todayIn(s.timezone, options.now);
    let horizon = addDays(parseDay(today), options.days ?? SERIES_HORIZON_DAYS);
    if (line.contract.endDate && line.contract.endDate < horizon) horizon = line.contract.endDate;
    const versions = s.versions.flatMap((v) => {
      const rule = recurrenceRuleSchema.safeParse(v.rule);
      return rule.success ? [{ ...v, rule: rule.data }] : [];
    });
    const byNumber = new Map(versions.map((v) => [v.version, v]));
    const list = occurrences({
      versions,
      from: today,
      to: horizon,
      holidayPolicy: s.holidayPolicy as HolidayPolicy,
      calendar: s.holidayCalendar as HolidayCalendar,
      closures: line.site.closures,
    });
    if (list.length > 0) {
      const result = await prisma.intervention.createMany({
        data: list.map((o) => {
          const v = byNumber.get(o.version)!;
          return {
            organizationId: s.organizationId,
            title: `${line.name} — ${line.site.name}`,
            siteId: line.siteId,
            contractId: line.contractId,
            companyId: line.contract.companyId ?? line.site.companyId,
            serviceLineId: line.id,
            seriesId: s.id,
            ruleVersionId: v.id,
            ownerId: v.plannedAgentId ?? line.plannedAgentId,
            date: parseDay(o.date),
            startTime: v.startTime ?? line.startTime,
            durationMinutes: v.durationMinutes ?? line.durationMinutes,
            slotKey: seriesSlotKey(s.id, o.slotDate),
            originalPlannedDate: o.movedForHoliday ? parseDay(o.slotDate) : null,
          };
        }),
        skipDuplicates: true,
      });
      created += result.count;
    }
    await prisma.recurrenceSeries.update({
      where: { id: s.id },
      data: { generatedUntil: horizon },
    });
  }
  return { series: series.length, created };
}

/**
 * Retire les passages futurs **intacts** d'une série à partir d'un jour (nouvelle version,
 * fermeture, changement de règle) : planifiés, jamais commencés, sans journal. Les passages
 * réalisés, commencés, déplacés à la main ou documentés ne sont jamais touchés.
 */
export async function clearUntouchedFuture(seriesId: string, fromDay: Date): Promise<number> {
  const result = await prisma.intervention.deleteMany({
    where: {
      seriesId,
      date: { gte: fromDay },
      status: "planned",
      checkInAt: null,
      reportNumber: null,
      events: { none: {} },
      proofs: { none: {} },
      anomalies: { none: {} },
    },
  });
  return result.count;
}
