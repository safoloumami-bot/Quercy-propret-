import {
  type PlanKey,
  type SubscriptionStatus,
  billingState,
  monthlyRecurringRevenue,
} from "@quercy/core";
import { prisma } from "@quercy/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { runStripeEvent } from "../../billing/webhook";
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
});
