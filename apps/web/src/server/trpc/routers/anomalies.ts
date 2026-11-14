import {
  ANOMALY_SEVERITIES,
  ANOMALY_SOURCES,
  ANOMALY_STATUSES,
  type AnomalyAction,
  FIELD_ANOMALY_TYPES,
  SYSTEM_ANOMALY_TYPES,
  anomalyClientEligible,
  anomalyOpen,
  anomalyTransition,
  anomalyTypeLabel,
} from "@quercy/core";
import { reportAnomalies } from "@quercy/jobs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { publish } from "../../realtime";
import { signedFileUrl } from "../../storage";
import { createTRPCRouter, orgProcedure, recordAudit } from "../init";
import { isCleaningManager } from "./sites";

type Ctx = Parameters<typeof isCleaningManager>[0];

function requireManager(ctx: Ctx) {
  if (!isCleaningManager(ctx))
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Les anomalies sont traitées par les responsables.",
    });
}

const ALL_TYPES = [...FIELD_ANOMALY_TYPES, ...SYSTEM_ANOMALY_TYPES].map((t) => t.value) as [
  string,
  ...string[],
];
const severity = z.enum(
  ANOMALY_SEVERITIES.map((s) => s.value) as [
    (typeof ANOMALY_SEVERITIES)[number]["value"],
    ...(typeof ANOMALY_SEVERITIES)[number]["value"][],
  ],
);
const statusFilter = z.enum(["open", "all", ...ANOMALY_STATUSES.map((s) => s.value)]);

const INCLUDE = {
  site: { select: { id: true, name: true, code: true } },
  intervention: { select: { id: true, title: true, date: true, reportNumber: true } },
  reportedBy: { select: { name: true } },
  validatedBy: { select: { name: true } },
  resolvedBy: { select: { name: true } },
  photo: { select: { id: true, storageKey: true, name: true, mimeType: true } },
} as const;

export const anomaliesRouter = createTRPCRouter({
  /** Anomalies de l'espace (responsables), les plus récentes d'abord. */
  list: orgProcedure
    .input(
      z.object({
        status: statusFilter.default("open"),
        siteId: z.string().min(1).optional(),
        source: z.enum(["agent", "system", "inspection", "client"]).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      requireManager(ctx);
      const status =
        input.status === "open"
          ? { in: ["reported", "validated", "in_progress"] }
          : input.status === "all"
            ? undefined
            : input.status;
      const [rows, counts] = await Promise.all([
        ctx.db.anomaly.findMany({
          where: {
            archivedAt: null,
            ...(status ? { status } : {}),
            ...(input.siteId ? { siteId: input.siteId } : {}),
            ...(input.source ? { source: input.source } : {}),
          },
          include: INCLUDE,
          orderBy: { reportedAt: "desc" },
          take: 300,
        }),
        ctx.db.anomaly.groupBy({
          by: ["status"],
          where: { archivedAt: null },
          _count: { _all: true },
        }),
      ]);
      return {
        counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])) as Record<
          string,
          number
        >,
        anomalies: await Promise.all(
          rows.map(async (a) => ({
            id: a.id,
            type: a.type,
            typeLabel: anomalyTypeLabel(a.type),
            status: a.status,
            severity: a.severity,
            source: a.source,
            sourceLabel: ANOMALY_SOURCES[a.source as keyof typeof ANOMALY_SOURCES] ?? a.source,
            location: a.location,
            comment: a.comment,
            resolution: a.resolution,
            visibleToClient: a.visibleToClient,
            reportedAt: a.reportedAt,
            validatedAt: a.validatedAt,
            resolvedAt: a.resolvedAt,
            reportedBy: a.reportedBy?.name ?? null,
            validatedBy: a.validatedBy?.name ?? null,
            resolvedBy: a.resolvedBy?.name ?? null,
            site: a.site,
            intervention: a.intervention,
            photoUrl: a.photo ? await signedFileUrl(a.photo) : null,
          })),
        ),
      };
    }),

  /** Valider, rejeter, prendre en charge, résoudre ou rouvrir. */
  act: orgProcedure
    .input(
      z.object({
        id: z.string().min(1),
        action: z.enum(["validate", "reject", "start", "resolve", "reopen"]),
        note: z.string().trim().max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireManager(ctx);
      const anomaly = await ctx.db.anomaly.findFirst({ where: { id: input.id } });
      if (!anomaly) throw new TRPCError({ code: "NOT_FOUND", message: "Anomalie introuvable." });
      const next = anomalyTransition(anomaly.status, input.action as AnomalyAction);
      if (!next)
        throw new TRPCError({
          code: "CONFLICT",
          message: "Cette action n'est pas possible depuis le statut actuel.",
        });
      if (input.action === "resolve" && !input.note)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Indiquez ce qui a été fait pour la résoudre.",
        });
      const now = new Date();
      await ctx.db.anomaly.update({
        where: { id: anomaly.id },
        data: {
          status: next,
          ...(input.action === "validate" ? { validatedById: ctx.user.id, validatedAt: now } : {}),
          ...(input.action === "resolve"
            ? { resolvedById: ctx.user.id, resolvedAt: now, resolution: input.note }
            : {}),
          // Rejetée ou rouverte : elle ne peut plus apparaître dans un rapport client.
          ...(!anomalyClientEligible(next) ? { visibleToClient: false } : {}),
          ...(input.action === "reopen"
            ? {
                validatedById: null,
                validatedAt: null,
                resolvedById: null,
                resolvedAt: null,
              }
            : {}),
        },
      });
      await recordAudit(ctx, {
        action: `anomaly.${input.action}`,
        entityType: "anomaly",
        entityId: anomaly.id,
        changes: { status: { before: anomaly.status, after: next } },
        metadata: {
          type: anomalyTypeLabel(anomaly.type),
          ...(input.note ? { note: input.note } : {}),
        },
      });
      return { status: next };
    }),

  /** Corriger ce que l'agent ou la détection a saisi (tant que ce n'est pas clos). */
  update: orgProcedure
    .input(
      z.object({
        id: z.string().min(1),
        type: z.enum(ALL_TYPES),
        location: z.string().trim().max(120),
        comment: z.string().trim().max(2000),
        severity,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireManager(ctx);
      const anomaly = await ctx.db.anomaly.findFirst({ where: { id: input.id } });
      if (!anomaly) throw new TRPCError({ code: "NOT_FOUND", message: "Anomalie introuvable." });
      if (!anomalyOpen(anomaly.status))
        throw new TRPCError({
          code: "CONFLICT",
          message: "Rouvrez l'anomalie avant de la corriger.",
        });
      const data = {
        type: input.type,
        location: input.location || null,
        comment: input.comment || null,
        severity: input.severity,
      };
      await ctx.db.anomaly.update({ where: { id: anomaly.id }, data });
      const changes = Object.fromEntries(
        (Object.keys(data) as (keyof typeof data)[])
          .filter((k) => anomaly[k] !== data[k])
          .map((k) => [k, { before: anomaly[k], after: data[k] }]),
      );
      await recordAudit(ctx, {
        action: "anomaly.corrected",
        entityType: "anomaly",
        entityId: anomaly.id,
        changes,
      });
      return { ok: true };
    }),

  /** Montrer ou non une anomalie au client (rapport) : seulement une fois validée. */
  setClientVisibility: orgProcedure
    .input(z.object({ id: z.string().min(1), visible: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      requireManager(ctx);
      const anomaly = await ctx.db.anomaly.findFirst({ where: { id: input.id } });
      if (!anomaly) throw new TRPCError({ code: "NOT_FOUND", message: "Anomalie introuvable." });
      if (input.visible && !anomalyClientEligible(anomaly.status))
        throw new TRPCError({
          code: "CONFLICT",
          message: "Validez d'abord l'anomalie : une anomalie non validée reste interne.",
        });
      await ctx.db.anomaly.update({
        where: { id: anomaly.id },
        data: { visibleToClient: input.visible },
      });
      await recordAudit(ctx, {
        action: input.visible ? "anomaly.shown_to_client" : "anomaly.hidden_from_client",
        entityType: "anomaly",
        entityId: anomaly.id,
      });
      return { ok: true };
    }),

  /** Anomalie saisie par un responsable (appel du client, ronde du chef) : validée d'office. */
  create: orgProcedure
    .input(
      z.object({
        siteId: z.string().min(1),
        type: z.enum(ALL_TYPES),
        location: z.string().trim().max(120).default(""),
        comment: z.string().trim().max(2000).default(""),
        severity: severity.default("normal"),
        source: z.enum(["inspection", "client"]).default("inspection"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireManager(ctx);
      if (!(await ctx.db.site.count({ where: { id: input.siteId } })))
        throw new TRPCError({ code: "NOT_FOUND", message: "Site introuvable." });
      const [created] = await reportAnomalies([
        {
          organizationId: ctx.organizationId,
          type: input.type,
          source: input.source,
          siteId: input.siteId,
          location: input.location,
          comment: input.comment,
          severity: input.severity,
          reportedById: ctx.user.id,
        },
      ]);
      await ctx.db.anomaly.update({
        where: { id: created!.id },
        data: { status: "validated", validatedById: ctx.user.id, validatedAt: new Date() },
      });
      for (const userId of created!.notified)
        await publish(ctx.organizationId, { type: "notification", userId });
      await recordAudit(ctx, {
        action: "anomaly.created",
        entityType: "anomaly",
        entityId: created!.id,
        metadata: { type: anomalyTypeLabel(input.type) },
      });
      return { id: created!.id };
    }),
});
