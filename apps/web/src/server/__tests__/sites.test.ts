import { dayKey, parseDay, todayIn } from "@quercy/core";
import { prisma } from "@quercy/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { expectCode, testFixtures } from "./helpers";

const fx = testFixtures("sites");
type Api = Awaited<ReturnType<typeof fx.caller>>;
let orgId: string;
let owner: Api;
let agentA: Api;
let agentB: Api;
let aId: string;
let bId: string;
let companyId: string;
let residence: string;
let cageA: string;
let cageB: string;
const today = todayIn();

beforeAll(async () => {
  const o = await fx.user("owner");
  const a = await fx.user("agent-a");
  const b = await fx.user("agent-b");
  aId = a.id;
  bId = b.id;
  orgId = (await fx.org("a")).id;
  await fx.member(orgId, o.id, "owner");
  await fx.member(orgId, a.id, "worker");
  await fx.member(orgId, b.id, "worker");
  owner = await fx.caller(o, orgId);
  agentA = await fx.caller(a, orgId);
  agentB = await fx.caller(b, orgId);

  companyId = (
    await prisma.company.create({ data: { organizationId: orgId, name: "Syndic Fictif" } })
  ).id;
  residence = (
    await prisma.site.create({
      data: { organizationId: orgId, name: "Résidence des Tilleuls", companyId, code: "R01" },
    })
  ).id;
  cageA = (
    await prisma.site.create({
      data: {
        organizationId: orgId,
        name: "Cage A",
        code: "R01-A",
        parentId: residence,
        accessCode: "4682B",
      },
    })
  ).id;
  cageB = (
    await prisma.site.create({
      data: { organizationId: orgId, name: "Cage B", code: "R01-B", parentId: residence },
    })
  ).id;
  const day = parseDay(today);
  await prisma.intervention.createMany({
    data: [
      {
        organizationId: orgId,
        title: "Cage A",
        siteId: cageA,
        ownerId: aId,
        date: day,
        startTime: "09:00",
        durationMinutes: 60,
      },
      {
        organizationId: orgId,
        title: "Cage B",
        siteId: cageB,
        ownerId: bId,
        date: day,
        startTime: "09:00",
        durationMinutes: 60,
      },
      // Chevauchement : l'agent A est aussi prévu à 9 h 30 sur la cage B.
      {
        organizationId: orgId,
        title: "Cage B renfort",
        siteId: cageB,
        ownerId: aId,
        date: day,
        startTime: "09:30",
        durationMinutes: 30,
        status: "done",
      },
      {
        organizationId: orgId,
        title: "Cage B vitres",
        siteId: cageB,
        ownerId: aId,
        date: day,
        startTime: "09:45",
        durationMinutes: 30,
      },
    ],
  });
  await prisma.siteInfo.createMany({
    data: [
      {
        organizationId: orgId,
        siteId: cageA,
        label: "Local poubelles",
        content: "Au fond de la cour",
        category: "access",
      },
      {
        organizationId: orgId,
        siteId: cageA,
        label: "Clé personnelle",
        content: "Boîte 3, code 1234",
        category: "keys",
        visibility: "agent",
        agentId: aId,
      },
      {
        organizationId: orgId,
        siteId: cageA,
        label: "Tarif",
        content: "Négocié à 45 €",
        category: "other",
        visibility: "managers",
      },
      {
        organizationId: orgId,
        siteId: cageA,
        label: "Ancienne",
        content: "Archivée",
        archivedAt: new Date(),
      },
    ],
  });
});

afterAll(async () => {
  await prisma.siteInfo.deleteMany({ where: { organizationId: orgId } });
  await prisma.intervention.deleteMany({ where: { organizationId: orgId } });
  await prisma.site.updateMany({ where: { organizationId: orgId }, data: { parentId: null } });
  await fx.cleanup();
  await prisma.$disconnect();
});

describe("fiche de site : chacun ne voit que ce qui le concerne", () => {
  it("le responsable voit tout, sous-sites compris", async () => {
    const sheet = await owner.sites.sheet({ siteId: cageA });
    expect(sheet.canManage).toBe(true);
    expect(sheet.infos.map((i) => i.label).sort()).toEqual([
      "Clé personnelle",
      "Local poubelles",
      "Tarif",
    ]);
    expect(sheet.site.parent).toMatchObject({ name: "Résidence des Tilleuls" });
    const parent = await owner.sites.sheet({ siteId: residence });
    expect(parent.site.children.map((c) => c.code)).toEqual(["R01-A", "R01-B"]);
  });

  it("l'agent du site voit les infos des agents et les siennes, pas celles des responsables", async () => {
    const sheet = await agentA.sites.sheet({ siteId: cageA });
    expect(sheet.canManage).toBe(false);
    expect(sheet.infos.map((i) => i.label).sort()).toEqual(["Clé personnelle", "Local poubelles"]);
    expect(sheet.site.accessCode).toBe("4682B");
  });

  it("un autre agent ne voit ni la fiche ni la clé personnelle", async () => {
    await expectCode(agentB.sites.sheet({ siteId: cageA }), "FORBIDDEN");
    const day = await agentA.cleaning.myDay({ day: today });
    const cage = day.find((i) => i.title === "Cage A")!;
    expect(cage.infos.map((i) => i.label).sort()).toEqual(["Clé personnelle", "Local poubelles"]);
    const dayB = await agentB.cleaning.myDay({ day: today });
    expect(dayB.flatMap((i) => i.infos.map((x) => x.label))).not.toContain("Clé personnelle");
  });

  it("seul un responsable modifie la fiche", async () => {
    await expectCode(
      agentA.sites.saveInfo({
        siteId: cageA,
        category: "instructions",
        label: "x",
        content: "y",
        visibility: "site_agents",
      }),
      "FORBIDDEN",
    );
    await expectCode(
      owner.sites.saveInfo({
        siteId: cageB,
        category: "keys",
        label: "Clé",
        content: "x",
        visibility: "agent",
      }),
      "BAD_REQUEST",
    );
    const { id } = await owner.sites.saveInfo({
      siteId: cageB,
      category: "keys",
      label: "Badge",
      content: "Badge n°12",
      visibility: "agent",
      agentId: bId,
    });
    expect((await agentB.sites.sheet({ siteId: cageB })).infos.map((i) => i.label)).toEqual([
      "Badge",
    ]);
    await owner.sites.archiveInfo({ id });
    expect((await agentB.sites.sheet({ siteId: cageB })).infos).toHaveLength(0);
  });
});

describe("vue d'ensemble client", () => {
  it("réunit la résidence et ses cages, même sans client sur les cages", async () => {
    const overview = await owner.sites.clientOverview({ companyId, month: today.slice(0, 7) });
    expect(overview.sites.map((s) => s.code)).toEqual(["R01", "R01-A", "R01-B"]);
    expect(overview.totals).toMatchObject({ sites: 3, planned: 4, done: 1 });
    await expectCode(
      agentA.sites.clientOverview({ companyId, month: today.slice(0, 7) }),
      "FORBIDDEN",
    );
  });
});

describe("planning : chevauchements", () => {
  it("alerte quand un agent est prévu à deux endroits en même temps (sans bloquer)", async () => {
    const planning = await owner.cleaning.planning({ week: today });
    expect(planning.conflicts).toHaveLength(1);
    const ids = planning.conflicts[0]!.ids;
    const titles = planning.interventions.filter((i) => ids.includes(i.id)).map((i) => i.title);
    expect(titles.sort()).toEqual(["Cage A", "Cage B vitres"]);
    expect(planning.conflicts[0]).toMatchObject({ agentId: aId, day: dayKey(parseDay(today)) });
  });
});
