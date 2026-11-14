import { PRESET_REPORTS } from "@quercy/core";
import { prisma } from "@quercy/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { expectCode, testFixtures } from "./helpers";

const fx = testFixtures("analytics");
type Api = Awaited<ReturnType<typeof fx.caller>>;

let orgId: string;
let ownerApi: Api;
let memberApi: Api;
let accountantApi: Api;
let memberId: string;

beforeAll(async () => {
  const owner = await fx.user("owner");
  const member = await fx.user("member");
  const accountant = await fx.user("accountant");
  memberId = member.id;
  const org = await fx.org("a");
  orgId = org.id;
  await fx.member(orgId, owner.id, "owner");
  await fx.member(orgId, member.id, "member");
  await fx.member(orgId, accountant.id, "accountant");
  ownerApi = await fx.caller(owner, orgId);
  memberApi = await fx.caller(member, orgId);
  accountantApi = await fx.caller(accountant, orgId);
  const company = await prisma.company.create({
    data: { organizationId: orgId, name: "Client A" },
  });
  const now = new Date();
  await prisma.salesDocument.createMany({
    data: [
      {
        organizationId: orgId,
        kind: "INVOICE",
        number: "FA-1",
        status: "sent",
        companyId: company.id,
        totalExclCents: 120_000,
        totalCents: 144_000,
        dueCents: 144_000,
        issueDate: now,
        ownerId: owner.id,
      },
      {
        organizationId: orgId,
        kind: "INVOICE",
        number: "FA-2",
        status: "overdue",
        companyId: company.id,
        totalExclCents: 30_000,
        totalCents: 36_000,
        dueCents: 36_000,
        issueDate: now,
        dueDate: new Date(now.getTime() - 40 * 86_400_000),
        ownerId: owner.id,
      },
      {
        organizationId: orgId,
        kind: "INVOICE",
        status: "draft",
        companyId: company.id,
        totalExclCents: 999_000,
        issueDate: now,
        ownerId: owner.id,
      },
    ],
  });
  await prisma.deal.createMany({
    data: [
      {
        organizationId: orgId,
        name: "D1",
        stage: "proposal",
        amount: 10_000,
        probability: 50,
        ownerId: owner.id,
      },
      {
        organizationId: orgId,
        name: "D2",
        stage: "won",
        amount: 5_000,
        probability: 100,
        closedAt: now,
        ownerId: member.id,
      },
    ],
  });
});

afterAll(async () => {
  await fx.cleanup();
  await prisma.$disconnect();
});

describe("tableau de bord", () => {
  it("propose un tableau par défaut selon le rôle, puis garde la disposition enregistrée", async () => {
    const initial = await ownerApi.dashboard.get();
    expect(initial.customized).toBe(false);
    expect(initial.layout.map((i) => i.widget)).toContain("revenue");
    const accountant = await accountantApi.dashboard.get();
    // Le comptable ne voit pas le CRM : aucun widget de pipeline.
    expect(accountant.layout.some((i) => i.widget === "pipeline")).toBe(false);
    expect(accountant.available.some((w) => w.key === "pipeline")).toBe(false);

    const layout = [{ i: "a", widget: "revenue", x: 0, y: 0, w: 4, h: 2, config: {} }];
    await ownerApi.dashboard.save({ layout });
    expect((await ownerApi.dashboard.get()).layout).toEqual(layout);
    await expectCode(
      accountantApi.dashboard.save({
        layout: [{ i: "b", widget: "pipeline", x: 0, y: 0, w: 4, h: 2, config: {} }],
      }),
      "BAD_REQUEST",
    );
    await ownerApi.dashboard.reset();
    expect((await ownerApi.dashboard.get()).customized).toBe(false);
  });

  it("calcule les indicateurs sur la période, émis seulement", async () => {
    const revenue = await ownerApi.dashboard.widget({
      widget: "revenue",
      period: { preset: "month" },
    });
    expect(revenue).toMatchObject({ kind: "kpi", value: 150_000, previous: 0 });
    const overdue = await ownerApi.dashboard.widget({
      widget: "overdue",
      period: { preset: "month" },
    });
    expect(overdue).toMatchObject({ kind: "overdue", total: 36_000, count: 1 });
    const pipeline = await ownerApi.dashboard.widget({
      widget: "pipeline",
      period: { preset: "month" },
    });
    expect(pipeline).toMatchObject({ kind: "pipeline", total: 10_000, weighted: 5_000 });
    await expectCode(
      accountantApi.dashboard.widget({ widget: "pipeline", period: { preset: "month" } }),
      "FORBIDDEN",
    );
  });
});

describe("rapports", () => {
  it("exécute un rapport avec liens vers la liste filtrée, et respecte le périmètre", async () => {
    const def = PRESET_REPORTS.find((p) => p.key === "revenue-by-customer")!.definition;
    const result = await ownerApi.reports.run({ definition: def, period: { preset: "month" } });
    expect(result.total).toBe(150_000);
    expect(result.points[0]).toMatchObject({ label: "Client A", value: 150_000 });
    expect(result.points[0]!.href).toContain("/ventes/factures?filtre=");

    const won = PRESET_REPORTS.find((p) => p.key === "deals-by-owner")!.definition;
    const mine = await memberApi.reports.run({ definition: won, period: { preset: "month" } });
    expect(mine.total).toBe(5_000);
    await expectCode(
      memberApi.reports.run({
        definition: { ...def, measure: { op: "sum", field: "subject" } },
        period: { preset: "month" },
      }),
      "BAD_REQUEST",
    );
  });

  it("enregistre, partage et protège les rapports", async () => {
    const def = PRESET_REPORTS.find((p) => p.key === "pipeline-by-stage")!.definition;
    const { id } = await memberApi.reports.save({
      name: "Mon pipeline",
      definition: def,
      period: "year",
      shared: false,
      schedule: "weekly",
      recipients: ["Chef@Exemple.fr"],
    });
    const saved = await prisma.report.findUniqueOrThrow({ where: { id } });
    expect(saved).toMatchObject({ ownerId: memberId, recipients: ["chef@exemple.fr"] });
    await expectCode(ownerApi.reports.get({ id }), "NOT_FOUND");
    await memberApi.reports.save({
      id,
      name: "Mon pipeline",
      definition: def,
      period: "year",
      shared: true,
      schedule: "none",
      recipients: [],
    });
    expect((await ownerApi.reports.list()).saved.some((r) => r.id === id)).toBe(true);
    await expectCode(accountantApi.reports.delete({ id }), "FORBIDDEN");
    await memberApi.reports.delete({ id });
    expect((await ownerApi.reports.list()).saved.some((r) => r.id === id)).toBe(false);
  });
});
