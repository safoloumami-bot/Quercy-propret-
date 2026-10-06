import {
  detectPointageAnomalies,
  ENTITIES,
  addDays,
  dayKey,
  findConflicts,
  parseRecordInput,
  utcDay,
  weekStart,
} from "@quercy/core";
import { generateInterventions, recordInterventionEvent, reportAnomalies } from "@quercy/jobs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { publish } from "../../realtime";
import { afterRecordChange } from "../../records/after-change";
import { type RecordsCtx, entityContext } from "../../records/context";
import { applyBusinessRules } from "../../records/hooks";
import { cleaningHours, workspaceAgents } from "../../cleaning/hours";
import { isCleaningManager, visibleSiteInfos } from "./sites";
import { authorize, createTRPCRouter, orgProcedure, recordAudit } from "../init";

const dayInput = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue (AAAA-MM-JJ).");
const monthInput = z.string().regex(/^\d{4}-\d{2}$/, "Mois attendu (AAAA-MM).");

type Ctx = Parameters<typeof entityContext>[0];

/** Intervention modifiable par la personne (la sienne, ou droits étendus). */
async function editableIntervention(ctx: Ctx, id: string) {
  const { scopeWhere } = await entityContext(ctx, "intervention", "update");
  const row = await ctx.db.intervention.findFirst({ where: { id, ...scopeWhere } });
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Intervention introuvable." });
  return row;
}

/** Enregistre un pointage (arrivée, départ…) en appliquant les règles métier. */
async function saveIntervention(
  ctx: Ctx,
  current: Record<string, unknown> & { id: string; title: string },
  data: Record<string, unknown>,
  action: string,
) {
  const next = applyBusinessRules("intervention", data, current);
  const updated = await ctx.db.intervention.update({ where: { id: current.id }, data: next });
  await recordAudit(ctx, {
    action,
    entityType: "intervention",
    entityId: current.id,
    metadata: { name: current.title },
  });
  await publish(ctx.organizationId, {
    type: "record.changed",
    entity: "intervention",
    ids: [current.id],
    actorId: ctx.user.id,
  });
  await afterRecordChange(ctx, "intervention", [current.id], "updated");
  return updated;
}

/** Pointage hors créneau ou de durée anormale : anomalie aux responsables, sans bloquer. */
async function pointageAnomalies(
  ctx: { db: RecordsCtx["db"]; organizationId: string },
  id: string,
) {
  try {
    const row = await ctx.db.intervention.findFirst({
      where: { id },
      include: { series: { select: { timezone: true } } },
    });
    if (!row) return;
    const reported = await reportAnomalies(
      detectPointageAnomalies(row, row.series?.timezone ?? "Europe/Paris").map((found) => ({
        organizationId: ctx.organizationId,
        source: "system" as const,
        siteId: row.siteId,
        interventionId: row.id,
        ...found,
      })),
    );
    for (const userId of new Set(reported.flatMap((r) => r.notified)))
      await publish(ctx.organizationId, { type: "notification", userId });
  } catch (error) {
    console.error(
      JSON.stringify({ level: "error", msg: "cleaning.anomaly_failed", error: String(error) }),
    );
  }
}

export const cleaningRouter = createTRPCRouter({
  /** Planning d'une semaine : agents en lignes, jours en colonnes. */
  planning: orgProcedure.input(z.object({ week: dayInput })).query(async ({ ctx, input }) => {
    const { scopeWhere } = await entityContext(ctx, "intervention", "view");
    const monday = weekStart(new Date(`${input.week}T00:00:00.000Z`));
    const sunday = addDays(monday, 6);
    const rows = await ctx.db.intervention.findMany({
      where: { date: { gte: monday, lte: sunday }, ...scopeWhere },
      include: {
        site: { select: { id: true, name: true, city: true } },
        company: { select: { name: true } },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });
    const interventions = rows.map((r) => ({
      id: r.id,
      title: r.title,
      day: dayKey(r.date),
      startTime: r.startTime,
      durationMinutes: r.durationMinutes,
      status: r.status,
      agentId: r.ownerId,
      siteName: r.site?.name ?? null,
      city: r.site?.city ?? null,
      companyName: r.company?.name ?? null,
    }));
    return {
      weekStart: dayKey(monday),
      days: Array.from({ length: 7 }, (_, i) => dayKey(addDays(monday, i))),
      agents: await workspaceAgents(ctx),
      interventions,
      // Un même intervenant prévu à deux endroits en même temps : alerte, jamais blocage.
      conflicts: findConflicts(
        interventions
          .filter((i) => !["cancelled", "done"].includes(i.status))
          .map((i) => ({ ...i, agentId: i.agentId })),
      ),
    };
  }),

  /** Crée tout de suite les interventions des contrats en cours (3 semaines d'avance). */
  generate: orgProcedure.mutation(async ({ ctx }) => {
    await entityContext(ctx, "intervention", "create");
    const result = await generateInterventions({ organizationId: ctx.organizationId });
    if (result.created > 0)
      await publish(ctx.organizationId, {
        type: "record.changed",
        entity: "intervention",
        ids: [],
        actorId: ctx.user.id,
      });
    return result;
  }),

  /** Réaffecte une intervention (remplacement d'un agent absent). */
  reassign: orgProcedure
    .input(z.object({ id: z.string().min(1), agentId: z.string().min(1).nullable() }))
    .mutation(async ({ ctx, input }) => {
      authorize(ctx, "cleaning", "update");
      const { scope } = await entityContext(ctx, "intervention", "update");
      if (scope === "own")
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seul un responsable peut réaffecter une intervention.",
        });
      const current = await editableIntervention(ctx, input.id);
      if (input.agentId) {
        const member = await ctx.db.membership.count({ where: { userId: input.agentId } });
        if (!member)
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cet agent n'est pas membre." });
      }
      await saveIntervention(ctx, current, { ownerId: input.agentId }, "intervention.reassign");
      await recordInterventionEvent({
        organizationId: ctx.organizationId,
        interventionId: current.id,
        userId: ctx.user.id,
        type: "reassigned",
        metadata: { from: current.ownerId, to: input.agentId },
      });
      return { ok: true };
    }),

  /** Interventions du jour de la personne connectée, avec les informations d'accès au site. */
  myDay: orgProcedure.input(z.object({ day: dayInput })).query(async ({ ctx, input }) => {
    await entityContext(ctx, "intervention", "view");
    const day = utcDay(new Date(`${input.day}T00:00:00.000Z`));
    const rows = await ctx.db.intervention.findMany({
      where: {
        OR: [{ ownerId: ctx.user.id }, { replacementAgentId: ctx.user.id }],
        date: day,
        status: { not: "cancelled" },
      },
      include: {
        site: {
          select: {
            id: true,
            name: true,
            address: true,
            postalCode: true,
            city: true,
            accessCode: true,
            keys: true,
            instructions: true,
            openingHours: true,
          },
        },
        company: { select: { name: true } },
      },
      orderBy: [{ startTime: "asc" }, { createdAt: "asc" }],
    });
    // Fiche de site : seulement ce que cet agent doit voir.
    const siteIds = [...new Set(rows.flatMap((r) => (r.site ? [r.site.id] : [])))];
    const infos = await visibleSiteInfos(ctx, siteIds, {
      manager: isCleaningManager(ctx),
      siteAgentOf: () => true,
    });
    return rows.map((r) => ({
      infos: infos.filter((i) => i.siteId === r.site?.id),
      id: r.id,
      title: r.title,
      startTime: r.startTime,
      durationMinutes: r.durationMinutes,
      status: r.status,
      checkInAt: r.checkInAt,
      checkOutAt: r.checkOutAt,
      workedMinutes: r.workedMinutes,
      notes: r.notes,
      signedBy: r.signedBy,
      hasSignature: Boolean(r.signatureUrl),
      hasPhoto: Boolean(r.photoUrl),
      companyName: r.company?.name ?? null,
      site: r.site,
    }));
  }),

  checkIn: orgProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const current = await editableIntervention(ctx, input.id);
      if (current.checkInAt)
        throw new TRPCError({ code: "CONFLICT", message: "L'arrivée est déjà pointée." });
      await saveIntervention(ctx, current, { checkInAt: new Date() }, "intervention.check_in");
      await recordInterventionEvent({
        organizationId: ctx.organizationId,
        interventionId: current.id,
        userId: ctx.user.id,
        type: "started",
        metadata: { source: "logiciel" },
      });
      await pointageAnomalies(ctx, current.id);
      return { ok: true };
    }),

  /** Départ : compte rendu, photo et signature du client facultatifs. */
  checkOut: orgProcedure
    .input(
      z.object({
        id: z.string().min(1),
        notes: z.string().max(10_000).optional(),
        signedBy: z.string().max(200).optional(),
        signatureUrl: z.string().max(800_000).optional(),
        photoUrl: z.string().max(800_000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const current = await editableIntervention(ctx, input.id);
      const { id: _id, ...values } = input;
      const parsed = parseRecordInput(
        ENTITIES.intervention.fields.filter((f) =>
          ["notes", "signedBy", "signatureUrl", "photoUrl"].includes(f.key),
        ),
        Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined && v !== "")),
        "update",
      );
      if (!parsed.success)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: Object.values(parsed.errors).join(" "),
        });
      const now = new Date();
      await saveIntervention(
        ctx,
        current,
        { ...parsed.value.data, checkInAt: current.checkInAt ?? now, checkOutAt: now },
        "intervention.check_out",
      );
      await recordInterventionEvent({
        organizationId: ctx.organizationId,
        interventionId: current.id,
        userId: ctx.user.id,
        type: "finished",
        metadata: { source: "logiciel", signed: Boolean(input.signatureUrl) },
      });
      await pointageAnomalies(ctx, current.id);
      return { ok: true };
    }),

  /**
   * Heures du mois par agent pour la paie : temps pointé (ou prévu à défaut), dont nuit
   * (21 h – 6 h), dimanche et jours fériés.
   */
  hours: orgProcedure
    .input(z.object({ month: monthInput }))
    .query(({ ctx, input }) => cleaningHours(ctx, input.month)),
});
