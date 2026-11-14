import {
  type DashboardItem,
  type SystemRoleKey,
  WIDGETS,
  can,
  dashboardLayoutSchema,
  defaultDashboard,
  periodSchema,
  resolvePeriod,
  systemRoleKeySchema,
  widgetByKey,
} from "@quercy/core";
import type { Prisma } from "@quercy/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { WIDGET_DATA, isWidgetKey } from "../../analytics/widgets";
import type { ResolvedWorkspace } from "../../workspace";
import { createTRPCRouter, orgProcedure } from "../init";

/** Widgets autorisés : module actif et droit de lecture sur ce module. */
function availableWidgets(workspace: ResolvedWorkspace) {
  return WIDGETS.filter(
    (w) =>
      !w.module ||
      (workspace.organization.modules.includes(w.module) &&
        can(workspace.role.permissions, w.module, "view")),
  );
}

function roleKey(workspace: ResolvedWorkspace): SystemRoleKey | null {
  const parsed = systemRoleKeySchema.safeParse(workspace.role.systemKey);
  return parsed.success ? parsed.data : null;
}

export const dashboardRouter = createTRPCRouter({
  /** Tableau de bord de la personne (ou celui par défaut de son rôle) et widgets disponibles. */
  get: orgProcedure.query(async ({ ctx }) => {
    const available = availableWidgets(ctx.workspace);
    const allowed = new Set(available.map((w) => w.key));
    const saved = await ctx.db.dashboard.findFirst({ where: { userId: ctx.user.id } });
    const parsed = saved ? dashboardLayoutSchema.safeParse(saved.layout) : null;
    const layout: DashboardItem[] = (
      parsed?.success
        ? parsed.data
        : defaultDashboard(roleKey(ctx.workspace), ctx.workspace.organization.modules)
    ).filter((item) => allowed.has(item.widget));
    const reports = await ctx.db.report.findMany({
      where: { OR: [{ ownerId: ctx.user.id }, { shared: true }] },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return { layout, customized: Boolean(parsed?.success), available, reports };
  }),

  save: orgProcedure
    .input(z.object({ layout: dashboardLayoutSchema }))
    .mutation(async ({ ctx, input }) => {
      const allowed = new Set(availableWidgets(ctx.workspace).map((w) => w.key));
      const unknown = input.layout.find((i) => !allowed.has(i.widget) || !widgetByKey(i.widget));
      if (unknown)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Widget indisponible dans cet espace.",
        });
      const layout = input.layout as unknown as Prisma.InputJsonValue;
      await ctx.db.dashboard.upsert({
        where: {
          organizationId_userId: { organizationId: ctx.organizationId, userId: ctx.user.id },
        },
        create: { organizationId: ctx.organizationId, userId: ctx.user.id, layout },
        update: { layout },
      });
      return { ok: true };
    }),

  /** Retour au tableau de bord par défaut du rôle. */
  reset: orgProcedure.mutation(async ({ ctx }) => {
    await ctx.db.dashboard.deleteMany({ where: { userId: ctx.user.id } });
    return { ok: true };
  }),

  widget: orgProcedure
    .input(
      z.object({
        widget: z.string().max(40),
        period: periodSchema,
        config: z
          .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
          .default({}),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!isWidgetKey(input.widget))
        throw new TRPCError({ code: "BAD_REQUEST", message: "Widget inconnu." });
      const timeZone = ctx.workspace.organization.preferences.timezone;
      const now = new Date();
      const data = await WIDGET_DATA[input.widget]({
        ctx,
        now,
        timeZone,
        config: input.config,
        period: resolvePeriod(input.period, now, timeZone),
      });
      return data as Awaited<ReturnType<(typeof WIDGET_DATA)[keyof typeof WIDGET_DATA]>>;
    }),
});
