import { addDays, dayKey, utcDay } from "@quercy/core";
import { prisma } from "@quercy/db";
import { detectAnomalies } from "@quercy/jobs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { expectCode, testFixtures } from "./helpers";

const fx = testFixtures("anomalies");
type Api = Awaited<ReturnType<typeof fx.caller>>;
let orgId: string;
let ownerId: string;
let agentId: string;
let owner: Api;
let agent: Api;
let siteId: string;

beforeAll(async () => {
  const o = await fx.user("owner");
  const a = await fx.user("agent");
  ownerId = o.id;
  agentId = a.id;
  orgId = (await fx.org("a")).id;
  await fx.member(orgId, o.id, "owner");
  await fx.member(orgId, a.id, "worker");
  owner = await fx.caller(o, orgId);
  agent = await fx.caller(a, orgId);
  siteId = (
    await prisma.site.create({
      data: { organizationId: orgId, name: "Résidence fictive", code: "A01" },
    })
  ).id;
});

afterAll(async () => {
  await prisma.anomaly.deleteMany({ where: { organizationId: orgId } });
  await prisma.interventionEvent.deleteMany({ where: { organizationId: orgId } });
  await fx.cleanup();
  await prisma.$disconnect();
});

async function reported(type = "leak") {
  return prisma.anomaly.create({
    data: {
      organizationId: orgId,
      siteId,
      type,
      source: "agent",
      reportedById: agentId,
      location: "Hall",
      comment: "Fuite",
    },
  });
}

describe("circuit de validation", () => {
  it("réservé aux responsables", async () => {
    await expectCode(agent.anomalies.list({ status: "open" }), "FORBIDDEN");
    const a = await reported();
    await expectCode(agent.anomalies.act({ id: a.id, action: "validate" }), "FORBIDDEN");
  });

  it("jamais visible du client avant validation", async () => {
    const a = await reported();
    await expectCode(owner.anomalies.setClientVisibility({ id: a.id, visible: true }), "CONFLICT");
    await expectCode(owner.anomalies.act({ id: a.id, action: "resolve", note: "x" }), "CONFLICT");

    await owner.anomalies.update({
      id: a.id,
      type: "lighting",
      location: "Hall, 2e étage",
      comment: "Ampoule HS",
      severity: "high",
    });
    await owner.anomalies.act({ id: a.id, action: "validate" });
    await owner.anomalies.setClientVisibility({ id: a.id, visible: true });
    await expectCode(owner.anomalies.act({ id: a.id, action: "resolve" }), "BAD_REQUEST");
    await owner.anomalies.act({ id: a.id, action: "resolve", note: "Ampoule changée" });
    const saved = await prisma.anomaly.findUniqueOrThrow({ where: { id: a.id } });
    expect(saved).toMatchObject({
      type: "lighting",
      status: "resolved",
      severity: "high",
      visibleToClient: true,
      validatedById: ownerId,
      resolvedById: ownerId,
      resolution: "Ampoule changée",
    });
    // Rouverte : elle redevient interne.
    await owner.anomalies.act({ id: a.id, action: "reopen" });
    expect(await prisma.anomaly.findUniqueOrThrow({ where: { id: a.id } })).toMatchObject({
      status: "reported",
      visibleToClient: false,
      validatedById: null,
    });
    const audit = await prisma.auditLog.findMany({
      where: { organizationId: orgId, entityId: a.id },
      select: { action: true },
    });
    expect(audit.map((x) => x.action)).toEqual(
      expect.arrayContaining(["anomaly.corrected", "anomaly.validate", "anomaly.resolve"]),
    );
  });

  it("le rejet la retire de tout rapport client", async () => {
    const a = await reported("pests");
    await owner.anomalies.act({ id: a.id, action: "validate" });
    await owner.anomalies.setClientVisibility({ id: a.id, visible: true });
    await owner.anomalies.act({ id: a.id, action: "reject", note: "Doublon" });
    expect(await prisma.anomaly.findUniqueOrThrow({ where: { id: a.id } })).toMatchObject({
      status: "rejected",
      visibleToClient: false,
    });
  });

  it("une anomalie saisie par le responsable est validée d'office", async () => {
    const { id } = await owner.anomalies.create({
      siteId,
      type: "bulky_items",
      location: "Local vélos",
      comment: "Signalé par le syndic",
      source: "client",
    });
    expect(await prisma.anomaly.findUniqueOrThrow({ where: { id } })).toMatchObject({
      status: "validated",
      source: "client",
      validatedById: ownerId,
    });
    const list = await owner.anomalies.list({ status: "open" });
    expect(list.anomalies.find((a) => a.id === id)).toMatchObject({
      typeLabel: "Encombrants",
      site: { name: "Résidence fictive" },
    });
    expect(list.counts.validated).toBeGreaterThanOrEqual(1);
  });
});

describe("détection automatique", () => {
  it("pointage hors créneau, durée anormale, contrôle non conforme, passage manqué — sans doublon", async () => {
    const now = new Date();
    const today = utcDay(now);
    const late = await prisma.intervention.create({
      data: {
        organizationId: orgId,
        title: "Entretien",
        siteId,
        ownerId: agentId,
        date: today,
        startTime: "06:00",
        durationMinutes: 120,
        // Arrivée cinq heures plus tard, vingt minutes sur place.
        checkInAt: new Date(`${dayKey(today)}T09:00:00Z`),
        checkOutAt: new Date(`${dayKey(today)}T09:20:00Z`),
      },
    });
    const forgotten = await prisma.intervention.create({
      data: {
        organizationId: orgId,
        title: "Vitres",
        siteId,
        date: addDays(today, -3),
        status: "missed",
      },
    });
    const inspection = await prisma.inspection.create({
      data: {
        organizationId: orgId,
        title: "Contrôle fictif",
        siteId,
        date: today,
        score: 40,
        result: "non_compliant",
      },
    });
    const missed = [{ ...forgotten, organizationId: orgId }];
    const first = await detectAnomalies(now, missed, { organizationId: orgId });
    expect(first).toBe(4);
    const second = await detectAnomalies(now, missed, { organizationId: orgId });
    expect(second).toBe(0);
    const rows = await prisma.anomaly.findMany({
      where: { organizationId: orgId, source: { in: ["system", "inspection"] } },
    });
    expect(rows.map((r) => r.dedupeKey).sort()).toEqual(
      [
        `controle:${inspection.id}`,
        `creneau:${late.id}`,
        `duree:${late.id}`,
        `manque:${forgotten.id}`,
      ].sort(),
    );
    expect(rows.every((r) => r.status === "reported" && !r.visibleToClient)).toBe(true);
    // Les responsables sont prévenus, pas l'agent.
    const notes = await prisma.notification.findMany({
      where: { organizationId: orgId, type: "anomaly.reported" },
    });
    expect(notes.length).toBeGreaterThanOrEqual(4);
    expect(notes.every((n) => n.userId === ownerId)).toBe(true);
  });
});
