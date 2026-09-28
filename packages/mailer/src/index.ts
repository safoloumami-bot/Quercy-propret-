import Redis from "ioredis";
import { Resend } from "resend";

/** Clé Redis de la boîte de développement (emails capturés sans fournisseur configuré). */
export const DEV_MAILBOX_KEY = "dev:mailbox";

export interface MailAttachment {
  filename: string;
  content: Uint8Array;
  contentType?: string;
}

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: MailAttachment[];
}

export interface DevMail {
  to: string;
  subject: string;
  text: string;
  links: string[];
  attachments: string[];
  sentAt: string;
}

let resend: Resend | null = null;
let redis: Redis | null = null;

function devMailboxEnabled(): boolean {
  // La boîte de développement vit dans Redis : sans Redis en production, les emails sont
  // seulement journalisés.
  const redisAvailable = Boolean(process.env.REDIS_URL) || process.env.NODE_ENV !== "production";
  return process.env.ENABLE_DEV_MAILBOX === "true" && !process.env.RESEND_API_KEY && redisAvailable;
}

async function mailbox(): Promise<Redis> {
  redis ??= new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 2_000,
    enableOfflineQueue: false,
  });
  if (redis.status === "wait" || redis.status === "end") await redis.connect();
  return redis;
}

/**
 * Envoie un email (application web et worker). Avec RESEND_API_KEY : envoi réel via Resend.
 * Sans clé : l'email est journalisé, et gardé dans la boîte de développement si elle est activée.
 */
export async function sendMail(message: MailMessage): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (key) {
    resend ??= new Resend(key);
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "Quercy <no-reply@quercy.app>",
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      replyTo: message.replyTo,
      attachments: message.attachments?.map((a) => ({
        filename: a.filename,
        content: Buffer.from(a.content),
        contentType: a.contentType,
      })),
    });
    if (error) throw new Error(`Envoi de l'email impossible : ${error.message}`);
    return;
  }

  const links = [...message.html.matchAll(/href="([^"]+)"/g)].map((m) =>
    m[1]!.replaceAll("&amp;", "&"),
  );
  const attachments = message.attachments?.map((a) => a.filename) ?? [];
  console.info(
    JSON.stringify({
      level: "info",
      msg: "email.logged",
      to: message.to,
      subject: message.subject,
      links,
      attachments,
    }),
  );
  if (!devMailboxEnabled()) return;
  const mail: DevMail = {
    to: message.to,
    subject: message.subject,
    text: message.text,
    links,
    attachments,
    sentAt: new Date().toISOString(),
  };
  try {
    const client = await mailbox();
    await client.lpush(DEV_MAILBOX_KEY, JSON.stringify(mail));
    await client.ltrim(DEV_MAILBOX_KEY, 0, 99);
  } catch (error) {
    console.error(
      JSON.stringify({ level: "error", msg: "dev-mailbox.write", error: String(error) }),
    );
  }
}

/** Ferme la connexion Redis de la boîte de développement (fin des tests, arrêt du worker). */
export async function closeMailer(): Promise<void> {
  if (redis && redis.status !== "end") await redis.quit().catch(() => undefined);
  redis = null;
}
