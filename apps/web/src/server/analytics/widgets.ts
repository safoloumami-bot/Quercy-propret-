import "server-only";

import {
  DEAL_STAGES,
  type FilterGroup,
  type ResolvedPeriod,
  bucketOf,
  bucketsBetween,
  drillDownFilter,
  recordTitle,
  reportDefinitionSchema,
  zonedMidnight,
  zonedParts,
} from "@quercy/core";
import { runReport } from "@quercy/reports";
import { TRPCError } from "@trpc/server";

import { filteredListHref } from "@/lib/filter-param";

import { type RecordsCtx, entityContext } from "../records/context";

type Ctx = RecordsCtx;

export interface WidgetContext {
  ctx: Ctx;
  period: ResolvedPeriod;
  timeZone: string;
  config: Record<string, string | number | boolean | null>;
  now: Date;
}

/** Jours calendaires (inclus) d'une période, pour les filtres de liste. */
function periodDays(p: { from: Date; to: Date }, timeZone: string) {
  const f = zonedParts(p.from, timeZone);
  const t = zonedParts(new Date(p.to.getTime() - 1), timeZone);
  const ymd = (x: { year: number; month: number; day: number }) =>
    `${x.year}-${String(x.month + 1).padStart(2, "0")}-${String(x.day).padStart(2, "0")}`;
  return { from: ymd(f), to: ymd(t) };
}

const ISSUED = { status: { not: "draft" } };
const inRange = (p: { from: Date; to: Date }) => ({ gte: p.from, lt: p.to });

function rules(...list: (FilterGroup["rules"][number] | null)[]): FilterGroup {
  return {
    combinator: "and",
    rules: list.filter((r): r is FilterGroup["rules"][number] => r !== null),
  };
}

async function netRevenue(ctx: Ctx, range: { from: Date; to: Date }) {
  const invoices = await entityContext(ctx, "invoice", "view");
  const credits = await entityContext(ctx, "creditNote", "view").catch(() => null);
  const [inv, cred] = await Promise.all([
    ctx.db.salesDocument.aggregate({
      where: { kind: "INVOICE", ...ISSUED, issueDate: inRange(range), ...invoices.scopeWhere },
      _sum: { totalExclCents: true },
      _count: { _all: true },
    }),
    credits
      ? ctx.db.salesDocument.aggregate({
          where: {
            kind: "CREDIT_NOTE",
            ...ISSUED,
            issueDate: inRange(range),
            ...credits.scopeWhere,
          },
          _sum: { totalExclCents: true },
        })
      : Promise.resolve({ _sum: { totalExclCents: 0 } }),
  ]);
  return {
    value: (inv._sum.totalExclCents ?? 0) - (cred._sum.totalExclCents ?? 0),
    count: inv._count._all,
  };
}

function revenueHref(period: ResolvedPeriod, timeZone: string) {
  const days = periodDays(period, timeZone);
  return filteredListHref(
    "invoice",
    rules(
      { field: "status", operator: "not_in", value: ["draft"] },
      { field: "issueDate", operator: "between", value: [days.from, days.to] },
    ),
  );
}

export const WIDGET_DATA = {
  async revenue({ ctx, period, timeZone }: WidgetContext) {
    const [current, previous] = await Promise.all([
      netRevenue(ctx, period),
      netRevenue(ctx, period.previous),
    ]);
    return {
      kind: "kpi" as const,
      unit: "cents" as const,
      value: current.value,
      previous: previous.value,
      detail: `${current.count} facture${current.count > 1 ? "s" : ""} émise${current.count > 1 ? "s" : ""}, avoirs déduits`,
      href: revenueHref(period, timeZone),
    };
  },

  async cash({ ctx, period }: WidgetContext) {
    const { scopeWhere } = await entityContext(ctx, "invoice", "view");
    const sum = (range: { from: Date; to: Date }) =>
      ctx.db.payment.aggregate({
        where: { date: inRange(range), document: { kind: "INVOICE", ...scopeWhere } },
        _sum: { amountCents: true },
        _count: { _all: true },
      });
    const [current, previous] = await Promise.all([sum(period), sum(period.previous)]);
    return {
      kind: "kpi" as const,
      unit: "cents" as const,
      value: current._sum.amountCents ?? 0,
      previous: previous._sum.amountCents ?? 0,
      detail: `${current._count._all} paiement${current._count._all > 1 ? "s" : ""} reçu${current._count._all > 1 ? "s" : ""}`,
      href: filteredListHref(
        "invoice",
        rules({ field: "status", operator: "in", value: ["paid", "partial"] }),
      ),
    };
  },

  async overdue({ ctx, now }: WidgetContext) {
    const { scopeWhere } = await entityContext(ctx, "invoice", "view");
    const invoices = await ctx.db.salesDocument.findMany({
      where: { kind: "INVOICE", status: "overdue", ...scopeWhere },
      select: {
        id: true,
        number: true,
        dueCents: true,
        dueDate: true,
        company: { select: { name: true } },
      },
      orderBy: { dueCents: "desc" },
    });
    const buckets = [
      { label: "1 à 30 jours", min: 1, max: 30, cents: 0, count: 0 },
      { label: "31 à 60 jours", min: 31, max: 60, cents: 0, count: 0 },
      { label: "61 à 90 jours", min: 61, max: 90, cents: 0, count: 0 },
      { label: "Plus de 90 jours", min: 91, max: Infinity, cents: 0, count: 0 },
    ];
    const lateDays = (d: Date | null) =>
      d ? Math.max(1, Math.floor((now.getTime() - d.getTime()) / 86_400_000)) : 1;
    for (const inv of invoices) {
      const days = lateDays(inv.dueDate);
      const b = buckets.find((x) => days >= x.min && days <= x.max)!;
      b.cents += inv.dueCents;
      b.count += 1;
    }
    return {
      kind: "overdue" as const,
      total: invoices.reduce((s, i) => s + i.dueCents, 0),
      count: invoices.length,
      buckets: buckets.map(({ label, cents, count }) => ({ label, cents, count })),
      items: invoices.slice(0, 5).map((i) => ({
        id: i.id,
        label: `${i.number ?? "—"} · ${i.company?.name ?? "Client"}`,
        cents: i.dueCents,
        days: lateDays(i.dueDate),
      })),
      href: filteredListHref(
        "invoice",
        rules({ field: "status", operator: "in", value: ["overdue"] }),
      ),
    };
  },

  async revenue_trend({ ctx, now, timeZone }: WidgetContext) {
    const { scopeWhere } = await entityContext(ctx, "invoice", "view");
    const { year, month } = zonedParts(now, timeZone);
    const from = zonedMidnight(year, month - 11, 1, timeZone);
    const to = zonedMidnight(year, month + 1, 1, timeZone);
    const [invoices, payments] = await Promise.all([
      ctx.db.salesDocument.findMany({
        where: { kind: "INVOICE", ...ISSUED, issueDate: inRange({ from, to }), ...scopeWhere },
        select: { issueDate: true, totalExclCents: true },
      }),
      ctx.db.payment.findMany({
        where: { date: inRange({ from, to }), document: { kind: "INVOICE", ...scopeWhere } },
        select: { date: true, amountCents: true },
      }),
    ]);
    const months = bucketsBetween(from, to, "month", timeZone).map((b) => ({
      ...b,
      invoiced: 0,
      cash: 0,
    }));
    const byKey = new Map(months.map((m) => [m.key, m]));
    for (const i of invoices) {
      const m = byKey.get(bucketOf(i.issueDate!, "month", timeZone).key);
      if (m) m.invoiced += i.totalExclCents;
    }
    for (const p of payments) {
      const m = byKey.get(bucketOf(p.date, "month", timeZone).key);
      if (m) m.cash += p.amountCents;
    }
    return {
      kind: "trend" as const,
      points: months.map((m) => {
        const [y, mm] = m.key.split("-").map(Number) as [number, number];
        const last = new Date(Date.UTC(y, mm, 0)).getUTCDate();
        return {
          key: m.key,
          label: m.label,
          invoiced: m.invoiced,
          cash: m.cash,
          href: filteredListHref(
            "invoice",
            rules(
              { field: "status", operator: "not_in", value: ["draft"] },
              {
                field: "issueDate",
                operator: "between",
                value: [`${m.key}-01`, `${m.key}-${last}`],
              },
            ),
          ),
        };
      }),
    };
  },

  async top_customers({ ctx, period, timeZone }: WidgetContext) {
    const { scopeWhere } = await entityContext(ctx, "invoice", "view");
    const grouped = await ctx.db.salesDocument.groupBy({
      by: ["companyId"],
      where: {
        kind: "INVOICE",
        ...ISSUED,
        issueDate: inRange(period),
        companyId: { not: null },
        ...scopeWhere,
      },
      _sum: { totalExclCents: true },
      orderBy: { _sum: { totalExclCents: "desc" } },
      take: 6,
    });
    const companies = await ctx.db.company.findMany({
      where: { id: { in: grouped.map((g) => g.companyId!) } },
      select: { id: true, name: true },
    });
    const names = new Map(companies.map((c) => [c.id, c.name]));
    const days = periodDays(period, timeZone);
    return {
      kind: "ranking" as const,
      unit: "cents" as const,
      items: grouped.map((g) => ({
        id: g.companyId!,
        label: names.get(g.companyId!) ?? "Client",
        value: g._sum.totalExclCents ?? 0,
        href: filteredListHref(
          "invoice",
          rules(
            { field: "status", operator: "not_in", value: ["draft"] },
            { field: "companyId", operator: "in", value: [g.companyId!] },
            { field: "issueDate", operator: "between", value: [days.from, days.to] },
          ),
        ),
      })),
    };
  },

  async quotes({ ctx, period }: WidgetContext) {
    const { scopeWhere } = await entityContext(ctx, "quote", "view");
    const [pending, issued, won] = await Promise.all([
      ctx.db.salesDocument.aggregate({
        where: { kind: "QUOTE", status: "sent", ...scopeWhere },
        _sum: { totalExclCents: true },
        _count: { _all: true },
      }),
      ctx.db.salesDocument.count({
        where: { kind: "QUOTE", ...ISSUED, issueDate: inRange(period), ...scopeWhere },
      }),
      ctx.db.salesDocument.count({
        where: {
          kind: "QUOTE",
          status: { in: ["accepted", "invoiced"] },
          issueDate: inRange(period),
          ...scopeWhere,
        },
      }),
    ]);
    return {
      kind: "kpi" as const,
      unit: "cents" as const,
      value: pending._sum.totalExclCents ?? 0,
      previous: null,
      detail: `${pending._count._all} devis en attente · transformation ${issued ? Math.round((won / issued) * 100) : 0} % sur la période`,
      href: filteredListHref("quote", rules({ field: "status", operator: "in", value: ["sent"] })),
    };
  },

  async objective(input: WidgetContext) {
    const target = Number(input.config.target);
    const revenue = await netRevenue(input.ctx, input.period);
    return {
      kind: "objective" as const,
      target: Number.isFinite(target) && target > 0 ? Math.round(target * 100) : null,
      value: revenue.value,
      href: revenueHref(input.period, input.timeZone),
    };
  },

  async pipeline({ ctx }: WidgetContext) {
    const { scopeWhere } = await entityContext(ctx, "deal", "view");
    const deals = await ctx.db.deal.findMany({
      where: { stage: { notIn: ["won", "lost"] }, ...scopeWhere },
      select: { stage: true, amount: true, probability: true },
    });
    const stages = DEAL_STAGES.filter((s) => s.value !== "won" && s.value !== "lost").map((s) => {
      const list = deals.filter((d) => d.stage === s.value);
      return {
        key: s.value,
        label: s.label,
        amount: list.reduce((sum, d) => sum + (d.amount ?? 0), 0),
        weighted: list.reduce(
          (sum, d) => sum + ((d.amount ?? 0) * (d.probability ?? s.probability)) / 100,
          0,
        ),
        count: list.length,
        href: filteredListHref("deal", rules({ field: "stage", operator: "in", value: [s.value] })),
      };
    });
    return {
      kind: "pipeline" as const,
      stages,
      total: stages.reduce((s, x) => s + x.amount, 0),
      weighted: stages.reduce((s, x) => s + x.weighted, 0),
    };
  },

  async deals_won({ ctx, period, timeZone }: WidgetContext) {
    const { scopeWhere } = await entityContext(ctx, "deal", "view");
    const sum = (range: { from: Date; to: Date }) =>
      ctx.db.deal.aggregate({
        where: { stage: "won", closedAt: inRange(range), ...scopeWhere },
        _sum: { amount: true },
        _count: { _all: true },
      });
    const [current, previous] = await Promise.all([sum(period), sum(period.previous)]);
    const days = periodDays(period, timeZone);
    return {
      kind: "kpi" as const,
      unit: "euros" as const,
      value: current._sum.amount ?? 0,
      previous: previous._sum.amount ?? 0,
      detail: `${current._count._all} affaire${current._count._all > 1 ? "s" : ""} gagnée${current._count._all > 1 ? "s" : ""}`,
      href: filteredListHref(
        "deal",
        rules(
          { field: "stage", operator: "in", value: ["won"] },
          { field: "closedAt", operator: "between", value: [days.from, days.to] },
        ),
      ),
    };
  },

  async activities_today({ ctx, now, timeZone }: WidgetContext) {
    await entityContext(ctx, "activity", "view");
    const { year, month, day } = zonedParts(now, timeZone);
    const tomorrow = zonedMidnight(year, month, day + 1, timeZone);
    const today = zonedMidnight(year, month, day, timeZone);
    const where = { ownerId: ctx.user.id, done: false, dueAt: { lt: tomorrow } };
    const [items, count, late] = await Promise.all([
      ctx.db.activity.findMany({
        where,
        orderBy: { dueAt: "asc" },
        take: 8,
        select: {
          id: true,
          subject: true,
          type: true,
          dueAt: true,
          company: { select: { name: true } },
        },
      }),
      ctx.db.activity.count({ where }),
      ctx.db.activity.count({ where: { ...where, dueAt: { lt: today } } }),
    ]);
    return {
      kind: "agenda" as const,
      entity: "activity" as const,
      count,
      late,
      items: items.map((a) => ({
        id: a.id,
        label: a.subject,
        detail: a.company?.name ?? null,
        at: a.dueAt,
        late: Boolean(a.dueAt && a.dueAt < today),
      })),
      href: filteredListHref(
        "activity",
        rules(
          { field: "ownerId", operator: "in", value: [ctx.user.id] },
          { field: "done", operator: "is_false" },
        ),
      ),
    };
  },

  async tasks_today({ ctx, now, timeZone }: WidgetContext) {
    await entityContext(ctx, "task", "view");
    const { year, month, day } = zonedParts(now, timeZone);
    const today = zonedMidnight(year, month, day, timeZone);
    const horizon = zonedMidnight(year, month, day + 8, timeZone);
    const where = { ownerId: ctx.user.id, status: { not: "done" }, dueDate: { lt: horizon } };
    const [items, count, late] = await Promise.all([
      ctx.db.task.findMany({
        where,
        orderBy: { dueDate: "asc" },
        take: 8,
        select: { id: true, title: true, dueDate: true, project: { select: { name: true } } },
      }),
      ctx.db.task.count({ where }),
      ctx.db.task.count({ where: { ...where, dueDate: { lt: today } } }),
    ]);
    return {
      kind: "agenda" as const,
      entity: "task" as const,
      count,
      late,
      items: items.map((t) => ({
        id: t.id,
        label: recordTitle("task", t),
        detail: t.project?.name ?? null,
        at: t.dueDate,
        late: Boolean(t.dueDate && t.dueDate < today),
      })),
      href: filteredListHref(
        "task",
        rules(
          { field: "ownerId", operator: "in", value: [ctx.user.id] },
          { field: "status", operator: "not_in", value: ["done"] },
        ),
      ),
    };
  },

  async time_spent({ ctx, period, timeZone }: WidgetContext) {
    const { scopeWhere } = await entityContext(ctx, "timeEntry", "view");
    const [grouped, previous] = await Promise.all([
      ctx.db.timeEntry.groupBy({
        by: ["projectId"],
        where: { date: inRange(period), minutes: { not: null }, ...scopeWhere },
        _sum: { minutes: true },
        orderBy: { _sum: { minutes: "desc" } },
      }),
      ctx.db.timeEntry.aggregate({
        where: { date: inRange(period.previous), ...scopeWhere },
        _sum: { minutes: true },
      }),
    ]);
    const projects = await ctx.db.project.findMany({
      where: { id: { in: grouped.map((g) => g.projectId).filter((x): x is string => Boolean(x)) } },
      select: { id: true, name: true },
    });
    const names = new Map(projects.map((p) => [p.id, p.name]));
    const days = periodDays(period, timeZone);
    return {
      kind: "ranking" as const,
      unit: "minutes" as const,
      total: grouped.reduce((s, g) => s + (g._sum.minutes ?? 0), 0),
      previous: previous._sum.minutes ?? 0,
      items: grouped.slice(0, 6).map((g) => ({
        id: g.projectId ?? "aucun",
        label: g.projectId ? (names.get(g.projectId) ?? "Projet") : "Sans projet",
        value: g._sum.minutes ?? 0,
        href: filteredListHref(
          "timeEntry",
          rules(
            g.projectId
              ? { field: "projectId", operator: "in", value: [g.projectId] }
              : { field: "projectId", operator: "is_empty" },
            { field: "date", operator: "between", value: [days.from, days.to] },
          ),
        ),
      })),
    };
  },

  async report({ ctx, period, timeZone, config }: WidgetContext) {
    const id = typeof config.reportId === "string" ? config.reportId : null;
    if (!id) return { kind: "report" as const, report: null };
    const report = await ctx.db.report.findFirst({
      where: { id, OR: [{ ownerId: ctx.user.id }, { shared: true }] },
    });
    if (!report) return { kind: "report" as const, report: null };
    const def = reportDefinitionSchema.parse(report.definition);
    const { fields, scopeWhere } = await entityContext(ctx, def.entity, "view");
    const result = await runReport(ctx.db, {
      definition: def,
      fields,
      scopeWhere,
      range: def.dateField ? period : null,
      timeZone,
    });
    const days = def.dateField ? periodDays(period, timeZone) : null;
    return {
      kind: "report" as const,
      report: { id: report.id, name: report.name, definition: def },
      result: {
        total: result.total,
        count: result.count,
        measureField: result.measureField,
        points: result.points.map((p) => {
          const filter = drillDownFilter(def, p, days);
          return { ...p, href: filter ? filteredListHref(def.entity, filter) : null };
        }),
      },
    };
  },
} satisfies Record<string, (input: WidgetContext) => Promise<unknown>>;

export type WidgetKey = keyof typeof WIDGET_DATA;

export function isWidgetKey(key: string): key is WidgetKey {
  return Object.prototype.hasOwnProperty.call(WIDGET_DATA, key);
}

export function unknownWidget(): never {
  throw new TRPCError({ code: "BAD_REQUEST", message: "Widget inconnu." });
}
