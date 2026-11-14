import {
  ABSENCE_KINDS,
  type CandidateAgent,
  addDays,
  dayKey,
  labelOf,
  parseDay,
  rankReplacements,
} from "@quercy/core";
import { prisma } from "@quercy/db";
import { cleaningManagerIds } from "@quercy/jobs";

const frDay = (d: Date) =>
  d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });

export function absenceSummary(a: { kind: string; startDate: Date; endDate: Date }): string {
  const range =
    a.startDate.getTime() === a.endDate.getTime()
      ? `le ${frDay(a.startDate)}`
      : `du ${frDay(a.startDate)} au ${frDay(a.endDate)}`;
  return `${labelOf(ABSENCE_KINDS, a.kind)} ${range}`;
}

/**
 * Enregistre une absence. Demandée par l'agent, elle attend la validation du chef (qui est
 * prévenu) ; saisie par un responsable, elle est validée d'office.
 */
export async function recordAbsence(input: {
  organizationId: string;
  userId: string;
  kind: string;
  start: string;
  end: string;
  comment?: string | null;
  source: "app" | "software";
  requestedById: string;
  approved: boolean;
}) {
  const absence = await prisma.absence.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId,
      kind: input.kind,
      startDate: parseDay(input.start),
      endDate: parseDay(input.end),
      comment: input.comment?.trim() || null,
      source: input.source,
      requestedById: input.requestedById,
      status: input.approved ? "approved" : "requested",
      ...(input.approved ? { decidedById: input.requestedById, decidedAt: new Date() } : {}),
    },
    include: { user: { select: { name: true } } },
  });
  if (!input.approved) {
    const managers = (await cleaningManagerIds(input.organizationId)).filter(
      (id) => id !== input.requestedById,
    );
    if (managers.length)
      await prisma.notification.createMany({
        data: managers.map((userId) => ({
          organizationId: input.organizationId,
          userId,
          actorId: input.requestedById,
          type: "absence.requested",
          title: `Absence à valider : ${absence.user.name}`,
          body: [absenceSummary(absence), absence.comment].filter(Boolean).join(" — "),
          url: `/nettoyage/absences?id=${absence.id}`,
        })),
      });
    return { absence, notified: managers };
  }
  return { absence, notified: [] as string[] };
}

/**
 * Passages touchés par une absence (l'agent est prévu ou remplaçant, non réalisés), avec pour
 * chacun les propositions de remplacement dans l'ordre.
 */
export async function absenceImpact(
  organizationId: string,
  absence: { userId: string; startDate: Date; endDate: Date },
) {
  const visits = await prisma.intervention.findMany({
    where: {
      organizationId,
      deletedAt: null,
      date: { gte: absence.startDate, lte: absence.endDate },
      status: { in: ["planned", "rescheduled"] },
      checkInAt: null,
      OR: [
        { replacementAgentId: absence.userId },
        { ownerId: absence.userId, replacementAgentId: null },
      ],
    },
    include: {
      site: { select: { id: true, name: true, code: true } },
      serviceLine: { select: { activity: true } },
      replacementAgent: { select: { name: true } },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
  if (visits.length === 0) return [];
  const from = absence.startDate;
  const to = absence.endDate;
  const [members, profiles, absences, busy, history] = await Promise.all([
    prisma.membership.findMany({
      where: { organizationId, deletedAt: null },
      select: { user: { select: { id: true, name: true } } },
    }),
    prisma.workerProfile.findMany({ where: { organizationId } }),
    prisma.absence.findMany({
      where: {
        organizationId,
        status: "approved",
        startDate: { lte: to },
        endDate: { gte: from },
      },
    }),
    prisma.intervention.findMany({
      where: {
        organizationId,
        deletedAt: null,
        date: { gte: from, lte: to },
        status: { notIn: ["cancelled", "done"] },
      },
      select: {
        date: true,
        startTime: true,
        durationMinutes: true,
        ownerId: true,
        replacementAgentId: true,
      },
    }),
    prisma.intervention.findMany({
      where: {
        organizationId,
        deletedAt: null,
        siteId: { in: [...new Set(visits.map((v) => v.siteId).filter((s): s is string => !!s))] },
        date: { gte: addDays(from, -120), lt: from },
      },
      select: { siteId: true, ownerId: true, actualAgentId: true, replacementAgentId: true },
    }),
  ]);
  const profileOf = new Map(profiles.map((p) => [p.userId, p]));
  const agents: CandidateAgent[] = members.map(({ user }) => {
    const absentDays = new Set<string>();
    for (const a of absences.filter((x) => x.userId === user.id))
      for (let d = a.startDate; d <= a.endDate; d = addDays(d, 1)) absentDays.add(dayKey(d));
    return {
      id: user.id,
      name: user.name,
      kind: profileOf.get(user.id)?.kind ?? "employee",
      activities: profileOf.get(user.id)?.activities ?? [],
      absentDays,
      busy: busy
        .filter((b) => (b.replacementAgentId ?? b.ownerId) === user.id)
        .map((b) => ({
          day: dayKey(b.date),
          startTime: b.startTime,
          durationMinutes: b.durationMinutes,
        })),
      knowsSites: new Set(
        history
          .filter((h) => [h.ownerId, h.actualAgentId, h.replacementAgentId].includes(user.id))
          .map((h) => h.siteId!)
          .filter(Boolean),
      ),
    };
  });
  // Le passage de l'absent ne le rend pas « occupé » pour les autres propositions.
  const absentProfile = profileOf.get(absence.userId);
  // Passage par passage, dans l'ordre : le remplaçant retenu devient « occupé » pour les
  // passages suivants, pour ne jamais proposer la même personne à deux endroits à la fois.
  const byId = new Map(agents.map((a) => [a.id, a]));
  return visits.map((v) => {
    const slot = {
      day: dayKey(v.date),
      startTime: v.startTime,
      durationMinutes: v.durationMinutes,
      siteId: v.siteId,
      activity: v.serviceLine?.activity ?? null,
    };
    const proposals = rankReplacements(
      slot,
      {
        id: absence.userId,
        replacement1Id: absentProfile?.replacement1Id ?? null,
        replacement2Id: absentProfile?.replacement2Id ?? null,
      },
      agents,
    );
    const suggested = proposals.find((p) => !p.conflict) ?? proposals[0] ?? null;
    if (suggested)
      byId.get(suggested.agentId)?.busy.push({
        day: slot.day,
        startTime: slot.startTime,
        durationMinutes: slot.durationMinutes,
      });
    return {
      id: v.id,
      title: v.title,
      day: slot.day,
      startTime: v.startTime,
      durationMinutes: v.durationMinutes,
      site: v.site,
      currentReplacement:
        v.replacementAgentId === absence.userId ? null : (v.replacementAgent?.name ?? null),
      proposals,
      suggestedAgentId: suggested?.agentId ?? null,
    };
  });
}
