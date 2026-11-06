import "server-only";

import type { SubscriptionStatus } from "@quercy/core";
import { prisma } from "@quercy/db";
import type Stripe from "stripe";

import { planFromPriceId } from "./stripe";

const STATUS_MAP: Record<string, SubscriptionStatus> = {
  active: "ACTIVE",
  trialing: "TRIALING",
  past_due: "PAST_DUE",
  unpaid: "UNPAID",
  canceled: "CANCELED",
  incomplete: "INCOMPLETE",
  incomplete_expired: "CANCELED",
  paused: "UNPAID",
};

function customerId(value: string | { id: string } | null): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

/** Retrouve l'espace concerné : métadonnée posée au Checkout, sinon client ou abonnement Stripe. */
export async function findOrganizationForSubscription(subscription: Stripe.Subscription) {
  const fromMetadata = subscription.metadata?.organizationId;
  if (fromMetadata) {
    const org = await prisma.organization.findUnique({ where: { id: fromMetadata } });
    if (org) return org;
  }
  const customer = customerId(subscription.customer);
  return prisma.organization.findFirst({
    where: {
      OR: [
        { stripeSubscriptionId: subscription.id },
        ...(customer ? [{ stripeCustomerId: customer }] : []),
      ],
    },
  });
}

/**
 * Recopie l'état d'un abonnement Stripe sur l'espace (offre, statut, sièges, période).
 * Stripe reste la source de vérité ; cette fonction est idempotente.
 */
export async function applySubscription(subscription: Stripe.Subscription, deleted = false) {
  const org = await findOrganizationForSubscription(subscription);
  if (!org) return { organizationId: null as string | null, ignored: true };

  const item = subscription.items.data[0];
  const mapped = item ? planFromPriceId(item.price.id) : null;
  const status: SubscriptionStatus = deleted
    ? "CANCELED"
    : (STATUS_MAP[subscription.status] ?? "INCOMPLETE");
  const now = new Date();

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      stripeCustomerId: customerId(subscription.customer) ?? org.stripeCustomerId,
      stripeSubscriptionId: deleted ? null : subscription.id,
      subscriptionStatus: status,
      ...(mapped && !deleted ? { plan: mapped.plan, billingInterval: mapped.interval } : {}),
      // Fin d'abonnement : retour à l'offre Gratuite (les données restent).
      ...(deleted
        ? {
            plan: "FREE",
            billingInterval: null,
            seats: 0,
            canceledAt: now,
            cancelAtPeriodEnd: false,
          }
        : {}),
      ...(!deleted
        ? {
            seats: item?.quantity ?? org.seats,
            currentPeriodEnd: item
              ? new Date(item.current_period_end * 1000)
              : org.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            subscribedAt: org.subscribedAt ?? now,
            // L'essai sans carte s'arrête dès la souscription.
            trialEndsAt: null,
          }
        : {}),
      pastDueSince: status === "PAST_DUE" ? (org.pastDueSince ?? now) : null,
    },
  });
  return { organizationId: org.id, ignored: false };
}
