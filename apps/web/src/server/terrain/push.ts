import "server-only";

import { prisma } from "@quercy/db";
import webpush from "web-push";

import { decryptSecret, encryptSecret } from "../secrets";
import { terrainSettings } from "./config";

/** Clés des notifications du téléphone de l'entreprise (créées une fois, la privée chiffrée). */
export async function vapidKeys(organizationId: string) {
  const t = await terrainSettings(organizationId);
  if (t.vapidPublicKey && t.vapidPrivateEnc)
    return { publicKey: t.vapidPublicKey, privateKey: decryptSecret(t.vapidPrivateEnc) };
  const keys = webpush.generateVAPIDKeys();
  const saved = await prisma.terrainSettings.updateMany({
    where: { organizationId, vapidPublicKey: null },
    data: { vapidPublicKey: keys.publicKey, vapidPrivateEnc: encryptSecret(keys.privateKey) },
  });
  if (saved.count) return keys;
  // Une autre requête les a créées entre-temps : on relit.
  const again = await terrainSettings(organizationId);
  return { publicKey: again.vapidPublicKey!, privateKey: decryptSecret(again.vapidPrivateEnc!) };
}

export interface PushMessage {
  titre: string;
  corps: string;
  /** Écran de l'application ouvert au toucher (tournee, demandes, equipe, factures). */
  onglet?: string;
  tag?: string;
}

/**
 * Envoie une notification aux téléphones abonnés des membres visés (tous si `userIds` est
 * nul). Les abonnements expirés sont retirés. Ne lève jamais : renvoie le nombre d'envois.
 */
export async function sendPush(
  organizationId: string,
  userIds: string[] | null,
  message: PushMessage,
): Promise<number> {
  try {
    const subs = await prisma.pushSubscription.findMany({
      where: { organizationId, ...(userIds ? { userId: { in: userIds } } : {}) },
    });
    if (!subs.length) return 0;
    const keys = await vapidKeys(organizationId);
    const org = await prisma.salesSettings.findUnique({
      where: { organizationId },
      select: { email: true },
    });
    const payload = JSON.stringify(message);
    const dead: string[] = [];
    let sent = 0;
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: s.keys as { p256dh: string; auth: string } },
            payload,
            {
              vapidDetails: {
                subject: `mailto:${org?.email || "contact@quercy.app"}`,
                publicKey: keys.publicKey,
                privateKey: keys.privateKey,
              },
              TTL: 3600,
              // Un service de notification qui ne répond pas ne doit rien bloquer.
              timeout: 5000,
            },
          );
          sent++;
        } catch (error) {
          const code = (error as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) dead.push(s.id);
        }
      }),
    );
    if (dead.length) await prisma.pushSubscription.deleteMany({ where: { id: { in: dead } } });
    return sent;
  } catch (error) {
    console.error(JSON.stringify({ level: "warn", msg: "push.failed", error: String(error) }));
    return 0;
  }
}

/** Responsables de l'application (accès « patron » actifs). */
export async function patronIds(organizationId: string): Promise<string[]> {
  const rows = await prisma.fieldAccess.findMany({
    where: { organizationId, role: "patron", active: true },
    select: { userId: true },
  });
  return rows.map((r) => r.userId);
}
