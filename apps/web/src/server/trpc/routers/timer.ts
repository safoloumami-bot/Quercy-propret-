import { recordTitle } from "@quercy/core";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { publish } from "../../realtime";
import { entityContext } from "../../records/context";
import { createTRPCRouter, orgProcedure } from "../init";

/** Minutes écoulées, arrondies à la minute supérieure (au moins 1). */
export function elapsedMinutes(startedAt: Date, now: Date = new Date()): number {
  return Math.max(1, Math.ceil((now.getTime() - startedAt.getTime()) / 60_000));
}

/** Chronomètre personnel : une seule saisie de temps en cours par personne et par espace. */
export const timerRouter = createTRPCRouter({
  current: orgProcedure.query(async ({ ctx }) => {
    if (!ctx.workspace.organization.modules.includes("projects")) return null;
    const entry = await ctx.db.timeEntry.findFirst({
      where: { ownerId: ctx.user.id, startedAt: { not: null }, minutes: null },
      include: {
        task: { select: { id: true, title: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { startedAt: "desc" },
    });
    if (!entry) return null;
    return {
      id: entry.id,
      startedAt: entry.startedAt!,
      description: entry.description,
      label: entry.task
        ? recordTitle("task", entry.task)
        : (entry.project?.name ?? entry.description ?? "Sans tâche"),
      taskId: entry.taskId,
    };
  }),

  start: orgProcedure
    .input(
      z.object({
        taskId: z.string().min(1).nullish(),
        projectId: z.string().min(1).nullish(),
        description: z.string().trim().max(200).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await entityContext(ctx, "timeEntry", "create");
      let projectId = input.projectId ?? null;
      if (input.taskId) {
        const { scopeWhere } = await entityContext(ctx, "task", "view");
        const task = await ctx.db.task.findFirst({ where: { id: input.taskId, ...scopeWhere } });
        if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Tâche introuvable." });
        projectId = task.projectId ?? projectId;
      } else if (projectId) {
        const exists = await ctx.db.project.count({ where: { id: projectId } });
        if (!exists) throw new TRPCError({ code: "NOT_FOUND", message: "Projet introuvable." });
      }
      const now = new Date();
      // Démarrer un chronomètre arrête le précédent.
      const running = await ctx.db.timeEntry.findMany({
        where: { ownerId: ctx.user.id, startedAt: { not: null }, minutes: null },
      });
      for (const r of running)
        await ctx.db.timeEntry.update({
          where: { id: r.id },
          data: { minutes: elapsedMinutes(r.startedAt!, now) },
        });
      const entry = await ctx.db.timeEntry.create({
        data: {
          organizationId: ctx.organizationId,
          ownerId: ctx.user.id,
          taskId: input.taskId ?? null,
          projectId,
          description: input.description || null,
          date: now,
          startedAt: now,
        },
      });
      await publish(ctx.organizationId, {
        type: "record.changed",
        entity: "timeEntry",
        ids: [entry.id],
        actorId: ctx.user.id,
      });
      return { id: entry.id };
    }),

  stop: orgProcedure.mutation(async ({ ctx }) => {
    const running = await ctx.db.timeEntry.findFirst({
      where: { ownerId: ctx.user.id, startedAt: { not: null }, minutes: null },
    });
    if (!running)
      throw new TRPCError({ code: "BAD_REQUEST", message: "Aucun chronomètre en cours." });
    const minutes = elapsedMinutes(running.startedAt!);
    await ctx.db.timeEntry.update({ where: { id: running.id }, data: { minutes } });
    await publish(ctx.organizationId, {
      type: "record.changed",
      entity: "timeEntry",
      ids: [running.id],
      actorId: ctx.user.id,
    });
    return { id: running.id, minutes };
  }),
});
