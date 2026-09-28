/**
 * Crée (ou retrouve) dans Stripe les produits et les quatre prix de Quercy, puis affiche les
 * variables d'environnement à renseigner. Idempotent grâce aux « lookup keys » des prix.
 *
 *   STRIPE_SECRET_KEY=sk_test_... pnpm stripe:setup
 */
import { ANNUAL_DISCOUNT, PLANS } from "@quercy/core";
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error(
    "Renseignez STRIPE_SECRET_KEY (clé de test sk_test_…) dans .env ou l'environnement.",
  );
  process.exit(1);
}
const stripe = new Stripe(key);

async function ensureProduct(plan: "PRO" | "BUSINESS") {
  const existing = await stripe.products.search({ query: `metadata['quercy_plan']:'${plan}'` });
  if (existing.data[0]) return existing.data[0];
  return stripe.products.create({
    name: `Quercy ${PLANS[plan].name}`,
    description: PLANS[plan].tagline,
    metadata: { quercy_plan: plan },
  });
}

async function ensurePrice(
  plan: "PRO" | "BUSINESS",
  interval: "month" | "year",
  productId: string,
) {
  const lookupKey = `quercy_${plan.toLowerCase()}_${interval}`;
  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
  if (existing.data[0]) return existing.data[0];
  const monthly = PLANS[plan].monthlyPricePerSeat!;
  return stripe.prices.create({
    product: productId,
    currency: "eur",
    lookup_key: lookupKey,
    // Prix par utilisateur ; la quantité de l'abonnement = nombre de membres.
    unit_amount: interval === "month" ? monthly : Math.round(monthly * (1 - ANNUAL_DISCOUNT)) * 12,
    recurring: { interval, usage_type: "licensed" },
    tax_behavior: "exclusive",
    metadata: { quercy_plan: plan },
  });
}

const lines: string[] = [];
for (const plan of ["PRO", "BUSINESS"] as const) {
  const product = await ensureProduct(plan);
  for (const interval of ["month", "year"] as const) {
    const price = await ensurePrice(plan, interval, product.id);
    lines.push(`STRIPE_PRICE_${plan}_${interval.toUpperCase()}="${price.id}"`);
  }
}

console.info("\nProduits et prix prêts. Ajoutez dans .env :\n");
console.info(lines.join("\n"));
console.info(
  "\nWebhooks en local : stripe listen --forward-to localhost:3000/api/stripe/webhook\n" +
    "puis copiez le secret « whsec_… » affiché dans STRIPE_WEBHOOK_SECRET.\n" +
    "En production, déclarez l'URL <APP_URL>/api/stripe/webhook dans le tableau de bord Stripe avec les événements :\n" +
    "checkout.session.completed, customer.subscription.created/updated/deleted, invoice.paid, invoice.payment_failed.\n",
);
