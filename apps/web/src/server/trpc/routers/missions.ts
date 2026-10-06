import { TASK_FREQUENCIES, type TaskFrequency, taskFrequencyLabel } from "@quercy/core";
import type { Prisma } from "@quercy/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { refreshUpcomingVisits } from "../../cleaning/missions";
import { createTRPCRouter, orgProcedure, recordAudit } from "../init";
import { isCleaningManager, siteAgentIds } from "./sites";

type Ctx = Parameters<typeof isCleaningManager>[0];

function requireManager(ctx: Ctx) {
  if (!isCleaningManager(ctx))
    throw new TRPCError({ code: "FORBIDDEN", message: "Réservé aux responsables." });
}

const frequency = z.enum(
  TASK_FREQUENCIES.map((f) => f.value) as [TaskFrequency, ...TaskFrequency[]],
);
const text = (max: number) => z.string().trim().max(max).default("");

export const missionTaskInput = z.object({
  zone: z.string().trim().min(1, "Zone manquante.").max(80),
  label: z.string().trim().min(1, "Tâche sans libellé.").max(200),
  frequency: frequency.default("each_visit"),
  critical: z.boolean().default(false),
  photoRequired: z.boolean().default(false),
});

const SHEET_INCLUDE = {
  tasks: { orderBy: { sortOrder: "asc" } },
  serviceLine: { select: { id: true, name: true } },
  updatedBy: { select: { name: true } },
} as const;

function snapshotOf(sheet: {
  title: string;
  serviceLineId: string | null;
  procedure: string | null;
  products: string | null;
  equipment: string | null;
  instructions: string | null;
  durationMinutes: number | null;
  tasks: z.infer<typeof missionTaskInput>[];
}) {
  return {
    title: sheet.title,
    serviceLineId: sheet.serviceLineId,
    procedure: sheet.procedure,
    products: sheet.products,
    equipment: sheet.equipment,
    instructions: sheet.instructions,
    durationMinutes: sheet.durationMinutes,
    tasks: sheet.tasks.map(({ zone, label, frequency, critical, photoRequired }) => ({
      zone,
      label,
      frequency,
      critical,
      photoRequired,
    })),
  };
}

export const missionsRouter = createTRPCRouter({
  /** Fiches mission d'un site : responsables, et agents du site en lecture. */
  list: orgProcedure
    .input(z.object({ siteId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const manager = isCleaningManager(ctx);
      if (!manager && !(await siteAgentIds(ctx, input.siteId)).has(ctx.user.id))
        throw new TRPCError({ code: "FORBIDDEN", message: "Fiches réservées aux agents du site." });
      const [sheets, lines] = await Promise.all([
        ctx.db.missionSheet.findMany({
          where: { siteId: input.siteId, archivedAt: null },
          include: SHEET_INCLUDE,
          orderBy: [{ serviceLineId: { sort: "asc", nulls: "first" } }, { createdAt: "asc" }],
        }),
        manager
          ? ctx.db.serviceLine.findMany({
              where: { siteId: input.siteId, status: "active" },
              select: { id: true, name: true },
              orderBy: { name: "asc" },
            })
          : [],
      ]);
      return {
        canManage: manager,
        serviceLines: lines,
        sheets: sheets.map((s) => ({
          id: s.id,
          title: s.title,
          version: s.version,
          serviceLine: s.serviceLine,
          procedure: s.procedure,
          products: s.products,
          equipment: s.equipment,
          instructions: s.instructions,
          durationMinutes: s.durationMinutes,
          updatedAt: s.updatedAt,
          updatedBy: s.updatedBy?.name ?? null,
          tasks: s.tasks.map((t) => ({
            zone: t.zone,
            label: t.label,
            frequency: t.frequency as TaskFrequency,
            frequencyLabel: taskFrequencyLabel(t.frequency),
            critical: t.critical,
            photoRequired: t.photoRequired,
          })),
        })),
      };
    }),

  /**
   * Crée ou modifie une fiche : nouvelle version (l'ancienne reste dans l'historique) ; les
   * passages à venir pas encore commencés recevront la nouvelle version.
   */
  save: orgProcedure
    .input(
      z.object({
        id: z.string().min(1).optional(),
        siteId: z.string().min(1),
        serviceLineId: z.string().min(1).nullable().default(null),
        title: z.string().trim().min(1, "Donnez un titre à la fiche.").max(120),
        procedure: text(6000),
        products: text(3000),
        equipment: text(3000),
        instructions: text(6000),
        durationMinutes: z.number().int().min(5).max(1440).nullable().default(null),
        tasks: z.array(missionTaskInput).max(300),
        note: z.string().trim().max(300).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireManager(ctx);
      if (!(await ctx.db.site.count({ where: { id: input.siteId } })))
        throw new TRPCError({ code: "NOT_FOUND", message: "Site introuvable." });
      if (
        input.serviceLineId &&
        !(await ctx.db.serviceLine.count({
          where: { id: input.serviceLineId, siteId: input.siteId },
        }))
      )
        throw new TRPCError({ code: "BAD_REQUEST", message: "Prestation d'un autre site." });
      // Une seule fiche active par prestation (ou pour tout le site).
      const twin = await ctx.db.missionSheet.findFirst({
        where: {
          siteId: input.siteId,
          serviceLineId: input.serviceLineId,
          archivedAt: null,
          ...(input.id ? { id: { not: input.id } } : {}),
        },
        select: { id: true },
      });
      if (twin)
        throw new TRPCError({
          code: "CONFLICT",
          message: input.serviceLineId
            ? "Cette prestation a déjà sa fiche mission : modifiez-la."
            : "Le site a déjà une fiche mission générale : modifiez-la.",
        });
      const fields = {
        title: input.title,
        serviceLineId: input.serviceLineId,
        procedure: input.procedure || null,
        products: input.products || null,
        equipment: input.equipment || null,
        instructions: input.instructions || null,
        durationMinutes: input.durationMinutes,
      };
      const current = input.id
        ? await ctx.db.missionSheet.findFirst({
            where: { id: input.id, siteId: input.siteId, archivedAt: null },
          })
        : null;
      if (input.id && !current)
        throw new TRPCError({ code: "NOT_FOUND", message: "Fiche introuvable." });
      const version = current ? current.version + 1 : 1;
      const tasks = input.tasks.map((t, i) => ({
        organizationId: ctx.organizationId,
        ...t,
        sortOrder: i,
      }));
      const sheet = current
        ? await ctx.db.missionSheet.update({
            where: { id: current.id },
            data: {
              ...fields,
              version,
              updatedById: ctx.user.id,
              tasks: { deleteMany: {}, createMany: { data: tasks } },
            },
          })
        : await ctx.db.missionSheet.create({
            data: {
              ...fields,
              organizationId: ctx.organizationId,
              siteId: input.siteId,
              version,
              createdById: ctx.user.id,
              updatedById: ctx.user.id,
              tasks: { createMany: { data: tasks } },
            },
          });
      await ctx.db.missionSheetVersion.create({
        data: {
          organizationId: ctx.organizationId,
          sheetId: sheet.id,
          version,
          snapshot: snapshotOf({ ...fields, tasks: input.tasks }) as Prisma.InputJsonValue,
          note: input.note ?? null,
          createdById: ctx.user.id,
        },
      });
      const refreshed = await refreshUpcomingVisits(ctx.organizationId, {
        id: sheet.id,
        siteId: input.siteId,
        serviceLineId: input.serviceLineId,
      });
      await recordAudit(ctx, {
        action: current ? "mission_sheet.updated" : "mission_sheet.created",
        entityType: "site",
        entityId: input.siteId,
        metadata: { title: input.title, version, tasks: input.tasks.length, refreshed },
      });
      return { id: sheet.id, version, refreshed };
    }),

  /** Retire une fiche (elle reste liée aux passages déjà faits avec elle). */
  archive: orgProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      requireManager(ctx);
      const sheet = await ctx.db.missionSheet.update({
        where: { id: input.id },
        data: { archivedAt: new Date(), updatedById: ctx.user.id },
      });
      await refreshUpcomingVisits(ctx.organizationId, sheet);
      await recordAudit(ctx, {
        action: "mission_sheet.archived",
        entityType: "site",
        entityId: sheet.siteId,
        metadata: { title: sheet.title, version: sheet.version },
      });
      return { ok: true };
    }),

  /** Historique des versions d'une fiche. */
  versions: orgProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      requireManager(ctx);
      const versions = await ctx.db.missionSheetVersion.findMany({
        where: { sheetId: input.id },
        include: { createdBy: { select: { name: true } } },
        orderBy: { version: "desc" },
      });
      return versions.map((v) => {
        const snap = v.snapshot as ReturnType<typeof snapshotOf>;
        return {
          version: v.version,
          createdAt: v.createdAt,
          author: v.createdBy?.name ?? null,
          note: v.note,
          title: snap.title,
          tasks: snap.tasks.length,
        };
      });
    }),
});
