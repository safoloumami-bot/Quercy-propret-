import { NextResponse } from "next/server";

import { receiveInvoicePayment } from "@/server/sales/online-payment";

export const dynamic = "force-dynamic";

/**
 * Webhook Stripe propre à chaque entreprise (paiement en ligne de ses factures). La signature
 * est vérifiée avec le secret de webhook qu'elle a enregistré dans ses paramètres de vente.
 */
export async function POST(request: Request, { params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Signature manquante." }, { status: 400 });
  const payload = await request.text();
  try {
    const result = await receiveInvoicePayment(orgId, payload, signature);
    return NextResponse.json({ received: true, result });
  } catch (error) {
    console.error(
      JSON.stringify({ level: "warn", msg: "stripe.sales_webhook", orgId, error: String(error) }),
    );
    return NextResponse.json({ error: "Événement refusé." }, { status: 400 });
  }
}
