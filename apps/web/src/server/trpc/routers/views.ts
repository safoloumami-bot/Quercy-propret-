import { ENTITY_KEYS, viewConfigSchema } from "@quercy/core";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, orgProcedure } from "../init";

export const viewsRouter = createTRPCRouter({
  /** Mes vues et les vues partagées de l'équipe. */
  list: orgProcedure
    .input(z.object({ entity: z.enum(ENTITY_KEYS) }))
    .query(async ({ ctx, input }) => {
      const views = await ctx.db.savedView.findMany({
        where: { entityType: input.entity, OR: [{ ownerId: ctx.user.id }, { shared: true }] },
        include: { owner: { select: { name: true } } },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      });
      return views.map((v) => {
        const config = viewConfigSchema.safeParse(v.config);
        return {
          id: v.id,
          name: v.name,
          shared: v.shared,
          mine: v.ownerId === ctx.user.id,
          ownerName: v.owner.name,
          config: config.success ? config.data : null,
        };
      });
    }),

  create: orgProcedure
    .input(
      z.object({
        entity: z.enum(ENTITY_KEYS),
        name: z.string().trim().min(1).max(60),
        shared: z.boolean(),
        config: viewConfigSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const count = await ctx.db.savedView.count({
        where: { entityType: input.entity, ownerId: ctx.user.id },
      });
      if (count >= 50)
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "50 vues maximum par type de fiche.",
        });
      const view = await ctx.db.savedView.create({
        data: {
          organizationId: ctx.organizationId,
          ownerId: ctx.user.id,
          entityType: input.entity,
          name: input.name,
          shared: input.shared,
          config: input.config,
          position: count,
        },
      });
      return { id: view.id };
    }),

  /** Seul l'auteur modifie sa vue (une vue partagée se duplique pour être adaptée). */
  update: orgProcedure
    .input(
      z.object({
        id: z.string().min(1),
        name: z.string().trim().min(1).max(60).optional(),
        shared: z.boolean().optional(),
        config: viewConfigSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const view = await ctx.db.savedView.findUnique({ where: { id: input.id } });
      if (!view || view.ownerId !== ctx.user.id)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Vue introuvable, ou créée par une autre personne.",
        });
      await ctx.db.savedView.update({
        where: { id: view.id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.shared !== undefined ? { shared: input.shared } : {}),
          ...(input.config !== undefined ? { config: input.config } : {}),
        },
      });
      return { ok: true };
    }),

  delete: orgProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const view = await ctx.db.savedView.findUnique({ where: { id: input.id } });
      if (!view || view.ownerId !== ctx.user.id)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Vue introuvable, ou créée par une autre personne.",
        });
      await ctx.db.savedView.update({ where: { id: view.id }, data: { deletedAt: new Date() } });
      return { ok: true };
    }),
});
