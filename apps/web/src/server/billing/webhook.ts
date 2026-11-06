import "server-only";

import { GRACE_PERIOD_DAYS } from "@quercy/core";
import { type Prisma, prisma } from "@quercy/db";
import type Stripe from "stripe";

import { sendEmail } from "../email/send";
import { PaymentFailedEmail } from "../email/templates";
import { env } from "../env";
import { applySubscription } from "./sync";

type Outcome = { organizationId: string | null; ignored: boolean };

function id(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

async function organizationForCustomer(customer: string | null) {
  if (!customer) return null;
  return prisma.organization.findUnique({ where: { stripeCustomerId: customer } });
}

async function notifyOwners(organizationId: string, organizationName: string) {
  const owners = await prisma.membership.findMany({
    where: { organizationId, deletedAt: null, role: { systemKey: "owner" } },
    select: { user: { select: { email: true } } },
  });
  const url = `${env().APP_URL}/reglages/facturation`;
  for (const owner of owners) {
    await sendEmail({
      to: owner.user.email,
      subject: `Paiement refusé — ${organizationName}`,
      react: PaymentFailedEmail({ url, organizationName, graceDays: GRACE_PERIOD_DAYS }),
    });
  }
}

/** Applique un événement Stripe à la base. Chaque cas est idempotent. */
async function handle(event: Stripe.Event): Promise<Outcome> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const organizationId = session.client_reference_id;
      if (!organizationId || session.mode !== "subscription")
        return { organizationId, ignored: true };
      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          stripeCustomerId: id(session.customer),
          stripeSubscriptionId: id(session.subscription),
        },
      });
      return { organizationId, ignored: false };
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
      return applySubscription(event.data.object);
    case "customer.subscription.deleted":
      return applySubscription(event.data.object, true);
    case "invoice.payment_failed": {
      const org = await organizationForCustomer(id(event.data.object.customer));
      if (!org) return { organizationId: null, ignored: true };
      await prisma.organization.update({
        where: { id: org.id },
        data: { pastDueSince: org.pastDueSince ?? new Date() },
      });
      await notifyOwners(org.id, org.name);
      return { organizationId: org.id, ignored: false };
    }
    case "invoice.paid": {
      const org = await organizationForCustomer(id(event.data.object.customer));
      if (!org) return { organizationId: null, ignored: true };
      await prisma.organization.update({
        where: { id: org.id },
        data: {
          pastDueSince: null,
          ...(org.subscriptionStatus === "PAST_DUE" || org.subscriptionStatus === "UNPAID"
            ? { subscriptionStatus: "ACTIVE" }
            : {}),
        },
      });
      return { organizationId: org.id, ignored: false };
    }
    default:
      return { organizationId: null, ignored: true };
  }
}

/** Traite (ou retraite) un événement déjà enregistré. */
export async function runStripeEvent(eventId: string): Promise<"processed" | "ignored" | "failed"> {
  const record = await prisma.stripeEvent.update({
    where: { id: eventId },
    data: { attempts: { increment: 1 } },
  });
  try {
    const outcome = await handle(record.payload as unknown as Stripe.Event);
    await prisma.stripeEvent.update({
      where: { id: eventId },
      data: {
        status: outcome.ignored ? "IGNORED" : "PROCESSED",
        organizationId: outcome.organizationId,
        processedAt: new Date(),
        error: null,
      },
    });
    return outcome.ignored ? "ignored" : "processed";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      JSON.stringify({
        level: "error",
        msg: "stripe.event.failed",
        eventId,
        type: record.type,
        error: message,
      }),
    );
    await prisma.stripeEvent.update({
      where: { id: eventId },
      data: { status: "FAILED", error: message.slice(0, 2000) },
    });
    return "failed";
  }
}

/**
 * Point d'entrée des webhooks : enregistre l'événement (idempotence sur son id Stripe) puis
 * le traite. Un événement déjà traité n'est jamais rejoué deux fois ; un échec reste en base
 * et peut être rejoué depuis l'espace super-admin.
 */
export async function receiveStripeEvent(
  event: Stripe.Event,
): Promise<"processed" | "ignored" | "failed" | "duplicate"> {
  const existing = await prisma.stripeEvent.findUnique({
    where: { id: event.id },
    select: { status: true },
  });
  if (existing && (existing.status === "PROCESSED" || existing.status === "IGNORED"))
    return "duplicate";
  if (!existing) {
    await prisma.stripeEvent
      .create({
        data: {
          id: event.id,
          type: event.type,
          payload: event as unknown as Prisma.InputJsonValue,
        },
      })
      .catch((error: unknown) => {
        // Deux livraisons simultanées : la seconde s'arrête ici.
        if ((error as { code?: string }).code !== "P2002") throw error;
      });
  }
  return runStripeEvent(event.id);
}
