import { addDays, dayKey, parseDay, todayIn } from "@quercy/core";
import { prisma } from "@quercy/db";
import { reviseContracts } from "@quercy/jobs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { expectCode, testFixtures } from "./helpers";

const fx = testFixtures("chiffrage");
type Api = Awaited<ReturnType<typeof fx.caller>>;
let orgId: string;
let owner: Api;
let chef: Api;
let alice: Api;
const ids: Record<string, string> = {};
const today = parseDay(todayIn());

const base = {
  kind: "one_off" as const,
  people: 2,
  hoursPerPerson: 3,
  hourlyCostCents: 2_200,
  km: 30,
  kmCostCents: 50,
  travelMinutes: 30,
  productsCents: 800,
  equipmentCents: 500,
  rentalCents: 0,
  subcontractCents: 0,
  otherCents: 300,
  targetMarginPct: 32,
  priceCents: null,
  weekdays: [],
  startTime: "08:00",
  startDate: dayKey(addDays(today, 10)),
  endDate: null,
};

beforeAll(async () => {
  const org = await fx.org("a");
  orgId = org.id;
  for (const [key, role] of [
    ["owner", "owner"],
    ["chef", "manager"],
    ["alice", "worker"],
  ] as const) {
    const created = await fx.user(key);
    const u = await prisma.user.update({ where: { id: created.id }, data: { name: key } });
    ids[key] = u.id;
    await fx.member(orgId, u.id, role);
    if (key === "owner") owner = await fx.caller(u, orgId);
    if (key === "chef") chef = await fx.caller(u, orgId);
    if (key === "alice") alice = await fx.caller(u, orgId);
  }
  ids.company = (
    await prisma.company.create({ data: { organizationId: orgId, name: "Syndic Lot" } })
  ).id;
  ids.site = (
    await prisma.site.create({
      data: { organizationId: orgId, name: "Résidence Lot", companyId: ids.company },
    })
  ).id;
});

afterAll(async () => {
  await prisma.interventionEvent.deleteMany({ where: { organizationId: orgId } });
  await prisma.intervention.deleteMany({ where: { organizationId: orgId } });
  await prisma.estimate.deleteMany({ where: { organizationId: orgId } });
  await fx.cleanup();
  await prisma.$disconnect();
});

describe("chiffrage", () => {
  it("calcul enregistré, validation du chef, devis puis contrat ponctuel", async () => {
    const e = await chef.records.create({
      entity: "estimate",
      values: { title: "Remise en état après travaux", companyId: ids.company, siteId: ids.site },
    });
    ids.estimate = e.id as string;
    await chef.estimates.save({ id: ids.estimate, values: base });
    let got = await chef.estimates.get({ id: ids.estimate });
    expect(got.estimate).toMatchObject({
      reference: `CH-${new Date().getFullYear()}-0001`,
      costCents: 18_500,
      advisedPriceCents: 27_206,
      minPriceCents: 23_125,
      marginPct: 32,
      ownerApprovalRequired: false,
    });
    // Pas de devis avant validation ; l'agent ne valide pas.
    await expectCode(chef.estimates.createQuote({ id: ids.estimate }), "BAD_REQUEST");
    await chef.estimates.submit({ id: ids.estimate });
    await expectCode(alice.estimates.approve({ id: ids.estimate }), "NOT_FOUND");
    expect(await chef.estimates.approve({ id: ids.estimate })).toEqual({
      status: "approved",
      waitingForBoss: false,
    });

    const { quoteId } = await chef.estimates.createQuote({ id: ids.estimate });
    const quote = await prisma.salesDocument.findUniqueOrThrow({
      where: { id: quoteId },
      include: { lines: true },
    });
    expect(quote).toMatchObject({ kind: "QUOTE", companyId: ids.company, totalExclCents: 27_206 });
    expect(quote.lines[0]!.description).toBe("Remise en état après travaux — Résidence Lot");
    // Le devis parti, le prix ne se change plus.
    await expectCode(chef.estimates.save({ id: ids.estimate, values: base }), "CONFLICT");

    const { contractId } = await chef.estimates.createContract({ id: ids.estimate });
    const contract = await prisma.cleaningContract.findUniqueOrThrow({
      where: { id: contractId },
      include: { interventions: true },
    });
    expect(contract).toMatchObject({
      kind: "one_off",
      billingMode: "per_visit",
      visitPriceCents: 27_206,
      durationMinutes: 180,
    });
    expect(contract.interventions).toHaveLength(1);
    expect(dayKey(contract.interventions[0]!.date)).toBe(base.startDate);
    got = await chef.estimates.get({ id: ids.estimate });
    expect(got.estimate.status).toBe("won");
    expect((await prisma.salesDocument.findUniqueOrThrow({ where: { id: quoteId } })).status).toBe(
      "accepted",
    );

    // Le ponctuel devient récurrent : planning rempli.
    const { created } = await chef.estimates.makeRecurring({
      contractId,
      weekdays: ["1", "4"],
      monthlyPriceCents: 52_000,
    });
    expect(created).toBeGreaterThan(0);
    await expectCode(
      chef.estimates.makeRecurring({ contractId, weekdays: ["1"], monthlyPriceCents: 1 }),
      "CONFLICT",
    );
  });

  it("sous la marge minimale, le chef ne suffit pas : le patron valide aussi", async () => {
    const e = await chef.records.create({
      entity: "estimate",
      values: { title: "Entretien bureaux", companyId: ids.company, siteId: ids.site },
    });
    const id = e.id as string;
    await chef.estimates.save({
      id,
      values: { ...base, kind: "recurring", weekdays: ["2", "5"], priceCents: 20_000 },
    });
    const got = await chef.estimates.get({ id });
    expect(got.estimate.ownerApprovalRequired).toBe(true);
    expect(got.estimate.monthlyPriceCents).toBe(173_400);
    await chef.estimates.submit({ id });
    expect(await chef.estimates.approve({ id })).toEqual({
      status: "submitted",
      waitingForBoss: true,
    });
    const notes = await prisma.notification.count({
      where: { organizationId: orgId, userId: ids.owner!, type: "estimate.owner_approval" },
    });
    expect(notes).toBe(1);
    expect(await owner.estimates.approve({ id })).toMatchObject({ status: "approved" });
    // Modifier un chiffrage validé le renvoie en brouillon.
    const r = await chef.estimates.save({
      id,
      values: { ...base, kind: "recurring", weekdays: ["2"] },
    });
    expect(r.reset).toBe(true);
    expect((await chef.estimates.get({ id })).estimate.status).toBe("draft");
  });
});

describe("facturation des passages", () => {
  it("une facture par client : forfait, manqués déduits, supplément validé, jamais deux fois", async () => {
    // Mois précédent, terminé.
    const first = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
    const period = first.toISOString().slice(0, 7);
    const contract = await prisma.cleaningContract.create({
      data: {
        organizationId: orgId,
        name: "Entretien Résidence Lot",
        siteId: ids.site!,
        companyId: ids.company,
        kind: "recurring",
        billingMode: "monthly",
        monthlyPriceCents: 40_000,
      },
    });
    const visit = (day: number, status: string, extra: Record<string, unknown> = {}) =>
      prisma.intervention.create({
        data: {
          organizationId: orgId,
          title: "Entretien",
          siteId: ids.site,
          companyId: ids.company,
          contractId: contract.id,
          date: addDays(first, day),
          status,
          ...extra,
        },
      });
    await visit(0, "done");
    await visit(7, "done");
    await visit(14, "missed");
    await visit(21, "done");
    const extra = await prisma.intervention.create({
      data: {
        organizationId: orgId,
        title: "Vitrerie hall",
        siteId: ids.site,
        companyId: ids.company,
        date: addDays(first, 3),
        status: "done",
      },
    });
    // Un supplément proposé attend la validation.
    await owner.records.update({
      entity: "intervention",
      id: extra.id,
      values: { extraPriceCents: 90 },
    });
    let preview = await chef.cleaningBilling.preview({ period });
    expect(preview.extras).toEqual([
      expect.objectContaining({ id: extra.id, extraPriceCents: 9_000 }),
    ]);
    await expectCode(alice.cleaningBilling.preview({ period }), "FORBIDDEN");
    await chef.cleaningBilling.decideExtra({
      interventionId: extra.id,
      approve: true,
      priceCents: 8_500,
    });

    preview = await chef.cleaningBilling.preview({ period });
    const client = preview.clients.find((c) => c.companyId === ids.company)!;
    expect(client.lines.map((l) => [l.quantity, l.unitPriceCents])).toEqual([
      [1, 40_000],
      [1, -10_000],
      [1, 8_500],
    ]);
    expect(client.totalExclCents).toBe(38_500);

    // Le mois en cours ne se facture pas encore.
    await expectCode(
      chef.cleaningBilling.createInvoices({
        period: today.toISOString().slice(0, 7),
        companyIds: [ids.company!],
      }),
      "CONFLICT",
    );
    const r = await chef.cleaningBilling.createInvoices({ period, companyIds: [ids.company!] });
    expect(r.created).toHaveLength(1);
    const invoice = await prisma.salesDocument.findUniqueOrThrow({
      where: { id: r.created[0]!.invoiceId },
      include: { billedInterventions: true },
    });
    expect(invoice).toMatchObject({ kind: "INVOICE", status: "draft", billingPeriod: period });
    expect(invoice.totalExclCents).toBe(38_500);
    expect(invoice.billedInterventions).toHaveLength(5);
    // Rejouer : rien de nouveau, la facture est retrouvée.
    const again = await chef.cleaningBilling.createInvoices({ period, companyIds: [ids.company!] });
    expect(again).toMatchObject({ created: [], skipped: [{ reason: "déjà facturé" }] });
    preview = await chef.cleaningBilling.preview({ period });
    expect(preview.clients.find((c) => c.companyId === ids.company)!.invoice?.id).toBe(invoice.id);
    // Un passage facturé ne change plus de supplément.
    await expectCode(
      owner.records.update({
        entity: "intervention",
        id: extra.id,
        values: { extraPriceCents: 10 },
      }),
      "BAD_REQUEST",
    );
  });
});

describe("contrats à l'année", () => {
  it("révision annuelle des prix et reconduction tacite, ou fin du contrat", async () => {
    const yesterday = addDays(today, -1);
    const renewed = await prisma.cleaningContract.create({
      data: {
        organizationId: orgId,
        name: "Bureaux A",
        siteId: ids.site!,
        monthlyPriceCents: 100_000,
        priceRevisionPct: 2.5,
        nextRevisionDate: today,
        tacitRenewal: true,
        endDate: yesterday,
      },
    });
    const ended = await prisma.cleaningContract.create({
      data: { organizationId: orgId, name: "Bureaux B", siteId: ids.site!, endDate: yesterday },
    });
    expect(await reviseContracts()).toBeGreaterThanOrEqual(2);
    const a = await prisma.cleaningContract.findUniqueOrThrow({ where: { id: renewed.id } });
    expect(a.monthlyPriceCents).toBe(102_500);
    expect(a.status).toBe("active");
    expect(a.endDate!.getUTCFullYear()).toBe(yesterday.getUTCFullYear() + 1);
    expect(a.nextRevisionDate!.getUTCFullYear()).toBe(today.getUTCFullYear() + 1);
    expect(
      (await prisma.cleaningContract.findUniqueOrThrow({ where: { id: ended.id } })).status,
    ).toBe("ended");
    // Une seconde passe le même jour ne révise pas deux fois.
    await reviseContracts();
    expect(
      (await prisma.cleaningContract.findUniqueOrThrow({ where: { id: renewed.id } }))
        .monthlyPriceCents,
    ).toBe(102_500);
  });
});
