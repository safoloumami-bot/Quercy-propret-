import { randomBytes } from "node:crypto";

import { prisma } from "@quercy/db";
import { closeMailer } from "@quercy/mailer";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { runDailySales } from "../daily";
import {
  addPayment,
  convertDocument,
  createCreditNote,
  finalizeDocument,
  getDocument,
  invoiceProjectTime,
  makeRecurring,
  saveLines,
} from "../service";

const run = randomBytes(4).toString("hex");
let orgId = "";
let companyId = "";

async function draft(kind: string, extra: Record<string, unknown> = {}) {
  return prisma.salesDocument.create({
    data: {
      organizationId: orgId,
      kind,
      status: kind === "RECURRING" ? "active" : "draft",
      companyId,
      ...extra,
    },
  });
}

const LINES = [
  {
    description: "Forfait entretien",
    quantity: 1,
    unitPriceCents: 100_000,
    discountPercent: 0,
    vatRate: 20,
  },
  { description: "Produits", quantity: 2, unitPriceCents: 1_000, discountPercent: 0, vatRate: 5.5 },
];

beforeAll(async () => {
  process.env.ENABLE_DEV_MAILBOX = "false";
  delete process.env.RESEND_API_KEY;
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  const org = await prisma.organization.create({
    data: { name: "Ventes test", slug: `ventes-${run}` },
  });
  orgId = org.id;
  const company = await prisma.company.create({
    data: { organizationId: orgId, name: "Client test", email: "client@example.fr" },
  });
  companyId = company.id;
});

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: orgId } });
  await closeMailer();
  await prisma.$disconnect();
});

describe("documents commerciaux", () => {
  it("calcule les totaux et numérote les factures sans trou, par année", async () => {
    const a = await draft("INVOICE");
    const saved = await saveLines(orgId, a.id, LINES);
    expect(saved.totalExclCents).toBe(102_000);
    expect(saved.taxCents).toBe(20_000 + 110);
    expect(saved.totalCents).toBe(122_110);

    const b = await draft("INVOICE");
    await expect(finalizeDocument(orgId, b.id)).rejects.toThrow(/au moins une ligne/);
    await saveLines(orgId, b.id, LINES);

    const now = new Date("2026-03-10T12:00:00Z");
    const first = await finalizeDocument(orgId, a.id, now);
    const second = await finalizeDocument(orgId, b.id, now);
    expect(first.number).toBe("FA-2026-0001");
    expect(second.number).toBe("FA-2026-0002");
    expect(first.dueDate?.toISOString()).toBe("2026-04-09T00:00:00.000Z");
    // Une émission refusée ne consomme pas de numéro.
    const c = await draft("INVOICE", { companyId: null });
    await saveLines(orgId, c.id, LINES);
    await expect(finalizeDocument(orgId, c.id, now)).rejects.toThrow(/client/);
    const d = await draft("INVOICE");
    await saveLines(orgId, d.id, LINES);
    expect((await finalizeDocument(orgId, d.id, now)).number).toBe("FA-2026-0003");
    // Émise, la facture n'est plus modifiable.
    await expect(saveLines(orgId, a.id, LINES)).rejects.toThrow(/avoir/);
  });

  it("impute paiements et avoirs, et met à jour le statut", async () => {
    const inv = await draft("INVOICE");
    await saveLines(orgId, inv.id, LINES);
    await finalizeDocument(orgId, inv.id);
    let doc = await addPayment(
      orgId,
      inv.id,
      { amountCents: 22_110, date: new Date(), method: "transfer" },
      null,
    );
    expect(doc.status).toBe("partial");
    expect(doc.dueCents).toBe(100_000);
    // Paiement Stripe rejoué (même référence) : ignoré.
    await addPayment(
      orgId,
      inv.id,
      { amountCents: 22_110, date: new Date(), method: "stripe", reference: "cs_1" },
      null,
    );
    doc = await addPayment(
      orgId,
      inv.id,
      { amountCents: 22_110, date: new Date(), method: "stripe", reference: "cs_1" },
      null,
    );
    expect(doc.paidCents).toBe(44_220);

    const credit = await createCreditNote(orgId, inv.id, null);
    await saveLines(orgId, credit.id, [{ ...LINES[0]!, unitPriceCents: 50_000, vatRate: 20 }]);
    const issued = await finalizeDocument(orgId, credit.id);
    expect(issued.number).toMatch(/^AV-\d{4}-0001$/);
    doc = await getDocument(orgId, inv.id);
    expect(doc.dueCents).toBe(122_110 - 44_220 - 60_000);
    expect(doc.status).toBe("partial");
  });

  it("transforme un devis accepté en facture", async () => {
    const quote = await draft("QUOTE");
    await saveLines(orgId, quote.id, LINES);
    await expect(convertDocument(orgId, quote.id, "INVOICE", null)).rejects.toThrow();
    await finalizeDocument(orgId, quote.id);
    const invoice = await convertDocument(orgId, quote.id, "INVOICE", null);
    const full = await getDocument(orgId, invoice.id);
    expect(full.lines).toHaveLength(2);
    expect(full.totalCents).toBe(122_110);
    expect(full.sourceId).toBe(quote.id);
    expect((await getDocument(orgId, quote.id)).status).toBe("invoiced");
  });

  it("génère les factures récurrentes et relance les impayés", async () => {
    const inv = await draft("INVOICE");
    await saveLines(orgId, inv.id, LINES);
    await finalizeDocument(orgId, inv.id, new Date("2026-01-15T09:00:00Z"));
    const template = await makeRecurring(orgId, inv.id, "monthly", null);
    await prisma.salesDocument.update({ where: { id: template.id }, data: { autoSend: true } });
    expect(template.nextRunAt?.toISOString()).toBe("2026-02-15T00:00:00.000Z");

    const result = await runDailySales("https://app.quercy.test", new Date("2026-02-15T06:00:00Z"));
    expect(result.errors).toEqual([]);
    expect(result.recurring).toBeGreaterThanOrEqual(1);
    const generated = await prisma.salesDocument.findFirst({
      where: { organizationId: orgId, sourceId: template.id },
    });
    expect(generated?.number).toMatch(/^FA-2026-/);
    expect(generated?.sentAt).not.toBeNull();
    const after = await getDocument(orgId, template.id);
    expect(after.nextRunAt?.toISOString()).toBe("2026-03-15T00:00:00.000Z");

    // La facture de janvier (échéance 14 février) est en retard ; relance à J+7.
    await runDailySales("https://app.quercy.test", new Date("2026-02-22T06:00:00Z"));
    const late = await getDocument(orgId, inv.id);
    expect(late.status).toBe("overdue");
    expect(late.reminderCount).toBe(1);
  });

  it("facture le temps passé non facturé d'un projet", async () => {
    const project = await prisma.project.create({
      data: { organizationId: orgId, name: "Remise en état", companyId, hourlyRate: 45 },
    });
    await prisma.timeEntry.createMany({
      data: [
        { organizationId: orgId, projectId: project.id, date: new Date(), minutes: 90 },
        { organizationId: orgId, projectId: project.id, date: new Date(), minutes: 30 },
        {
          organizationId: orgId,
          projectId: project.id,
          date: new Date(),
          minutes: 60,
          billable: false,
        },
      ],
    });
    const { invoice, entries } = await invoiceProjectTime(orgId, project.id, null);
    expect(entries).toBe(2);
    const full = await getDocument(orgId, invoice.id);
    expect(full.totalExclCents).toBe(9_000);
    await expect(invoiceProjectTime(orgId, project.id, null)).rejects.toThrow(/Aucun temps/);
  });
});
