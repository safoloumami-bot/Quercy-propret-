import { type Prisma, prisma } from "@quercy/db";

import { buildFacturXml } from "../facturx";
import { renderDocumentPdf } from "../pdf";
import { SalesError, documentData } from "../service";
import { readEInvoiceFile } from "./extract";
import { type EInvoiceEvent, type EInvoiceStatus, isFinalStatus } from "./lifecycle";
import { type ParsedEInvoice, parseEInvoiceXml } from "./parse";
import { type EInvoicingProvider, einvoicingProvider } from "./providers";

function pushEvent(history: unknown, event: EInvoiceEvent): Prisma.InputJsonArray {
  const list = Array.isArray(history) ? (history as EInvoiceEvent[]) : [];
  return [...list, event]
    .slice(-50)
    .map((e) => ({ status: e.status, at: e.at, ...(e.message ? { message: e.message } : {}) }));
}

async function providerFor(organizationId: string): Promise<EInvoicingProvider> {
  const settings = await prisma.salesSettings.findUnique({
    where: { organizationId },
    select: { einvoicingProvider: true },
  });
  const provider = einvoicingProvider(settings?.einvoicingProvider);
  if (!provider)
    throw new SalesError(
      "Activez la facture électronique dans Ventes › Paramètres avant de transmettre.",
    );
  return provider;
}

/** Une facture part en facture électronique si le client est un professionnel identifié. */
export function isEInvoiceable(doc: {
  kind: string;
  status: string;
  company: { siren: string | null; vatNumber: string | null } | null;
}): boolean {
  return (
    (doc.kind === "INVOICE" || doc.kind === "CREDIT_NOTE") &&
    doc.status !== "draft" &&
    Boolean(doc.company?.siren || doc.company?.vatNumber)
  );
}

/**
 * Transmet une facture (ou un avoir) émise à la plateforme agréée : PDF Factur-X et XML.
 * Une facture déjà déposée n'est pas renvoyée (seule une erreur de transmission se rejoue).
 */
export async function transmitEInvoice(input: {
  organizationId: string;
  documentId: string;
  now?: Date;
}): Promise<{ status: EInvoiceStatus; simulated: boolean }> {
  const now = input.now ?? new Date();
  const provider = await providerFor(input.organizationId);
  const { doc, data } = await documentData(input.organizationId, input.documentId);
  if (doc.kind !== "INVOICE" && doc.kind !== "CREDIT_NOTE")
    throw new SalesError("Seules les factures et les avoirs se transmettent.");
  if (doc.status === "draft") throw new SalesError("Émettez la facture avant de la transmettre.");
  const siren = doc.company?.siren?.replace(/\s/g, "").slice(0, 9) || null;
  if (!siren && !doc.company?.vatNumber)
    throw new SalesError(
      "Renseignez le SIREN du client : la facture électronique ne concerne que les clients professionnels (les ventes aux particuliers relèvent de l'e-reporting).",
    );

  const existing = await prisma.eInvoice.findFirst({
    where: { organizationId: input.organizationId, salesDocumentId: doc.id, direction: "OUT" },
    orderBy: { createdAt: "desc" },
  });
  if (existing && existing.status !== "error")
    throw new SalesError("Cette facture a déjà été transmise.");

  const xml = buildFacturXml(data);
  const pdf = await renderDocumentPdf(data, { facturX: true, now });
  const base = {
    organizationId: input.organizationId,
    direction: "OUT",
    salesDocumentId: doc.id,
    provider: provider.key,
    number: doc.number,
    counterpartyName: doc.company?.name ?? null,
    counterpartySiren: siren,
    totalCents: doc.totalCents,
  };
  try {
    const sent = await provider.send({ number: doc.number ?? doc.id, buyerSiren: siren, xml, pdf });
    const event = { status: sent.status, at: now.toISOString(), message: sent.message };
    if (existing)
      await prisma.eInvoice.update({
        where: { id: existing.id },
        data: {
          providerRef: sent.ref,
          status: sent.status,
          statusAt: now,
          error: null,
          history: pushEvent(existing.history, event),
        },
      });
    else
      await prisma.eInvoice.create({
        data: {
          ...base,
          providerRef: sent.ref,
          status: sent.status,
          statusAt: now,
          history: [event],
        },
      });
    return { status: sent.status, simulated: provider.simulated };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const event = { status: "error", at: now.toISOString(), message };
    if (existing)
      await prisma.eInvoice.update({
        where: { id: existing.id },
        data: {
          status: "error",
          statusAt: now,
          error: message,
          history: pushEvent(existing.history, event),
        },
      });
    else
      await prisma.eInvoice.create({
        data: { ...base, status: "error", statusAt: now, error: message, history: [event] },
      });
    throw new SalesError(`La plateforme a refusé l'envoi : ${message}`);
  }
}

/**
 * Enregistre une facture fournisseur reçue (PDF Factur-X ou XML CII/UBL) : retrouve ou crée
 * le fournisseur (SIREN, TVA, puis nom) et crée la facture à payer dans Achats.
 */
export async function importIncomingEInvoice(input: {
  organizationId: string;
  bytes: Uint8Array;
  provider?: string;
  providerRef?: string | null;
  ownerId?: string | null;
  now?: Date;
}): Promise<{
  billId: string;
  supplierId: string;
  supplierCreated: boolean;
  parsed: ParsedEInvoice;
}> {
  const now = input.now ?? new Date();
  const xml = await readEInvoiceFile(input.bytes);
  const parsed = parseEInvoiceXml(xml);
  const org = input.organizationId;

  const suppliers = await prisma.supplier.findMany({
    where: { organizationId: org, deletedAt: null },
    select: { id: true, name: true, siret: true, vatNumber: true },
  });
  const norm = (s: string | null | undefined) => (s ?? "").replace(/\s/g, "").toUpperCase();
  const { siren, vatNumber, name } = parsed.seller;
  let supplier =
    (siren && suppliers.find((s) => norm(s.siret).startsWith(siren))) ||
    (vatNumber && suppliers.find((s) => norm(s.vatNumber) === norm(vatNumber))) ||
    suppliers.find((s) => s.name.trim().toLowerCase() === name.trim().toLowerCase()) ||
    null;

  if (supplier) {
    const duplicate = await prisma.bill.findFirst({
      where: {
        organizationId: org,
        supplierId: supplier.id,
        number: parsed.number,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (duplicate)
      throw new SalesError(`La facture ${parsed.number} de ${supplier.name} est déjà enregistrée.`);
  }

  const sign = parsed.isCreditNote ? -1 : 1;
  return prisma.$transaction(async (tx) => {
    let supplierCreated = false;
    if (!supplier) {
      supplier = await tx.supplier.create({
        data: { organizationId: org, name, siret: siren, vatNumber },
        select: { id: true, name: true, siret: true, vatNumber: true },
      });
      supplierCreated = true;
    }
    const bill = await tx.bill.create({
      data: {
        organizationId: org,
        supplierId: supplier.id,
        number: parsed.number,
        status: "to_pay",
        issueDate: parsed.issueDate ?? now,
        dueDate: parsed.dueDate,
        totalExclCents: sign * parsed.totalExclCents,
        vatCents: sign * parsed.taxCents,
        totalCents: sign * parsed.totalCents,
        ownerId: input.ownerId ?? null,
        notes: `${parsed.isCreditNote ? "Avoir" : "Facture"} électronique reçue (${parsed.format}${
          parsed.currency !== "EUR" ? `, ${parsed.currency}` : ""
        }).`,
      },
      select: { id: true },
    });
    await tx.eInvoice.create({
      data: {
        organizationId: org,
        direction: "IN",
        billId: bill.id,
        provider: input.provider ?? "upload",
        providerRef: input.providerRef ?? null,
        number: parsed.number,
        status: "made_available",
        statusAt: now,
        history: [{ status: "made_available", at: now.toISOString() }],
        counterpartyName: name,
        counterpartySiren: siren,
        totalCents: sign * parsed.totalCents,
        xml,
      },
    });
    return { billId: bill.id, supplierId: supplier.id, supplierCreated, parsed };
  });
}

export interface EInvoicingSyncResult {
  statusUpdates: number;
  received: number;
  errors: string[];
}

/** Synchronisation quotidienne : statuts des factures transmises et factures reçues. */
export async function syncEInvoicing(now: Date = new Date()): Promise<EInvoicingSyncResult> {
  const result: EInvoicingSyncResult = { statusUpdates: 0, received: 0, errors: [] };
  const orgs = await prisma.salesSettings.findMany({
    where: { einvoicingProvider: { not: null } },
    select: { organizationId: true, einvoicingProvider: true, einvoicingSyncedAt: true },
  });
  for (const org of orgs) {
    const provider = einvoicingProvider(org.einvoicingProvider);
    if (!provider) continue;
    try {
      const open = await prisma.eInvoice.findMany({
        where: {
          organizationId: org.organizationId,
          direction: "OUT",
          provider: provider.key,
          providerRef: { not: null },
        },
        select: { id: true, providerRef: true, status: true, createdAt: true, history: true },
      });
      const pending = open.filter((e) => !isFinalStatus(e.status) && e.status !== "error");
      const updates = await provider.statuses(
        pending.map((e) => ({ ref: e.providerRef!, status: e.status, sentAt: e.createdAt })),
        now,
      );
      for (const u of updates) {
        const row = pending.find((e) => e.providerRef === u.ref);
        if (!row || row.status === u.status) continue;
        await prisma.eInvoice.update({
          where: { id: row.id },
          data: {
            status: u.status,
            statusAt: now,
            history: pushEvent(row.history, {
              status: u.status,
              at: now.toISOString(),
              message: u.message,
            }),
          },
        });
        result.statusUpdates += 1;
      }
      for (const file of await provider.incoming(org.einvoicingSyncedAt)) {
        try {
          await importIncomingEInvoice({
            organizationId: org.organizationId,
            bytes: file.bytes,
            provider: provider.key,
            providerRef: file.ref,
            now,
          });
          result.received += 1;
        } catch (error) {
          result.errors.push(`${org.organizationId} ${file.ref}: ${String(error)}`);
        }
      }
      await prisma.salesSettings.update({
        where: { organizationId: org.organizationId },
        data: { einvoicingSyncedAt: now },
      });
    } catch (error) {
      result.errors.push(`${org.organizationId}: ${String(error)}`);
    }
  }
  return result;
}
