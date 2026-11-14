import { addDays, dayKey, utcDay } from "@quercy/core";
import { prisma } from "@quercy/db";
import { runCleaningDaily } from "@quercy/jobs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { hoursCsv } from "../cleaning/hours";
import { expectCode, testFixtures } from "./helpers";

const fx = testFixtures("cleaning");
type Api = Awaited<ReturnType<typeof fx.caller>>;

let orgId: string;
let ownerApi: Api;
let agentApi: Api;
let agentId: string;
let siteId: string;
let contractId: string;

const today = utcDay(new Date());
const everyDay = ["0", "1", "2", "3", "4", "5", "6"];

beforeAll(async () => {
  const owner = await fx.user("owner");
  const agent = await fx.user("agent");
  agentId = agent.id;
  const org = await fx.org("a");
  orgId = org.id;
  await fx.member(orgId, owner.id, "owner");
  await fx.member(orgId, agent.id, "member");
  ownerApi = await fx.caller(owner, orgId);
  agentApi = await fx.caller(agent, orgId);
});

afterAll(async () => {
  await fx.cleanup();
  await prisma.$disconnect();
});

describe("contrats d'entretien → planning", () => {
  it("un contrat créé remplit aussitôt le planning, sans doublon", async () => {
    const site = await ownerApi.records.create({
      entity: "site",
      values: { name: "Bureaux Gambetta", city: "Cahors", accessCode: "4682B" },
    });
    siteId = site.id;
    const contract = await ownerApi.records.create({
      entity: "cleaningContract",
      values: {
        name: "Entretien Gambetta",
        siteId,
        weekdays: everyDay,
        startTime: "18:30",
        durationMinutes: "2h",
        agentId,
      },
    });
    contractId = contract.id;
    const count = () => prisma.intervention.count({ where: { contractId } });
    // Aujourd'hui + 21 jours.
    expect(await count()).toBe(22);
    // La mise à jour d'un contrat ne duplique rien.
    expect(await ownerApi.cleaning.generate()).toMatchObject({ created: 0 });
    const first = await prisma.intervention.findFirstOrThrow({
      where: { contractId, date: today },
    });
    expect(first).toMatchObject({ ownerId: agentId, startTime: "18:30", durationMinutes: 120 });
    const planning = await ownerApi.cleaning.planning({ week: dayKey(today) });
    expect(planning.days).toHaveLength(7);
    expect(planning.interventions.length).toBeGreaterThan(0);
    expect(planning.interventions[0]).toMatchObject({
      siteName: "Bureaux Gambetta",
      city: "Cahors",
    });
  });

  it("marque « non réalisée » une intervention oubliée", async () => {
    const old = await prisma.intervention.create({
      data: {
        organizationId: orgId,
        title: "Ancienne",
        siteId,
        date: addDays(today, -5),
        status: "planned",
      },
    });
    await runCleaningDaily();
    expect((await prisma.intervention.findUniqueOrThrow({ where: { id: old.id } })).status).toBe(
      "missed",
    );
  });
});

describe("ma journée et pointage", () => {
  it("l'agent voit ses interventions, pointe, fait signer ; le temps est calculé", async () => {
    const mine = await prisma.intervention.create({
      data: {
        organizationId: orgId,
        title: "Entretien — Bureaux Gambetta",
        siteId,
        ownerId: agentId,
        date: today,
        startTime: "08:00",
        durationMinutes: 90,
      },
    });
    const day = await agentApi.cleaning.myDay({ day: dayKey(today) });
    const item = day.find((i) => i.id === mine.id)!;
    expect(item.site).toMatchObject({ name: "Bureaux Gambetta", accessCode: "4682B" });

    await agentApi.cleaning.checkIn({ id: mine.id });
    await expectCode(agentApi.cleaning.checkIn({ id: mine.id }), "CONFLICT");
    // Arrivée ramenée 75 minutes plus tôt pour mesurer le temps.
    await prisma.intervention.update({
      where: { id: mine.id },
      data: { checkInAt: new Date(Date.now() - 75 * 60_000) },
    });
    await agentApi.cleaning.checkOut({
      id: mine.id,
      notes: "RAS",
      signedBy: "M. Delpech",
      signatureUrl:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    });
    const done = await prisma.intervention.findUniqueOrThrow({ where: { id: mine.id } });
    expect(done.status).toBe("done");
    expect(done.workedMinutes).toBeGreaterThanOrEqual(74);
    expect(done.workedMinutes).toBeLessThanOrEqual(76);
    expect(done.signedBy).toBe("M. Delpech");

    // Signature invalide refusée.
    const other = await prisma.intervention.create({
      data: { organizationId: orgId, title: "Autre", siteId, ownerId: agentId, date: today },
    });
    await expectCode(
      agentApi.cleaning.checkOut({ id: other.id, signatureUrl: "javascript:alert(1)" }),
      "BAD_REQUEST",
    );
  });

  it("un agent ne pointe pas l'intervention d'un autre et ne réaffecte pas", async () => {
    const notMine = await prisma.intervention.create({
      data: { organizationId: orgId, title: "Pas à moi", siteId, date: today },
    });
    await expectCode(agentApi.cleaning.checkIn({ id: notMine.id }), "NOT_FOUND");
    await expectCode(agentApi.cleaning.reassign({ id: notMine.id, agentId }), "FORBIDDEN");
    await ownerApi.cleaning.reassign({ id: notMine.id, agentId });
    expect(
      (await prisma.intervention.findUniqueOrThrow({ where: { id: notMine.id } })).ownerId,
    ).toBe(agentId);
  });

  it("totalise les heures du mois pour la paie", async () => {
    const month = dayKey(today).slice(0, 7);
    const hours = await ownerApi.cleaning.hours({ month });
    const agentRow = hours.rows.find((r) => r.agentId === agentId)!;
    expect(agentRow.interventions).toBeGreaterThanOrEqual(1);
    expect(agentRow.totalMinutes).toBeGreaterThanOrEqual(74);
    const csv = hoursCsv(hours).split("\r\n");
    expect(csv[0]).toContain("Heures totales");
    expect(csv.some((line) => line.includes(";") && /\d+,\d{2}/.test(line))).toBe(true);
  });
});

describe("contrôle qualité", () => {
  it("calcule la note et le résultat à partir de la grille", async () => {
    const inspection = await ownerApi.records.create({
      entity: "inspection",
      values: {
        title: "Contrôle mensuel",
        siteId,
        floors: true,
        sanitary: true,
        dusting: true,
        windows: false,
        bins: true,
      },
    });
    const read = () => prisma.inspection.findUniqueOrThrow({ where: { id: inspection.id } });
    expect(await read()).toMatchObject({ score: 80, result: "compliant" });
    await ownerApi.records.update({
      entity: "inspection",
      id: inspection.id,
      values: { sanitary: false, bins: false },
    });
    expect(await read()).toMatchObject({ score: 40, result: "non_compliant" });
  });
});
