import { recordPath, reminderDue, startOfDayUtc } from "@quercy/core";
import { prisma } from "@quercy/db";

import { emailDocument } from "./mail";
import { generateFromRecurring, refreshInvoice } from "./service";

export interface DailySalesResult {
  recurring: number;
  overdue: number;
  expiredQuotes: number;
  reminders: number;
  errors: { documentId: string; error: string }[];
}

async function recipient(documentId: string): Promise<string | null> {
  const doc = await prisma.salesDocument.findUnique({
    where: { id: documentId },
    select: { contact: { select: { email: true } }, company: { select: { email: true } } },
  });
  return doc?.contact?.email ?? doc?.company?.email ?? null;
}

/**
 * Traitement quotidien des ventes (worker) : factures récurrentes échues, passage des factures
 * « en retard », expiration des devis et relances automatiques d'impayés.
 */
export async function runDailySales(
  appUrl: string,
  now: Date = new Date(),
): Promise<DailySalesResult> {
  const result: DailySalesResult = {
    recurring: 0,
    overdue: 0,
    expiredQuotes: 0,
    reminders: 0,
    errors: [],
  };
  const today = startOfDayUtc(now);

  // 1. Factures récurrentes arrivées à échéance (une par modèle et par passage).
  const templates = await prisma.salesDocument.findMany({
    where: { kind: "RECURRING", status: "active", nextRunAt: { lte: now }, deletedAt: null },
    select: { id: true, organizationId: true, ownerId: true, subject: true },
  });
  for (const t of templates) {
    try {
      const { invoiceId, autoSend } = await generateFromRecurring(t.organizationId, t.id, now);
      result.recurring += 1;
      const to = autoSend ? await recipient(invoiceId) : null;
      if (to)
        await emailDocument({
          organizationId: t.organizationId,
          documentId: invoiceId,
          to,
          appUrl,
          now,
        });
      if (t.ownerId)
        await prisma.notification.create({
          data: {
            organizationId: t.organizationId,
            userId: t.ownerId,
            type: "sales.recurring_generated",
            title: `Facture récurrente émise : ${t.subject ?? "modèle"}${to ? " (envoyée)" : ""}`,
            url: recordPath("invoice", invoiceId),
          },
        });
    } catch (error) {
      result.errors.push({ documentId: t.id, error: String(error) });
    }
  }

  // 2. Factures échues non réglées → « en retard ».
  const late = await prisma.salesDocument.findMany({
    where: {
      kind: "INVOICE",
      status: { in: ["sent", "partial"] },
      dueDate: { lt: today },
      deletedAt: null,
    },
    select: { id: true, organizationId: true },
  });
  for (const invoice of late) {
    await prisma.$transaction((tx) => refreshInvoice(tx, invoice.organizationId, invoice.id, now));
    result.overdue += 1;
  }

  // 3. Devis dont la validité est dépassée.
  const expired = await prisma.salesDocument.updateMany({
    where: { kind: "QUOTE", status: "sent", dueDate: { lt: today }, deletedAt: null },
    data: { status: "expired" },
  });
  result.expiredQuotes = expired.count;

  // 4. Relances automatiques (paliers définis dans les paramètres de vente).
  const overdue = await prisma.salesDocument.findMany({
    where: { kind: "INVOICE", status: "overdue", deletedAt: null },
    select: {
      id: true,
      organizationId: true,
      dueDate: true,
      reminderCount: true,
      lastReminderAt: true,
      organization: { select: { salesSettings: true } },
    },
  });
  for (const invoice of overdue) {
    const settings = invoice.organization.salesSettings;
    if (settings && !settings.remindersEnabled) continue;
    const days = settings?.reminderDays ?? [7, 15, 30];
    if (!reminderDue(invoice, days, now)) continue;
    const to = await recipient(invoice.id);
    if (!to) continue;
    try {
      await emailDocument({
        organizationId: invoice.organizationId,
        documentId: invoice.id,
        to,
        appUrl,
        mode: "reminder",
        now,
      });
      result.reminders += 1;
    } catch (error) {
      result.errors.push({ documentId: invoice.id, error: String(error) });
    }
  }
  return result;
}
