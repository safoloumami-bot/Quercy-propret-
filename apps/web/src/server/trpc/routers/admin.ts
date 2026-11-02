import {
  DEFAULT_TRADE_PRESETS,
  GENERAL_TRADE_KEY,
  INDUSTRIES,
  type PlanKey,
  type SubscriptionStatus,
  billingState,
  monthlyRecurringRevenue,
  tradePresetInputSchema,
  tradeSlugSchema,
} from "@quercy/core";
import { prisma } from "@quercy/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { runStripeEvent } from "../../billing/webhook";
import { clearTradePresetCache, listTradePresets } from "../../trade-presets";
import { authedProcedure, createTRPCRouter } from "../init";

/** Réservé au propriétaire du SaaS (user.role = "admin"), jamais pendant une session d'assistance. */
const adminProcedure = authedProcedure.use(({ ctx, next }) => {
  const role = (ctx.user as { role?: string | null }).role;
  const impersonating = Boolean(
    (ctx.session.session as { impersonatedBy?: string | null }).impersonatedBy,
  );
  if (role !== "admin" || impersonating) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Espace réservé à l'équipe Quercy." });
  }
  return next();
});

const PAYING: SubscriptionStatus[] = ["ACTIVE", "PAST_DUE", "TRIALING"];
const DAY = 86_400_000;

export const adminRouter = createTRPCRouter({
  stats: adminProcedure.query(async () => {
    const now = new Date();
    const [paying, trials, canceled30, organizations, users] = await Promise.all([
      prisma.organization.findMany({
        where: { deletedAt: null, subscriptionStatus: { in: PAYING } },
        select: { plan: true, billingInterval: true, seats: true },
      }),
      prisma.organization.count({
        where: { deletedAt: null, subscriptionStatus: "NONE", trialEndsAt: { gt: now } },
      }),
      prisma.organization.count({
        where: { canceledAt: { gte: new Date(now.getTime() - 30 * DAY) } },
      }),
      prisma.organization.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null } }),
    ]);
    const mrr = paying.reduce(
      (sum, o) => sum + monthlyRecurringRevenue(o.plan as PlanKey, o.billingInterval, o.seats),
      0,
    );
    const base = paying.length + canceled30;
    return {
      mrr,
      arr: mrr * 12,
      payingCount: paying.length,
      trials,
      churnRate: base === 0 ? 0 : canceled30 / base,
      canceled30,
      organizations,
      users,
    };
  }),

  organizations: adminProcedure
    .input(z.object({ search: z.string().trim().max(80).optional() }))
    .query(async ({ input }) => {
      const orgs = await prisma.organization.findMany({
        where: {
          deletedAt: null,
          ...(input.search
            ? { name: { contains: input.search, mode: "insensitive" as const } }
            : {}),
        },
        include: {
          memberships: {
            where: { deletedAt: null },
            select: {
              role: { select: { systemKey: true } },
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      return orgs.map((o) => {
        const owner = o.memberships.find((m) => m.role.systemKey === "owner")?.user ?? null;
        const state = billingState({
          plan: o.plan as PlanKey,
          subscriptionStatus: o.subscriptionStatus,
          trialEndsAt: o.trialEndsAt,
          pastDueSince: o.pastDueSince,
          memberCount: o.memberships.length,
          moduleCount: o.modules.length,
        });
        return {
          id: o.id,
          name: o.name,
          createdAt: o.createdAt,
          plan: state.effectivePlan,
          subscriptionStatus: o.subscriptionStatus,
          trialDaysLeft: state.trialDaysLeft,
          readOnly: state.readOnly,
          members: o.memberships.length,
          modules: o.modules.length,
          mrr: PAYING.includes(o.subscriptionStatus)
            ? monthlyRecurringRevenue(o.plan as PlanKey, o.billingInterval, o.seats)
            : 0,
          owner,
        };
      });
    }),

  failedEvents: adminProcedure.query(() =>
    prisma.stripeEvent.findMany({
      where: { status: "FAILED" },
      select: {
        id: true,
        type: true,
        attempts: true,
        error: true,
        createdAt: true,
        organizationId: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ),

  replayEvent: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const event = await prisma.stripeEvent.findUnique({
        where: { id: input.id },
        select: { status: true },
      });
      if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Événement introuvable." });
      if (event.status === "PROCESSED") return { result: "processed" as const };
      return { result: await runStripeEvent(input.id) };
    }),

  /* ───────────── Corps de métier (préréglages proposés aux entreprises) ───────────── */

  /** Tous les préréglages, actifs ou non, avec le nombre d'espaces qui les utilisent. */
  tradePresets: adminProcedure.query(async () => {
    clearTradePresetCache();
    const [presets, usage] = await Promise.all([
      listTradePresets(),
      prisma.organization.groupBy({
        by: ["trade"],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
    ]);
    const count = new Map(usage.map((u) => [u.trade ?? GENERAL_TRADE_KEY, u._count._all]));
    return presets.map((p) => ({ ...p, organizations: count.get(p.key) ?? 0 }));
  }),

  /**
   * Enregistre un préréglage (création ou modification). Les espaces déjà créés gardent leur
   * catalogue : le préréglage sert aux nouveaux espaces et quand une entreprise choisit son
   * métier ; l'assistant IA, lui, suit immédiatement le nouveau texte.
   */
  saveTradePreset: adminProcedure
    .input(tradePresetInputSchema.extend({ isNew: z.boolean().default(false) }))
    .mutation(async ({ ctx, input }) => {
      const { isNew, ...data } = input;
      if (!INDUSTRIES.some((i) => i.value === data.industry)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Secteur d'activité inconnu." });
      }
      if (isNew) {
        const taken = (await listTradePresets()).some((p) => p.key === data.key);
        if (taken) {
          throw new TRPCError({ code: "CONFLICT", message: "Cet identifiant est déjà utilisé." });
        }
      }
      const keywords = [...new Set(data.keywords.map((k) => k.trim()).filter(Boolean))];
      const values = {
        ...data,
        keywords,
        active: data.key === GENERAL_TRADE_KEY ? true : data.active,
        catalog: data.catalog.map((c) => ({ ...c, description: c.description || undefined })),
        updatedById: ctx.user.id,
      };
      await prisma.tradePreset.upsert({
        where: { key: data.key },
        create: values,
        update: values,
      });
      clearTradePresetCache();
      return { key: data.key };
    }),

  /**
   * Préréglage d'origine : revient à la version livrée avec le logiciel.
   * Préréglage ajouté par l'équipe : le supprime s'il n'est utilisé par aucun espace
   * (sinon, il faut le désactiver).
   */
  resetTradePreset: adminProcedure
    .input(z.object({ key: tradeSlugSchema }))
    .mutation(async ({ input }) => {
      const builtin = DEFAULT_TRADE_PRESETS.some((p) => p.key === input.key);
      if (!builtin) {
        const used = await prisma.organization.count({ where: { trade: input.key } });
        if (used > 0) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Utilisé par ${used} espace${used > 1 ? "s" : ""} : désactivez-le plutôt.`,
          });
        }
      }
      await prisma.tradePreset.deleteMany({ where: { key: input.key } });
      clearTradePresetCache();
      return { result: builtin ? ("reset" as const) : ("deleted" as const) };
    }),
});
