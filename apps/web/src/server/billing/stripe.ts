import "server-only";

import type { BillingInterval, PlanKey } from "@quercy/core";
import Stripe from "stripe";

import { env } from "../env";

type PaidPlan = Extract<PlanKey, "PRO" | "BUSINESS">;

/** Correspondance offre × périodicité → identifiant de prix Stripe (variables d'environnement). */
export function priceIds(): Record<`${PaidPlan}_${BillingInterval}`, string | undefined> {
  const e = env();
  return {
    PRO_MONTH: e.STRIPE_PRICE_PRO_MONTH,
    PRO_YEAR: e.STRIPE_PRICE_PRO_YEAR,
    BUSINESS_MONTH: e.STRIPE_PRICE_BUSINESS_MONTH,
    BUSINESS_YEAR: e.STRIPE_PRICE_BUSINESS_YEAR,
  };
}

/** Le paiement en ligne est-il configuré (clé secrète et quatre prix) ? */
export function stripeConfigured(): boolean {
  return Boolean(env().STRIPE_SECRET_KEY) && Object.values(priceIds()).every(Boolean);
}

export function priceIdFor(plan: PaidPlan, interval: BillingInterval): string {
  const id = priceIds()[`${plan}_${interval}`];
  if (!id) throw new Error(`Prix Stripe manquant pour ${plan}/${interval}.`);
  return id;
}

/** Offre et périodicité à partir d'un identifiant de prix, ou null si inconnu. */
export function planFromPriceId(
  priceId: string,
): { plan: PaidPlan; interval: BillingInterval } | null {
  for (const [key, id] of Object.entries(priceIds())) {
    if (id && id === priceId) {
      const [plan, interval] = key.split("_") as [PaidPlan, BillingInterval];
      return { plan, interval };
    }
  }
  return null;
}

let client: Stripe | null = null;

/** Client Stripe (version d'API figée par le SDK). Lève une erreur si non configuré. */
export function stripe(): Stripe {
  const key = env().STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe n'est pas configuré (STRIPE_SECRET_KEY).");
  client ??= new Stripe(key, { appInfo: { name: "Quercy" }, maxNetworkRetries: 2 });
  return client;
}

/** Construction et vérification de signature d'un webhook (aucun appel réseau). */
export function verifyWebhook(payload: string, signature: string): Stripe.Event {
  const secret = env().STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET manquant.");
  return Stripe.webhooks.constructEvent(payload, signature, secret);
}

export type { Stripe };
