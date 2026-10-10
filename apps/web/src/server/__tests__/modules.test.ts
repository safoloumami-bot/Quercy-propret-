import { prisma } from "@quercy/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { workingDays } from "../records/hooks";
import { testFixtures } from "./helpers";

const fx = testFixtures("modules");
type Api = Awaited<ReturnType<typeof fx.caller>>;

let orgId: string;
let ownerApi: Api;
let ownerId: string;

beforeAll(async () => {
  const owner = await fx.user("owner");
  ownerId = owner.id;
  const org = await fx.org("a");
  orgId = org.id;
  await fx.member(orgId, owner.id, "owner");
  ownerApi = await fx.caller(owner, orgId);
});

afterAll(async () => {
  await fx.cleanup();
  await prisma.$disconnect();
});

describe("stocks", () => {
  it("calcule le stock des mouvements (corbeille comprise) et alerte sous le seuil", async () => {
    const product = await ownerApi.records.create({
      entity: "product",
      values: { name: "Détergent 5 L", type: "good", unitPrice: 12, reorderLevel: 10 },
    });
    const stock = async () =>
      (await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stockQuantity;
    await ownerApi.records.create({
      entity: "stockMovement",
      values: { productId: product.id, type: "in", quantity: 30 },
    });
    const out = await ownerApi.records.create({
      entity: "stockMovement",
      values: { productId: product.id, type: "out", quantity: 25 },
    });
    expect(await stock()).toBe(5);
    expect(
      await prisma.notification.count({ where: { organizationId: orgId, type: "stock.low" } }),
    ).toBe(1);
    await ownerApi.records.delete({ entity: "stockMovement", ids: [out.id] });
    expect(await stock()).toBe(30);
    await ownerApi.records.restore({ entity: "stockMovement", ids: [out.id] });
    expect(await stock()).toBe(5);
  });
});

describe("trésorerie", () => {
  it("tient le solde à jour : solde initial + opérations", async () => {
    const account = await ownerApi.records.create({
      entity: "bankAccount",
      values: { name: "Courant", openingBalanceCents: 1000 },
    });
    const balance = async () =>
      (await prisma.bankAccount.findUniqueOrThrow({ where: { id: account.id } })).balanceCents;
    await ownerApi.records.create({
      entity: "bankTransaction",
      values: { label: "Client", amountCents: 500, accountId: account.id },
    });
    await ownerApi.records.create({
      entity: "bankTransaction",
      values: { label: "Loyer", amountCents: -200, accountId: account.id },
    });
    // Montants saisis en euros, stockés en centimes.
    expect(await balance()).toBe(100_000 + 50_000 - 20_000);
    await ownerApi.records.update({
      entity: "bankAccount",
      id: account.id,
      values: { openingBalanceCents: 0 },
    });
    expect(await balance()).toBe(30_000);
  });
});

describe("règles métier", () => {
  it("date de paiement, de résolution et jours ouvrés", async () => {
    const supplier = await ownerApi.records.create({
      entity: "supplier",
      values: { name: "Papeterie" },
    });
    const bill = await ownerApi.records.create({
      entity: "bill",
      values: { supplierId: supplier.id, totalCents: 120 },
    });
    await ownerApi.records.update({ entity: "bill", id: bill.id, values: { status: "paid" } });
    expect((await prisma.bill.findUniqueOrThrow({ where: { id: bill.id } })).paidAt).not.toBeNull();

    const ticket = await ownerApi.records.create({
      entity: "ticket",
      values: { subject: "Vitres" },
    });
    await ownerApi.records.update({
      entity: "ticket",
      id: ticket.id,
      values: { status: "resolved" },
    });
    expect(
      (await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).resolvedAt,
    ).not.toBeNull();

    const employee = await ownerApi.records.create({
      entity: "employee",
      values: { firstName: "Julie", lastName: "Martin" },
    });
    const leave = await ownerApi.records.create({
      entity: "leave",
      values: { employeeId: employee.id, startDate: "2026-09-25", endDate: "2026-09-29" },
    });
    expect((await prisma.leave.findUniqueOrThrow({ where: { id: leave.id } })).days).toBe(3);
    expect(workingDays(new Date("2026-09-26"), new Date("2026-09-27"))).toBe(0);
  });

  it("crée une facture fournisseur à partir d'un document lu (fournisseur réutilisé)", async () => {
    const data = {
      documentType: "invoice" as const,
      supplierName: "papeterie",
      supplierSiret: null,
      supplierVatNumber: null,
      documentNumber: "F-42",
      issueDate: "2026-09-12",
      dueDate: "2026-10-12",
      currency: "EUR",
      totalExcludingTax: 100,
      totalTax: 20,
      totalIncludingTax: 120,
      vatLines: [],
      lines: [],
      paymentMethod: null,
      iban: null,
      notes: null,
    };
    const { id, url } = await ownerApi.purchases.billFromExtraction({ data });
    expect(url).toBe(`/achats/factures/${id}`);
    const bill = await prisma.bill.findUniqueOrThrow({
      where: { id },
      include: { supplier: true },
    });
    expect(bill).toMatchObject({ number: "F-42", totalCents: 12_000, ownerId });
    expect(bill.supplier.name).toBe("Papeterie");
    expect(await prisma.supplier.count({ where: { organizationId: orgId } })).toBe(1);
  });
});
