import "server-only";

import { type MailAttachment, sendMail } from "@quercy/mailer";
import { render, toPlainText } from "@react-email/render";
import type * as React from "react";

export { DEV_MAILBOX_KEY, type DevMail } from "@quercy/mailer";

/**
 * Envoie un email transactionnel rendu avec React Email. Avec RESEND_API_KEY : envoi réel via
 * Resend. Sans clé : l'email est journalisé (et gardé dans la boîte de développement si elle
 * est activée).
 */
export async function sendEmail(message: {
  to: string;
  subject: string;
  react: React.ReactElement;
  replyTo?: string;
  attachments?: MailAttachment[];
}): Promise<void> {
  const html = await render(message.react);
  await sendMail({
    to: message.to,
    subject: message.subject,
    html,
    text: toPlainText(html),
    replyTo: message.replyTo,
    attachments: message.attachments,
  });
}
