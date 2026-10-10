import { DOCUMENT_TITLES, type DocumentKind, formatCents } from "@quercy/core";
import { prisma } from "@quercy/db";
import { sendMail } from "@quercy/mailer";

import { renderDocumentPdf } from "./pdf";
import { SalesError, documentData, documentFilename } from "./service";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

/** Email HTML sobre (même charte que les emails transactionnels). */
export function documentEmailHtml(input: {
  sender: string;
  heading: string;
  message: string;
  facts: [string, string][];
  buttonLabel: string;
  buttonUrl: string;
}): string {
  const paragraphs = input.message
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;line-height:1.6">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const facts = input.facts
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 0;color:#6b7280">${esc(k)}</td><td style="padding:4px 0;text-align:right;font-weight:600">${esc(v)}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;padding:32px">
<tr><td>
<p style="margin:0 0 4px;font-size:13px;color:#6b7280">${esc(input.sender)}</p>
<h1 style="margin:0 0 20px;font-size:20px">${esc(input.heading)}</h1>
${paragraphs}
<table role="presentation" width="100%" style="margin:8px 0 24px;border-top:1px solid #e4e4e7;border-bottom:1px solid #e4e4e7;font-size:14px">${facts}</table>
<a href="${esc(input.buttonUrl)}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;font-size:14px">${esc(input.buttonLabel)}</a>
<p style="margin:24px 0 0;font-size:12px;color:#6b7280">Le document est joint à cet email au format PDF.</p>
</td></tr></table>
</td></tr></table></body></html>`;
}

function plain(input: Parameters<typeof documentEmailHtml>[0]): string {
  return [
    input.heading,
    "",
    input.message,
    "",
    ...input.facts.map(([k, v]) => `${k} : ${v}`),
    "",
    `${input.buttonLabel} : ${input.buttonUrl}`,
  ].join("\n");
}

/** Adresse publique d'un document (consultation, acceptation d'un devis, paiement). */
export function publicDocumentUrl(appUrl: string, token: string): string {
  return `${appUrl.replace(/\/$/, "")}/document/${token}`;
}

/**
 * Envoie un document par email avec son PDF (et le XML Factur-X pour une facture ou un avoir).
 * `mode` : envoi initial ou relance d'impayé.
 */
export async function emailDocument(input: {
  organizationId: string;
  documentId: string;
  to: string;
  message?: string;
  appUrl: string;
  replyTo?: string | null;
  mode?: "send" | "reminder";
  now?: Date;
}): Promise<void> {
  const now = input.now ?? new Date();
  const mode = input.mode ?? "send";
  const pre = await prisma.salesDocument.findFirst({
    where: { id: input.documentId, organizationId: input.organizationId, deletedAt: null },
    select: { publicToken: true, kind: true, status: true },
  });
  if (!pre) throw new SalesError("Ce document n'existe pas.");
  if (pre.status === "draft") throw new SalesError("Émettez le document avant de l'envoyer.");
  const url = publicDocumentUrl(input.appUrl, pre.publicToken);
  const { doc, data } = await documentData(input.organizationId, input.documentId, {
    paymentUrl: pre.kind === "INVOICE" ? url : null,
  });
  const kind = doc.kind as DocumentKind;
  const pdf = await renderDocumentPdf(data, {
    facturX: kind === "INVOICE" || kind === "CREDIT_NOTE",
    now,
  });
  const title = DOCUMENT_TITLES[kind];
  const sender = data.seller.name || "Quercy";

  const facts: [string, string][] = [[title, doc.number ?? ""]];
  if (kind === "INVOICE") {
    facts.push(["Montant TTC", formatCents(doc.totalCents)]);
    if (doc.dueCents !== doc.totalCents) facts.push(["Reste à payer", formatCents(doc.dueCents)]);
    if (doc.dueDate) facts.push(["Échéance", dateFmt.format(doc.dueDate)]);
  } else {
    facts.push(["Montant TTC", formatCents(doc.totalCents)]);
    if (kind === "QUOTE" && doc.dueDate)
      facts.push(["Valable jusqu'au", dateFmt.format(doc.dueDate)]);
  }

  const defaults: Record<DocumentKind, string> = {
    QUOTE: `Bonjour,\n\nVeuillez trouver ci-joint notre devis ${doc.number}. Vous pouvez le consulter et l'accepter en ligne.\n\nCordialement,\n${sender}`,
    ORDER: `Bonjour,\n\nVeuillez trouver ci-joint la confirmation de votre commande ${doc.number}.\n\nCordialement,\n${sender}`,
    INVOICE: `Bonjour,\n\nVeuillez trouver ci-joint notre facture ${doc.number}.\n\nCordialement,\n${sender}`,
    CREDIT_NOTE: `Bonjour,\n\nVeuillez trouver ci-joint l'avoir ${doc.number}.\n\nCordialement,\n${sender}`,
    RECURRING: "",
  };
  const reminder = `Bonjour,\n\nSauf erreur de notre part, la facture ${doc.number} arrivée à échéance le ${
    doc.dueDate ? dateFmt.format(doc.dueDate) : ""
  } n'a pas encore été réglée (reste dû : ${formatCents(doc.dueCents)}).\n\nSi le règlement est en cours, merci de ne pas tenir compte de ce message.\n\nCordialement,\n${sender}`;

  const content = {
    sender,
    heading: mode === "reminder" ? `Relance : facture ${doc.number}` : `${title} ${doc.number}`,
    message: input.message?.trim() || (mode === "reminder" ? reminder : defaults[kind]),
    facts,
    buttonLabel:
      kind === "INVOICE"
        ? "Consulter et payer"
        : kind === "QUOTE"
          ? "Consulter et accepter"
          : "Consulter",
    buttonUrl: url,
  };
  await sendMail({
    to: input.to,
    subject:
      mode === "reminder"
        ? `Relance — facture ${doc.number} (${sender})`
        : `${title} ${doc.number} — ${sender}`,
    html: documentEmailHtml(content),
    text: plain(content),
    replyTo: input.replyTo ?? data.seller.email ?? undefined,
    attachments: [
      { filename: documentFilename(doc), content: pdf, contentType: "application/pdf" },
    ],
  });

  await prisma.salesDocument.update({
    where: { id: doc.id },
    data:
      mode === "reminder"
        ? { reminderCount: { increment: 1 }, lastReminderAt: now }
        : { sentAt: now },
  });
}
