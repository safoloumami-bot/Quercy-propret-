import {
  WORKER_DOCUMENT_KINDS,
  WORKER_KINDS,
  type WorkerKind,
  dayKey,
  documentAlertLevel,
  labelOf,
  parseDay,
  todayIn,
} from "@quercy/core";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, orgProcedure, recordAudit } from "../init";
import { isCleaningManager } from "./sites";

type Ctx = Parameters<typeof isCleaningManager>[0];

function requireManager(ctx: Ctx) {
  if (!isCleaningManager(ctx))
    throw new TRPCError({ code: "FORBIDDEN", message: "Réservé aux responsables." });
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullable()
    .default(null);

export const workersRouter = createTRPCRouter({
  /** Intervenants de l'espace (membres), leur fiche et leurs attestations. */
  list: orgProcedure.query(async ({ ctx }) => {
    requireManager(ctx);
    const [members, profiles, lines] = await Promise.all([
      ctx.db.membership.findMany({
        select: {
          user: { select: { id: true, name: true, email: true } },
          role: { select: { name: true } },
        },
      }),
      ctx.db.workerProfile.findMany({ include: { documents: { orderBy: { expiresAt: "asc" } } } }),
      ctx.db.serviceLine.findMany({
        where: { activity: { not: null } },
        select: { activity: true },
        distinct: ["activity"],
      }),
    ]);
    const today = parseDay(todayIn());
    const profileOf = new Map(profiles.map((p) => [p.userId, p]));
    const nameOf = new Map(members.map((m) => [m.user.id, m.user.name]));
    return {
      activities: lines.map((l) => l.activity!).sort((a, b) => a.localeCompare(b, "fr")),
      workers: members
        .map(({ user, role }) => {
          const p = profileOf.get(user.id);
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: role.name,
            kind: (p?.kind ?? "employee") as WorkerKind,
            kindLabel: labelOf(WORKER_KINDS, p?.kind ?? "employee"),
            activities: p?.activities ?? [],
            zone: p?.zone ?? null,
            hourlyCost: p?.hourlyCostCents != null ? p.hourlyCostCents / 100 : null,
            replacement1Id: p?.replacement1Id ?? null,
            replacement2Id: p?.replacement2Id ?? null,
            replacement1: p?.replacement1Id ? (nameOf.get(p.replacement1Id) ?? null) : null,
            replacement2: p?.replacement2Id ? (nameOf.get(p.replacement2Id) ?? null) : null,
            usualVehicle: p?.usualVehicle ?? null,
            canDriveCompanyVehicles: p?.canDriveCompanyVehicles ?? false,
            phone: p?.phone ?? null,
            companyName: p?.companyName ?? null,
            siret: p?.siret ?? null,
            notes: p?.notes ?? null,
            documents: (p?.documents ?? []).map((d) => ({
              id: d.id,
              kind: d.kind,
              kindLabel: labelOf(WORKER_DOCUMENT_KINDS, d.kind),
              label: d.label,
              expiresAt: d.expiresAt ? dayKey(d.expiresAt) : null,
              alert: documentAlertLevel(d.expiresAt, today),
            })),
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name, "fr")),
    };
  }),

  /** Enregistre la fiche d'un intervenant. */
  save: orgProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        kind: z.enum(WORKER_KINDS.map((k) => k.value) as [WorkerKind, ...WorkerKind[]]),
        activities: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
        zone: optionalText(80),
        hourlyCost: z.number().min(0).max(1000).nullable().default(null),
        replacement1Id: z.string().min(1).nullable().default(null),
        replacement2Id: z.string().min(1).nullable().default(null),
        usualVehicle: optionalText(80),
        canDriveCompanyVehicles: z.boolean().default(false),
        phone: optionalText(30),
        companyName: optionalText(120),
        siret: z
          .string()
          .trim()
          .transform((v) => v.replace(/\s/g, ""))
          .refine((v) => v === "" || /^\d{14}$/.test(v), "Le SIRET compte 14 chiffres.")
          .transform((v) => v || null)
          .nullable()
          .default(null),
        notes: optionalText(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireManager(ctx);
      const members = new Set(
        (await ctx.db.membership.findMany({ select: { userId: true } })).map((m) => m.userId),
      );
      if (!members.has(input.userId))
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cet intervenant n'est pas membre." });
      for (const r of [input.replacement1Id, input.replacement2Id])
        if (r && (!members.has(r) || r === input.userId))
          throw new TRPCError({ code: "BAD_REQUEST", message: "Remplaçant invalide." });
      if (input.replacement1Id && input.replacement1Id === input.replacement2Id)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Choisissez deux remplaçants différents.",
        });
      const data = {
        kind: input.kind,
        activities: [...new Set(input.activities)],
        zone: input.zone,
        hourlyCostCents: input.hourlyCost === null ? null : Math.round(input.hourlyCost * 100),
        replacement1Id: input.replacement1Id,
        replacement2Id: input.replacement2Id,
        usualVehicle: input.usualVehicle,
        canDriveCompanyVehicles: input.canDriveCompanyVehicles,
        phone: input.phone,
        companyName: input.kind === "subcontractor" ? input.companyName : null,
        siret: input.kind === "subcontractor" ? input.siret : null,
        notes: input.notes,
      };
      await ctx.db.workerProfile.upsert({
        where: {
          organizationId_userId: { organizationId: ctx.organizationId, userId: input.userId },
        },
        create: { ...data, organizationId: ctx.organizationId, userId: input.userId },
        update: data,
      });
      await recordAudit(ctx, {
        action: "worker.updated",
        entityType: "user",
        entityId: input.userId,
        metadata: { kind: input.kind },
      });
      return { ok: true };
    }),

  /** Ajoute ou modifie une attestation (URSSAF, assurance…) avec sa date d'expiration. */
  saveDocument: orgProcedure
    .input(
      z.object({
        id: z.string().min(1).optional(),
        userId: z.string().min(1),
        kind: z.enum(WORKER_DOCUMENT_KINDS.map((k) => k.value) as [string, ...string[]]),
        label: optionalText(120),
        expiresAt: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable()
          .default(null),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireManager(ctx);
      const profile =
        (await ctx.db.workerProfile.findFirst({ where: { userId: input.userId } })) ??
        (await ctx.db.workerProfile.create({
          data: { organizationId: ctx.organizationId, userId: input.userId, kind: "subcontractor" },
        }));
      const data = {
        kind: input.kind,
        label: input.label,
        expiresAt: input.expiresAt ? parseDay(input.expiresAt) : null,
        // Nouvelle date : les alertes repartent de zéro.
        alertLevel: null,
        alertedAt: null,
      };
      const saved = input.id
        ? await ctx.db.workerDocument.update({
            where: { id: input.id, profileId: profile.id },
            data,
          })
        : await ctx.db.workerDocument.create({
            data: { ...data, organizationId: ctx.organizationId, profileId: profile.id },
          });
      await recordAudit(ctx, {
        action: "worker.document_saved",
        entityType: "user",
        entityId: input.userId,
        metadata: { kind: input.kind, expiresAt: input.expiresAt },
      });
      return { id: saved.id };
    }),

  removeDocument: orgProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      requireManager(ctx);
      const doc = await ctx.db.workerDocument.delete({
        where: { id: input.id },
        include: { profile: { select: { userId: true } } },
      });
      await recordAudit(ctx, {
        action: "worker.document_removed",
        entityType: "user",
        entityId: doc.profile.userId,
        metadata: { kind: doc.kind },
      });
      return { ok: true };
    }),
});
