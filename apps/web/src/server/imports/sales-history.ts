import "server-only";

import { randomUUID } from "node:crypto";

import {
  HISTORY_TAG,
  type HistoryKind,
  type HistoryRow,
  invoiceStatus,
  normalizeHeader,
  sebtSequence,
  sequenceKey,
} from "@quercy/core";
import { refreshInvoice, salesSettings } from "@quercy/documents";
import { type Prisma, prisma } from "@quercy/db";

export interface HistoryImportResult {
  /** Documents qui seront (ou ont été) créés. */
  imported: number;
  /** Numéros déjà présents dans sebt : ignorés, l'import peut être relancé sans doublon. */
  duplicates: string[];
  /** Clients à créer (introuvables parmi les entreprises). */
  newClients: string[];
  /** Avoirs dont la facture d'origine est introuvable : importés sans lien. */
  unlinked: string[];
}

const CHUNK = 250;

function day(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

/**
 * Reprise d'historique : crée des documents **déjà émis**, avec leur numéro et leur date
 * d'origine, une ligne de reprise au taux de TVA du document, le client retrouvé par son nom
 * (ou créé) et l'étiquette « reprise ». Les numéros déjà présents sont ignorés (idempotent).
 *
 * Les documents repris ne déclenchent aucune relance et ne partent pas dans l'export FEC :
 * ils sont déjà comptabilisés dans l'ancien logiciel. Si leurs numéros suivent le format de
 * sebt, la numérotation des prochains documents reprend après eux.
 */
export async function importSalesHistory(input: {
  organizationId: string;
  userId: string;
  kind: HistoryKind;
  rows: HistoryRow[];
  dryRun: boolean;
  now?: Date;
}): Promise<HistoryImportResult & { ids: string[] }> {
  const { organizationId, userId, kind, rows, dryRun } = input;
  const now = input.now ?? new Date();

  const existing = await prisma.salesDocument.findMany({
    where: { organizationId, kind, number: { in: rows.map((r) => r.number) } },
    select: { number: true },
  });
  const taken = new Set(existing.map((d) => d.number));
  const fresh = rows.filter((r) => !taken.has(r.number));

  const companies = await prisma.company.findMany({
    where: { organizationId, deletedAt: null },
    select: { id: true, name: true },
  });
  const companyIds = new Map(companies.map((c) => [normalizeHeader(c.name), c.id]));
  const newClients = new Map<string, string>();
  for (const r of fresh) {
    const key = normalizeHeader(r.client);
    if (!companyIds.has(key) && !newClients.has(key)) newClients.set(key, r.client);
  }

  const invoiceIds = new Map<string, string>();
  if (kind === "CREDIT_NOTE") {
    const refs = [...new Set(fresh.map((r) => r.invoiceNumber).filter(Boolean))] as string[];
    const invoices = refs.length
      ? await prisma.salesDocument.findMany({
          where: { organizationId, kind: "INVOICE", number: { in: refs }, deletedAt: null },
          select: { id: true, number: true },
        })
      : [];
    for (const i of invoices) invoiceIds.set(i.number!, i.id);
  }
  const unlinked = fresh
    .filter((r) => r.invoiceNumber && !invoiceIds.has(r.invoiceNumber))
    .map((r) => r.number);

  const summary: HistoryImportResult = {
    imported: fresh.length,
    duplicates: [...taken].filter(Boolean) as string[],
    newClients: [...newClients.values()],
    unlinked,
  };
  if (dryRun || fresh.length === 0) return { ...summary, ids: [] };

  const settings = await salesSettings(organizationId);
  const prefix =
    kind === "INVOICE"
      ? settings.invoicePrefix
      : kind === "CREDIT_NOTE"
        ? settings.creditNotePrefix
        : settings.quotePrefix;

  // Clients manquants.
  const companyRows: Prisma.CompanyCreateManyInput[] = [...newClients].map(([key, name]) => {
    const id = randomUUID();
    companyIds.set(key, id);
    return { id, organizationId, name, ownerId: userId, tags: [HISTORY_TAG] };
  });

  const documents: Prisma.SalesDocumentCreateManyInput[] = [];
  const lines: Prisma.SalesDocumentLineCreateManyInput[] = [];
  const payments: Prisma.PaymentCreateManyInput[] = [];
  const sequences = new Map<number, number>();

  for (const r of fresh) {
    const id = randomUUID();
    const issueDate = day(r.issueDate);
    const dueDate = r.dueDate ? day(r.dueDate) : null;
    let status: string;
    let paidAt: Date | null = null;
    let acceptedAt: Date | null = null;
    if (kind === "INVOICE") {
      status = invoiceStatus({ totalCents: r.totalCents, paidCents: r.paidCents, dueDate }, now);
      if (status === "paid") paidAt = dueDate && dueDate < now ? dueDate : issueDate;
    } else if (kind === "CREDIT_NOTE") {
      status = "issued";
    } else {
      status = r.quoteStatus ?? "sent";
      if (status === "accepted") acceptedAt = issueDate;
    }
    documents.push({
      id,
      organizationId,
      kind,
      number: r.number,
      status,
      subject: r.subject,
      companyId: companyIds.get(normalizeHeader(r.client)) ?? null,
      ownerId: userId,
      issueDate,
      dueDate,
      paymentTermsDays:
        dueDate && dueDate >= issueDate
          ? Math.round((dueDate.getTime() - issueDate.getTime()) / 86_400_000)
          : 0,
      notes: "Document repris d'un autre logiciel.",
      totalExclCents: r.totalExclCents,
      taxCents: r.taxCents,
      totalCents: r.totalCents,
      paidCents: r.paidCents,
      dueCents: kind === "INVOICE" ? r.totalCents - r.paidCents : 0,
      creditedInvoiceId: r.invoiceNumber ? (invoiceIds.get(r.invoiceNumber) ?? null) : null,
      sentAt: issueDate,
      paidAt,
      acceptedAt,
      tags: [HISTORY_TAG],
    });
    lines.push({
      documentId: id,
      position: 0,
      description: r.subject ?? `Reprise du document ${r.number}`,
      quantity: 1,
      unitPriceCents: r.totalExclCents,
      vatRate: r.vatRate,
      totalExclCents: r.totalExclCents,
    });
    if (kind === "INVOICE" && r.paidCents > 0) {
      payments.push({
        organizationId,
        documentId: id,
        amountCents: r.paidCents,
        date: paidAt ?? issueDate,
        method: "other",
        reference: `Reprise ${r.number}`,
        createdById: userId,
      });
    }
    const seq = sebtSequence(r.number, prefix);
    if (seq) sequences.set(seq.year, Math.max(sequences.get(seq.year) ?? 0, seq.sequence));
  }

  await prisma.$transaction(
    async (tx) => {
      if (companyRows.length) await tx.company.createMany({ data: companyRows });
      for (let i = 0; i < documents.length; i += CHUNK) {
        await tx.salesDocument.createMany({ data: documents.slice(i, i + CHUNK) });
        await tx.salesDocumentLine.createMany({ data: lines.slice(i, i + CHUNK) });
      }
      for (let i = 0; i < payments.length; i += CHUNK) {
        await tx.payment.createMany({ data: payments.slice(i, i + CHUNK) });
      }
      // La numérotation continue après les numéros repris (jamais en arrière).
      for (const [year, value] of sequences) {
        const key = sequenceKey(kind, year);
        await tx.$executeRaw`
          INSERT INTO number_sequence ("organizationId", key, value)
          VALUES (${organizationId}, ${key}, ${value})
          ON CONFLICT ("organizationId", key)
          DO UPDATE SET value = GREATEST(number_sequence.value, EXCLUDED.value)`;
      }
      // Avoirs : les factures d'origine passent « annulée par avoir » ou voient leur reste dû baisser.
      if (kind === "CREDIT_NOTE") {
        const linked = new Set(documents.map((d) => d.creditedInvoiceId).filter(Boolean));
        for (const invoiceId of linked) await refreshInvoice(tx, organizationId, invoiceId!, now);
      }
    },
    { timeout: 60_000, maxWait: 10_000 },
  );

  return { ...summary, ids: documents.map((d) => d.id!) };
}
