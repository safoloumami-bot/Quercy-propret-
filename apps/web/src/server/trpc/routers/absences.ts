import { ABSENCE_KINDS, type AbsenceKind, ABSENCE_STATUSES, dayKey, labelOf } from "@quercy/core";
import { recordInterventionEvent } from "@quercy/jobs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { absenceImpact, absenceSummary, recordAbsence } from "../../cleaning/absences";
import { notify } from "../../notify";
import { publish } from "../../realtime";
import { createTRPCRouter, orgProcedure, recordAudit } from "../init";
import { isCleaningManager } from "./sites";

type Ctx = Parameters<typeof isCleaningManager>[0];

function requireManager(ctx: Ctx) {
  if (!isCleaningManager(ctx))
    throw new TRPCError({ code: "FORBIDDEN", message: "Réservé aux responsables." });
}

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue (AAAA-MM-JJ).");
const kind = z.enum(ABSENCE_KINDS.map((k) => k.value) as [AbsenceKind, ...AbsenceKind[]]);

async function loadAbsence(ctx: Ctx, id: string) {
  const absence = await ctx.db.absence.findFirst({
    where: { id },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!absence) throw new TRPCError({ code: "NOT_FOUND", message: "Absence introuvable." });
  return absence;
}

export const absencesRouter = createTRPCRouter({
  /** Absences : toutes pour un responsable, les siennes pour un agent. */
  list: orgProcedure
    .input(z.object({ status: z.enum(["open", "all", "requested", "approved"]).default("open") }))
    .query(async ({ ctx, input }) => {
      const manager = isCleaningManager(ctx);
      const rows = await ctx.db.absence.findMany({
        where: {
          ...(manager ? {} : { userId: ctx.user.id }),
          ...(input.status === "open"
            ? {
                OR: [
                  { status: "requested" },
                  { status: "approved", endDate: { gte: new Date(Date.now() - 86_400_000) } },
                ],
              }
            : input.status === "all"
              ? {}
              : { status: input.status }),
        },
        include: {
          user: { select: { id: true, name: true } },
          decidedBy: { select: { name: true } },
        },
        orderBy: [{ startDate: "asc" }],
        take: 300,
      });
      const members = manager
        ? await ctx.db.membership.findMany({
            select: { user: { select: { id: true, name: true } } },
          })
        : [];
      return {
        canManage: manager,
        members: members.map((m) => m.user).sort((a, b) => a.name.localeCompare(b.name, "fr")),
        absences: rows.map((a) => ({
          id: a.id,
          user: a.user,
          kind: a.kind,
          kindLabel: labelOf(ABSENCE_KINDS, a.kind),
          start: dayKey(a.startDate),
          end: dayKey(a.endDate),
          comment: a.comment,
          status: a.status,
          statusLabel: labelOf(ABSENCE_STATUSES, a.status),
          source: a.source,
          decidedBy: a.decidedBy?.name ?? null,
          decisionNote: a.decisionNote,
        })),
      };
    }),

  /** Déclarer une absence : pour soi (à valider), ou pour un agent (responsable, validée). */
  create: orgProcedure
    .input(
      z.object({
        userId: z.string().min(1).optional(),
        kind,
        start: day,
        end: day,
        comment: z.string().trim().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const manager = isCleaningManager(ctx);
      const userId = input.userId ?? ctx.user.id;
      if (userId !== ctx.user.id && !manager)
        throw new TRPCError({ code: "FORBIDDEN", message: "Vous ne déclarez que vos absences." });
      if (input.end < input.start)
        throw new TRPCError({ code: "BAD_REQUEST", message: "La fin précède le début." });
      if (!(await ctx.db.membership.count({ where: { userId } })))
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cet agent n'est pas membre." });
      const { absence, notified } = await recordAbsence({
        organizationId: ctx.organizationId,
        userId,
        kind: input.kind,
        start: input.start,
        end: input.end,
        comment: input.comment,
        source: "software",
        requestedById: ctx.user.id,
        approved: manager,
      });
      for (const id of notified)
        await publish(ctx.organizationId, { type: "notification", userId: id });
      await recordAudit(ctx, {
        action: manager ? "absence.recorded" : "absence.requested",
        entityType: "absence",
        entityId: absence.id,
        metadata: { summary: absenceSummary(absence), userId },
      });
      return { id: absence.id, status: absence.status };
    }),

  /** Valider ou refuser une absence demandée. */
  decide: orgProcedure
    .input(
      z.object({
        id: z.string().min(1),
        approve: z.boolean(),
        note: z.string().trim().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireManager(ctx);
      const absence = await loadAbsence(ctx, input.id);
      if (absence.status !== "requested")
        throw new TRPCError({ code: "CONFLICT", message: "Cette absence a déjà été traitée." });
      await ctx.db.absence.update({
        where: { id: absence.id },
        data: {
          status: input.approve ? "approved" : "rejected",
          decidedById: ctx.user.id,
          decidedAt: new Date(),
          decisionNote: input.note || null,
        },
      });
      await notify({
        organizationId: ctx.organizationId,
        userIds: [absence.userId],
        actorId: ctx.user.id,
        type: input.approve ? "absence.approved" : "absence.rejected",
        title: `${absenceSummary(absence)} : ${input.approve ? "validée" : "refusée"}`,
        body: input.note,
        url: "/nettoyage/absences",
      });
      await recordAudit(ctx, {
        action: input.approve ? "absence.approved" : "absence.rejected",
        entityType: "absence",
        entityId: absence.id,
        metadata: { summary: absenceSummary(absence), agent: absence.user.name },
      });
      return { ok: true };
    }),

  /** Annuler une absence (la sienne si elle n'est pas traitée, ou par un responsable). */
  cancel: orgProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const absence = await loadAbsence(ctx, input.id);
      const own = absence.userId === ctx.user.id && absence.status === "requested";
      if (!own) requireManager(ctx);
      await ctx.db.absence.update({ where: { id: absence.id }, data: { status: "cancelled" } });
      await recordAudit(ctx, {
        action: "absence.cancelled",
        entityType: "absence",
        entityId: absence.id,
        metadata: { summary: absenceSummary(absence) },
      });
      return { ok: true };
    }),

  /** Passages touchés et propositions de remplacement (n°1, n°2, qualifié, sous-traitant). */
  impact: orgProcedure.input(z.object({ id: z.string().min(1) })).query(async ({ ctx, input }) => {
    requireManager(ctx);
    const absence = await loadAbsence(ctx, input.id);
    return {
      absence: { id: absence.id, user: absence.user, summary: absenceSummary(absence) },
      visits: await absenceImpact(ctx.organizationId, absence),
    };
  }),

  /**
   * Le chef confirme les remplacements : chaque remplaçant reçoit le passage, donc la fiche du
   * site et ses accès, et seulement ceux-là.
   */
  assign: orgProcedure
    .input(
      z.object({
        absenceId: z.string().min(1),
        assignments: z
          .array(z.object({ interventionId: z.string().min(1), agentId: z.string().min(1) }))
          .min(1)
          .max(200),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireManager(ctx);
      const absence = await loadAbsence(ctx, input.absenceId);
      const members = new Set(
        (await ctx.db.membership.findMany({ select: { userId: true } })).map((m) => m.userId),
      );
      const visits = await ctx.db.intervention.findMany({
        where: {
          id: { in: input.assignments.map((a) => a.interventionId) },
          date: { gte: absence.startDate, lte: absence.endDate },
          OR: [{ ownerId: absence.userId }, { replacementAgentId: absence.userId }],
        },
        include: { site: { select: { name: true } } },
      });
      const byId = new Map(visits.map((v) => [v.id, v]));
      const perAgent = new Map<string, string[]>();
      for (const a of input.assignments) {
        const visit = byId.get(a.interventionId);
        if (!visit)
          throw new TRPCError({ code: "BAD_REQUEST", message: "Passage hors de cette absence." });
        if (!members.has(a.agentId) || a.agentId === absence.userId)
          throw new TRPCError({ code: "BAD_REQUEST", message: "Remplaçant invalide." });
        await ctx.db.intervention.update({
          where: { id: visit.id },
          data: { replacementAgentId: a.agentId },
        });
        await recordInterventionEvent({
          organizationId: ctx.organizationId,
          interventionId: visit.id,
          userId: ctx.user.id,
          type: "reassigned",
          metadata: {
            source: "logiciel",
            replacementFor: absence.userId,
            absenceId: absence.id,
            from: visit.replacementAgentId ?? visit.ownerId,
            to: a.agentId,
          },
        });
        perAgent.set(a.agentId, [
          ...(perAgent.get(a.agentId) ?? []),
          `${dayKey(visit.date)}${visit.startTime ? ` ${visit.startTime}` : ""} — ${visit.site?.name ?? visit.title}`,
        ]);
      }
      for (const [agentId, lines] of perAgent)
        await notify({
          organizationId: ctx.organizationId,
          userIds: [agentId],
          actorId: ctx.user.id,
          type: "absence.replacement",
          title: `Remplacement de ${absence.user.name} : ${lines.length} passage${lines.length > 1 ? "s" : ""}`,
          body: lines.slice(0, 10).join("\n"),
          url: "/nettoyage/ma-journee",
        });
      await publish(ctx.organizationId, {
        type: "record.changed",
        entity: "intervention",
        ids: [...byId.keys()],
        actorId: ctx.user.id,
      });
      await recordAudit(ctx, {
        action: "absence.replacements_assigned",
        entityType: "absence",
        entityId: absence.id,
        metadata: { agent: absence.user.name, visits: input.assignments.length },
      });
      return { assigned: input.assignments.length };
    }),
});
