import { z } from "zod";

import { MODULE_KEYS } from "./modules";

export const PLAN_KEYS = ["FREE", "PRO", "BUSINESS", "ENTERPRISE"] as const;
export const planKeySchema = z.enum(PLAN_KEYS);
export type PlanKey = z.infer<typeof planKeySchema>;

export const BILLING_INTERVALS = ["MONTH", "YEAR"] as const;
export const billingIntervalSchema = z.enum(BILLING_INTERVALS);
export type BillingInterval = z.infer<typeof billingIntervalSchema>;

export const SUBSCRIPTION_STATUSES = [
  "NONE",
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "UNPAID",
  "CANCELED",
  "INCOMPLETE",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/** Remise de l'engagement annuel. */
export const ANNUAL_DISCOUNT = 0.2;
/** Durée de l'essai gratuit du plan Business (sans carte). */
export const TRIAL_DAYS = 14;
/** Délai de grâce après un paiement refusé, avant le passage en lecture seule. */
export const GRACE_PERIOD_DAYS = 7;

export interface PlanLimits {
  /** null = illimité */
  maxMembers: number | null;
  maxModules: number | null;
  storageGbPerMember: number;
  aiCreditsPerMemberMonthly: number;
  automations: boolean;
}

export interface PlanDefinition {
  key: PlanKey;
  name: string;
  tagline: string;
  /** Prix mensuel HT par utilisateur, en centimes ; null = sur devis. */
  monthlyPricePerSeat: number | null;
  limits: PlanLimits;
  highlights: string[];
  selfServe: boolean;
}

export const PLANS: Record<PlanKey, PlanDefinition> = {
  FREE: {
    key: "FREE",
    name: "Gratuit",
    tagline: "Pour démarrer seul.",
    monthlyPricePerSeat: 0,
    limits: {
      maxMembers: 1,
      maxModules: 2,
      storageGbPerMember: 1,
      aiCreditsPerMemberMonthly: 50,
      automations: false,
    },
    highlights: [
      "1 utilisateur",
      "2 modules au choix",
      "1 Go de stockage",
      "50 crédits IA par mois",
    ],
    selfServe: true,
  },
  PRO: {
    key: "PRO",
    name: "Pro",
    tagline: "Pour les petites équipes.",
    monthlyPricePerSeat: 1500,
    limits: {
      maxMembers: null,
      maxModules: 6,
      storageGbPerMember: 10,
      aiCreditsPerMemberMonthly: 500,
      automations: false,
    },
    highlights: [
      "Utilisateurs illimités",
      "6 modules au choix",
      "10 Go par utilisateur",
      "500 crédits IA par utilisateur et par mois",
    ],
    selfServe: true,
  },
  BUSINESS: {
    key: "BUSINESS",
    name: "Business",
    tagline: "Tout Quercy, sans limite de modules.",
    monthlyPricePerSeat: 2900,
    limits: {
      maxMembers: null,
      maxModules: MODULE_KEYS.length,
      storageGbPerMember: 50,
      aiCreditsPerMemberMonthly: 3000,
      automations: true,
    },
    highlights: [
      "Tous les modules",
      "Automatisations",
      "50 Go par utilisateur",
      "IA étendue : 3 000 crédits par utilisateur et par mois",
    ],
    selfServe: true,
  },
  ENTERPRISE: {
    key: "ENTERPRISE",
    name: "Entreprise",
    tagline: "Pour les grandes organisations.",
    monthlyPricePerSeat: null,
    limits: {
      maxMembers: null,
      maxModules: MODULE_KEYS.length,
      storageGbPerMember: 200,
      aiCreditsPerMemberMonthly: 10000,
      automations: true,
    },
    highlights: [
      "Tout Business",
      "Hébergement dédié possible",
      "Accompagnement et SLA",
      "Facturation sur devis",
    ],
    selfServe: false,
  },
};

/** Prix HT par utilisateur et par mois (en centimes), selon la périodicité. */
export function pricePerSeatPerMonth(plan: PlanKey, interval: BillingInterval): number | null {
  const monthly = PLANS[plan].monthlyPricePerSeat;
  if (monthly === null) return null;
  return interval === "YEAR" ? Math.round(monthly * (1 - ANNUAL_DISCOUNT)) : monthly;
}

/** Revenu mensuel récurrent (MRR, centimes HT) d'un abonnement. */
export function monthlyRecurringRevenue(
  plan: PlanKey,
  interval: BillingInterval | null,
  seats: number,
): number {
  return (pricePerSeatPerMonth(plan, interval ?? "MONTH") ?? 0) * Math.max(0, seats);
}

/** Montant formaté en euros (« 1 234,50 € »). */
export function formatCents(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export interface BillingSnapshot {
  plan: PlanKey;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: Date | null;
  pastDueSince: Date | null;
  memberCount: number;
  moduleCount: number;
}

export type ReadOnlyReason = "trial_ended_over_limits" | "payment_overdue" | "unpaid";

export interface BillingState {
  /** Offre réellement appliquée (un essai terminé sans abonnement revient au Gratuit). */
  effectivePlan: PlanKey;
  limits: PlanLimits;
  trialing: boolean;
  trialDaysLeft: number | null;
  /** Paiement refusé, encore dans le délai de grâce. */
  gracePeriod: { daysLeft: number } | null;
  readOnly: ReadOnlyReason | null;
  overLimits: { members: boolean; modules: boolean };
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * État de facturation d'un espace à un instant donné. Fonction pure : les mêmes règles
 * s'appliquent partout (serveur, bannières, super-admin).
 *
 * - Essai sans abonnement : plan Business jusqu'à `trialEndsAt`, puis Gratuit.
 * - Au-delà des limites du plan effectif après l'essai : lecture seule jusqu'à la souscription.
 * - Paiement refusé : délai de grâce de 7 jours, puis lecture seule ; « impayé » : lecture seule.
 */
export function billingState(snapshot: BillingSnapshot, now: Date = new Date()): BillingState {
  const paying = ["ACTIVE", "PAST_DUE", "UNPAID", "TRIALING"].includes(snapshot.subscriptionStatus);
  const inTrial =
    !paying && snapshot.trialEndsAt !== null && snapshot.trialEndsAt.getTime() > now.getTime();
  const trialExpired =
    !paying && snapshot.plan !== "FREE" && snapshot.plan !== "ENTERPRISE" && !inTrial;

  const effectivePlan: PlanKey = trialExpired ? "FREE" : snapshot.plan;
  const limits = PLANS[effectivePlan].limits;
  const overLimits = {
    members: limits.maxMembers !== null && snapshot.memberCount > limits.maxMembers,
    modules: limits.maxModules !== null && snapshot.moduleCount > limits.maxModules,
  };

  let gracePeriod: BillingState["gracePeriod"] = null;
  let readOnly: ReadOnlyReason | null = null;
  if (snapshot.subscriptionStatus === "UNPAID") {
    readOnly = "unpaid";
  } else if (snapshot.subscriptionStatus === "PAST_DUE") {
    const since = snapshot.pastDueSince ?? now;
    const daysLeft = Math.ceil((since.getTime() + GRACE_PERIOD_DAYS * DAY - now.getTime()) / DAY);
    if (daysLeft > 0) gracePeriod = { daysLeft };
    else readOnly = "payment_overdue";
  } else if (trialExpired && (overLimits.members || overLimits.modules)) {
    readOnly = "trial_ended_over_limits";
  }

  return {
    effectivePlan,
    limits,
    trialing: inTrial || snapshot.subscriptionStatus === "TRIALING",
    trialDaysLeft: inTrial
      ? Math.max(0, Math.ceil((snapshot.trialEndsAt!.getTime() - now.getTime()) / DAY))
      : null,
    gracePeriod,
    readOnly,
    overLimits,
  };
}

export const READ_ONLY_MESSAGES: Record<ReadOnlyReason, string> = {
  trial_ended_over_limits:
    "L'essai est terminé et l'espace dépasse les limites de l'offre Gratuite. Les données restent consultables ; choisissez une offre pour continuer à travailler.",
  payment_overdue:
    "Le dernier paiement a échoué et le délai de grâce est écoulé. Les données restent consultables ; mettez à jour le moyen de paiement pour réactiver l'espace.",
  unpaid:
    "L'abonnement est impayé. Les données restent consultables ; régularisez le paiement pour réactiver l'espace.",
};

/** Vérifie qu'un nombre de membres tient dans l'offre ; renvoie un message sinon. */
export function memberLimitError(
  limits: PlanLimits,
  wanted: number,
  planName: string,
): string | null {
  if (limits.maxMembers === null || wanted <= limits.maxMembers) return null;
  return `L'offre ${planName} est limitée à ${limits.maxMembers} utilisateur${limits.maxMembers > 1 ? "s" : ""}. Passez à l'offre Pro pour inviter votre équipe.`;
}

export function moduleLimitError(
  limits: PlanLimits,
  wanted: number,
  planName: string,
): string | null {
  if (limits.maxModules === null || wanted <= limits.maxModules) return null;
  return `L'offre ${planName} permet ${limits.maxModules} modules actifs. Désactivez-en un ou passez à l'offre supérieure.`;
}
