import { NextResponse } from "next/server";

import { verifyWebhook } from "@/server/billing/stripe";
import { receiveStripeEvent } from "@/server/billing/webhook";

export const dynamic = "force-dynamic";

/**
 * Webhook Stripe. Signature vérifiée sur le corps brut ; réponse 200 dès que l'événement est
 * enregistré et traité, 500 en cas d'échec (Stripe relivrera).
 */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Signature manquante." }, { status: 400 });

  const payload = await request.text();
  let event;
  try {
    event = verifyWebhook(payload, signature);
  } catch (error) {
    console.error(
      JSON.stringify({ level: "warn", msg: "stripe.webhook.invalid", error: String(error) }),
    );
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }

  const result = await receiveStripeEvent(event);
  return NextResponse.json({ received: true, result }, { status: result === "failed" ? 500 : 200 });
}
