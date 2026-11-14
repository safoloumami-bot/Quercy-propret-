import { type BillingInterval, PLANS, billingIntervalSchema, moduleLimitError } from "@quercy/core";
import { prisma } from "@quercy/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { env } from "../../env";
import { loadBillingState } from "../../billing/state";
import { priceIdFor, stripe, stripeConfigured } from "../../billing/stripe";
import { applySubscription } from "../../billing/sync";
import { authorize, createTRPCRouter, orgProcedure, recordAudit } from "../init";

const paidPlanSchema = z.enum(["PRO", "BUSINESS"]);

function requireStripe() {
  if (!stripeConfigured()) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Le paiement en ligne n'est pas configuré sur cette installation. Contactez l'administrateur de la plateforme.",
    });
  }
  return stripe();
}

function stripeFailure(error: unknown): never {
  console.error(
    JSON.stringify({ level: "error", msg: "billing.stripe_error", error: String(error) }),
  );
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message:
      "Le service de paiement ne répond pas. Réessayez dans un instant ; rien n'a été facturé.",
  });
}

export const billingRouter = createTRPCRouter({
  overview: orgProcedure.query(async ({ ctx }) => {
    authorize(ctx, "billing", "view", "La facturation est réservée aux administrateurs.");
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: ctx.organizationId } });
    const state = await loadBillingState(org);
    return {
      plan: org.plan,
      subscriptionStatus: org.subscriptionStatus,
      billingInterval: org.billingInterval,
      seats: org.seats,
      currentPeriodEnd: org.currentPeriodEnd,
      cancelAtPeriodEnd: org.cancelAtPeriodEnd,
      trialEndsAt: org.trialEndsAt,
      hasSubscription: Boolean(org.stripeSubscriptionId),
      hasCustomer: Boolean(org.stripeCustomerId),
      state,
      usage: { members: state.memberCount, modules: org.modules.length },
      stripeConfigured: stripeConfigured(),
      canManage: ctx.workspace.role.permissions.billing?.admin === "all",
      salesEmail: env().SALES_EMAIL,
    };
  }),

  invoices: orgProcedure.query(async ({ ctx }) => {
    authorize(ctx, "billing", "view");
    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: ctx.organizationId },
      select: { stripeCustomerId: true },
    });
    if (!org.stripeCustomerId || !stripeConfigured()) return [];
    const list = await stripe()
      .invoices.list({ customer: org.stripeCustomerId, limit: 24 })
      .catch(stripeFailure);
    return list.data.map((i) => ({
      id: i.id,
      number: i.number,
      createdAt: new Date(i.created * 1000),
      total: i.total,
      currency: i.currency.toUpperCase(),
      status: i.status,
      pdfUrl: i.invoice_pdf ?? null,
      hostedUrl: i.hosted_invoice_url ?? null,
    }));
  }),

  /** Première souscription : page de paiement Stripe Checkout. */
  checkout: orgProcedure
    .input(z.object({ plan: paidPlanSchema, interval: billingIntervalSchema }))
    .mutation(async ({ ctx, input }) => {
      authorize(
        ctx,
        "billing",
        "admin",
        "Seul le propriétaire de l'espace peut souscrire un abonnement.",
      );
      const client = requireStripe();
      const org = await prisma.organization.findUniqueOrThrow({
        where: { id: ctx.organizationId },
      });
      if (org.stripeSubscriptionId) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Un abonnement existe déjà : changez d'offre depuis cette page.",
        });
      }
      const limitError = moduleLimitError(
        PLANS[input.plan].limits,
        org.modules.length,
        PLANS[input.plan].name,
      );
      if (limitError) throw new TRPCError({ code: "PRECONDITION_FAILED", message: limitError });

      const members = await prisma.membership.count({
        where: { organizationId: org.id, deletedAt: null },
      });
      const appUrl = env().APP_URL;
      try {
        let customer = org.stripeCustomerId;
        if (!customer) {
          const created = await client.customers.create({
            name: org.name,
            email: ctx.user.email,
            metadata: { organizationId: org.id },
            preferred_locales: ["fr"],
          });
          customer = created.id;
          await prisma.organization.update({
            where: { id: org.id },
            data: { stripeCustomerId: customer },
          });
        }
        const session = await client.checkout.sessions.create({
          mode: "subscription",
          customer,
          client_reference_id: org.id,
          line_items: [
            { price: priceIdFor(input.plan, input.interval), quantity: Math.max(1, members) },
          ],
          subscription_data: { metadata: { organizationId: org.id } },
          billing_address_collection: "required",
          tax_id_collection: { enabled: true },
          customer_update: { name: "auto", address: "auto" },
          allow_promotion_codes: true,
          locale: "fr",
          success_url: `${appUrl}/reglages/facturation?paiement=confirme`,
          cancel_url: `${appUrl}/reglages/facturation`,
        });
        if (!session.url) throw new Error("Session Checkout sans URL.");
        return { url: session.url };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        return stripeFailure(error);
      }
    }),

  /** Changement d'offre ou de périodicité d'un abonnement existant (au prorata). */
  changePlan: orgProcedure
    .input(z.object({ plan: paidPlanSchema, interval: billingIntervalSchema }))
    .mutation(async ({ ctx, input }) => {
      authorize(ctx, "billing", "admin", "Seul le propriétaire de l'espace peut changer d'offre.");
      const client = requireStripe();
      const org = await prisma.organization.findUniqueOrThrow({
        where: { id: ctx.organizationId },
      });
      if (!org.stripeSubscriptionId) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Aucun abonnement actif : choisissez d'abord une offre.",
        });
      }
      const limitError = moduleLimitError(
        PLANS[input.plan].limits,
        org.modules.length,
        PLANS[input.plan].name,
      );
      if (limitError) throw new TRPCError({ code: "PRECONDITION_FAILED", message: limitError });
      try {
        const current = await client.subscriptions.retrieve(org.stripeSubscriptionId);
        const item = current.items.data[0];
        if (!item) throw new Error("Abonnement sans ligne.");
        const updated = await client.subscriptions.update(current.id, {
          items: [{ id: item.id, price: priceIdFor(input.plan, input.interval) }],
          proration_behavior: "create_prorations",
          cancel_at_period_end: false,
        });
        await applySubscription(updated);
      } catch (error) {
        return stripeFailure(error);
      }
      await recordAudit(ctx, {
        action: "billing.plan.update",
        entityType: "organization",
        entityId: ctx.organizationId,
        changes: {
          plan: { before: org.plan, after: input.plan },
          billingInterval: {
            before: org.billingInterval,
            after: input.interval satisfies BillingInterval,
          },
        },
      });
      return { ok: true };
    }),

  /** Portail client Stripe : moyen de paiement, adresse, factures. */
  portal: orgProcedure.mutation(async ({ ctx }) => {
    authorize(
      ctx,
      "billing",
      "admin",
      "Seul le propriétaire de l'espace gère le moyen de paiement.",
    );
    const client = requireStripe();
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: ctx.organizationId } });
    if (!org.stripeCustomerId) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Aucun moyen de paiement enregistré pour l'instant.",
      });
    }
    const session = await client.billingPortal.sessions
      .create({
        customer: org.stripeCustomerId,
        return_url: `${env().APP_URL}/reglages/facturation`,
        locale: "fr",
      })
      .catch(stripeFailure);
    return { url: session.url };
  }),

  /** Annulation en fin de période (ou reprise d'un abonnement dont l'annulation est programmée). */
  setCancelAtPeriodEnd: orgProcedure
    .input(z.object({ cancel: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      authorize(
        ctx,
        "billing",
        "admin",
        "Seul le propriétaire de l'espace peut résilier l'abonnement.",
      );
      const client = requireStripe();
      const org = await prisma.organization.findUniqueOrThrow({
        where: { id: ctx.organizationId },
      });
      if (!org.stripeSubscriptionId)
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Aucun abonnement actif." });
      const updated = await client.subscriptions
        .update(org.stripeSubscriptionId, { cancel_at_period_end: input.cancel })
        .catch(stripeFailure);
      await applySubscription(updated);
      await recordAudit(ctx, {
        action: input.cancel ? "billing.cancel" : "billing.resume",
        entityType: "organization",
        entityId: ctx.organizationId,
      });
      return { ok: true };
    }),
});
