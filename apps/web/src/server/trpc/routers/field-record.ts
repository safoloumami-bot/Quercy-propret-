import { INTERVENTION_EVENT_TYPES, anomalyTypeLabel } from "@quercy/core";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { signedFileUrl } from "../../storage";
import { createTRPCRouter, orgProcedure } from "../init";
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
});
