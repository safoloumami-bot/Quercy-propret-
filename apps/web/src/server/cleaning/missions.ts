import { dueLookbackStart, parseDay, taskDue, todayIn } from "@quercy/core";
import { prisma } from "@quercy/db";

/** Tâche prévue pour un passage (avant d'être enregistrée comme point de contrôle). */
export interface PlannedTask {
  area: string;
  label: string;
  critical: boolean;
  frequency: string | null;
  photoRequired: boolean;
}

const SHEET_INCLUDE = { tasks: { orderBy: { sortOrder: "asc" } } } as const;

/**
 * Fiche mission d'un passage : celle de sa prestation si elle existe, sinon celle du site
 * (toutes prestations).
 */
export async function missionSheetFor(
  organizationId: string,
  target: { siteId: string | null; serviceLineId: string | null },
) {
  if (!target.siteId) return null;
  const sheets = await prisma.missionSheet.findMany({
    where: {
      organizationId,
      siteId: target.siteId,
      archivedAt: null,
      OR: [
        { serviceLineId: null },
        ...(target.serviceLineId ? [{ serviceLineId: target.serviceLineId }] : []),
      ],
    },
    include: SHEET_INCLUDE,
  });
  return (
    sheets.find((s) => s.serviceLineId && s.serviceLineId === target.serviceLineId) ??
    sheets.find((s) => !s.serviceLineId) ??
    null
  );
}

export type MissionSheetRow = NonNullable<Awaited<ReturnType<typeof missionSheetFor>>>;

/**
 * Tâches dues pour ce passage d'après la fiche mission : toutes celles « à chaque passage »,
 * et les hebdomadaires, mensuelles ou trimestrielles si c'est la première visite de la période.
 */
export async function dueMissionTasks(
  organizationId: string,
  sheet: MissionSheetRow,
  visit: { id: string; siteId: string | null; date: Date },
): Promise<PlannedTask[]> {
  const previous = await prisma.intervention.findMany({
    where: {
      organizationId,
      siteId: visit.siteId,
      id: { not: visit.id },
      deletedAt: null,
      status: { not: "cancelled" },
      date: { gte: dueLookbackStart(visit.date), lt: visit.date },
      ...(sheet.serviceLineId ? { serviceLineId: sheet.serviceLineId } : {}),
    },
    select: { date: true },
  });
  const days = previous.map((p) => p.date);
  return sheet.tasks
    .filter((t) => taskDue(t.frequency, visit.date, days))
    .map((t) => ({
      area: t.zone,
      label: t.label,
      critical: t.critical,
      frequency: t.frequency,
      photoRequired: t.photoRequired,
    }));
}

/**
 * Après modification d'une fiche : les passages à venir, pas encore commencés et dont les
 * points de contrôle sont intacts, prendront la nouvelle version (points recréés à
 * l'ouverture). Les passages commencés gardent la version avec laquelle ils ont été faits.
 */
export async function refreshUpcomingVisits(
  organizationId: string,
  sheet: { id: string; siteId: string; serviceLineId: string | null },
): Promise<number> {
  const today = parseDay(todayIn());
  const visits = await prisma.intervention.findMany({
    where: {
      organizationId,
      siteId: sheet.siteId,
      ...(sheet.serviceLineId ? { serviceLineId: sheet.serviceLineId } : {}),
      deletedAt: null,
      status: "planned",
      checkInAt: null,
      date: { gte: today },
      tasks: { some: {}, none: { OR: [{ done: true }, { reason: { not: null } }] } },
    },
    select: { id: true },
  });
  if (visits.length === 0) return 0;
  const ids = visits.map((v) => v.id);
  await prisma.$transaction([
    prisma.interventionTask.deleteMany({ where: { interventionId: { in: ids } } }),
    prisma.interventionConsumable.deleteMany({
      where: {
        interventionId: { in: ids },
        intervention: { consumables: { none: { quantity: { gt: 0 } } } },
      },
    }),
    prisma.intervention.updateMany({
      where: { id: { in: ids } },
      data: { missionSheetId: null, missionVersion: null },
    }),
  ]);
  return ids.length;
}
