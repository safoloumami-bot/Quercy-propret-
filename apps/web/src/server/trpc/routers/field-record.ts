import { INTERVENTION_EVENT_TYPES, anomalyTypeLabel } from "@quercy/core";
import type { Prisma } from "@quercy/db";
import { recordInterventionEvent } from "@quercy/jobs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { signedFileUrl } from "../../storage";
import { createTRPCRouter, orgProcedure, recordAudit } from "../init";
import { isCleaningManager } from "./sites";

interface EventMeta {
  label?: string;
  detail?: string;
  by?: string;
  offline?: boolean;
}

export const fieldRecordRouter = createTRPCRouter({
  /**
   * Relevé terrain d'une intervention : points de contrôle, consommables, photos, journal et
   * anomalies. Visible des responsables et des agents de l'intervention.
   */
  get: orgProcedure
    .input(z.object({ interventionId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const intervention = await ctx.db.intervention.findFirst({
        where: { id: input.interventionId, deletedAt: undefined },
        include: {
          tasks: { orderBy: { sortOrder: "asc" }, include: { doneBy: { select: { name: true } } } },
          consumables: { orderBy: { sortOrder: "asc" } },
          proofs: {
            orderBy: { takenAt: "asc" },
            include: {
              file: { select: { id: true, storageKey: true, name: true, mimeType: true } },
              author: { select: { name: true } },
            },
          },
          events: {
            orderBy: { at: "asc" },
            take: 500,
            include: { user: { select: { name: true } } },
          },
          anomalies: {
            where: { archivedAt: null },
            orderBy: { reportedAt: "asc" },
            select: { id: true, type: true, status: true, location: true, comment: true },
          },
          owner: { select: { name: true } },
          replacementAgent: { select: { name: true } },
          actualAgent: { select: { name: true } },
        },
      });
      if (!intervention)
        throw new TRPCError({ code: "NOT_FOUND", message: "Intervention introuvable." });
      const mine = [
        intervention.ownerId,
        intervention.replacementAgentId,
        intervention.actualAgentId,
      ].includes(ctx.user.id);
      if (!isCleaningManager(ctx) && !mine)
        throw new TRPCError({ code: "FORBIDDEN", message: "Ce relevé ne vous concerne pas." });

      const areas: { area: string; tasks: typeof tasks }[] = [];
      const tasks = intervention.tasks.map((t) => ({
        id: t.id,
        label: t.label,
        critical: t.critical,
        done: t.done,
        doneAt: t.doneAt,
        doneBy: t.doneBy?.name ?? null,
        reason: t.reason,
        area: t.area,
      }));
      for (const t of tasks) {
        const last = areas.at(-1);
        if (last && last.area === t.area) last.tasks.push(t);
        else areas.push({ area: t.area, tasks: [t] });
      }
      return {
        canCorrect: isCleaningManager(ctx),
        closed: Boolean(intervention.reportNumber),
        agents: {
          planned: intervention.owner?.name ?? null,
          replacement: intervention.replacementAgent?.name ?? null,
          actual: intervention.actualAgent?.name ?? null,
        },
        areas,
        consumables: intervention.consumables
          .filter((c) => c.quantity > 0)
          .map((c) => ({ label: c.label, unit: c.unit, quantity: c.quantity })),
        photos: await Promise.all(
          intervention.proofs
            .filter((p) => p.file)
            .map(async (p) => ({
              id: p.id,
              type: p.type,
              area: p.area,
              takenAt: p.takenAt,
              author: p.author?.name ?? null,
              url: await signedFileUrl(p.file!),
            })),
        ),
        journal: intervention.events.map((e) => {
          const meta = (e.metadata ?? {}) as EventMeta;
          return {
            at: e.at,
            type: e.type,
            label:
              meta.label ??
              INTERVENTION_EVENT_TYPES[e.type as keyof typeof INTERVENTION_EVENT_TYPES] ??
              e.type,
            detail: meta.detail ?? null,
            by: meta.by ?? e.user?.name ?? null,
            offline: meta.offline === true,
          };
        }),
        anomalies: intervention.anomalies.map((a) => ({
          ...a,
          typeLabel: anomalyTypeLabel(a.type),
        })),
      };
    }),

  /**
   * Correction d'un point de contrôle par un responsable, même après clôture. L'ancienne et la
   * nouvelle valeur sont gardées au journal de l'intervention et dans l'historique.
   */
  correctTask: orgProcedure
    .input(
      z.object({
        taskId: z.string().min(1),
        done: z.boolean(),
        reason: z.string().trim().max(600),
        note: z.string().trim().max(300).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!isCleaningManager(ctx))
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Correction réservée aux responsables.",
        });
      const task = await ctx.db.interventionTask.findFirst({
        where: { id: input.taskId },
        include: { intervention: { select: { id: true, fieldData: true } } },
      });
      if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Point introuvable." });
      const reason = input.reason || null;
      if (task.done === input.done && (task.reason ?? null) === reason) return { changed: false };
      await ctx.db.interventionTask.update({
        where: { id: task.id },
        data: {
          done: input.done,
          reason,
          ...(input.done !== task.done
            ? { doneAt: input.done ? new Date() : null, doneById: input.done ? ctx.user.id : null }
            : {}),
        },
      });
      // Bilan de clôture tenu à jour (points validés / réserves).
      const data = (task.intervention.fieldData ?? {}) as {
        cloture?: { ok: number; tot: number; res: number };
      };
      if (data.cloture) {
        const tasks = await ctx.db.interventionTask.findMany({
          where: { interventionId: task.interventionId },
          select: { done: true },
        });
        data.cloture.ok = tasks.filter((t) => t.done).length;
        data.cloture.res = tasks.length - data.cloture.ok;
        await ctx.db.intervention.update({
          where: { id: task.interventionId },
          data: { fieldData: data as Prisma.InputJsonValue },
        });
      }
      const before = `${task.done ? "fait" : "non fait"}${task.reason ? ` (${task.reason})` : ""}`;
      const after = `${input.done ? "fait" : "non fait"}${reason ? ` (${reason})` : ""}`;
      await recordInterventionEvent({
        organizationId: ctx.organizationId,
        interventionId: task.interventionId,
        userId: ctx.user.id,
        type: "record_corrected",
        metadata: {
          source: "logiciel",
          label: "Relevé corrigé",
          detail: `${task.area} — ${task.label} : ${before} → ${after}${input.note ? ` · ${input.note}` : ""}`,
          by: ctx.user.name,
          taskId: task.id,
          before: { done: task.done, reason: task.reason },
          after: { done: input.done, reason },
        },
      });
      await recordAudit(ctx, {
        action: "intervention.record_corrected",
        entityType: "intervention",
        entityId: task.interventionId,
        changes: {
          [`${task.area} — ${task.label}`]: { before, after },
        },
        metadata: input.note ? { note: input.note } : null,
      });
      return { changed: true };
    }),
});
