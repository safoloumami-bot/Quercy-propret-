import "server-only";

import { render, toPlainText } from "@react-email/render";
import type * as React from "react";
import { Resend } from "resend";

import { redis } from "@/lib/redis";

import { devMailboxEnabled, env } from "../env";

export const DEV_MAILBOX_KEY = "dev:mailbox";

export interface DevMail {
  to: string;
  subject: string;
  text: string;
  links: string[];
  sentAt: string;
}

let resend: Resend | null = null;

/**
 * Envoie un email transactionnel. Avec RESEND_API_KEY : envoi réel via Resend.
 * Sans clé : l'email est journalisé (et gardé dans la boîte de développement si elle est activée).
 */
export async function sendEmail(message: {
  to: string;
  subject: string;
  react: React.ReactElement;
}): Promise<void> {
  const html = await render(message.react);
  const text = toPlainText(html);
  const e = env();

  if (e.RESEND_API_KEY) {
    resend ??= new Resend(e.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: e.EMAIL_FROM,
      to: message.to,
      subject: message.subject,
      html,
      text,
    });
    if (error) throw new Error(`Envoi de l'email impossible : ${error.message}`);
    return;
  }

  const links = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]!.replaceAll("&amp;", "&"));
  console.info(
    JSON.stringify({
      level: "info",
      msg: "email.logged",
      to: message.to,
      subject: message.subject,
      links,
    }),
  );
  if (devMailboxEnabled()) {
    const mail: DevMail = {
      to: message.to,
      subject: message.subject,
      text,
      links,
      sentAt: new Date().toISOString(),
    };
    try {
      if (redis.status === "wait" || redis.status === "end") await redis.connect();
      await redis.lpush(DEV_MAILBOX_KEY, JSON.stringify(mail));
      await redis.ltrim(DEV_MAILBOX_KEY, 0, 99);
    } catch (error) {
      console.error(
        JSON.stringify({ level: "error", msg: "dev-mailbox.write", error: String(error) }),
      );
    }
  }
}
