import "server-only";

import { addPayment, publicDocumentUrl } from "@quercy/documents";
import { prisma } from "@quercy/db";
import Stripe from "stripe";

import { env } from "../env";
import { publish } from "../realtime";
import { decryptSecret } from "../secrets";

/** Client Stripe de l'entreprise (ses propres clés), ou null si le paiement en ligne n'est pas configuré. */
export async function organizationStripe(
  organizationId: string,
): Promise<{ client: Stripe; webhookSecret: string } | null> {
  const settings = await prisma.salesSettings.findUnique({ where: { organizationId } });
  if (!settings?.stripeSecretKeyEnc || !settings.stripeWebhookSecretEnc) return null;
  return {
    client: new Stripe(decryptSecret(settings.stripeSecretKeyEnc), {
      appInfo: { name: "Quercy" },
      maxNetworkRetries: 2,
    }),
    webhookSecret: decryptSecret(settings.stripeWebhookSecretEnc),
  };
}

/** Session de paiement Stripe Checkout pour le reste dû d'une facture (lien public). */
export async function createInvoiceCheckout(token: string): Promise<string> {
  const invoice = await prisma.salesDocument.findUnique({
    where: { publicToken: token },
    include: {
      organization: { select: { name: true } },
      contact: { select: { email: true } },
      company: { select: { email: true } },
    },
  });
  if (!invoice || invoice.deletedAt || invoice.kind !== "INVOICE")
    throw new Error("Facture introuvable.");
  if (!["sent", "partial", "overdue"].includes(invoice.status) || invoice.dueCents <= 0)
    throw new Error("Cette facture n'a plus de montant à régler.");
  const stripe = await organizationStripe(invoice.organizationId);
  if (!stripe) throw new Error("Le paiement en ligne n'est pas activé par l'émetteur.");
  const url = publicDocumentUrl(env().APP_URL, token);
  const metadata = { organizationId: invoice.organizationId, documentId: invoice.id };
  const session = await stripe.client.checkout.sessions.create({
    mode: "payment",
    locale: "fr",
    customer_email: invoice.contact?.email ?? invoice.company?.email ?? undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: invoice.dueCents,
          product_data: { name: `Facture ${invoice.number} — ${invoice.organization.name}` },
        },
      },
    ],
    metadata,
    payment_intent_data: { metadata, description: `Facture ${invoice.number}` },
    success_url: `${url}?paiement=ok`,
    cancel_url: `${url}?paiement=annule`,
  });
  if (!session.url) throw new Error("Stripe n'a pas renvoyé de page de paiement.");
  return session.url;
}

/**
 * Webhook Stripe d'une entreprise : un paiement Checkout réussi devient un encaissement sur la
 * facture (idempotent : la référence est l'identifiant de la session).
 */
export async function receiveInvoicePayment(
  organizationId: string,
  payload: string,
  signature: string,
): Promise<"recorded" | "ignored"> {
  const stripe = await organizationStripe(organizationId);
  if (!stripe) throw new Error("Paiement en ligne non configuré pour cet espace.");
  const event = stripe.client.webhooks.constructEvent(payload, signature, stripe.webhookSecret);
  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded"
  )
    return "ignored";
  const session = event.data.object;
  if (session.payment_status !== "paid") return "ignored";
  const documentId = session.metadata?.documentId;
  if (!documentId || session.metadata?.organizationId !== organizationId) return "ignored";
  await addPayment(
    organizationId,
    documentId,
    {
      amountCents: session.amount_total ?? 0,
      date: new Date(event.created * 1000),
      method: "stripe",
      reference: session.id,
    },
    null,
  );
  await publish(organizationId, {
    type: "record.changed",
    entity: "invoice",
    ids: [documentId],
    actorId: null,
  });
  return "recorded";
}
