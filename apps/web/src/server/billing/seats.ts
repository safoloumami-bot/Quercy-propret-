import "server-only";

import { prisma } from "@quercy/db";

import { stripe, stripeConfigured } from "./stripe";
import { applySubscription } from "./sync";

/**
 * Aligne le nombre de sièges facturés sur le nombre de membres (facturation au prorata).
 * Appelé après chaque arrivée ou départ. Au mieux : un échec est journalisé sans bloquer
 * l'action de l'utilisateur, et le webhook suivant resynchronise l'état.
 */
export async function syncSeats(organizationId: string): Promise<void> {
  if (!stripeConfigured()) return;
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { stripeSubscriptionId: true, seats: true },
  });
  if (!org?.stripeSubscriptionId) return;
  const members = await prisma.membership.count({ where: { organizationId, deletedAt: null } });
  const quantity = Math.max(1, members);
  if (quantity === org.seats) return;
  try {
    const subscription = await stripe().subscriptions.retrieve(org.stripeSubscriptionId);
    const item = subscription.items.data[0];
    if (!item) return;
    const updated = await stripe().subscriptions.update(subscription.id, {
      items: [{ id: item.id, quantity }],
      proration_behavior: "create_prorations",
    });
    await applySubscription(updated);
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "billing.seats.sync_failed",
        organizationId,
        error: String(error),
      }),
    );
  }
}
