import {
  PERIOD_PRESETS,
  PRESET_REPORTS,
  REPORT_SCHEDULES,
  can,
  drillDownFilter,
  periodSchema,
  reportDefinitionSchema,
  resolvePeriod,
  zonedParts,
} from "@quercy/core";
import type { Prisma } from "@quercy/db";
import { ReportError, measureLabel, runReport } from "@quercy/reports";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { filteredListHref } from "@/lib/filter-param";

import { entityContext } from "../../records/context";
import { createTRPCRouter, orgProcedure, recordAudit } from "../init";

const reportInput = z.object({
  name: z.string().trim().min(1, { error: "Donnez un nom au rapport." }).max(120),
  description: z.string().trim().max(500).nullish(),
  definition: reportDefinitionSchema,
  period: z.enum(PERIOD_PRESETS),
  shared: z.boolean(),
  schedule: z.enum(REPORT_SCHEDULES),
  recipients: z.array(z.email({ error: "Adresse email invalide." })).max(20),
});

function ymd(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${String(p.month + 1).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export const reportsRouter = createTRPCRouter({
  /** Rapports prédéfinis (modules autorisés) et rapports enregistrés visibles. */
  list: orgProcedure.query(async ({ ctx }) => {
    const modules = ctx.workspace.organization.modules;
    const presets = PRESET_REPORTS.filter(
      (p) => modules.includes(p.module) && can(ctx.workspace.role.permissions, p.module, "view"),
    );
    const saved = await ctx.db.report.findMany({
      where: { OR: [{ ownerId: ctx.user.id }, { shared: true }] },
      include: { owner: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return {
      presets,
      saved: saved.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        shared: r.shared,
        schedule: r.schedule,
        owner: r.owner.name,
        mine: r.ownerId === ctx.user.id,
        definition: reportDefinitionSchema.parse(r.definition),
        updatedAt: r.updatedAt,
      })),
    };
  }),

  get: orgProcedure.input(z.object({ id: z.string().min(1) })).query(async ({ ctx, input }) => {
    const r = await ctx.db.report.findFirst({
      where: { id: input.id, OR: [{ ownerId: ctx.user.id }, { shared: true }] },
      include: { owner: { select: { name: true } } },
    });
    if (!r)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Ce rapport n'existe pas ou n'est pas partagé.",
      });
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      definition: reportDefinitionSchema.parse(r.definition),
      period: r.period,
      shared: r.shared,
      schedule: r.schedule,
      recipients: r.recipients,
      lastSentAt: r.lastSentAt,
      owner: r.owner.name,
      canEdit:
        r.ownerId === ctx.user.id || can(ctx.workspace.role.permissions, "settings", "admin"),
    };
  }),

  /** Exécute une définition sur une période (constructeur, rapport, widget). */
  run: orgProcedure
    .input(z.object({ definition: reportDefinitionSchema, period: periodSchema }))
    .query(async ({ ctx, input }) => {
      const def = input.definition;
      const { fields, scopeWhere } = await entityContext(ctx, def.entity, "view");
      const timeZone = ctx.workspace.organization.preferences.timezone;
      const period = resolvePeriod(input.period, new Date(), timeZone);
      try {
        const result = await runReport(ctx.db, {
          definition: def,
          fields,
          scopeWhere,
          range: def.dateField ? period : null,
          timeZone,
        });
        const days = def.dateField
          ? {
              from: ymd(period.from, timeZone),
              to: ymd(new Date(period.to.getTime() - 1), timeZone),
            }
          : null;
        return {
          ...result,
          measure: measureLabel(def),
          period: def.dateField ? period.label : null,
          href: filteredListHref(def.entity, drillDownFilter(def, null, days)),
          points: result.points.map((p) => {
            const filter = drillDownFilter(def, p, days);
            return { ...p, href: filter ? filteredListHref(def.entity, filter) : null };
          }),
        };
      } catch (error) {
        if (error instanceof ReportError)
          throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
        throw error;
      }
    }),

  save: orgProcedure
    .input(reportInput.extend({ id: z.string().min(1).optional() }))
    .mutation(async ({ ctx, input }) => {
      await entityContext(ctx, input.definition.entity, "view");
      const data = {
        name: input.name,
        description: input.description ?? null,
        definition: input.definition as unknown as Prisma.InputJsonValue,
        period: input.period,
        shared: input.shared,
        schedule: input.schedule,
        recipients: [...new Set(input.recipients.map((e) => e.toLowerCase()))],
      };
      if (input.id) {
        const existing = await ctx.db.report.findFirst({ where: { id: input.id } });
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Rapport introuvable." });
        if (
          existing.ownerId !== ctx.user.id &&
          !can(ctx.workspace.role.permissions, "settings", "admin")
        )
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Seul l'auteur du rapport peut le modifier.",
          });
        await ctx.db.report.update({ where: { id: input.id }, data });
        await recordAudit(ctx, {
          action: "report.update",
          entityType: "report",
          entityId: input.id,
          metadata: { name: input.name },
        });
        return { id: input.id };
      }
      const created = await ctx.db.report.create({
        data: { ...data, organizationId: ctx.organizationId, ownerId: ctx.user.id },
      });
      await recordAudit(ctx, {
        action: "report.create",
        entityType: "report",
        entityId: created.id,
        metadata: { name: input.name },
      });
      return { id: created.id };
    }),

  delete: orgProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.report.findFirst({ where: { id: input.id } });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Rapport introuvable." });
      if (
        existing.ownerId !== ctx.user.id &&
        !can(ctx.workspace.role.permissions, "settings", "admin")
      )
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seul l'auteur du rapport peut le supprimer.",
        });
      await ctx.db.report.update({ where: { id: input.id }, data: { deletedAt: new Date() } });
      await recordAudit(ctx, {
        action: "report.delete",
        entityType: "report",
        entityId: input.id,
        metadata: { name: existing.name },
      });
      return { ok: true };
    }),
});
