import "server-only";

import {
  type BillingState,
  type PlanKey,
  type SubscriptionStatus,
  billingState,
} from "@quercy/core";
import { prisma } from "@quercy/db";

/** État de facturation d'un espace (offre effective, limites, lecture seule). */
export async function loadBillingState(org: {
  id: string;
  plan: string;
  subscriptionStatus?: string;
  trialEndsAt: Date | null;
  pastDueSince?: Date | null;
  modules: readonly string[];
}): Promise<BillingState & { memberCount: number }> {
  const memberCount = await prisma.membership.count({
    where: { organizationId: org.id, deletedAt: null },
  });
  const state = billingState({
    plan: org.plan as PlanKey,
    subscriptionStatus: (org.subscriptionStatus ?? "NONE") as SubscriptionStatus,
    trialEndsAt: org.trialEndsAt,
    pastDueSince: org.pastDueSince ?? null,
    memberCount,
    moduleCount: org.modules.length,
  });
  return { ...state, memberCount };
}

/** Erreur « limite de l'offre atteinte » : l'interface propose alors de changer d'offre. */
export class PlanLimitError extends Error {
  override readonly name = "PlanLimitError";
}
