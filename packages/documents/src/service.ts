import {
  DOCUMENT_TITLES,
  type DocumentKind,
  type DocumentLineInput,
  ISSUED_STATUS,
  addDays,
  computeTotals,
  formatDocumentNumber,
  invoiceStatus,
  lineTotalCents,
  nextRunDate,
  sequenceKey,
  startOfDayUtc,
} from "@quercy/core";
import { type Prisma, type SalesDocument, type SalesSettings, prisma } from "@quercy/db";

import type { DocumentData } from "./types";

type Tx = Prisma.TransactionClient;

export class SalesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SalesError";
  }
}

// ─────────────────────────── Paramètres ───────────────────────────

/** Paramètres de vente de l'espace (créés avec les valeurs par défaut au premier accès). */
export async function salesSettings(
  organizationId: string,
  tx: Tx = prisma,
): Promise<SalesSettings> {
  const existing = await tx.salesSettings.findUnique({ where: { organizationId } });
  if (existing) return existing;
  const org = await tx.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { name: true },
  });
  return tx.salesSettings.upsert({
    where: { organizationId },
    create: { organizationId, legalName: org.name },
    update: {},
  });
}

function prefixFor(settings: SalesSettings, kind: DocumentKind): string {
  switch (kind) {
    case "QUOTE":
      return settings.quotePrefix;
    case "ORDER":
      return settings.orderPrefix;
    case "INVOICE":
      return settings.invoicePrefix;
    case "CREDIT_NOTE":
      return settings.creditNotePrefix;
    default:
      throw new SalesError("Ce type de document n'est pas numéroté.");
  }
}

/**
 * Prochain numéro d'un type de document, dans la transaction de l'émission : si l'émission
 * échoue, le compteur est annulé avec elle, d'où une numérotation continue sans trou.
 */
async function nextSequence(tx: Tx, organizationId: string, key: string): Promise<number> {
  const rows = await tx.$queryRaw<{ value: number }[]>`
    INSERT INTO number_sequence ("organizationId", key, value) VALUES (${organizationId}, ${key}, 1)
    ON CONFLICT ("organizationId", key) DO UPDATE SET value = number_sequence.value + 1
    RETURNING value`;
  return rows[0]!.value;
}

// ─────────────────────────── Lecture ───────────────────────────

export async function getDocument(organizationId: string, id: string, tx: Tx = prisma) {
  const doc = await tx.salesDocument.findFirst({
    where: { id, organizationId, deletedAt: null },
    include: {
      lines: { orderBy: { position: "asc" } },
      payments: { orderBy: { date: "asc" } },
      company: true,
      contact: true,
      creditedInvoice: { select: { id: true, number: true } },
      source: { select: { id: true, kind: true, number: true } },
      derived: {
        where: { deletedAt: null },
        select: { id: true, kind: true, number: true, status: true, totalCents: true },
      },
      creditNotes: {
        where: { deletedAt: null },
        select: { id: true, number: true, status: true, totalCents: true },
      },
    },
  });
  if (!doc) throw new SalesError("Ce document n'existe pas ou a été supprimé.");
  return doc;
}

export type FullDocument = Awaited<ReturnType<typeof getDocument>>;

/** Données de rendu (PDF, Factur-X) d'un document. */
export async function documentData(
  organizationId: string,
  id: string,
  options: { paymentUrl?: string | null } = {},
): Promise<{ doc: FullDocument; data: DocumentData }> {
  const [doc, settings] = await Promise.all([
    getDocument(organizationId, id),
    salesSettings(organizationId),
  ]);
  const totals = computeTotals(doc.lines, { vatExempt: settings.vatExempt });
  const data: DocumentData = {
    kind: doc.kind as DocumentKind,
    number: doc.number,
    issueDate: doc.issueDate,
    dueDate: doc.dueDate,
    subject: doc.subject,
    notes: doc.notes,
    paymentTermsDays: doc.paymentTermsDays,
    currency: "EUR",
    seller: {
      name: settings.legalName ?? "",
      address: settings.address,
      postalCode: settings.postalCode,
      city: settings.city,
      country: settings.country,
      registration: settings.siret,
      vatNumber: settings.vatNumber,
      email: settings.email,
      phone: settings.phone,
      iban: settings.iban,
      bic: settings.bic,
      vatExempt: settings.vatExempt,
      footer: settings.footer,
      latePenaltyText: settings.latePenaltyText,
    },
    buyer: {
      name: doc.company?.name ?? "Client",
      address: doc.company?.address,
      postalCode: doc.company?.postalCode,
      city: doc.company?.city,
      country: doc.company?.country,
      registration: doc.company?.siren,
      vatNumber: doc.company?.vatNumber,
      email: doc.contact?.email ?? doc.company?.email,
      contactName: doc.contact
        ? [doc.contact.firstName, doc.contact.lastName].filter(Boolean).join(" ")
        : null,
    },
    lines: doc.lines.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unit: l.unit,
      unitPriceCents: l.unitPriceCents,
      discountPercent: l.discountPercent,
      vatRate: settings.vatExempt ? 0 : l.vatRate,
      totalExclCents: l.totalExclCents,
    })),
    totals,
    paidCents: doc.paidCents,
    dueCents: doc.dueCents,
    creditedInvoiceNumber: doc.creditedInvoice?.number ?? null,
    paymentUrl: options.paymentUrl ?? null,
  };
  return { doc, data };
}

export function documentFilename(doc: Pick<SalesDocument, "kind" | "number" | "id">): string {
  const title = DOCUMENT_TITLES[doc.kind as DocumentKind].replace(/\s+/g, "-");
  return `${doc.number ?? `${title}-brouillon-${doc.id.slice(-6)}`}.pdf`;
}

// ─────────────────────────── Écriture ───────────────────────────

function assertEditable(doc: Pick<SalesDocument, "kind" | "status">) {
  if (doc.kind === "RECURRING") return;
  if (doc.status !== "draft")
    throw new SalesError(
      doc.kind === "INVOICE" || doc.kind === "CREDIT_NOTE"
        ? "Un document émis ne peut plus être modifié : établissez un avoir pour le corriger."
        : "Seul un brouillon est modifiable : dupliquez le document pour repartir d'une copie.",
    );
}

/** Totaux enregistrés d'un document, recalculés depuis ses lignes. */
async function storeTotals(tx: Tx, organizationId: string, id: string) {
  const [lines, settings, doc] = await Promise.all([
    tx.salesDocumentLine.findMany({ where: { documentId: id } }),
    salesSettings(organizationId, tx),
    tx.salesDocument.findUniqueOrThrow({ where: { id }, select: { paidCents: true } }),
  ]);
  const totals = computeTotals(lines, { vatExempt: settings.vatExempt });
  await tx.salesDocument.update({
    where: { id },
    data: {
      totalExclCents: totals.totalExclCents,
      taxCents: totals.taxCents,
      totalCents: totals.totalCents,
      dueCents: totals.totalCents - doc.paidCents,
    },
  });
}

/** Remplace les lignes d'un brouillon (ou d'un modèle récurrent) et recalcule les totaux. */
export async function saveLines(organizationId: string, id: string, lines: DocumentLineInput[]) {
  return prisma.$transaction(async (tx) => {
    const doc = await getDocument(organizationId, id, tx);
    assertEditable(doc);
    const productIds = [...new Set(lines.map((l) => l.productId).filter(Boolean))] as string[];
    if (productIds.length) {
      const found = await tx.product.count({
        where: { id: { in: productIds }, organizationId },
      });
      if (found !== productIds.length)
        throw new SalesError("Un article sélectionné n'existe pas dans le catalogue.");
    }
    await tx.salesDocumentLine.deleteMany({ where: { documentId: id } });
    await tx.salesDocumentLine.createMany({
      data: lines.map((l, position) => ({
        documentId: id,
        position,
        productId: l.productId ?? null,
        description: l.description,
        quantity: l.quantity,
        unit: l.unit ?? null,
        unitPriceCents: l.unitPriceCents,
        discountPercent: l.discountPercent ?? 0,
        vatRate: l.vatRate,
        totalExclCents: lineTotalCents(l),
      })),
    });
    await storeTotals(tx, organizationId, id);
    return getDocument(organizationId, id, tx);
  });
}

/** Émission : numéro définitif, date, échéance ; le document devient non modifiable. */
export async function finalizeDocument(
  organizationId: string,
  id: string,
  now: Date = new Date(),
  tx?: Tx,
): Promise<FullDocument> {
  const run = async (t: Tx) => {
    const doc = await getDocument(organizationId, id, t);
    if (doc.kind === "RECURRING") throw new SalesError("Un modèle récurrent ne s'émet pas.");
    if (doc.status !== "draft") return doc;
    if (!doc.companyId) throw new SalesError("Choisissez le client avant d'émettre le document.");
    if (doc.lines.length === 0) throw new SalesError("Ajoutez au moins une ligne avant d'émettre.");
    const settings = await salesSettings(organizationId, t);
    const kind = doc.kind as DocumentKind;
    const issueDate = startOfDayUtc(now);
    const year = issueDate.getUTCFullYear();
    const seq = await nextSequence(t, organizationId, sequenceKey(kind, year));
    const number = formatDocumentNumber(prefixFor(settings, kind), year, seq);
    const dueDate =
      doc.dueDate ??
      (kind === "INVOICE"
        ? addDays(issueDate, doc.paymentTermsDays)
        : kind === "QUOTE"
          ? addDays(issueDate, settings.quoteValidityDays)
          : null);
    await t.salesDocument.update({
      where: { id },
      data: { number, issueDate, dueDate, status: ISSUED_STATUS[kind] },
    });
    await storeTotals(t, organizationId, id);
    if (kind === "CREDIT_NOTE" && doc.creditedInvoiceId)
      await refreshInvoice(t, organizationId, doc.creditedInvoiceId, now);
    if (kind === "INVOICE") await refreshInvoice(t, organizationId, id, now);
    return getDocument(organizationId, id, t);
  };
  return tx ? run(tx) : prisma.$transaction(run);
}

/**
 * Recalcule encaissé, avoirs imputés, reste dû et statut d'une facture émise.
 * Appelé après chaque paiement, avoir émis et chaque jour (passage « en retard »).
 */
export async function refreshInvoice(
  tx: Tx,
  organizationId: string,
  invoiceId: string,
  now: Date = new Date(),
) {
  const invoice = await tx.salesDocument.findFirst({
    where: { id: invoiceId, organizationId, kind: "INVOICE" },
    select: { id: true, status: true, totalCents: true, dueDate: true, paidAt: true },
  });
  if (!invoice || invoice.status === "draft") return;
  const [paid, credited] = await Promise.all([
    tx.payment.aggregate({ where: { documentId: invoiceId }, _sum: { amountCents: true } }),
    tx.salesDocument.aggregate({
      where: {
        creditedInvoiceId: invoiceId,
        kind: "CREDIT_NOTE",
        status: { not: "draft" },
        deletedAt: null,
      },
      _sum: { totalCents: true },
    }),
  ]);
  const paidCents = paid._sum.amountCents ?? 0;
  const creditedCents = credited._sum.totalCents ?? 0;
  const status = invoiceStatus(
    { totalCents: invoice.totalCents, paidCents, creditedCents, dueDate: invoice.dueDate },
    now,
  );
  await tx.salesDocument.update({
    where: { id: invoiceId },
    data: {
      paidCents,
      dueCents: invoice.totalCents - paidCents - creditedCents,
      status,
      paidAt: status === "paid" ? (invoice.paidAt ?? now) : null,
    },
  });
}

/** Encaissement d'une facture émise. */
export async function addPayment(
  organizationId: string,
  invoiceId: string,
  payment: { amountCents: number; date: Date; method: string; reference?: string | null },
  createdById: string | null,
) {
  return prisma.$transaction(async (tx) => {
    const invoice = await getDocument(organizationId, invoiceId, tx);
    if (invoice.kind !== "INVOICE") throw new SalesError("Seule une facture reçoit des paiements.");
    if (invoice.status === "draft")
      throw new SalesError("Émettez la facture avant d'enregistrer un paiement.");
    if (payment.amountCents <= 0) throw new SalesError("Le montant doit être positif.");
    if (payment.reference) {
      const duplicate = await tx.payment.count({
        where: { documentId: invoiceId, reference: payment.reference },
      });
      if (duplicate) return getDocument(organizationId, invoiceId, tx);
    }
    await tx.payment.create({
      data: {
        organizationId,
        documentId: invoiceId,
        amountCents: payment.amountCents,
        date: payment.date,
        method: payment.method,
        reference: payment.reference ?? null,
        createdById,
      },
    });
    await refreshInvoice(tx, organizationId, invoiceId);
    return getDocument(organizationId, invoiceId, tx);
  });
}

export async function deletePayment(organizationId: string, paymentId: string) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({ where: { id: paymentId, organizationId } });
    if (!payment) throw new SalesError("Ce paiement n'existe pas.");
    await tx.payment.delete({ where: { id: paymentId } });
    await refreshInvoice(tx, organizationId, payment.documentId);
    return payment;
  });
}

const COPY_FIELDS = [
  "subject",
  "companyId",
  "contactId",
  "dealId",
  "projectId",
  "paymentTermsDays",
  "notes",
] as const;

/** Copie d'un document vers un nouveau brouillon (même type ou type suivant). */
async function copyDocument(
  tx: Tx,
  source: FullDocument,
  kind: DocumentKind,
  ownerId: string | null,
  extra: Partial<Prisma.SalesDocumentUncheckedCreateInput> = {},
) {
  const data: Prisma.SalesDocumentUncheckedCreateInput = {
    organizationId: source.organizationId,
    kind,
    status: kind === "RECURRING" ? "active" : "draft",
    ownerId: ownerId ?? source.ownerId,
    tags: source.tags,
    ...Object.fromEntries(COPY_FIELDS.map((f) => [f, source[f]])),
    ...extra,
  };
  const created = await tx.salesDocument.create({ data });
  await tx.salesDocumentLine.createMany({
    data: source.lines.map((l) => ({
      documentId: created.id,
      position: l.position,
      productId: l.productId,
      description: l.description,
      quantity: l.quantity,
      unit: l.unit,
      unitPriceCents: l.unitPriceCents,
      discountPercent: l.discountPercent,
      vatRate: l.vatRate,
      totalExclCents: l.totalExclCents,
    })),
  });
  await storeTotals(tx, source.organizationId, created.id);
  return created;
}

/** Devis → commande ou facture ; commande → facture. Le document d'origine est marqué. */
export async function convertDocument(
  organizationId: string,
  id: string,
  target: "ORDER" | "INVOICE",
  ownerId: string | null,
) {
  return prisma.$transaction(async (tx) => {
    const source = await getDocument(organizationId, id, tx);
    const allowed =
      (source.kind === "QUOTE" && ["sent", "accepted"].includes(source.status)) ||
      (source.kind === "ORDER" &&
        target === "INVOICE" &&
        ["confirmed", "delivered"].includes(source.status));
    if (!allowed)
      throw new SalesError(
        source.kind === "QUOTE"
          ? "Émettez le devis (ou marquez-le accepté) avant de le transformer."
          : "Seule une commande confirmée ou livrée se facture.",
      );
    const created = await copyDocument(tx, source, target, ownerId, { sourceId: source.id });
    if (target === "INVOICE" || source.kind === "QUOTE")
      await tx.salesDocument.update({
        where: { id },
        data: {
          status: target === "INVOICE" ? "invoiced" : source.status,
          ...(source.kind === "QUOTE" && !source.acceptedAt ? { acceptedAt: new Date() } : {}),
        },
      });
    return created;
  });
}

/** Avoir sur une facture émise (reprend ses lignes ; à ajuster avant émission si partiel). */
export async function createCreditNote(
  organizationId: string,
  invoiceId: string,
  ownerId: string | null,
) {
  return prisma.$transaction(async (tx) => {
    const invoice = await getDocument(organizationId, invoiceId, tx);
    if (invoice.kind !== "INVOICE" || invoice.status === "draft")
      throw new SalesError("Un avoir se crée à partir d'une facture émise.");
    return copyDocument(tx, invoice, "CREDIT_NOTE", ownerId, {
      creditedInvoiceId: invoice.id,
      subject: `Avoir sur la facture ${invoice.number}`,
    });
  });
}

export async function duplicateDocument(
  organizationId: string,
  id: string,
  ownerId: string | null,
) {
  return prisma.$transaction(async (tx) => {
    const source = await getDocument(organizationId, id, tx);
    return copyDocument(tx, source, source.kind as DocumentKind, ownerId, {
      subject: source.subject,
      ...(source.kind === "RECURRING"
        ? { interval: source.interval, nextRunAt: source.nextRunAt, autoSend: source.autoSend }
        : {}),
    });
  });
}

/** Modèle récurrent à partir d'une facture (même client, mêmes lignes). */
export async function makeRecurring(
  organizationId: string,
  invoiceId: string,
  interval: string,
  ownerId: string | null,
) {
  return prisma.$transaction(async (tx) => {
    const source = await getDocument(organizationId, invoiceId, tx);
    const base = source.issueDate ?? startOfDayUtc();
    return copyDocument(tx, source, "RECURRING", ownerId, {
      interval,
      nextRunAt: nextRunDate(base, interval),
      subject: source.subject ?? `Facturation ${source.company?.name ?? ""}`.trim(),
    });
  });
}

/**
 * Génère et émet la facture d'un modèle récurrent, puis programme la suivante. Idempotent par
 * échéance : un modèle dont la prochaine date est déjà passée ne génère qu'une facture par appel.
 */
export async function generateFromRecurring(
  organizationId: string,
  templateId: string,
  now: Date = new Date(),
): Promise<{ invoiceId: string; autoSend: boolean }> {
  return prisma.$transaction(async (tx) => {
    const template = await getDocument(organizationId, templateId, tx);
    if (template.kind !== "RECURRING" || template.status !== "active")
      throw new SalesError("Ce modèle récurrent n'est pas actif.");
    if (template.lines.length === 0 || !template.companyId)
      throw new SalesError("Le modèle doit avoir un client et au moins une ligne.");
    const runDate = template.nextRunAt ?? startOfDayUtc(now);
    const invoice = await copyDocument(tx, template, "INVOICE", template.ownerId, {
      sourceId: template.id,
    });
    await finalizeDocument(organizationId, invoice.id, now, tx);
    const next = nextRunDate(runDate, template.interval ?? "monthly");
    const ended = template.endsAt ? next > template.endsAt : false;
    await tx.salesDocument.update({
      where: { id: templateId },
      data: { nextRunAt: ended ? null : next, status: ended ? "ended" : "active" },
    });
    return { invoiceId: invoice.id, autoSend: template.autoSend };
  });
}

/** Facture brouillon à partir du temps facturable non facturé d'un projet. */
export async function invoiceProjectTime(
  organizationId: string,
  projectId: string,
  ownerId: string | null,
) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.findFirst({
      where: { id: projectId, organizationId, deletedAt: null },
    });
    if (!project) throw new SalesError("Ce projet n'existe pas.");
    if (!project.companyId) throw new SalesError("Associez un client au projet avant de facturer.");
    if (!project.hourlyRate) throw new SalesError("Renseignez le taux horaire du projet.");
    const entries = await tx.timeEntry.findMany({
      where: {
        organizationId,
        projectId,
        billable: true,
        invoiceId: null,
        minutes: { gt: 0 },
        deletedAt: null,
      },
      include: { task: { select: { title: true } } },
    });
    if (entries.length === 0) throw new SalesError("Aucun temps facturable à facturer.");
    const byTask = new Map<string, number>();
    for (const e of entries) {
      const label = e.task?.title ?? "Temps passé";
      byTask.set(label, (byTask.get(label) ?? 0) + (e.minutes ?? 0));
    }
    const settings = await salesSettings(organizationId, tx);
    const invoice = await tx.salesDocument.create({
      data: {
        organizationId,
        kind: "INVOICE",
        status: "draft",
        companyId: project.companyId,
        projectId,
        ownerId: ownerId ?? project.ownerId,
        subject: `${project.name} — temps passé`,
        paymentTermsDays: settings.paymentTermsDays,
      },
    });
    const unitPriceCents = Math.round(project.hourlyRate * 100);
    await tx.salesDocumentLine.createMany({
      data: [...byTask.entries()].map(([label, minutes], position) => {
        const quantity = Math.round((minutes / 60) * 100) / 100;
        return {
          documentId: invoice.id,
          position,
          description: label,
          quantity,
          unit: "hour",
          unitPriceCents,
          discountPercent: 0,
          vatRate: 20,
          totalExclCents: lineTotalCents({ quantity, unitPriceCents }),
        };
      }),
    });
    await tx.timeEntry.updateMany({
      where: { id: { in: entries.map((e) => e.id) } },
      data: { invoiceId: invoice.id },
    });
    await storeTotals(tx, organizationId, invoice.id);
    return { invoice, entries: entries.length };
  });
}
