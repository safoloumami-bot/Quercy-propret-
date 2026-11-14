import { z } from "zod";

import { createTRPCRouter, orgProcedure } from "../init";

export const notificationsRouter = createTRPCRouter({
  list: orgProcedure.query(({ ctx }) =>
    ctx.db.notification.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        url: true,
        readAt: true,
        createdAt: true,
      },
    }),
  ),
  unreadCount: orgProcedure.query(({ ctx }) =>
    ctx.db.notification.count({ where: { userId: ctx.user.id, readAt: null } }),
  ),
  markRead: orgProcedure
    .input(z.object({ ids: z.array(z.string().min(1)).max(100) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.notification.updateMany({
        where: { id: { in: input.ids }, userId: ctx.user.id, readAt: null },
        data: { readAt: new Date() },
      });
      return { ok: true };
    }),
  markAllRead: orgProcedure.mutation(async ({ ctx }) => {
    await ctx.db.notification.updateMany({
      where: { userId: ctx.user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }),
});
