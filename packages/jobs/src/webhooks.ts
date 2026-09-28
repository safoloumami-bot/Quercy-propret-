import { createDecipheriv, createHmac, hkdfSync } from "node:crypto";

import { prisma } from "@quercy/db";

export const WEBHOOK_QUEUE = "webhooks";
const TIMEOUT_MS = 10_000;

/** Même clé que l'application web (ENCRYPTION_KEY, sinon dérivée du secret d'authentification). */
function key(): Buffer {
  if (process.env.ENCRYPTION_KEY) return Buffer.from(process.env.ENCRYPTION_KEY, "base64");
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET manquant : impossible de signer les webhooks.");
  return Buffer.from(hkdfSync("sha256", secret, "quercy", "quercy:secrets:v1", 32));
}

export function decryptSecret(sealed: string): string {
  const [version, iv, tag, data] = sealed.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Secret chiffré illisible.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(data, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

/** Signature « t=horodatage,v1=HMAC-SHA256(horodatage.corps) », vérifiable par le destinataire. */
export function signPayload(secret: string, body: string, timestamp: number): string {
  const digest = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return `t=${timestamp},v1=${digest}`;
}

/**
 * Livre un webhook. Lève une erreur en cas d'échec pour que BullMQ réessaie (5 tentatives,
 * délai exponentiel) ; l'état de chaque tentative est conservé.
 */
export async function deliverWebhook(deliveryId: string): Promise<{ status: number }> {
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { webhook: true },
  });
  if (!delivery || delivery.status === "delivered") return { status: 0 };
  const body = JSON.stringify({ id: delivery.id, ...(delivery.payload as object) });
  const timestamp = Math.floor(Date.now() / 1000);
  let statusCode: number | null = null;
  let error: string | null = null;
  try {
    const response = await fetch(delivery.webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Quercy-Webhooks/1.0",
        "X-Quercy-Event": delivery.event,
        "X-Quercy-Delivery": delivery.id,
        "X-Quercy-Signature": signPayload(decryptSecret(delivery.webhook.secret), body, timestamp),
      },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: "manual",
    });
    statusCode = response.status;
    if (!response.ok) error = `Réponse ${response.status}`;
  } catch (e) {
    error = e instanceof Error ? e.message : "Échec de connexion";
  }
  const ok = error === null;
  await prisma.webhookDelivery.update({
    where: { id: delivery.id },
    data: {
      status: ok ? "delivered" : "failed",
      statusCode,
      error,
      attempts: { increment: 1 },
    },
  });
  await prisma.webhook.update({
    where: { id: delivery.webhookId },
    data: { lastStatus: statusCode ?? 0, lastDeliveredAt: new Date() },
  });
  if (!ok) throw new Error(error!);
  return { status: statusCode! };
}
