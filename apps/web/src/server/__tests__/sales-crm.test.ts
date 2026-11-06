import { prisma } from "@quercy/db";
import { closeMailer } from "@quercy/mailer";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { expectCode, testFixtures } from "./helpers";

const fx = testFixtures("sales");
type Api = Awaited<ReturnType<typeof fx.caller>>;

let orgId: string;
let ownerApi: Api;
let sellerApi: Api;
let viewerApi: Api;
let outsiderApi: Api;
let companyId: string;

const LINES = [
  {
    description: "Entretien mensuel",
    quantity: 1,
    unitPriceCents: 89_000,
    discountPercent: 0,
    vatRate: 20,
  },
  { description: "Vitrerie", quantity: 4, unitPriceCents: 3_800, discountPercent: 10, vatRate: 20 },
];

beforeAll(async () => {
  process.env.ENABLE_DEV_MAILBOX = "false";
  delete process.env.RESEND_API_KEY;
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  const owner = await fx.user("owner");
  const seller = await fx.user("seller");
  const viewer = await fx.user("viewer");
  const outsider = await fx.user("outsider");
  const org = await fx.org("a");
  const other = await fx.org("b");
  orgId = org.id;
  await fx.member(orgId, owner.id, "owner");
  await fx.member(orgId, seller.id, "member");
  await fx.member(orgId, viewer.id, "viewer");
  await fx.member(other.id, outsider.id, "owner");
  ownerApi = await fx.caller(owner, orgId);
  sellerApi = await fx.caller(seller, orgId);
  viewerApi = await fx.caller(viewer, orgId);
  outsiderApi = await fx.caller(outsider, other.id);
  const company = await ownerApi.records.create({
    entity: "company",
    values: { name: "Mairie de Figeac", email: "compta@figeac.fr", city: "Figeac" },
  });
  companyId = company.id;
});

afterAll(async () => {
  await fx.cleanup();
  await closeMailer();
  await prisma.$disconnect();
});

describe("cycle devis → facture → paiement", () => {
  let quoteId = "";
  let invoiceId = "";

  it("crée un devis brouillon depuis le moteur générique puis l'émet", async () => {
    const quote = await ownerApi.records.create({
      entity: "quote",
      values: { companyId, subject: "Entretien des locaux" },
    });
    quoteId = quote.id;
    expect(quote).toMatchObject({ kind: "QUOTE", status: "draft", number: null });
    await ownerApi.sales.saveLines({ id: quoteId, lines: LINES });
    const issued = await ownerApi.sales.finalize({ id: quoteId });
    expect(issued.number).toMatch(/^DV-\d{4}-0001$/);
    expect(issued.totalExclCents).toBe(89_000 + 13_680);
    // Un devis n'apparaît pas dans la liste des factures (même table, entités distinctes).
    const invoices = await ownerApi.records.list({ entity: "invoice" });
    expect(invoices.rows.some((r) => r.id === quoteId)).toBe(false);
  });

  it("transforme le devis en facture, figée une fois émise", async () => {
    const { id } = await ownerApi.sales.convert({ id: quoteId, to: "INVOICE" });
    invoiceId = id;
    const invoice = await ownerApi.sales.finalize({ id: invoiceId });
    expect(invoice.number).toMatch(/^FA-\d{4}-0001$/);
    await expectCode(
      ownerApi.records.update({ entity: "invoice", id: invoiceId, values: { subject: "Autre" } }),
      "BAD_REQUEST",
    );
    await expectCode(
      ownerApi.records.delete({ entity: "invoice", ids: [invoiceId] }),
      "BAD_REQUEST",
    );
    await expectCode(ownerApi.sales.saveLines({ id: invoiceId, lines: LINES }), "BAD_REQUEST");
    // Le responsable reste modifiable.
    await ownerApi.records.update({
      entity: "invoice",
      id: invoiceId,
      values: { tags: ["mairie"] },
    });
  });

  it("enregistre un paiement partiel et envoie la facture", async () => {
    const doc = await ownerApi.sales.addPayment({
      id: invoiceId,
      amountCents: 50_000,
      date: new Date(),
      method: "transfer",
    });
    expect(doc.status).toBe("partial");
    await ownerApi.sales.send({ id: invoiceId, to: "compta@figeac.fr" });
    const sent = await prisma.salesDocument.findUniqueOrThrow({ where: { id: invoiceId } });
    expect(sent.sentAt).not.toBeNull();
  });

  it("applique les droits : lecture seule, périmètre, autre espace", async () => {
    await expect(viewerApi.sales.document({ id: invoiceId })).resolves.toMatchObject({
      canEdit: false,
    });
    await expectCode(viewerApi.sales.finalize({ id: quoteId }), "FORBIDDEN");
    // Un membre modifie seulement ses propres documents.
    await expectCode(
      sellerApi.sales.addPayment({
        id: invoiceId,
        amountCents: 100,
        date: new Date(),
        method: "cash",
      }),
      "FORBIDDEN",
    );
    await expectCode(outsiderApi.sales.document({ id: invoiceId }), "NOT_FOUND");
    await expectCode(viewerApi.sales.updateSettings({} as never), "BAD_REQUEST");
  });

  it("réserve les paramètres de vente aux administrateurs", async () => {
    const settings = await ownerApi.sales.settings();
    const input = {
      legalName: "Quercy Propreté SAS",
      address: "14 allée Fénelon",
      postalCode: "46000",
      city: "Cahors",
      country: "France",
      siret: "812 345 678 00021",
      vatNumber: "FR45812345678",
      email: "",
      phone: null,
      iban: "FR76 1310 6005 0030 0123 4567 890",
      bic: null,
      vatExempt: false,
      quotePrefix: "DV",
      orderPrefix: "BC",
      invoicePrefix: "FAC",
      creditNotePrefix: "AV",
      paymentTermsDays: 45,
      quoteValidityDays: 30,
      footer: null,
      latePenaltyText: null,
      remindersEnabled: true,
      reminderDays: [15, 7, 7],
    };
    expect(settings.invoicePrefix).toBe("FA");
    await expectCode(sellerApi.sales.updateSettings(input), "FORBIDDEN");
    await ownerApi.sales.updateSettings(input);
    const saved = await ownerApi.sales.settings();
    expect(saved).toMatchObject({
      siret: "81234567800021",
      invoicePrefix: "FAC",
      reminderDays: [7, 15],
    });
    await expectCode(
      ownerApi.sales.setStripe({ secretKey: "pas-une-cle", webhookSecret: "whsec_1234567890" }),
      "BAD_REQUEST",
    );
    await ownerApi.sales.setStripe({
      secretKey: "sk_test_1234567890abcdef",
      webhookSecret: "whsec_1234567890abcd",
    });
    const withStripe = await ownerApi.sales.settings();
    expect(withStripe.stripe.secretKey).toBe("sk_test_…cdef");
    const raw = await prisma.salesSettings.findUniqueOrThrow({ where: { organizationId: orgId } });
    expect(raw.stripeSecretKeyEnc).not.toContain("sk_test");
  });
});

describe("CRM : pipeline, doublons, chronomètre", () => {
  it("fait suivre la probabilité et la date de clôture à l'étape", async () => {
    const deal = await ownerApi.records.create({
      entity: "deal",
      values: { name: "Contrat annuel", companyId, stage: "proposal", amount: "12000" },
    });
    expect(deal).toMatchObject({ probability: 50, closedAt: null });
    const won = await ownerApi.records.update({
      entity: "deal",
      id: deal.id,
      values: { stage: "won" },
    });
    expect(won.probability).toBe(100);
    expect(won.closedAt).not.toBeNull();
    const reopened = await ownerApi.records.update({
      entity: "deal",
      id: deal.id,
      values: { stage: "negotiation" },
    });
    expect(reopened).toMatchObject({ probability: 75, closedAt: null });
  });

  it("détecte et fusionne deux entreprises en double", async () => {
    const a = await ownerApi.records.create({
      entity: "company",
      values: { name: "Boulangerie Delpech", city: "Cahors" },
    });
    const b = await ownerApi.records.create({
      entity: "company",
      values: { name: "Boulangerie Delpech SARL", phone: "05 65 00 00 00", tags: "pain" },
    });
    const contact = await ownerApi.records.create({
      entity: "contact",
      values: { lastName: "Delpech", companyId: b.id },
    });
    const pairs = await ownerApi.crm.duplicates({ entity: "company" });
    expect(
      pairs.some((p) => [p.firstId, p.secondId].sort().join() === [a.id, b.id].sort().join()),
    ).toBe(true);
    await expectCode(sellerApi.crm.duplicates({ entity: "company" }), "FORBIDDEN");

    const { moved } = await ownerApi.crm.merge({ entity: "company", keepId: a.id, mergeId: b.id });
    expect(moved.contacts).toBe(1);
    const kept = await ownerApi.records.get({ entity: "company", id: a.id });
    expect(kept.row).toMatchObject({ phone: "05 65 00 00 00", tags: ["pain"] });
    const moved2 = await prisma.contact.findUniqueOrThrow({ where: { id: contact.id } });
    expect(moved2.companyId).toBe(a.id);
    await expectCode(ownerApi.records.get({ entity: "company", id: b.id }), "NOT_FOUND");
  });

  it("chronomètre une tâche puis l'arrête", async () => {
    const task = await sellerApi.records.create({
      entity: "task",
      values: { title: "Visite technique" },
    });
    await sellerApi.timer.start({ taskId: task.id });
    const current = await sellerApi.timer.current();
    expect(current?.label).toBe("Visite technique");
    const { minutes } = await sellerApi.timer.stop();
    expect(minutes).toBe(1);
    expect(await sellerApi.timer.current()).toBeNull();
  });
});
