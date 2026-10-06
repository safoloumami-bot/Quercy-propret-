import {
  SITE_INFO_CATEGORIES,
  SITE_INFO_VISIBILITIES,
  type SiteInfoCategory,
  type SiteInfoVisibility,
  addDays,
  dayKey,
  describeRule,
  grantedScope,
  parseDay,
  recurrenceRuleSchema,
  siteInfoVisible,
  todayIn,
} from "@quercy/core";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { RecordsCtx } from "../../records/context";
import { createTRPCRouter, orgProcedure, recordAudit } from "../init";

type Ctx = RecordsCtx;

const category = z.enum(
  SITE_INFO_CATEGORIES.map((c) => c.value) as [SiteInfoCategory, ...SiteInfoCategory[]],
);
const visibility = z.enum(
  SITE_INFO_VISIBILITIES.map((v) => v.value) as [SiteInfoVisibility, ...SiteInfoVisibility[]],
);

/** Responsable : droit de modification sur le module au-delà de « les siens ». */
export function isCleaningManager(ctx: Ctx): boolean {
  const scope = grantedScope(ctx.workspace.role.permissions, "cleaning", "update");
  return scope === "all" || scope === "team";
}

function requireManager(ctx: Ctx) {
  if (!isCleaningManager(ctx))
    throw new TRPCError({ code: "FORBIDDEN", message: "Réservé aux responsables." });
}

/**
 * Agents d'un site : prévus, remplaçants ou intervenants réels de ses passages récents ou à
 * venir (deux mois en arrière, trois en avant), et intervenants prévus de ses prestations.
 */
export async function siteAgentIds(ctx: Ctx, siteId: string): Promise<Set<string>> {
  const today = parseDay(todayIn());
  const [interventions, lines] = await Promise.all([
    ctx.db.intervention.findMany({
      where: {
        siteId,
        date: { gte: addDays(today, -60), lte: addDays(today, 92) },
        status: { not: "cancelled" },
      },
      select: { ownerId: true, replacementAgentId: true, actualAgentId: true },
    }),
    ctx.db.serviceLine.findMany({
      where: { siteId, status: "active" },
      select: {
        plannedAgentId: true,
        series: { select: { versions: { select: { plannedAgentId: true } } } },
      },
    }),
  ]);
  const ids = new Set<string>();
  for (const i of interventions)
    for (const id of [i.ownerId, i.replacementAgentId, i.actualAgentId]) if (id) ids.add(id);
  for (const l of lines) {
    if (l.plannedAgentId) ids.add(l.plannedAgentId);
    for (const s of l.series)
      for (const v of s.versions) if (v.plannedAgentId) ids.add(v.plannedAgentId);
  }
  return ids;
}

/** Informations d'un site visibles par la personne. */
export async function visibleSiteInfos(
  ctx: Ctx,
  siteIds: string[],
  viewer: { manager: boolean; siteAgentOf: (siteId: string) => boolean },
) {
  const infos = await ctx.db.siteInfo.findMany({
    where: { siteId: { in: siteIds }, archivedAt: null },
    include: { agent: { select: { name: true } } },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return infos
    .filter((i) =>
      siteInfoVisible(i, {
        userId: ctx.user.id,
        manager: viewer.manager,
        siteAgent: viewer.siteAgentOf(i.siteId),
      }),
    )
    .map((i) => ({
      id: i.id,
      siteId: i.siteId,
      category: i.category,
      label: i.label,
      content: i.content,
      visibility: i.visibility,
      agentId: i.agentId,
      agentName: i.agent?.name ?? null,
    }));
}

function ruleText(rule: unknown): string {
  const parsed = recurrenceRuleSchema.safeParse(rule);
  return parsed.success ? describeRule(parsed.data) : "Règle à définir";
}

const OPEN_ANOMALY = ["reported", "validated", "in_progress"];

export const sitesRouter = createTRPCRouter({
  /**
   * Fiche de site, filtrée selon la personne : un responsable voit tout ; un agent du site voit
   * les informations « agents du site » et celles qui lui sont destinées ; les autres rien.
   */
  sheet: orgProcedure
    .input(z.object({ siteId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const site = await ctx.db.site.findFirst({
        where: { id: input.siteId, deletedAt: undefined },
        include: {
          company: { select: { id: true, name: true } },
          parent: { select: { id: true, name: true, code: true } },
          children: {
            where: { deletedAt: null },
            select: { id: true, name: true, code: true, city: true, status: true },
            orderBy: [{ code: "asc" }, { name: "asc" }],
          },
          serviceLines: {
            where: { status: "active" },
            include: {
              plannedAgent: { select: { name: true } },
              series: { include: { versions: { orderBy: { version: "desc" }, take: 1 } } },
            },
          },
        },
      });
      if (!site) throw new TRPCError({ code: "NOT_FOUND", message: "Site introuvable." });
      const manager = isCleaningManager(ctx);
      const agents = manager ? null : await siteAgentIds(ctx, site.id);
      const siteAgent = manager || agents!.has(ctx.user.id);
      if (!siteAgent)
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cette fiche est réservée aux agents qui interviennent sur ce site.",
        });
      const infos = await visibleSiteInfos(ctx, [site.id], {
        manager,
        siteAgentOf: () => siteAgent,
      });
      const members = manager
        ? await ctx.db.membership.findMany({
            include: { user: { select: { id: true, name: true } } },
          })
        : [];
      return {
        canManage: manager,
        site: {
          id: site.id,
          code: site.code,
          name: site.name,
          address: site.address,
          postalCode: site.postalCode,
          city: site.city,
          openingHours: site.openingHours,
          accessCode: site.accessCode,
          keys: site.keys,
          instructions: site.instructions,
          surfaceM2: site.surfaceM2,
          status: site.status,
          archived: Boolean(site.deletedAt),
          client: site.company,
          parent: site.parent,
          children: site.children,
        },
        services: site.serviceLines.map((l) => {
          const series = l.series[0];
          return {
            id: l.id,
            name: l.name,
            activity: l.activity,
            agentName: l.plannedAgent?.name ?? null,
            startTime: l.startTime,
            durationMinutes: l.durationMinutes,
            seriesStatus: series?.status ?? null,
            rule: series?.versions[0] ? ruleText(series.versions[0].rule) : null,
          };
        }),
        infos,
        agents: members
          .map((m) => ({ id: m.user.id, name: m.user.name }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      };
    }),

  /** Ajoute ou modifie une information de la fiche (responsables). */
  saveInfo: orgProcedure
    .input(
      z.object({
        id: z.string().min(1).optional(),
        siteId: z.string().min(1),
        category,
        label: z.string().trim().min(1, "Donnez un titre.").max(120),
        content: z.string().trim().min(1, "Écrivez l'information.").max(4000),
        visibility,
        agentId: z.string().min(1).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireManager(ctx);
      if (input.visibility === "agent" && !input.agentId)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Choisissez l'agent concerné." });
      if (input.agentId && !(await ctx.db.membership.count({ where: { userId: input.agentId } })))
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cet agent n'est pas membre." });
      if (!(await ctx.db.site.count({ where: { id: input.siteId } })))
        throw new TRPCError({ code: "NOT_FOUND", message: "Site introuvable." });
      const data = {
        category: input.category,
        label: input.label,
        content: input.content,
        visibility: input.visibility,
        agentId: input.visibility === "agent" ? (input.agentId ?? null) : null,
      };
      const saved = input.id
        ? await ctx.db.siteInfo.update({ where: { id: input.id, siteId: input.siteId }, data })
        : await ctx.db.siteInfo.create({
            data: {
              ...data,
              organizationId: ctx.organizationId,
              siteId: input.siteId,
              createdById: ctx.user.id,
            },
          });
      await recordAudit(ctx, {
        action: input.id ? "site_info.updated" : "site_info.created",
        entityType: "site",
        entityId: input.siteId,
        metadata: { label: input.label },
      });
      return { id: saved.id };
    }),

  /** Archive une information (elle reste dans l'historique). */
  archiveInfo: orgProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      requireManager(ctx);
      const info = await ctx.db.siteInfo.update({
        where: { id: input.id },
        data: { archivedAt: new Date() },
      });
      await recordAudit(ctx, {
        action: "site_info.archived",
        entityType: "site",
        entityId: info.siteId,
        metadata: { label: info.label },
      });
      return { ok: true };
    }),

  /**
   * Vue d'ensemble d'un client (ex. un syndic et ses cages) : tous ses sites et sous-sites,
   * prestations, passages du mois (prévus, réalisés, taux), prochains passages, anomalies
   * ouvertes (vue interne) et dernière note qualité.
   */
  clientOverview: orgProcedure
    .input(z.object({ companyId: z.string().min(1), month: z.string().regex(/^\d{4}-\d{2}$/) }))
    .query(async ({ ctx, input }) => {
      const scope = grantedScope(ctx.workspace.role.permissions, "cleaning", "view");
      if (scope !== "all" && scope !== "team")
        throw new TRPCError({ code: "FORBIDDEN", message: "Réservé aux responsables." });
      const company = await ctx.db.company.findFirst({
        where: { id: input.companyId },
        select: { id: true, name: true },
      });
      if (!company) throw new TRPCError({ code: "NOT_FOUND", message: "Client introuvable." });
      const direct = await ctx.db.site.findMany({
        where: { companyId: company.id },
        select: { id: true },
      });
      // Sous-sites rattachés à un site du client, même sans client renseigné.
      const ids = new Set(direct.map((s) => s.id));
      for (let frontier = [...ids]; frontier.length;) {
        const children = await ctx.db.site.findMany({
          where: { parentId: { in: frontier } },
          select: { id: true },
        });
        frontier = children.map((c) => c.id).filter((id) => !ids.has(id));
        frontier.forEach((id) => ids.add(id));
      }
      const from = parseDay(`${input.month}-01`);
      const to = addDays(new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1)), -1);
      const today = parseDay(todayIn());
      const sites = await ctx.db.site.findMany({
        where: { id: { in: [...ids] } },
        include: {
          serviceLines: {
            where: { status: "active" },
            include: {
              plannedAgent: { select: { name: true } },
              series: { include: { versions: { orderBy: { version: "desc" }, take: 1 } } },
            },
          },
          interventions: {
            where: { deletedAt: null, date: { gte: from, lte: to }, status: { not: "cancelled" } },
            select: { status: true, date: true },
          },
          anomalies: {
            where: { status: { in: OPEN_ANOMALY }, archivedAt: null },
            select: { id: true },
          },
          inspections: {
            where: { deletedAt: null },
            orderBy: { date: "desc" },
            take: 1,
            select: { score: true, date: true },
          },
        },
        orderBy: [{ code: "asc" }, { name: "asc" }],
      });
      const next = await ctx.db.intervention.groupBy({
        by: ["siteId"],
        where: {
          siteId: { in: [...ids] },
          date: { gte: today },
          status: "planned",
          deletedAt: null,
        },
        _min: { date: true },
      });
      const nextBySite = new Map(next.map((n) => [n.siteId, n._min.date]));
      const rows = sites.map((s) => {
        const planned = s.interventions.length;
        const done = s.interventions.filter((i) => i.status === "done").length;
        const missed = s.interventions.filter((i) =>
          ["missed", "access_impossible"].includes(i.status),
        ).length;
        return {
          id: s.id,
          code: s.code,
          name: s.name,
          city: s.city,
          parentId: s.parentId,
          status: s.status,
          services: s.serviceLines.map((l) => ({
            name: l.name,
            agentName: l.plannedAgent?.name ?? null,
            rule: l.series[0]?.versions[0] ? ruleText(l.series[0].versions[0].rule) : null,
          })),
          planned,
          done,
          missed,
          nextPassage: nextBySite.get(s.id) ? dayKey(nextBySite.get(s.id)!) : null,
          openAnomalies: s.anomalies.length,
          lastScore: s.inspections[0]?.score ?? null,
        };
      });
      const totals = rows.reduce(
        (t, r) => ({
          planned: t.planned + r.planned,
          done: t.done + r.done,
          missed: t.missed + r.missed,
          openAnomalies: t.openAnomalies + r.openAnomalies,
        }),
        { planned: 0, done: 0, missed: 0, openAnomalies: 0 },
      );
      const scores = rows.map((r) => r.lastScore).filter((n): n is number => n !== null);
      return {
        company,
        month: input.month,
        sites: rows,
        totals: {
          ...totals,
          sites: rows.length,
          // Taux de réalisation : passages réalisés sur passages dus (jusqu'à aujourd'hui).
          completionRate: (() => {
            const due = sites.reduce(
              (n, s) => n + s.interventions.filter((i) => i.date <= today).length,
              0,
            );
            return due ? Math.round((totals.done / due) * 100) : null;
          })(),
          averageScore: scores.length
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : null,
        },
      };
    }),
});
