import {
  ESTIMATE_STATUSES,
  WEEKDAYS,
  computeEstimate,
  labelOf,
  parseDay,
  recordPath,
  visitsPerMonthOf,
} from "@quercy/core";
import { SalesError, quoteFromEstimate } from "@quercy/documents";
import { cleaningManagerIds, generateInterventions } from "@quercy/jobs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { bossIds, minMarginOf, recomputeEstimates } from "../../estimates/service";
import { notify } from "../../notify";
import { type RecordsCtx, entityContext } from "../../records/context";
import { createTRPCRouter, orgProcedure, recordAudit } from "../init";
import { isCleaningManager } from "./sites";

const isBoss = (ctx: RecordsCtx) => ["owner", "admin"].includes(ctx.workspace.role.systemKey ?? "");

const cents = z.number().int().min(0).max(100_000_000);
const weekday = z.enum(WEEKDAYS.map((d) => d.value) as [string, ...string[]]);
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()
  .default(null);

const inputs = z.object({
  kind: z.enum(["one_off", "recurring"]),
  people: z.number().int().min(0).max(200),
  hoursPerPerson: z.number().min(0).max(1000),
  hourlyCostCents: cents,
  km: z.number().min(0).max(100_000),
  kmCostCents: cents,
  travelMinutes: z.number().int().min(0).max(10_000),
  productsCents: cents,
  equipmentCents: cents,
  rentalCents: cents,
  subcontractCents: cents,
  otherCents: cents,
  targetMarginPct: z.number().min(0).max(95),
  priceCents: cents.nullable(),
  weekdays: z.array(weekday).max(7).default([]),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .default(null),
  startDate: day,
  endDate: day,
});

async function load(ctx: RecordsCtx, id: string) {
  const { scopeWhere } = await entityContext(ctx, "estimate", "view");
  const estimate = await ctx.db.estimate.findFirst({ where: { id, ...scopeWhere } });
  if (!estimate) throw new TRPCError({ code: "NOT_FOUND", message: "Chiffrage introuvable." });
  return estimate;
}

/** Une erreur métier des documents devient un message pour la personne. */
async function sales<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof SalesError)
      throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
    throw error;
  }
}

export const estimatesRouter = createTRPCRouter({
  /** Chiffrage avec son calcul détaillé et ce que la personne peut faire. */
  get: orgProcedure.input(z.object({ id: z.string().min(1) })).query(async ({ ctx, input }) => {
    const e = await load(ctx, input.id);
    const minMarginPct = await minMarginOf(ctx.organizationId);
    const settings = await ctx.db.salesSettings.findUnique({
      where: { organizationId: ctx.organizationId },
      select: { defaultHourlyCostCents: true, defaultKmCostCents: true },
    });
    const users = await ctx.db.user.findMany({
      where: { id: { in: [e.approvedById, e.ownerApprovedById].filter((x): x is string => !!x) } },
      select: { id: true, name: true },
    });
    const name = (id: string | null) => users.find((u) => u.id === id)?.name ?? null;
    const visitsPerMonth = e.kind === "recurring" ? visitsPerMonthOf(e.weekdays) : null;
    return {
      estimate: {
        ...e,
        startDate: e.startDate?.toISOString().slice(0, 10) ?? null,
        endDate: e.endDate?.toISOString().slice(0, 10) ?? null,
      },
      statusLabel: labelOf(ESTIMATE_STATUSES, e.status),
      breakdown: computeEstimate({ ...e, visitsPerMonth }, minMarginPct),
      visitsPerMonth,
      minMarginPct,
      defaults: {
        hourlyCostCents: settings?.defaultHourlyCostCents ?? null,
        kmCostCents: settings?.defaultKmCostCents ?? null,
      },
      approvedBy: name(e.approvedById),
      ownerApprovedBy: name(e.ownerApprovedById),
      canApprove: isCleaningManager(ctx),
      isBoss: isBoss(ctx),
    };
  }),

  /** Enregistre les saisies ; un chiffrage déjà validé repasse en brouillon. */
  save: orgProcedure
    .input(z.object({ id: z.string().min(1), values: inputs }))
    .mutation(async ({ ctx, input }) => {
      const e = await load(ctx, input.id);
      await entityContext(ctx, "estimate", "update");
      if (["quoted", "won"].includes(e.status))
        throw new TRPCError({
          code: "CONFLICT",
          message: "Le devis est parti : faites un nouveau chiffrage pour changer le prix.",
        });
      const v = input.values;
      if (v.startDate && v.endDate && v.endDate < v.startDate)
        throw new TRPCError({ code: "BAD_REQUEST", message: "La fin précède le début." });
      await ctx.db.estimate.update({
        where: { id: e.id },
        data: {
          ...v,
          startDate: v.startDate ? parseDay(v.startDate) : null,
          endDate: v.endDate ? parseDay(v.endDate) : null,
          ...(e.status === "draft"
            ? {}
            : {
                status: "draft",
                submittedAt: null,
                approvedById: null,
                approvedAt: null,
                ownerApprovedById: null,
                ownerApprovedAt: null,
              }),
        },
      });
      await recomputeEstimates(ctx.organizationId, [e.id]);
      return { reset: e.status !== "draft" };
    }),

  /** Soumet au chef ; les responsables sont prévenus. */
  submit: orgProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const e = await load(ctx, input.id);
      await entityContext(ctx, "estimate", "update");
      if (!["draft", "rejected"].includes(e.status))
        throw new TRPCError({ code: "CONFLICT", message: "Ce chiffrage est déjà soumis." });
      if (e.costCents <= 0)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Renseignez les coûts d'abord." });
      await ctx.db.estimate.update({
        where: { id: e.id },
        data: { status: "submitted", submittedAt: new Date(), rejectionReason: null },
      });
      await notify({
        organizationId: ctx.organizationId,
        userIds: await cleaningManagerIds(ctx.organizationId),
        actorId: ctx.user.id,
        type: "estimate.submitted",
        title: `Chiffrage à valider : ${e.title}`,
        body: e.reference ?? undefined,
        url: recordPath("estimate", e.id),
      });
      await recordAudit(ctx, {
        action: "estimate.submitted",
        entityType: "estimate",
        entityId: e.id,
        metadata: { name: e.title },
      });
      return { ok: true };
    }),

  /**
   * Validation : par un chef ; sous la marge minimale, le patron (propriétaire ou
   * administrateur) valide aussi. Un patron qui valide couvre les deux.
   */
  approve: orgProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const e = await load(ctx, input.id);
      if (!isCleaningManager(ctx))
        throw new TRPCError({ code: "FORBIDDEN", message: "Réservé aux responsables." });
      if (e.status !== "submitted")
        throw new TRPCError({
          code: "CONFLICT",
          message: "Ce chiffrage n'attend pas de validation.",
        });
      const boss = isBoss(ctx);
      const now = new Date();
      const approvedById = e.approvedById ?? ctx.user.id;
      const ownerApprovedById = e.ownerApprovalRequired && boss ? ctx.user.id : e.ownerApprovedById;
      const done = !e.ownerApprovalRequired || !!ownerApprovedById;
      await ctx.db.estimate.update({
        where: { id: e.id },
        data: {
          approvedById,
          approvedAt: e.approvedAt ?? now,
          ...(ownerApprovedById && !e.ownerApprovedById
            ? { ownerApprovedById, ownerApprovedAt: now }
            : {}),
          ...(done ? { status: "approved" } : {}),
        },
      });
      if (!done)
        await notify({
          organizationId: ctx.organizationId,
          userIds: await bossIds(ctx.organizationId),
          actorId: ctx.user.id,
          type: "estimate.owner_approval",
          title: `Marge sous le minimum, validation du patron : ${e.title}`,
          body: `Marge ${e.marginPct ?? 0} % (minimum ${await minMarginOf(ctx.organizationId)} %).`,
          url: recordPath("estimate", e.id),
        });
      else if (e.ownerId)
        await notify({
          organizationId: ctx.organizationId,
          userIds: [e.ownerId],
          actorId: ctx.user.id,
          type: "estimate.approved",
          title: `Chiffrage validé : ${e.title}`,
          url: recordPath("estimate", e.id),
        });
      await recordAudit(ctx, {
        action: done ? "estimate.approved" : "estimate.approved_by_manager",
        entityType: "estimate",
        entityId: e.id,
        metadata: { name: e.title, marginPct: e.marginPct },
      });
      return { status: done ? "approved" : "submitted", waitingForBoss: !done };
    }),

  reject: orgProcedure
    .input(z.object({ id: z.string().min(1), reason: z.string().trim().min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      const e = await load(ctx, input.id);
      if (!isCleaningManager(ctx))
        throw new TRPCError({ code: "FORBIDDEN", message: "Réservé aux responsables." });
      if (e.status !== "submitted")
        throw new TRPCError({
          code: "CONFLICT",
          message: "Ce chiffrage n'attend pas de validation.",
        });
      await ctx.db.estimate.update({
        where: { id: e.id },
        data: {
          status: "rejected",
          rejectionReason: input.reason,
          approvedById: null,
          approvedAt: null,
          ownerApprovedById: null,
          ownerApprovedAt: null,
        },
      });
      if (e.ownerId)
        await notify({
          organizationId: ctx.organizationId,
          userIds: [e.ownerId],
          actorId: ctx.user.id,
          type: "estimate.rejected",
          title: `Chiffrage refusé : ${e.title}`,
          body: input.reason,
          url: recordPath("estimate", e.id),
        });
      await recordAudit(ctx, {
        action: "estimate.rejected",
        entityType: "estimate",
        entityId: e.id,
        metadata: { name: e.title, reason: input.reason },
      });
      return { ok: true };
    }),

  /** Devis brouillon depuis le chiffrage validé. */
  createQuote: orgProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const e = await load(ctx, input.id);
      await entityContext(ctx, "quote", "create");
      const { quote } = await sales(() => quoteFromEstimate(ctx.organizationId, e.id, ctx.user.id));
      await recordAudit(ctx, {
        action: "estimate.quoted",
        entityType: "estimate",
        entityId: e.id,
        metadata: { name: e.title, quoteId: quote.id },
      });
      return { quoteId: quote.id };
    }),

  /**
   * Contrat depuis le chiffrage (devis accepté ou chiffrage validé) : récurrent, il remplit
   * le planning ; ponctuel, il crée son passage à la date prévue.
   */
  createContract: orgProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const e = await load(ctx, input.id);
      await entityContext(ctx, "cleaningContract", "create");
      if (e.contractId)
        throw new TRPCError({ code: "CONFLICT", message: "Le contrat existe déjà." });
      if (!["approved", "quoted"].includes(e.status))
        throw new TRPCError({ code: "CONFLICT", message: "Le chiffrage doit être validé." });
      if (!e.siteId)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Choisissez le site du chiffrage." });
      if (!e.startDate)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Indiquez la date de début." });
      if (e.kind === "recurring" && !e.weekdays.length)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Choisissez les jours de passage du contrat récurrent.",
        });
      const price = e.priceCents ?? e.advisedPriceCents;
      const recurring = e.kind === "recurring";
      const minutes = Math.round(e.hoursPerPerson * 60) || null;
      const contract = await ctx.db.cleaningContract.create({
        data: {
          organizationId: ctx.organizationId,
          name: e.title,
          siteId: e.siteId,
          companyId: e.companyId,
          status: "active",
          kind: e.kind,
          billingMode: recurring ? "monthly" : "per_visit",
          monthlyPriceCents: recurring ? (e.monthlyPriceCents ?? null) : null,
          visitPriceCents: price,
          weekdays: e.weekdays,
          startTime: e.startTime,
          durationMinutes: minutes,
          startDate: e.startDate,
          endDate: e.endDate,
          description: e.notes,
          ownerId: ctx.user.id,
        },
      });
      if (recurring)
        await generateInterventions({
          organizationId: ctx.organizationId,
          contractIds: [contract.id],
        });
      else
        await ctx.db.intervention.create({
          data: {
            organizationId: ctx.organizationId,
            title: e.title,
            siteId: e.siteId,
            companyId: e.companyId,
            contractId: contract.id,
            date: e.startDate,
            startTime: e.startTime,
            durationMinutes: minutes,
            status: "planned",
          },
        });
      await ctx.db.estimate.update({
        where: { id: e.id },
        data: { contractId: contract.id, status: "won" },
      });
      if (e.quoteId)
        await ctx.db.salesDocument.updateMany({
          where: { id: e.quoteId, status: { in: ["draft", "sent"] } },
          data: { status: "accepted", acceptedAt: new Date() },
        });
      await recordAudit(ctx, {
        action: "estimate.contracted",
        entityType: "estimate",
        entityId: e.id,
        metadata: { name: e.title, contractId: contract.id, kind: e.kind },
      });
      return { contractId: contract.id };
    }),

  /** Un contrat ponctuel devient récurrent : jours de passage, forfait, planning rempli. */
  makeRecurring: orgProcedure
    .input(
      z.object({
        contractId: z.string().min(1),
        weekdays: z.array(weekday).min(1).max(7),
        startTime: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .nullable()
          .default(null),
        monthlyPriceCents: cents,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { scopeWhere } = await entityContext(ctx, "cleaningContract", "update");
      const contract = await ctx.db.cleaningContract.findFirst({
        where: { id: input.contractId, ...scopeWhere },
      });
      if (!contract) throw new TRPCError({ code: "NOT_FOUND", message: "Contrat introuvable." });
      if (contract.kind === "recurring")
        throw new TRPCError({ code: "CONFLICT", message: "Ce contrat est déjà récurrent." });
      await ctx.db.cleaningContract.update({
        where: { id: contract.id },
        data: {
          kind: "recurring",
          billingMode: "monthly",
          weekdays: input.weekdays,
          startTime: input.startTime ?? contract.startTime,
          monthlyPriceCents: input.monthlyPriceCents,
          status: "active",
        },
      });
      const { created } = await generateInterventions({
        organizationId: ctx.organizationId,
        contractIds: [contract.id],
      });
      await recordAudit(ctx, {
        action: "contract.made_recurring",
        entityType: "cleaningContract",
        entityId: contract.id,
        metadata: { name: contract.name, weekdays: input.weekdays },
      });
      return { created };
    }),
});
