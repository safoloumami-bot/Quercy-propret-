import { prisma } from "@quercy/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { expectCode, testFixtures } from "./helpers";

const fx = testFixtures("pilotage");
type Api = Awaited<ReturnType<typeof fx.caller>>;
let orgId: string;
let owner: Api;
let alice: Api;
const ids: Record<string, string> = {};

beforeAll(async () => {
  const org = await fx.org("a");
  orgId = org.id;
  for (const [key, role] of [
    ["owner", "owner"],
    ["alice", "worker"],
    ["sous", "worker"],
  ] as const) {
    const created = await fx.user(key);
    ids[key] = created.id;
    await fx.member(orgId, created.id, role);
    if (key === "owner") owner = await fx.caller(created, orgId);
    if (key === "alice") alice = await fx.caller(created, orgId);
  }
  await prisma.workerProfile.createMany({
    data: [
      { organizationId: orgId, userId: ids.alice!, kind: "employee", hourlyCostCents: 2_400 },
      { organizationId: orgId, userId: ids.sous!, kind: "subcontractor", hourlyCostCents: 3_000 },
    ],
  });
  const companyA = await prisma.company.create({ data: { organizationId: orgId, name: "A" } });
  const companyB = await prisma.company.create({ data: { organizationId: orgId, name: "B" } });
  ids.companyA = companyA.id;
  const site = await prisma.site.create({
    data: { organizationId: orgId, name: "Site A", companyId: companyA.id },
  });
  const siteB = await prisma.site.create({
    data: { organizationId: orgId, name: "Site B", companyId: companyB.id },
  });
  const good = await prisma.cleaningContract.create({
    data: {
      organizationId: orgId,
      name: "Contrat rentable",
      siteId: site.id,
      companyId: companyA.id,
      monthlyPriceCents: 40_000,
    },
  });
  const bad = await prisma.cleaningContract.create({
    data: {
      organizationId: orgId,
      name: "Contrat à perte",
      siteId: siteB.id,
      companyId: companyB.id,
      billingMode: "per_visit",
      visitPriceCents: 5_000,
    },
  });
  ids.bad = bad.id;
  // Mois précédent : 4 passages au forfait (1 manqué), 2 au passage chez B.
  const now = new Date();
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const day = (n: number) => new Date(first.getTime() + n * 86_400_000);
  const visit = (contract: typeof good, n: number, status: string, agent: string, minutes = 0) =>
    prisma.intervention.create({
      data: {
        organizationId: orgId,
        title: contract.name,
        siteId: contract.siteId,
        companyId: contract.companyId,
        contractId: contract.id,
        date: day(n),
        status,
        ownerId: agent,
        workedMinutes: minutes || null,
      },
    });
  const v1 = await visit(good, 0, "done", ids.alice!, 120);
  await visit(good, 7, "done", ids.alice!, 120);
  await visit(good, 14, "missed", ids.alice!);
  await visit(good, 21, "done", ids.alice!, 120);
  await visit(bad, 2, "done", ids.sous!, 180);
  await visit(bad, 9, "done", ids.sous!, 180);
  const product = await prisma.product.create({
    data: { organizationId: orgId, name: "Sacs", type: "good", purchasePrice: 2.5 },
  });
  await prisma.stockMovement.create({
    data: {
      organizationId: orgId,
      productId: product.id,
      type: "out",
      quantity: 4,
      interventionId: v1.id,
    },
  });
});

afterAll(async () => {
  await prisma.stockMovement.deleteMany({ where: { organizationId: orgId } });
  await prisma.intervention.deleteMany({ where: { organizationId: orgId } });
  await fx.cleanup();
  await prisma.$disconnect();
});

describe("pilotage financier", () => {
  it("CA des passages, coûts directs, marge ; les contrats peu rentables ressortent", async () => {
    await expectCode(alice.finance.dashboard({ preset: "last_month" }), "FORBIDDEN");
    const d = await owner.finance.dashboard({ preset: "last_month" });
    // Forfait 400 € avec 1 passage manqué sur 4 → 300 € ; 2 passages × 50 € = 100 €.
    expect(d.totals).toMatchObject({ recurringCents: 40_000, oneOffCents: 0 });
    // Salariée : 6 h × 24 € = 144 € ; sous-traitant : 6 h × 30 € = 180 € ; sacs 4 × 2,50 €.
    const cost = Object.fromEntries(d.costs.map((c) => [c.key, c.cents]));
    expect(cost).toMatchObject({ employees: 14_400, subcontractors: 18_000, products: 1_000 });
    expect(d.totals.marginCents).toBe(40_000 - 33_400);
    expect(d.lowProfit.map((c) => [c.label, c.marginPct])).toEqual([["Contrat à perte", -80]]);
    const good = d.contracts.find((c) => c.label === "Contrat rentable")!;
    expect(good).toMatchObject({ revenueCents: 30_000, costCents: 15_400, marginPct: 48.7 });

    const filtered = await owner.finance.dashboard({
      preset: "last_month",
      companyId: ids.companyA!,
    });
    expect(filtered.unfiltered).toBe(false);
    expect(filtered.totals.revenueCents).toBe(30_000);
    expect(filtered.lowProfit).toEqual([]);
  });
});
