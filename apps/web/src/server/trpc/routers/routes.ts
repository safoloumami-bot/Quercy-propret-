import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, orgProcedure, recordAudit } from "../init";
import { isCleaningManager } from "./sites";

type Ctx = Parameters<typeof isCleaningManager>[0];

function requireManager(ctx: Ctx) {
  if (!isCleaningManager(ctx))
    throw new TRPCError({ code: "FORBIDDEN", message: "Réservé aux responsables." });
}

const time = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "Heure attendue (HH:MM).")
  .nullable()
  .default(null);
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullable()
    .default(null);

const INCLUDE = {
  mainAgent: { select: { id: true, name: true } },
  replacementAgent: { select: { id: true, name: true } },
  stops: {
    orderBy: { sortOrder: "asc" },
    include: { site: { select: { id: true, name: true, code: true, city: true } } },
  },
} as const;

export const routesRouter = createTRPCRouter({
  /** Tournées de l'espace, avec leurs étapes dans l'ordre et les totaux de trajet. */
  list: orgProcedure.query(async ({ ctx }) => {
    requireManager(ctx);
    const routes = await ctx.db.route.findMany({
      where: { archivedAt: null },
      include: INCLUDE,
      orderBy: [{ active: "desc" }, { name: "asc" }],
    });
    return routes.map((r) => ({
      id: r.id,
      name: r.name,
      zone: r.zone,
      mainAgent: r.mainAgent,
      replacementAgent: r.replacementAgent,
      vehicle: r.vehicle,
      weekdays: r.weekdays,
      startTime: r.startTime,
      endTime: r.endTime,
      startPoint: r.startPoint,
      active: r.active,
      notes: r.notes,
      stops: r.stops.map((s) => ({
        siteId: s.siteId,
        site: s.site,
        travelMinutes: s.travelMinutes,
        travelKm: s.travelMeters === null ? null : s.travelMeters / 1000,
      })),
      totals: {
        stops: r.stops.length,
        travelMinutes: r.stops.reduce((n, s) => n + (s.travelMinutes ?? 0), 0),
        travelKm: r.stops.reduce((n, s) => n + (s.travelMeters ?? 0), 0) / 1000,
      },
    }));
  }),

  /** Crée ou modifie une tournée ; les étapes sont remplacées dans l'ordre donné. */
  save: orgProcedure
    .input(
      z.object({
        id: z.string().min(1).optional(),
        name: z.string().trim().min(1, "Donnez un nom à la tournée.").max(80),
        zone: text(80),
        mainAgentId: z.string().min(1).nullable().default(null),
        replacementAgentId: z.string().min(1).nullable().default(null),
        vehicle: text(80),
        weekdays: z.array(z.number().int().min(1).max(7)).max(7).default([]),
        startTime: time,
        endTime: time,
        startPoint: text(200),
        active: z.boolean().default(true),
        notes: text(2000),
        stops: z
          .array(
            z.object({
              siteId: z.string().min(1),
              travelMinutes: z.number().int().min(0).max(600).nullable().default(null),
              travelKm: z.number().min(0).max(1000).nullable().default(null),
            }),
          )
          .max(80),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireManager(ctx);
      const members = new Set(
        (await ctx.db.membership.findMany({ select: { userId: true } })).map((m) => m.userId),
      );
      for (const id of [input.mainAgentId, input.replacementAgentId])
        if (id && !members.has(id))
          throw new TRPCError({ code: "BAD_REQUEST", message: "Agent inconnu." });
      const siteIds = [...new Set(input.stops.map((s) => s.siteId))];
      if (siteIds.length !== input.stops.length)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Un site figure deux fois." });
      if ((await ctx.db.site.count({ where: { id: { in: siteIds } } })) !== siteIds.length)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Site introuvable." });
      const { stops, id, ...fields } = input;
      const data = { ...fields, weekdays: [...new Set(fields.weekdays)].sort() };
      const stopRows = stops.map((s, i) => ({
        organizationId: ctx.organizationId,
        siteId: s.siteId,
        sortOrder: i,
        travelMinutes: s.travelMinutes,
        travelMeters: s.travelKm === null ? null : Math.round(s.travelKm * 1000),
      }));
      const route = id
        ? await ctx.db.route.update({
            where: { id },
            data: { ...data, stops: { deleteMany: {}, createMany: { data: stopRows } } },
          })
        : await ctx.db.route.create({
            data: {
              ...data,
              organizationId: ctx.organizationId,
              stops: { createMany: { data: stopRows } },
            },
          });
      await recordAudit(ctx, {
        action: id ? "route.updated" : "route.created",
        entityType: "route",
        entityId: route.id,
        metadata: { name: input.name, stops: stops.length },
      });
      return { id: route.id };
    }),

  archive: orgProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      requireManager(ctx);
      const route = await ctx.db.route.update({
        where: { id: input.id },
        data: { archivedAt: new Date(), active: false },
      });
      await recordAudit(ctx, {
        action: "route.archived",
        entityType: "route",
        entityId: route.id,
        metadata: { name: route.name },
      });
      return { ok: true };
    }),
});
