"use server";

import { prisma } from "@quercy/db";
import { redirect } from "next/navigation";
import { z } from "zod";

import { publish } from "@/server/realtime";
import { createInvoiceCheckout } from "@/server/sales/online-payment";

const acceptSchema = z.object({
  token: z.string().min(10).max(40),
  name: z.string().trim().min(2, { error: "Indiquez vos nom et prénom." }).max(120),
  agree: z.literal("on", { error: "Cochez la case « Bon pour accord »." }),
});

export interface ActionState {
  error?: string;
}

/** Acceptation d'un devis en ligne (« Bon pour accord » signé par nom, horodaté, tracé). */
export async function acceptQuote(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = acceptSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Saisie invalide." };
  const quote = await prisma.salesDocument.findUnique({
    where: { publicToken: parsed.data.token },
  });
  if (!quote || quote.deletedAt || quote.kind !== "QUOTE") return { error: "Devis introuvable." };
  if (quote.status !== "sent")
    return { error: "Ce devis ne peut plus être accepté en ligne (expiré ou déjà traité)." };
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.salesDocument.update({
      where: { id: quote.id },
      data: { status: "accepted", acceptedAt: now },
    });
    if (quote.dealId)
      await tx.deal.update({
        where: { id: quote.dealId },
        data: { stage: "won", probability: 100, closedAt: now, amount: quote.totalExclCents / 100 },
      });
    await tx.auditLog.create({
      data: {
        organizationId: quote.organizationId,
        action: "sales.quote.accepted_online",
        entityType: "quote",
        entityId: quote.id,
        metadata: { name: quote.number, signedBy: parsed.data.name, at: now.toISOString() },
      },
    });
    if (quote.ownerId)
      await tx.notification.create({
        data: {
          organizationId: quote.organizationId,
          userId: quote.ownerId,
          type: "sales.quote_accepted",
          title: `Devis ${quote.number} accepté par ${parsed.data.name}`,
          url: `/ventes/devis/${quote.id}`,
        },
      });
  });
  await publish(quote.organizationId, {
    type: "record.changed",
    entity: "quote",
    ids: [quote.id],
    actorId: null,
  });
  redirect(`/document/${parsed.data.token}?accepte=1`);
}

/** Redirection vers le paiement Stripe Checkout de l'entreprise émettrice. */
export async function payInvoice(_prev: ActionState, form: FormData): Promise<ActionState> {
  const token = String(form.get("token") ?? "");
  let url: string;
  try {
    url = await createInvoiceCheckout(token);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Paiement indisponible." };
  }
  redirect(url);
}
