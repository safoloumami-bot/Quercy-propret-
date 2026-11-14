import {
  HOLIDAY_CALENDARS,
  HOLIDAY_POLICIES,
  type HolidayCalendar,
  type HolidayPolicy,
  addDays,
  dayKey,
  describeRule,
  grantedScope,
  occurrences,
  parseDay,
  recurrenceRuleSchema,
  todayIn,
} from "@quercy/core";
import { clearUntouchedFuture, generateSeriesInterventions } from "@quercy/jobs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { RecordsCtx } from "../../records/context";
import { createTRPCRouter, orgProcedure, recordAudit } from "../init";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue (AAAA-MM-JJ).");
const clock = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure attendue (HH:MM).")
  .nullable()
  .optional();
const policy = z.enum(HOLIDAY_POLICIES.map((p) => p.value) as [HolidayPolicy, ...HolidayPolicy[]]);
const calendar = z.enum(
  HOLIDAY_CALENDARS.map((c) => c.value) as [HolidayCalendar, ...HolidayCalendar[]],
);

const ruleInput = z.object({
  rule: recurrenceRuleSchema,
  effectiveFrom: day,
  startTime: clock,
  durationMinutes: z
    .number()
    .int()
    .min(5)
    .max(24 * 60)
    .nullable()
    .optional(),
  plannedAgentId: z.string().min(1).nullable().optional(),
});

type Ctx = RecordsCtx;

/** Seuls les responsables (droit de modification au-delà de « les siens ») gèrent les séries. */
function requireManager(ctx: Ctx) {
  const scope = grantedScope(ctx.workspace.role.permissions, "cleaning", "update");
  if (!scope || scope === "own")
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Seul un responsable peut gérer les récurrences.",
    });
}

async function loadSeries(ctx: Ctx, id: string) {
  const series = await ctx.db.recurrenceSeries.findFirst({
    where: { id },
    include: { versions: { orderBy: { version: "asc" } } },
  });
  if (!series) throw new TRPCError({ code: "NOT_FOUND", message: "Série introuvable." });
  return series;
}

async function ensureAgent(ctx: Ctx, agentId: string | null | undefined) {
  if (!agentId) return;
  const member = await ctx.db.membership.count({ where: { userId: agentId } });
  if (!member)
    throw new TRPCError({ code: "BAD_REQUEST", message: "Cet intervenant n'est pas membre." });
}

/** Prochains passages d'une série (aperçu), à partir d'aujourd'hui. */
function nextDates(
  versions: { version: number; effectiveFrom: Date | string; rule: unknown }[],
  options: {
    holidayPolicy: string;
    holidayCalendar: string;
    timezone: string;
    closures?: { startDate: Date; endDate: Date }[];
  },
  count: number,
) {
  const valid = versions.flatMap((v) => {
    const rule = recurrenceRuleSchema.safeParse(v.rule);
    return rule.success ? [{ ...v, rule: rule.data }] : [];
  });
  const today = todayIn(options.timezone);
  return occurrences({
    versions: valid,
    from: today,
    to: addDays(parseDay(today), 400),
    holidayPolicy: options.holidayPolicy as HolidayPolicy,
    calendar: options.holidayCalendar as HolidayCalendar,
    closures: options.closures,
  }).slice(0, count);
}

export const recurrenceRouter = createTRPCRouter({
  /** Séries de l'espace, avec leur règle en clair et leurs prochains passages. */
  list: orgProcedure
    .input(z.object({ status: z.enum(["proposed", "active", "paused", "ended"]).optional() }))
    .query(async ({ ctx, input }) => {
      requireManager(ctx);
      const series = await ctx.db.recurrenceSeries.findMany({
        where: input.status ? { status: input.status } : {},
        include: {
          versions: { orderBy: { version: "asc" } },
          serviceLine: {
            include: {
              site: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  city: true,
                  closures: { select: { startDate: true, endDate: true } },
                  company: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });
      const agents = await ctx.db.membership.findMany({
        include: { user: { select: { id: true, name: true } } },
      });
      const agentName = new Map(agents.map((m) => [m.user.id, m.user.name]));
      return {
        agents: agents
          .map((m) => ({ id: m.user.id, name: m.user.name }))
          .sort((a, b) => a.name.localeCompare(b.name)),
        series: series
          .map((s) => {
            const current = s.versions.at(-1)!;
            const rule = recurrenceRuleSchema.safeParse(current.rule);
            const agentId = current.plannedAgentId ?? s.serviceLine.plannedAgentId;
            return {
              id: s.id,
              status: s.status,
              source: s.source,
              holidayPolicy: s.holidayPolicy,
              holidayCalendar: s.holidayCalendar,
              serviceLine: {
                id: s.serviceLine.id,
                name: s.serviceLine.name,
                activity: s.serviceLine.activity,
              },
              site: s.serviceLine.site,
              current: {
                version: current.version,
                effectiveFrom: dayKey(current.effectiveFrom),
                rule: rule.success ? rule.data : null,
                description: rule.success ? describeRule(rule.data) : "Règle à définir",
                startTime: current.startTime ?? s.serviceLine.startTime,
                durationMinutes: current.durationMinutes ?? s.serviceLine.durationMinutes,
                plannedAgentId: agentId,
                agentName: agentId ? (agentName.get(agentId) ?? null) : null,
                note: current.note,
              },
              versions: s.versions.map((v) => ({
                version: v.version,
                effectiveFrom: dayKey(v.effectiveFrom),
                description: (() => {
                  const r = recurrenceRuleSchema.safeParse(v.rule);
                  return r.success ? describeRule(r.data) : "Règle à définir";
                })(),
              })),
              next: nextDates(
                s.versions,
                {
                  holidayPolicy: s.holidayPolicy,
                  holidayCalendar: s.holidayCalendar,
                  timezone: s.timezone,
                  closures: s.serviceLine.site.closures,
                },
                6,
              ).map((o) => o.date),
            };
          })
          .sort(
            (a, b) =>
              (a.site.code ?? a.site.name).localeCompare(b.site.code ?? b.site.name, "fr", {
                numeric: true,
              }) || a.serviceLine.name.localeCompare(b.serviceLine.name),
          ),
      };
    }),

  /** Aperçu des dates d'une règle avant de l'enregistrer. */
  preview: orgProcedure
    .input(
      z.object({
        rule: recurrenceRuleSchema,
        effectiveFrom: day,
        holidayPolicy: policy,
        holidayCalendar: calendar,
        count: z.number().int().min(1).max(30).default(8),
      }),
    )
    .query(({ input }) => ({
      description: describeRule(input.rule),
      dates: nextDates(
        [{ version: 1, effectiveFrom: input.effectiveFrom, rule: input.rule }],
        {
          holidayPolicy: input.holidayPolicy,
          holidayCalendar: input.holidayCalendar,
          timezone: "Europe/Paris",
        },
        input.count,
      ),
    })),

  /** Corrige une série encore proposée (avant validation, rien n'a été généré). */
  updateProposal: orgProcedure
    .input(
      ruleInput.extend({
        seriesId: z.string().min(1),
        holidayPolicy: policy,
        holidayCalendar: calendar,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireManager(ctx);
      const series = await loadSeries(ctx, input.seriesId);
      if (series.status !== "proposed")
        throw new TRPCError({
          code: "CONFLICT",
          message: "Série déjà validée : créez une nouvelle version.",
        });
      await ensureAgent(ctx, input.plannedAgentId);
      const current = series.versions.at(-1)!;
      await ctx.db.recurrenceRuleVersion.update({
        where: { id: current.id },
        data: {
          rule: input.rule,
          effectiveFrom: parseDay(input.effectiveFrom),
          startTime: input.startTime ?? null,
          durationMinutes: input.durationMinutes ?? null,
          plannedAgentId: input.plannedAgentId ?? null,
          note: null,
        },
      });
      await ctx.db.recurrenceSeries.update({
        where: { id: series.id },
        data: { holidayPolicy: input.holidayPolicy, holidayCalendar: input.holidayCalendar },
      });
      return { ok: true };
    }),

  /** Valide des séries proposées : elles génèrent aussitôt leurs passages futurs. */
  validate: orgProcedure
    .input(z.object({ seriesIds: z.array(z.string().min(1)).min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      requireManager(ctx);
      const proposed = await ctx.db.recurrenceSeries.findMany({
        where: { id: { in: input.seriesIds }, status: "proposed" },
        include: { versions: true },
      });
      const valid = proposed.filter((s) =>
        s.versions.every((v) => recurrenceRuleSchema.safeParse(v.rule).success),
      );
      const ids = valid.map((s) => s.id);
      if (ids.length === 0) return { validated: 0, created: 0 };
      await ctx.db.recurrenceSeries.updateMany({
        where: { id: { in: ids } },
        data: { status: "active", validatedById: ctx.user.id, validatedAt: new Date() },
      });
      const result = await generateSeriesInterventions({
        organizationId: ctx.organizationId,
        seriesIds: ids,
      });
      await recordAudit(ctx, {
        action: "recurrence.validated",
        entityType: "recurrenceSeries",
        metadata: { count: ids.length, created: result.created },
      });
      return { validated: ids.length, created: result.created };
    }),

  /**
   * Nouvelle version de la règle à partir d'une date : les passages réalisés ou commencés ne
   * bougent pas, les passages futurs intacts sont recalculés. La version précédente n'est
   * jamais modifiée.
   */
  newVersion: orgProcedure
    .input(ruleInput.extend({ seriesId: z.string().min(1), note: z.string().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      requireManager(ctx);
      const series = await loadSeries(ctx, input.seriesId);
      if (series.status === "proposed")
        throw new TRPCError({
          code: "CONFLICT",
          message: "Série pas encore validée : corrigez-la directement.",
        });
      const today = todayIn(series.timezone);
      if (input.effectiveFrom < today)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Une nouvelle version commence aujourd'hui ou plus tard : le passé ne change pas.",
        });
      const latest = series.versions.at(-1)!;
      if (dayKey(latest.effectiveFrom) >= input.effectiveFrom)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `La version en cours commence le ${dayKey(latest.effectiveFrom)} : choisissez une date ultérieure.`,
        });
      await ensureAgent(ctx, input.plannedAgentId);
      const from = parseDay(input.effectiveFrom);
      await ctx.db.recurrenceRuleVersion.create({
        data: {
          organizationId: ctx.organizationId,
          seriesId: series.id,
          version: latest.version + 1,
          effectiveFrom: from,
          rule: input.rule,
          startTime: input.startTime ?? null,
          durationMinutes: input.durationMinutes ?? null,
          plannedAgentId: input.plannedAgentId ?? null,
          note: input.note ?? null,
          createdById: ctx.user.id,
        },
      });
      const removed = await clearUntouchedFuture(series.id, from);
      const result =
        series.status === "active"
          ? await generateSeriesInterventions({
              organizationId: ctx.organizationId,
              seriesIds: [series.id],
            })
          : { created: 0 };
      await recordAudit(ctx, {
        action: "recurrence.new_version",
        entityType: "recurrenceSeries",
        entityId: series.id,
        metadata: { version: latest.version + 1, from: input.effectiveFrom, removed },
      });
      return { version: latest.version + 1, removed, created: result.created };
    }),

  /** Pause, reprise ou fin d'une série (les passages futurs intacts sont retirés). */
  setStatus: orgProcedure
    .input(z.object({ seriesId: z.string().min(1), status: z.enum(["active", "paused", "ended"]) }))
    .mutation(async ({ ctx, input }) => {
      requireManager(ctx);
      const series = await loadSeries(ctx, input.seriesId);
      if (series.status === "proposed")
        throw new TRPCError({ code: "CONFLICT", message: "Validez d'abord la série." });
      if (series.status === "ended")
        throw new TRPCError({ code: "CONFLICT", message: "Série terminée." });
      await ctx.db.recurrenceSeries.update({
        where: { id: series.id },
        data: { status: input.status },
      });
      let removed = 0;
      let created = 0;
      if (input.status === "active") {
        created = (
          await generateSeriesInterventions({
            organizationId: ctx.organizationId,
            seriesIds: [series.id],
          })
        ).created;
      } else {
        removed = await clearUntouchedFuture(series.id, parseDay(todayIn(series.timezone)));
      }
      await recordAudit(ctx, {
        action: `recurrence.${input.status}`,
        entityType: "recurrenceSeries",
        entityId: series.id,
      });
      return { removed, created };
    }),
});
