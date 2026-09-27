import { z } from "zod";

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

  entityTypes: orgProcedure.query(async ({ ctx }) => {
    authorize(ctx, "audit", "view");
    const rows = await ctx.db.auditLog.groupBy({
      by: ["entityType"],
      orderBy: { entityType: "asc" },
    });
    return rows.map((r) => r.entityType);
  }),
});
