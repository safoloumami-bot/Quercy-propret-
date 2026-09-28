import { ENTITY_KEYS } from "@quercy/core";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { delegate, entityContext } from "../../records/context";

import { authorize, createTRPCRouter, orgProcedure } from "../init";

export const auditRouter = createTRPCRouter({
  list: orgProcedure
    .input(
      z.object({
        cursor: z.string().nullish(),
        limit: z.number().int().min(1).max(100).default(50),
        actorId: z.string().optional(),
        entityType: z.string().max(40).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      authorize(ctx, "audit", "view", "Le journal d'audit est réservé aux administrateurs.");
      const items = await ctx.db.auditLog.findMany({
        where: {
          ...(input.actorId ? { actorId: input.actorId } : {}),
          ...(input.entityType ? { entityType: input.entityType } : {}),
        },
        include: { actor: { select: { id: true, name: true, email: true } } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      });
      const hasMore = items.length > input.limit;
      const page = hasMore ? items.slice(0, input.limit) : items;
      return {
        items: page.map((i) => ({
          id: i.id,
          action: i.action,
          entityType: i.entityType,
          entityId: i.entityId,
          changes: i.changes as Record<string, { before: unknown; after: unknown }> | null,
          metadata: i.metadata as Record<string, unknown> | null,
          ipAddress: i.ipAddress,
          createdAt: i.createdAt,
          actor: i.actor,
          impersonated: Boolean(i.impersonatorId),
        })),
        nextCursor: hasMore ? page[page.length - 1]!.id : null,
      };
    }),

  /** Historique d'une fiche (visible par quiconque peut consulter la fiche). */
  forRecord: orgProcedure
    .input(z.object({ entity: z.enum(ENTITY_KEYS), id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { scopeWhere } = await entityContext(ctx, input.entity, "view");
      const visible = await delegate(ctx, input.entity).count({
        where: { id: input.id, ...scopeWhere },
      });
      if (!visible) throw new TRPCError({ code: "NOT_FOUND", message: "Fiche introuvable." });
      const items = await ctx.db.auditLog.findMany({
        where: { entityType: input.entity, entityId: input.id },
        include: { actor: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      return items.map((i) => ({
        id: i.id,
        action: i.action,
        createdAt: i.createdAt,
        actor: i.actor,
        changes: i.changes as Record<string, { before: unknown; after: unknown }> | null,
        impersonated: Boolean(i.impersonatorId),
      }));
    }),

  entityTypes: orgProcedure.query(async ({ ctx }) => {
    authorize(ctx, "audit", "view");
    const rows = await ctx.db.auditLog.groupBy({
      by: ["entityType"],
      orderBy: { entityType: "asc" },
    });
    return rows.map((r) => r.entityType);
  }),
});
